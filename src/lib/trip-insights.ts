import type { TripCostAssumptions, TripGroupPlan } from "@/lib/types";

export const defaultGroupPlan: TripGroupPlan = {
  adults: 2,
  kids: 0,
  nonSkiers: 0,
  passHolders: 0,
  lodgingPreference: "flexible",
  transportMode: "drive",
  bookingPriority: "family-ease",
};

export const lodgingPreferenceLabels: Record<TripGroupPlan["lodgingPreference"], string> = {
  value: "Value lodging",
  walkable: "Walkable village",
  family: "Family-friendly stay",
  flexible: "Flexible lodging",
};

export const transportModeLabels: Record<TripGroupPlan["transportMode"], string> = {
  drive: "Driving",
  fly: "Flying",
  "train-shuttle": "Train or shuttle",
  mixed: "Mixed transport",
};

export const bookingPriorityLabels: Record<TripGroupPlan["bookingPriority"], string> = {
  "lowest-cost": "Lowest cost",
  "family-ease": "Family ease",
  "best-snow": "Best snow upside",
  "shortest-travel": "Shortest travel",
};

export function getGroupPlan(assumptions?: TripCostAssumptions | null): TripGroupPlan {
  return {
    ...defaultGroupPlan,
    ...(assumptions?.groupPlan ?? {}),
  };
}

export function getGroupSize(groupPlan: TripGroupPlan) {
  return Math.max(1, groupPlan.adults + groupPlan.kids + groupPlan.nonSkiers);
}

export function getSkierCount(groupPlan: TripGroupPlan) {
  return Math.max(1, groupPlan.adults + groupPlan.kids - groupPlan.nonSkiers);
}

export function getPerPersonCost(totalCost: number, groupPlan: TripGroupPlan) {
  return Math.ceil(totalCost / getGroupSize(groupPlan));
}

export function getReadinessItems(groupPlan: TripGroupPlan, includeLodging: boolean) {
  return [
    {
      label: "Share itinerary",
      detail: "Send the public trip link to collect reactions.",
      done: false,
    },
    {
      label: "Confirm lodging",
      detail: includeLodging
        ? `${lodgingPreferenceLabels[groupPlan.lodgingPreference]} is included in estimates.`
        : "Lodging is not included in the current budget.",
      done: includeLodging,
    },
    {
      label: "Reserve rentals",
      detail: "Lock gear before peak weekends and school breaks.",
      done: false,
    },
    {
      label: "Buy lift tickets",
      detail:
        groupPlan.passHolders > 0
          ? `${groupPlan.passHolders} pass holder${groupPlan.passHolders === 1 ? "" : "s"} noted.`
          : "No pass holders noted yet.",
      done: groupPlan.passHolders > 0,
    },
    {
      label: "Confirm transport",
      detail: `${transportModeLabels[groupPlan.transportMode]} plan selected.`,
      done: groupPlan.transportMode === "drive",
    },
  ];
}

export function getReadinessScore(groupPlan: TripGroupPlan, includeLodging: boolean) {
  const items = getReadinessItems(groupPlan, includeLodging);
  const completed = items.filter((item) => item.done).length;
  return Math.round((completed / items.length) * 100);
}

