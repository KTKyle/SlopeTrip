import { GoogleGenAI } from "@google/genai";
import { buildDemoRecommendation } from "@/lib/recommendation";
import { getResortById, resorts } from "@/lib/resorts";
import type { AbilityLevel, ResortRegion, TripRecommendationRequest, TripRecommendationResult } from "@/lib/types";

const recommendationPromptVersion = "slopetrip-recommendation-v2";

type TripChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type TripChatRequest = {
  messages: TripChatMessage[];
  selectedResortId?: string;
  abilityLevel?: AbilityLevel;
  region?: ResortRegion | "all";
  query?: string;
};

export async function recommendTrip(
  request: TripRecommendationRequest,
): Promise<TripRecommendationResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  const demo = buildDemoRecommendation(request);

  if (!apiKey) {
    return demo;
  }

  const ai = new GoogleGenAI({ apiKey });
  const prompt = [
    "Create a concise ski trip recommendation using only this anonymized trip planning context.",
    "Do not infer identity, exact address, health status, or sensitive traits.",
    "Return a short human-readable summary. Keep the local scoring result as the source of truth.",
    JSON.stringify({
      request: sanitizeTripRequest(request),
      localRecommendation: sanitizeRecommendationForModel(demo),
    }),
  ].join("\n\n");

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    return {
      ...demo,
      confidence: "model",
      summary: response.text?.slice(0, 800) || demo.summary,
      modelMetadata: {
        engine: "gemini-2.5-flash",
        promptVersion: recommendationPromptVersion,
      },
    };
  } catch {
    return {
      ...demo,
      summary: `${demo.summary} Gemini was unavailable, so this plan used local scoring.`,
      modelMetadata: {
        engine: "demo-scoring",
        promptVersion: recommendationPromptVersion,
        fallbackReason: "Gemini was unavailable",
      },
    };
  }
}

export async function answerTripQuestion(request: TripChatRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  const selected = request.selectedResortId ? getResortById(request.selectedResortId) : undefined;
  const contextResorts = selected
    ? [selected]
    : resorts
        .filter((resort) => request.region === "all" || !request.region || resort.region === request.region)
        .slice(0, 6);

  if (!apiKey) {
    return {
      confidence: "demo" as const,
      answer: buildDemoChatAnswer(request, selected),
    };
  }

  const ai = new GoogleGenAI({ apiKey });
  const prompt = [
    "You are SlopeTrip's ski travel assistant.",
    "Answer questions about gear, lift ticket and rental costs, travel timing, resort fit, and general trip recommendations.",
    "Use only the supplied resort context for resort facts. If exact travel time requires a starting point, ask for the origin and give a rough planning rule.",
    "Keep answers concise, practical, and friendly. Do not invent current live snow conditions beyond the provided context.",
    JSON.stringify({
      selectedResort: selected ? summarizeResort(selected) : null,
      visibleResorts: contextResorts.map(summarizeResort),
      userContext: {
        abilityLevel: request.abilityLevel,
        region: request.region,
        searchQuery: request.query,
      },
      messages: request.messages,
    }),
  ].join("\n\n");

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    return {
      confidence: "model" as const,
      answer: response.text?.slice(0, 1200) || buildDemoChatAnswer(request, selected),
    };
  } catch {
    return {
      confidence: "demo" as const,
      answer: `${buildDemoChatAnswer(request, selected)} Gemini was unavailable, so I used SlopeTrip's local trip context.`,
    };
  }
}

function sanitizeTripRequest(request: TripRecommendationRequest) {
  return {
    days: request.days,
    budget: request.budget,
    abilityLevel: request.abilityLevel,
    rentsGear: request.rentsGear,
    maxDriveHours: request.maxDriveHours,
    preferredRegion: request.preferredRegion,
    passAffiliations: request.passAffiliations,
    homeRegionHint: request.homeLocationLabel?.split(",").slice(-1).join(",").trim(),
  };
}

function sanitizeRecommendationForModel(result: TripRecommendationResult) {
  return {
    title: result.title,
    totalEstimatedCostUsd: result.totalEstimatedCostUsd,
    confidence: result.confidence,
    summary: result.summary,
    stops: result.stops.map((stop) => ({
      resortId: stop.resortId,
      resortName: stop.resortName,
      day: stop.day,
      estimatedCostUsd: stop.estimatedCostUsd,
      score: stop.score,
      reasons: stop.reasons,
      factors: stop.factors
        ?.filter((factor) => factor.label !== "Drive fit")
        .map((factor) => ({
          label: factor.label,
          value: factor.value,
          tone: factor.tone,
        })),
    })),
    safetyNotes: result.safetyNotes,
  };
}

function summarizeResort(resort: (typeof resorts)[number]) {
  return {
    name: resort.name,
    state: resort.state,
    region: resort.region,
    acres: resort.acres,
    trails: resort.trails,
    difficulty: resort.difficulty,
    ticketEstimateUsd: resort.ticketEstimateUsd,
    rentalEstimateUsd: resort.rentalEstimateUsd,
    snowfall7DayIn: resort.condition.snowfall7DayIn,
    highlights: resort.highlights,
  };
}

function buildDemoChatAnswer(request: TripChatRequest, selected?: (typeof resorts)[number]) {
  const latestQuestion = request.messages.at(-1)?.content.toLowerCase() ?? "";
  const resort = selected ?? resorts.find((item) => item.region === request.region) ?? resorts[0];

  if (latestQuestion.includes("gear") || latestQuestion.includes("rent")) {
    return `${resort.name} estimates rentals around $${resort.rentalEstimateUsd} per day. For a first trip, bring moisture-wicking layers, waterproof outerwear, gloves, goggles, warm socks, and rent skis/boots/poles unless you already own fitted gear.`;
  }

  if (latestQuestion.includes("cost") || latestQuestion.includes("budget") || latestQuestion.includes("price")) {
    const dayCost = resort.ticketEstimateUsd + resort.rentalEstimateUsd;
    return `For ${resort.name}, a rough per-day baseline is about $${dayCost}: $${resort.ticketEstimateUsd} lift ticket and $${resort.rentalEstimateUsd} rentals. Lodging is best searched separately because rates move by date, party size, and availability.`;
  }

  if (latestQuestion.includes("time") || latestQuestion.includes("drive") || latestQuestion.includes("travel")) {
    return `Travel time depends on your starting point. As a planning shortcut, use about 55 mph average driving speed plus 30-60 minutes for winter traffic, parking, shuttle, and gear pickup. Share an origin in the trip planner for a better estimate.`;
  }

  if (latestQuestion.includes("recommend") || latestQuestion.includes("best") || latestQuestion.includes("where")) {
    return `${resort.name} is a strong match to consider: ${resort.highlights.join(", ").toLowerCase()}. The terrain mix is ${resort.difficulty.beginner}% beginner, ${resort.difficulty.intermediate}% intermediate, and ${resort.difficulty.expert}% expert, so compare that to your comfort level before booking.`;
  }

  return `I can help compare resorts, estimate gear and ticket costs, think through travel timing, or pick a mountain for your skill level. Right now I would start with ${resort.name}, especially for ${resort.highlights[0].toLowerCase()}.`;
}
