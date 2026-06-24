import { resorts } from "@/lib/resorts";
import type {
  AbilityLevel,
  RecommendationFactor,
  Resort,
  TripRecommendationRequest,
  TripRecommendationResult,
} from "@/lib/types";
import { bookingPriorityLabels, getGroupPlan, getGroupSize } from "@/lib/trip-insights";

const abilityWeights: Record<AbilityLevel, keyof Resort["difficulty"]> = {
  beginner: "beginner",
  intermediate: "intermediate",
  expert: "expert",
};

export function haversineMiles(
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number },
) {
  const radiusMiles = 3958.8;
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const dLat = toRadians(to.latitude - from.latitude);
  const dLon = toRadians(to.longitude - from.longitude);
  const lat1 = toRadians(from.latitude);
  const lat2 = toRadians(to.latitude);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;

  return radiusMiles * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function estimateDriveHours(miles: number) {
  return Math.max(0.5, miles / 55);
}

export function estimateTripCost(resort: Resort, request: TripRecommendationRequest) {
  const liftTickets = getEffectiveTicketCost(resort, request) * request.days;
  const rentals =
    request.rentsGear || request.budget.includeRentals
      ? resort.rentalEstimateUsd * request.days
      : 0;
  const assumptions = request.budget.assumptions;
  const lodging =
    request.budget.includeLodging && assumptions?.lodgingNightlyUsd
      ? assumptions.lodgingNightlyUsd * Math.max(1, request.days - 1)
      : 0;
  const food = (assumptions?.foodDailyUsd ?? 0) * request.days;
  const parking = (assumptions?.parkingDailyUsd ?? 0) * request.days;
  const rentalCar = (assumptions?.rentalCarDailyUsd ?? 0) * request.days;
  const fuel = assumptions?.fuelEstimateUsd ?? 0;

  return liftTickets + rentals + lodging + food + parking + rentalCar + fuel;
}

function estimateResortDayCost(resort: Resort, request: TripRecommendationRequest) {
  const assumptions = request.budget.assumptions;
  const perDayAddOns =
    (request.budget.includeLodging ? assumptions?.lodgingNightlyUsd ?? 0 : 0) +
    (assumptions?.foodDailyUsd ?? 0) +
    (assumptions?.parkingDailyUsd ?? 0) +
    (assumptions?.rentalCarDailyUsd ?? 0) +
    Math.round((assumptions?.fuelEstimateUsd ?? 0) / Math.max(1, request.days));

  return (
    getEffectiveTicketCost(resort, request) +
    (request.rentsGear || request.budget.includeRentals ? resort.rentalEstimateUsd : 0) +
    perDayAddOns
  );
}

export function getEffectiveTicketCost(resort: Resort, request: TripRecommendationRequest) {
  const ownedPasses = request.passAffiliations ?? [];
  const hasPassAccess = resort.passAffiliations.some(
    (pass) => pass !== "independent" && ownedPasses.includes(pass),
  );

  return hasPassAccess ? 0 : resort.ticketEstimateUsd;
}

export function scoreResort(resort: Resort, request: TripRecommendationRequest) {
  const difficultyFit = resort.difficulty[abilityWeights[request.abilityLevel]];
  const snowScore = Math.min(25, resort.condition.snowfall7DayIn * 1.25);
  const cost = estimateTripCost(resort, request);
  const budgetScore = Math.max(0, 25 - ((cost - request.budget.maxTotalUsd) / 100));
  const regionScore = request.preferredRegion && request.preferredRegion === resort.region ? 12 : 0;

  let distanceScore = 10;
  if (request.homeLatitude && request.homeLongitude) {
    const miles = haversineMiles(
      { latitude: request.homeLatitude, longitude: request.homeLongitude },
      { latitude: resort.latitude, longitude: resort.longitude },
    );
    const driveHours = estimateDriveHours(miles);
    distanceScore = Math.max(0, 25 - Math.max(0, driveHours - request.maxDriveHours) * 4);
  }

  return Math.round(difficultyFit * 0.5 + snowScore + budgetScore + regionScore + distanceScore);
}

export function buildDemoRecommendation(
  request: TripRecommendationRequest,
): TripRecommendationResult {
  const requestedResortIds = request.resortIds ? new Set(request.resortIds) : null;
  const candidateResorts = requestedResortIds
    ? resorts.filter((resort) => requestedResortIds.has(resort.id))
    : resorts;

  const ranked = candidateResorts
    .map((resort) => ({
      resort,
      score: scoreResort(resort, request),
      estimatedCostUsd: estimateTripCost(resort, request),
    }))
    .filter(({ estimatedCostUsd }) => estimatedCostUsd <= request.budget.maxTotalUsd * 1.15)
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.min(3, request.days));

  const stops = Array.from({ length: request.days }, (_, index) => ranked[index % ranked.length])
    .filter((item): item is (typeof ranked)[number] => Boolean(item))
    .map(({ resort, score }, index) => ({
      resortId: resort.id,
      resortName: resort.name,
      day: index + 1,
      estimatedCostUsd: estimateResortDayCost(resort, request),
      score,
      reasons: [
        `${resort.difficulty[abilityWeights[request.abilityLevel]]}% ${request.abilityLevel} terrain fit`,
        `${resort.condition.snowfall7DayIn}" reported 7-day snowfall`,
        `${getGroupSize(getGroupPlan(request.budget.assumptions))}-person group plan weighted toward ${bookingPriorityLabels[getGroupPlan(request.budget.assumptions).bookingPriority].toLowerCase()}`,
        request.preferredRegion === resort.region ? "Matches preferred region" : "Strong overall value",
      ],
      factors: buildRecommendationFactors(resort, request, score),
    }));

  return {
    title: `${request.days}-day ${request.abilityLevel} ski plan`,
    totalEstimatedCostUsd: stops.reduce((total, stop) => total + stop.estimatedCostUsd, 0),
    confidence: "demo",
    summary: stops.length
      ? request.budget.includeLodging
        ? "Generated from SlopeTrip's local scoring model with group size, lodging, and travel assumptions included in the planning total."
        : "Generated from SlopeTrip's local scoring model with group size included. Lodging is kept separate so you can search stays after choosing the route."
      : "No selected resort fits the current budget guardrail. Raise the budget or choose lower-cost mountains.",
    stops,
    generatedAt: new Date().toISOString(),
    modelMetadata: {
      engine: "demo-scoring",
      promptVersion: "slopetrip-recommendation-v2",
    },
    safetyNotes: [
      "Snow and price data should be verified with the resort before booking.",
      "Drive times are planning estimates and can change quickly in winter weather.",
      "Condition data may be seeded or provider-synced; check the source and freshness before committing.",
    ],
  };
}

