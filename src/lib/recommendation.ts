import { resorts } from "@/lib/resorts";
import type {
  AbilityLevel,
  Resort,
  TripRecommendationRequest,
  TripRecommendationResult,
} from "@/lib/types";

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
  const liftTickets = resort.ticketEstimateUsd * request.days;
  const rentals =
    request.rentsGear || request.budget.includeRentals
      ? resort.rentalEstimateUsd * request.days
      : 0;

  return liftTickets + rentals;
}

function estimateResortDayCost(resort: Resort, request: TripRecommendationRequest) {
  return resort.ticketEstimateUsd + (request.rentsGear || request.budget.includeRentals ? resort.rentalEstimateUsd : 0);
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
        request.preferredRegion === resort.region ? "Matches preferred region" : "Strong overall value",
      ],
    }));

  return {
    title: `${request.days}-day ${request.abilityLevel} ski plan`,
    totalEstimatedCostUsd: stops.reduce((total, stop) => total + stop.estimatedCostUsd, 0),
    confidence: "demo",
    summary: stops.length
      ? "Generated from SlopeTrip's local scoring model. Lodging is kept separate so you can search stays after choosing the route."
      : "No selected resort fits the current budget guardrail. Raise the budget or choose lower-cost mountains.",
    stops,
  };
}
