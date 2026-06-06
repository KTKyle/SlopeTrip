import { GoogleGenAI } from "@google/genai";
import { buildDemoRecommendation } from "@/lib/recommendation";
import type { TripRecommendationRequest, TripRecommendationResult } from "@/lib/types";

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
    JSON.stringify({ request: sanitizeTripRequest(request), localRecommendation: demo }),
  ].join("\n\n");

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
  });

  return {
    ...demo,
    confidence: "model",
    summary: response.text?.slice(0, 800) || demo.summary,
  };
}

function sanitizeTripRequest(request: TripRecommendationRequest) {
  return {
    days: request.days,
    budget: request.budget,
    abilityLevel: request.abilityLevel,
    rentsGear: request.rentsGear,
    maxDriveHours: request.maxDriveHours,
    preferredRegion: request.preferredRegion,
    homeRegionHint: request.homeLocationLabel?.split(",").slice(-1).join(",").trim(),
  };
}
