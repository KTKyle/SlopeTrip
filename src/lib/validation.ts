import { z } from "zod";

export const abilityLevelSchema = z.enum(["beginner", "intermediate", "expert"]);
export const resortRegionSchema = z.enum(["northeast", "midwest", "rockies", "west", "pacific"]);

export const profileSchema = z.object({
  seasons: z.coerce.number().int().min(0).max(80),
  abilityLevel: abilityLevelSchema,
  rentsGear: z.coerce.boolean(),
  homeLocationLabel: z.string().trim().min(2).max(120),
  homeLatitude: z.coerce.number().min(18).max(72).optional(),
  homeLongitude: z.coerce.number().min(-180).max(-60).optional(),
});

export const tripRecommendationRequestSchema = z.object({
  days: z.coerce.number().int().min(1).max(14),
  budget: z.object({
    maxTotalUsd: z.coerce.number().int().min(100).max(50000),
    includeRentals: z.coerce.boolean(),
    includeLodging: z.coerce.boolean(),
  }),
  abilityLevel: abilityLevelSchema,
  rentsGear: z.coerce.boolean(),
  maxDriveHours: z.coerce.number().min(1).max(40),
  preferredRegion: resortRegionSchema.optional(),
  homeLocationLabel: z.string().trim().max(120).optional(),
  homeLatitude: z.coerce.number().min(18).max(72).optional(),
  homeLongitude: z.coerce.number().min(-180).max(-60).optional(),
});

export const routeMatrixRequestSchema = z.object({
  origin: z.object({
    label: z.string().trim().min(2).max(120),
    latitude: z.coerce.number().min(18).max(72).optional(),
    longitude: z.coerce.number().min(-180).max(-60).optional(),
  }),
  resortIds: z.array(z.string().trim().min(1)).min(1).max(10),
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
