import { randomBytes } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getResortById } from "@/lib/resorts";
import { getCurrentUser } from "@/lib/supabase/auth";
import type {
  AbilityLevel,
  PlannerTripSeed,
  ResortPassAffiliation,
  TripCostAssumptions,
  TripGroupPlan,
  TripRecommendationRequest,
  TripRecommendationResult,
  TripStatus,
  TripStopRecommendation,
  UserSkiProfile,
} from "@/lib/types";
import { createClient, createServiceClient } from "@/lib/supabase/server";

type ProfileRow = {
  seasons: number | null;
  ability_level: AbilityLevel | null;
  rents_gear: boolean | null;
  home_location_label: string | null;
  home_latitude: number | string | null;
  home_longitude: number | string | null;
  pass_affiliations?: string[] | null;
};

type TripRow = {
  id: string;
  title: string;
  days: number;
  budget_usd: number;
  ability_level: AbilityLevel;
  include_rentals: boolean;
  include_lodging: boolean;
  status?: TripStatus | null;
  version?: number | null;
  source_trip_id?: string | null;
  is_public?: boolean | null;
  share_token?: string | null;
  shared_at?: string | null;
  archived_at?: string | null;
  assumptions?: TripCostAssumptions;
  origin_label?: string | null;
  origin_latitude?: number | string | null;
  origin_longitude?: number | string | null;
  created_at: string;
  updated_at?: string | null;
};

type TripStopRow = {
  resort_id: string;
  stop_order: number;
  planned_day: number;
  estimated_cost_usd: number;
  drive_minutes: number | null;
  notes: string | null;
};

export type SavedTripSummary = TripRow & {
  stopCount?: number;
};

export type SavedTripDetail = TripRow & {
  stops: Array<TripStopRecommendation & { notes?: string }>;
};

const tripSelect = [
  "id",
  "title",
  "days",
  "budget_usd",
  "ability_level",
  "include_rentals",
  "include_lodging",
  "status",
  "version",
  "source_trip_id",
  "is_public",
  "share_token",
  "shared_at",
  "archived_at",
  "assumptions",
  "origin_label",
  "origin_latitude",
  "origin_longitude",
  "created_at",
  "updated_at",
].join(", ");

const shareTokenPattern = /^[A-Za-z0-9_-]{16,64}$/;

export async function getProfileForCurrentUser() {
  const supabase = await createClient();
  if (!supabase) return null;

  const user = await getCurrentUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select(
      "seasons, ability_level, rents_gear, home_location_label, home_latitude, home_longitude, pass_affiliations",
    )
    .eq("id", user.id)
    .maybeSingle<ProfileRow>();

  if (error || !data) return null;

  return mapProfile(data);
}

export async function getTripsForCurrentUser(options: { includeArchived?: boolean } = {}) {
  const supabase = await createClient();
  if (!supabase) return [];

  const user = await getCurrentUser();
  if (!user) return [];

  let query = supabase.from("trips").select(tripSelect).eq("user_id", user.id);

  if (!options.includeArchived) {
    query = query.neq("status", "archived");
  }

  const { data, error } = await query
    .order("created_at", { ascending: false })
    .returns<TripRow[]>();
  if (error) return [];

  return (data ?? []).map(normalizeTripRow) satisfies SavedTripSummary[];
}

export async function getTripForCurrentUser(id: string) {
  const supabase = await createClient();
  if (!supabase) return null;

  const user = await getCurrentUser();
  if (!user) return null;

  const { data: trip, error: tripError } = await supabase
    .from("trips")
    .select(tripSelect)
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle<TripRow>();

  if (tripError || !trip) return null;

  return getTripDetailFromRow(supabase, normalizeTripRow(trip));
}

export async function getPublicTripByShareToken(token: string) {
  if (!shareTokenPattern.test(token)) return null;

  const supabase = createServiceClient();
  if (!supabase) return null;

  const { data: trip, error: tripError } = await supabase
    .from("trips")
    .select(tripSelect)
    .eq("share_token", token)
    .eq("is_public", true)
    .maybeSingle<TripRow>();

  if (tripError || !trip) return null;

  return getTripDetailFromRow(supabase, normalizeTripRow(trip));
}

