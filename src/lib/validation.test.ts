import { describe, expect, it } from "vitest";
import {
  profileSchema,
  tripRecommendationRequestSchema,
  tripShareRequestSchema,
} from "@/lib/validation";

describe("validation schemas", () => {
  it("accepts valid onboarding profile input", () => {
    const parsed = profileSchema.safeParse({
      seasons: "4",
      abilityLevel: "intermediate",
      rentsGear: false,
      homeLocationLabel: "Burlington, VT",
      passAffiliations: ["ikon", "indy"],
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects unrealistic trip planning requests", () => {
    const parsed = tripRecommendationRequestSchema.safeParse({
      days: 99,
      abilityLevel: "expert",
      rentsGear: true,
      maxDriveHours: 10,
      budget: {
        maxTotalUsd: 50,
        includeRentals: true,
        includeLodging: true,
      },
    });
    expect(parsed.success).toBe(false);
  });

  it("accepts professional trip planning assumptions", () => {
    const parsed = tripRecommendationRequestSchema.safeParse({
      days: 3,
      abilityLevel: "intermediate",
      rentsGear: false,
      maxDriveHours: 8,
      passAffiliations: ["epic"],
      budget: {
        maxTotalUsd: 1800,
        includeRentals: false,
        includeLodging: true,
        assumptions: {
          lodgingNightlyUsd: 220,
          foodDailyUsd: 60,
          parkingDailyUsd: 25,
          fuelEstimateUsd: 140,
        },
      },
    });

    expect(parsed.success).toBe(true);
  });

  it("rejects string booleans for share toggles", () => {
    const parsed = tripShareRequestSchema.safeParse({ isPublic: "false" });

    expect(parsed.success).toBe(false);
  });

  it("bounds resort identifiers before persistence", () => {
    const parsed = tripRecommendationRequestSchema.safeParse({
      days: 3,
      abilityLevel: "intermediate",
      rentsGear: false,
      maxDriveHours: 8,
      resortIds: ["x".repeat(120)],
      budget: {
        maxTotalUsd: 1800,
        includeRentals: false,
        includeLodging: true,
      },
    });

    expect(parsed.success).toBe(false);
  });
});
