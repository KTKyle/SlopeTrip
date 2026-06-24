import type { Resort } from "@/lib/types";

export type ResortAmenityKey =
  | "beginnerFriendly"
  | "lessons"
  | "rentals"
  | "nightSkiing"
  | "adaptiveAccess"
  | "transitAccess";

export type ResortAmenityProfile = Record<ResortAmenityKey, boolean>;

export const amenityLabels: Record<ResortAmenityKey, string> = {
  beginnerFriendly: "Beginner friendly",
  lessons: "Lessons",
  rentals: "Rentals",
  nightSkiing: "Night skiing",
  adaptiveAccess: "Adaptive access",
  transitAccess: "Easy access",
};

export function getResortAmenityProfile(resort: Resort): ResortAmenityProfile {
  const highlights = resort.highlights.join(" ").toLowerCase();

  return {
    beginnerFriendly:
      resort.difficulty.beginner >= 25 ||
      highlights.includes("beginner") ||
      highlights.includes("family"),
    lessons:
      resort.difficulty.beginner >= 20 ||
      highlights.includes("beginner") ||
      highlights.includes("family"),
    rentals: resort.rentalEstimateUsd > 0,
    nightSkiing: highlights.includes("night skiing"),
    adaptiveAccess:
      highlights.includes("family") ||
      highlights.includes("village") ||
      highlights.includes("grooming"),
    transitAccess:
      highlights.includes("airport") ||
      highlights.includes("i-93") ||
      highlights.includes("denver") ||
      highlights.includes("boston") ||
      highlights.includes("drive"),
  };
}

export function resortMatchesAmenityFilters(
  resort: Resort,
  filters: Partial<Record<ResortAmenityKey, boolean>>,
) {
  const profile = getResortAmenityProfile(resort);

  return (Object.entries(filters) as Array<[ResortAmenityKey, boolean | undefined]>).every(
    ([key, enabled]) => !enabled || profile[key],
  );
}
