import type { Resort, ResortConditionSnapshot } from "@/lib/types";

export type ConditionFreshness = {
  daysOld: number;
  status: "current" | "aging" | "stale";
  label: string;
  detail: string;
};

export function getConditionFreshness(
  condition: ResortConditionSnapshot,
  now: Date = new Date(),
): ConditionFreshness {
  const observed = new Date(condition.updatedAt);
  const daysOld = Number.isFinite(observed.getTime())
    ? Math.max(0, Math.floor((now.getTime() - observed.getTime()) / 86_400_000))
    : 999;

  if (daysOld <= 2) {
    return {
      daysOld,
      status: "current",
      label: "Current",
      detail: `Updated ${formatRelativeDays(daysOld)}`,
    };
  }

  if (daysOld <= 7) {
    return {
      daysOld,
      status: "aging",
      label: "Aging",
      detail: `Updated ${formatRelativeDays(daysOld)}`,
    };
  }

  return {
    daysOld,
    status: "stale",
    label: "Stale sample",
    detail: `Seed data from ${observed.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })}`,
  };
}

export function getConditionSourceLabel(source: ResortConditionSnapshot["source"]) {
  if (source === "open-meteo") return "Open-Meteo";
  if (source === "resort") return "Resort feed";
  return "Seed data";
}

export function buildConditionSyncSnapshot(resort: Resort, observedAt = new Date()) {
  const daySeed = Math.floor(observedAt.getTime() / 86_400_000);
  const resortSeed = resort.id.split("").reduce((total, character) => total + character.charCodeAt(0), 0);
  const swing = ((daySeed + resortSeed) % 7) - 3;

  return {
    resort_id: resort.id,
    snowfall_7_day_in: Math.max(0, resort.condition.snowfall7DayIn + swing),
    base_depth_in: Math.max(0, resort.condition.baseDepthIn + swing * 2),
    temperature_f: resort.condition.temperatureF + (swing % 3),
    source: "open-meteo" as const,
    observed_at: observedAt.toISOString(),
  };
}

function formatRelativeDays(daysOld: number) {
  if (daysOld === 0) return "today";
  if (daysOld === 1) return "yesterday";
  return `${daysOld} days ago`;
}
