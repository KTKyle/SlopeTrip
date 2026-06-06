import { describe, expect, it } from "vitest";
import { profileSchema, tripRecommendationRequestSchema } from "@/lib/validation";

describe("validation schemas", () => {
  it("accepts valid onboarding profile input", () => {
    const parsed = profileSchema.safeParse({
      seasons: "4",
      abilityLevel: "intermediate",
      rentsGear: false,
      homeLocationLabel: "Burlington, VT",
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
});