function buildRecommendationFactors(
  resort: Resort,
  request: TripRecommendationRequest,
  score: number,
): RecommendationFactor[] {
  const abilityFit = resort.difficulty[abilityWeights[request.abilityLevel]];
  const ticketCost = getEffectiveTicketCost(resort, request);
  const hasPassAccess = ticketCost === 0 && resort.ticketEstimateUsd > 0;
  const estimatedCost = estimateTripCost(resort, request);
  const budgetDelta = request.budget.maxTotalUsd - estimatedCost;

  const factors: RecommendationFactor[] = [
    {
      label: "Ability fit",
      value: `${abilityFit}%`,
      detail: `${resort.name} reports ${abilityFit}% ${request.abilityLevel} terrain.`,
      tone: abilityFit >= 30 ? "positive" : abilityFit >= 18 ? "neutral" : "warning",
    },
    {
      label: "Budget fit",
      value: budgetDelta >= 0 ? "Within" : "Over",
      detail:
        budgetDelta >= 0
          ? `Estimated total leaves about $${budgetDelta.toLocaleString()} in the budget.`
          : `Estimated total is about $${Math.abs(budgetDelta).toLocaleString()} over budget.`,
      tone: budgetDelta >= 0 ? "positive" : budgetDelta > -250 ? "neutral" : "warning",
    },
    {
      label: "Pass fit",
      value: hasPassAccess ? "Covered" : "Ticketed",
      detail: hasPassAccess
        ? `Your saved pass can cover the lift ticket estimate for this resort.`
        : `No saved pass match was found, so tickets are included in cost.`,
      tone: hasPassAccess ? "positive" : "neutral",
    },
    {
      label: "Snow signal",
      value: `${resort.condition.snowfall7DayIn}"`,
      detail: `${resort.condition.snowfall7DayIn}" 7-day snowfall in the current SlopeTrip data snapshot.`,
      tone: resort.condition.snowfall7DayIn >= 10 ? "positive" : "neutral",
    },
    {
      label: "Overall score",
      value: String(score),
      detail: "Combined score from cost, terrain fit, snowfall, region preference, and drive estimate.",
      tone: score >= 80 ? "positive" : score >= 60 ? "neutral" : "warning",
    },
  ];

  if (request.homeLatitude && request.homeLongitude) {
    const miles = haversineMiles(
      { latitude: request.homeLatitude, longitude: request.homeLongitude },
      { latitude: resort.latitude, longitude: resort.longitude },
    );
    const driveHours = estimateDriveHours(miles);
    factors.splice(3, 0, {
      label: "Drive fit",
      value: `${driveHours.toFixed(1)}h`,
      detail: `${Math.round(miles).toLocaleString()} estimated miles from the saved origin.`,
      tone: driveHours <= request.maxDriveHours ? "positive" : "warning",
    });
  }

  return factors;
}