export async function saveGeneratedTripForCurrentUser(
  request: TripRecommendationRequest,
  result: TripRecommendationResult,
  options: { sourceTripId?: string } = {},
) {
  const supabase = await createClient();
  if (!supabase) {
    return { tripId: null, error: "Supabase is not configured" };
  }

  const user = await getCurrentUser();
  if (!user) {
    return { tripId: null, error: "Login is required to save trips" };
  }

  const invalidStop = result.stops.find(
    (stop) => !getResortById(stop.resortId) || stop.day > request.days,
  );
  if (invalidStop) {
    return { tripId: null, error: "Trip stops must reference known resorts and valid days" };
  }

  let sourceVersion = 0;
  if (options.sourceTripId) {
    const { data: source, error: sourceError } = await supabase
      .from("trips")
      .select("id, version")
      .eq("id", options.sourceTripId)
      .eq("user_id", user.id)
      .maybeSingle<{ id: string; version: number | null }>();

    if (sourceError || !source) {
      return { tripId: null, error: "Source trip could not be found" };
    }

    sourceVersion = source.version ?? 1;
  }

  const { data: trip, error: tripError } = await supabase
    .from("trips")
    .insert({
      user_id: user.id,
      title: result.title,
      days: request.days,
      budget_usd: request.budget.maxTotalUsd,
      ability_level: request.abilityLevel,
      include_rentals: request.budget.includeRentals,
      include_lodging: request.budget.includeLodging,
      assumptions: request.budget.assumptions ?? {},
      origin_label: request.homeLocationLabel ?? null,
      origin_latitude: request.homeLatitude ?? null,
      origin_longitude: request.homeLongitude ?? null,
      source_trip_id: options.sourceTripId ?? null,
      version: options.sourceTripId ? sourceVersion + 1 : 1,
    })
    .select("id")
    .single<{ id: string }>();

  if (tripError || !trip) {
    return { tripId: null, error: tripError?.message ?? "Trip could not be saved" };
  }

  const { error: stopsError } = await supabase.from("trip_stops").insert(
    result.stops.map((stop, index) => ({
      trip_id: trip.id,
      resort_id: stop.resortId,
      stop_order: index + 1,
      planned_day: stop.day,
      estimated_cost_usd: stop.estimatedCostUsd,
      notes: [
        ...stop.reasons,
        ...(stop.factors?.map((factor) => `${factor.label}: ${factor.value}`) ?? []),
      ].join(" | "),
    })),
  );

  if (stopsError) {
    return { tripId: null, error: stopsError.message };
  }

  await supabase.from("ai_trip_recommendations").insert({
    user_id: user.id,
    trip_id: trip.id,
    request_summary: request,
    result_summary: result,
    model: result.modelMetadata?.engine ?? (result.confidence === "model" ? "gemini-2.5-flash" : "demo-scoring"),
    prompt_version: result.modelMetadata?.promptVersion,
    fallback_reason: result.modelMetadata?.fallbackReason,
  });

  return { tripId: trip.id, error: null };
}

export async function updateTripForCurrentUser(
  id: string,
  input: { title?: string; status?: TripStatus },
) {
  const supabase = await createClient();
  if (!supabase) return { error: "Supabase is not configured" };

  const user = await getCurrentUser();
  if (!user) return { error: "Login is required to update trips" };

  const updates: Record<string, string | null> = {
    updated_at: new Date().toISOString(),
  };

  if (input.title !== undefined) updates.title = input.title;
  if (input.status !== undefined) {
    updates.status = input.status;
    updates.archived_at = input.status === "archived" ? new Date().toISOString() : null;
  }

  const { data, error } = await supabase
    .from("trips")
    .update(updates)
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle<{ id: string }>();
  if (!error && !data) return { error: "Trip could not be found" };
  return { error: error?.message ?? null };
}

export async function deleteTripForCurrentUser(id: string) {
  const supabase = await createClient();
  if (!supabase) return { error: "Supabase is not configured" };

  const user = await getCurrentUser();
  if (!user) return { error: "Login is required to delete trips" };

  const { data, error } = await supabase
    .from("trips")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle<{ id: string }>();
  if (!error && !data) return { error: "Trip could not be found" };
  return { error: error?.message ?? null };
}

