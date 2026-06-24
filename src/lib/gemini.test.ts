import { beforeEach, describe, expect, it } from "vitest";
import { answerTripQuestion, recommendTrip } from "@/lib/gemini";
import type { TripRecommendationRequest } from "@/lib/types";

const request: TripRecommendationRequest = {
  days: 3,
  abilityLevel: "intermediate",
  rentsGear: false,
  maxDriveHours: 8,
  preferredRegion: "northeast",
  resortIds: ["stowe"],
  budget: {
    maxTotalUsd: 1500,
    includeRentals: false,
    includeLodging: false,
  },
};

describe("Gemini fallback behavior", () => {
  beforeEach(() => {
    delete process.env.GEMINI_API_KEY;
  });

  it("returns deterministic recommendation metadata without Gemini", async () => {
    const result = await recommendTrip(request);

    expect(result.confidence).toBe("demo");
    expect(result.modelMetadata).toEqual(
      expect.objectContaining({
        engine: "demo-scoring",
        promptVersion: "slopetrip-recommendation-v2",
      }),
    );
  });

  it("does not invent exact drive times without an origin", async () => {
    const result = await answerTripQuestion({
      messages: [{ role: "user", content: "How long is the drive?" }],
      selectedResortId: "stowe",
      abilityLevel: "intermediate",
    });

    expect(result.confidence).toBe("demo");
    expect(result.answer).toContain("depends on your starting point");
  });
});
