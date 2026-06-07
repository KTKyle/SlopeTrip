import { describe, expect, it } from "vitest";
import { resorts } from "@/lib/resorts";
import { buildDemoRecommendation, estimateTripCost, scoreResort } from "@/lib/recommendation";
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
});