export async function duplicateTripForCurrentUser(id: string, title?: string) {
  const supabase = await createClient();
  if (!supabase) return { tripId: null, error: "Supabase is not configured" };

  const user = await getCurrentUser();
  if (!user) return { tripId: null, error: "Login is required to duplicate trips" };

  const { data: source, error: sourceError } = await supabase
    .from("trips")
    .select(tripSelect)
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle<TripRow>();

  if (sourceError || !source) {
    return { tripId: null, error: "Trip could not be found" };
  }

  const { data: sourceStops, error: stopsError } = await supabase
    .from("trip_stops")
    .select("resort_id, stop_order, planned_day, estimated_cost_usd, drive_minutes, notes")
    .eq("trip_id", source.id)
    .order("stop_order", { ascending: true })
    .returns<TripStopRow[]>();

  if (stopsError) return { tripId: null, error: stopsError.message };

  const normalizedSource = normalizeTripRow(source);
  const { data: trip, error: tripError } = await supabase
    .from("trips")
    .insert({
      user_id: user.id,
      title: title ?? `${source.title} copy`,
      days: source.days,
      budget_usd: source.budget_usd,
      ability_level: source.ability_level,
      include_rentals: source.include_rentals,
      include_lodging: source.include_lodging,
      status: "active",
      version: (normalizedSource.version ?? 1) + 1,
      source_trip_id: source.id,
      assumptions: normalizedSource.assumptions ?? {},
      origin_label: normalizedSource.origin_label ?? null,
      origin_latitude: normalizedSource.origin_latitude ?? null,
      origin_longitude: normalizedSource.origin_longitude ?? null,
    })
    .select("id")
    .single<{ id: string }>();

  if (tripError || !trip) {
    return { tripId: null, error: tripError?.message ?? "Trip could not be duplicated" };
  }

  const stops = sourceStops ?? [];
  if (stops.length > 0) {
    const { error } = await supabase.from("trip_stops").insert(
      stops.map((stop) => ({
        trip_id: trip.id,
        resort_id: stop.resort_id,
        stop_order: stop.stop_order,
        planned_day: stop.planned_day,
        estimated_cost_usd: stop.estimated_cost_usd,
        drive_minutes: stop.drive_minutes,
        notes: stop.notes,
      })),
    );

    if (error) return { tripId: null, error: error.message };
  }

  return { tripId: trip.id, error: null };
}

