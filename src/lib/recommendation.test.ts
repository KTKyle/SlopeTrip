import { describe, expect, it } from "vitest";
import { resorts } from "@/lib/resorts";
import {
  buildDemoRecommendation,
  estimateTripCost,
  getEffectiveTicketCost,
  scoreResort,
} from "@/lib/recommendation";
import type { TripRecommendationRequest } from "@/lib/types";

const baseRequest: TripRecommendationRequest = {
  days: 3,
  abilityLevel: "intermediate",
  rentsGear: false,
  maxDriveHours: 10,
  preferredRegion: "northeast",
  budget: {
    maxTotalUsd: 1200,
    includeRentals: false,
    includeLodging: false,
  },
};

describe("recommendation scoring", () => {
  it("estimates trip cost from tickets and rentals without lodging assumptions", () => {
    const resort = resorts.find((item) => item.id === "stowe")!;
    expect(estimateTripCost(resort, baseRequest)).toBe(537);
  });

  it("scores ability and preferred region", () => {
    const stowe = resorts.find((item) => item.id === "stowe")!;
    const vail = resorts.find((item) => item.id === "vail")!;
    expect(scoreResort(stowe, baseRequest)).toBeGreaterThan(scoreResort(vail, baseRequest));
  });

  it("returns a bounded demo itinerary", () => {
    const result = buildDemoRecommendation(baseRequest);
    expect(result.stops).toHaveLength(baseRequest.days);
    expect(result.totalEstimatedCostUsd).toBeGreaterThan(0);
    expect(result.confidence).toBe("demo");
  });

  it("removes ticket estimates when a saved pass covers the resort", () => {
    const stowe = resorts.find((item) => item.id === "stowe")!;
    expect(getEffectiveTicketCost(stowe, { ...baseRequest, passAffiliations: ["epic"] })).toBe(0);
  });

  it("includes lodging and travel assumptions when requested", () => {
    const stowe = resorts.find((item) => item.id === "stowe")!;
    const request: TripRecommendationRequest = {
      ...baseRequest,
      budget: {
        ...baseRequest.budget,
        includeLodging: true,
        assumptions: {
          lodgingNightlyUsd: 200,
          foodDailyUsd: 50,
          parkingDailyUsd: 20,
          fuelEstimateUsd: 100,
        },
      },
    };

    expect(estimateTripCost(stowe, request)).toBe(1247);
  });

  it("adds explanation factors to recommendation stops", () => {
    const result = buildDemoRecommendation({
      ...baseRequest,
      homeLatitude: 42.3601,
      homeLongitude: -71.0589,
      passAffiliations: ["epic"],
    });

    expect(result.stops[0].factors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "Ability fit" }),
        expect.objectContaining({ label: "Drive fit" }),
        expect.objectContaining({ label: "Pass fit", value: "Covered" }),
      ]),
    );
  });

  it("returns no stops when every candidate is far beyond budget", () => {
    const result = buildDemoRecommendation({
      ...baseRequest,
      budget: {
        maxTotalUsd: 100,
        includeRentals: true,
        includeLodging: true,
        assumptions: { lodgingNightlyUsd: 500 },
      },
    });

    expect(result.stops).toHaveLength(0);
  });
});
