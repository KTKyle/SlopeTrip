import { z } from "zod";

export const abilityLevelSchema = z.enum(["beginner", "intermediate", "expert"]);
export const resortRegionSchema = z.enum(["northeast", "midwest", "rockies", "west", "pacific"]);
export const resortPassAffiliationSchema = z.enum([
  "epic",
  "ikon",
  "new-england",
  "indy",
  "independent",
]);
export const tripStatusSchema = z.enum(["active", "archived"]);
export const resortIdSchema = z.string().trim().min(1).max(80);

export const tripCostAssumptionsSchema = z.object({
  lodgingNightlyUsd: z.coerce.number().int().min(0).max(5000).optional(),
  foodDailyUsd: z.coerce.number().int().min(0).max(1000).optional(),
  parkingDailyUsd: z.coerce.number().int().min(0).max(500).optional(),
  fuelEstimateUsd: z.coerce.number().int().min(0).max(5000).optional(),
  rentalCarDailyUsd: z.coerce.number().int().min(0).max(2000).optional(),
  groupPlan: z
    .object({
      adults: z.coerce.number().int().min(0).max(40),
      kids: z.coerce.number().int().min(0).max(40),
      nonSkiers: z.coerce.number().int().min(0).max(40),
      passHolders: z.coerce.number().int().min(0).max(40),
      lodgingPreference: z
        .enum(["value", "walkable", "family", "flexible"])
        .default("flexible"),
      transportMode: z.enum(["drive", "fly", "train-shuttle", "mixed"]).default("drive"),
      bookingPriority: z
        .enum(["lowest-cost", "family-ease", "best-snow", "shortest-travel"])
        .default("family-ease"),
    })
    .optional(),
});

export const profileSchema = z.object({
  seasons: z.coerce.number().int().min(0).max(80),
  abilityLevel: abilityLevelSchema,
  rentsGear: z.coerce.boolean(),
  homeLocationLabel: z.string().trim().min(2).max(120),
  homeLatitude: z.coerce.number().min(18).max(72).optional(),
  homeLongitude: z.coerce.number().min(-180).max(-60).optional(),
  passAffiliations: z.array(resortPassAffiliationSchema).max(5).default([]),
});

export const tripRecommendationRequestSchema = z.object({
  days: z.coerce.number().int().min(1).max(14),
  budget: z.object({
    maxTotalUsd: z.coerce.number().int().min(100).max(50000),
    includeRentals: z.coerce.boolean(),
    includeLodging: z.coerce.boolean(),
    assumptions: tripCostAssumptionsSchema.optional(),
  }),
  abilityLevel: abilityLevelSchema,
  rentsGear: z.coerce.boolean(),
  maxDriveHours: z.coerce.number().min(1).max(40),
  preferredRegion: resortRegionSchema.optional(),
  passAffiliations: z.array(resortPassAffiliationSchema).max(5).optional(),
  resortIds: z.array(resortIdSchema).min(1).max(10).optional(),
  homeLocationLabel: z.string().trim().max(120).optional(),
  homeLatitude: z.coerce.number().min(18).max(72).optional(),
  homeLongitude: z.coerce.number().min(-180).max(-60).optional(),
});

export const saveTripRequestSchema = z.object({
  request: tripRecommendationRequestSchema,
  result: z.object({
    title: z.string().trim().min(1).max(160),
    totalEstimatedCostUsd: z.coerce.number().int().min(0).max(500000),
    confidence: z.enum(["demo", "model"]),
    summary: z.string().trim().min(1).max(1200),
    stops: z
      .array(
        z.object({
          resortId: resortIdSchema,
          resortName: z.string().trim().min(1).max(160),
          day: z.coerce.number().int().min(1).max(14),
          estimatedCostUsd: z.coerce.number().int().min(0).max(500000),
          score: z.coerce.number().int(),
          reasons: z.array(z.string().trim().min(1).max(240)).max(6),
          factors: z
            .array(
              z.object({
                label: z.string().trim().min(1).max(80),
                value: z.string().trim().min(1).max(80),
                detail: z.string().trim().min(1).max(240),
                tone: z.enum(["positive", "neutral", "warning"]),
              }),
            )
            .max(8)
            .optional(),
        }),
      )
      .min(1)
      .max(14),
    generatedAt: z.string().trim().max(80).optional(),
    modelMetadata: z
      .object({
        engine: z.enum(["demo-scoring", "gemini-2.5-flash"]),
        promptVersion: z.string().trim().min(1).max(80),
        fallbackReason: z.string().trim().min(1).max(240).optional(),
      })
      .optional(),
    safetyNotes: z.array(z.string().trim().min(1).max(240)).max(8).optional(),
  }),
  sourceTripId: z.string().uuid().optional(),
});

export const routeMatrixRequestSchema = z.object({
  origin: z.object({
    label: z.string().trim().min(2).max(120),
    latitude: z.coerce.number().min(18).max(72).optional(),
    longitude: z.coerce.number().min(-180).max(-60).optional(),
  }),
  resortIds: z.array(resortIdSchema).min(1).max(10),
});

export const tripChatRequestSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().min(1).max(1200),
      }),
    )
    .min(1)
    .max(12),
  selectedResortId: z.string().trim().min(1).optional(),
  abilityLevel: abilityLevelSchema.optional(),
  region: z.union([resortRegionSchema, z.literal("all")]).optional(),
  query: z.string().trim().max(120).optional(),
});

export const tripUpdateRequestSchema = z
  .object({
    title: z.string().trim().min(1).max(160).optional(),
    status: tripStatusSchema.optional(),
  })
  .refine((value) => value.title !== undefined || value.status !== undefined, {
    message: "At least one trip update field is required",
  });

export const tripDuplicateRequestSchema = z.object({
  title: z.string().trim().min(1).max(160).optional(),
});

export const tripShareRequestSchema = z.object({
  isPublic: z.boolean(),
});