export async function setTripSharingForCurrentUser(id: string, isPublic: boolean) {
  const supabase = await createClient();
  if (!supabase) return { shareToken: null, error: "Supabase is not configured" };

  const user = await getCurrentUser();
  if (!user) return { shareToken: null, error: "Login is required to update trip sharing" };

  const { data: current, error: currentError } = await supabase
    .from("trips")
    .select("id, share_token")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle<{ id: string; share_token: string | null }>();

  if (currentError || !current) {
    return { shareToken: null, error: "Trip could not be found" };
  }

  const shareToken = isPublic ? current.share_token ?? generateShareToken() : null;
  const { error } = await supabase
    .from("trips")
    .update({
      is_public: isPublic,
      share_token: shareToken,
      shared_at: isPublic ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id);

  return { shareToken, error: error?.message ?? null };
}

export function toPlannerTripSeed(trip: SavedTripDetail): PlannerTripSeed {
  return {
    id: trip.id,
    title: trip.title,
    days: trip.days,
    budgetUsd: trip.budget_usd,
    abilityLevel: trip.ability_level,
    includeRentals: trip.include_rentals,
    includeLodging: trip.include_lodging,
    originLabel: trip.origin_label ?? undefined,
    originLatitude: toOptionalNumber(trip.origin_latitude),
    originLongitude: toOptionalNumber(trip.origin_longitude),
    assumptions: normalizeAssumptions(trip.assumptions),
    stops: trip.stops.map((stop) => ({
      resortId: stop.resortId,
      day: stop.day,
    })),
  };
}

async function getTripDetailFromRow(
  supabase: SupabaseClient,
  trip: TripRow,
) {
  if (!supabase) return null;

  const { data: stops, error: stopsError } = await supabase
    .from("trip_stops")
    .select("resort_id, stop_order, planned_day, estimated_cost_usd, drive_minutes, notes")
    .eq("trip_id", trip.id)
    .order("stop_order", { ascending: true })
    .returns<TripStopRow[]>();

  if (stopsError) return null;

  return {
    ...trip,
    stops: (stops ?? []).map((stop) => {
      const resort = getResortById(stop.resort_id);
      return {
        resortId: stop.resort_id,
        resortName: resort?.name ?? stop.resort_id,
        day: stop.planned_day,
        estimatedCostUsd: stop.estimated_cost_usd,
        score: 0,
        reasons: stop.notes ? [stop.notes] : [],
        notes: stop.notes ?? undefined,
      };
    }),
  } satisfies SavedTripDetail;
}

function mapProfile(row: ProfileRow): UserSkiProfile {
  return {
    seasons: row.seasons ?? 2,
    abilityLevel: row.ability_level ?? "intermediate",
    rentsGear: row.rents_gear ?? false,
    homeLocationLabel: row.home_location_label ?? "",
    homeLatitude: toOptionalNumber(row.home_latitude),
    homeLongitude: toOptionalNumber(row.home_longitude),
    passAffiliations: (row.pass_affiliations ?? []).filter(
      (pass): pass is ResortPassAffiliation =>
        pass === "epic" ||
        pass === "ikon" ||
        pass === "new-england" ||
        pass === "indy" ||
        pass === "independent",
    ),
  };
}

function normalizeTripRow(row: TripRow): TripRow {
  return {
    ...row,
    status: row.status ?? "active",
    version: row.version ?? 1,
    is_public: row.is_public ?? false,
    assumptions: normalizeAssumptions(row.assumptions),
  };
}

function normalizeAssumptions(value: unknown): TripCostAssumptions {
  if (!value || typeof value !== "object") return {};
  const source = value as Record<string, unknown>;

  return {
    lodgingNightlyUsd: toOptionalNumber(source.lodgingNightlyUsd),
    foodDailyUsd: toOptionalNumber(source.foodDailyUsd),
    parkingDailyUsd: toOptionalNumber(source.parkingDailyUsd),
    fuelEstimateUsd: toOptionalNumber(source.fuelEstimateUsd),
    rentalCarDailyUsd: toOptionalNumber(source.rentalCarDailyUsd),
    groupPlan: normalizeGroupPlan(source.groupPlan),
  };
}

function normalizeGroupPlan(value: unknown): TripGroupPlan | undefined {
  if (!value || typeof value !== "object") return undefined;
  const source = value as Record<string, unknown>;
  const lodgingPreference = String(source.lodgingPreference ?? "flexible");
  const transportMode = String(source.transportMode ?? "drive");
  const bookingPriority = String(source.bookingPriority ?? "family-ease");

  return {
    adults: toBoundedInteger(source.adults, 1, 0, 40),
    kids: toBoundedInteger(source.kids, 0, 0, 40),
    nonSkiers: toBoundedInteger(source.nonSkiers, 0, 0, 40),
    passHolders: toBoundedInteger(source.passHolders, 0, 0, 40),
    lodgingPreference:
      lodgingPreference === "value" ||
      lodgingPreference === "walkable" ||
      lodgingPreference === "family" ||
      lodgingPreference === "flexible"
        ? lodgingPreference
        : "flexible",
    transportMode:
      transportMode === "drive" ||
      transportMode === "fly" ||
      transportMode === "train-shuttle" ||
      transportMode === "mixed"
        ? transportMode
        : "drive",
    bookingPriority:
      bookingPriority === "lowest-cost" ||
      bookingPriority === "family-ease" ||
      bookingPriority === "best-snow" ||
      bookingPriority === "shortest-travel"
        ? bookingPriority
        : "family-ease",
  };
}

function toOptionalNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return undefined;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : undefined;
}

function toBoundedInteger(value: unknown, fallback: number, min: number, max: number) {
  const numeric = toOptionalNumber(value);
  if (numeric === undefined) return fallback;
  return Math.min(max, Math.max(min, Math.round(numeric)));
}

function generateShareToken() {
  return randomBytes(18)
    .toString("base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}
