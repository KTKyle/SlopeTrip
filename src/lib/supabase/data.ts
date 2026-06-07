import { getResortById } from "@/lib/resorts";
import type {
  AbilityLevel,
  TripRecommendationRequest,
  TripRecommendationResult,
  TripStopRecommendation,
  UserSkiProfile,
} from "@/lib/types";
import { createClient } from "@/lib/supabase/server";

type ProfileRow = {
  seasons: number | null;
  ability_level: AbilityLevel | null;
  rents_gear: boolean | null;
  home_location_label: string | null;
  home_latitude: number | string | null;
  home_longitude: number | string | null;
};

type TripRow = {
  id: string;
  title: string;
  days: number;
  budget_usd: number;
  ability_level: AbilityLevel;
  include_rentals: boolean;
  include_lodging: boolean;
  created_at: string;
};

type TripStopRow = {
  resort_id: string;
  stop_order: number;
  planned_day: number;
  estimated_cost_usd: number;
  drive_minutes: number | null;
  notes: string | null;
};

export type SavedTripDetail = TripRow & {
  stops: Array<TripStopRecommendation & { notes?: string }>;
};

export async function getProfileForCurrentUser() {
  const supabase = await createClient();
  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("seasons, ability_level, rents_gear, home_location_label, home_latitude, home_longitude")
    .eq("id", user.id)
    .maybeSingle<ProfileRow>();

  if (error || !data) return null;

  return mapProfile(data);
}

export async function getTripForCurrentUser(id: string) {
  const supabase = await createClient();
  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: trip, error: tripError } = await supabase
    .from("trips")
    .select("id, title, days, budget_usd, ability_level, include_rentals, include_lodging, created_at")
    .eq("id", id)
    .maybeSingle<TripRow>();

  if (tripError || !trip) return null;

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

export async function saveGeneratedTripForCurrentUser(
  request: TripRecommendationRequest,
  result: TripRecommendationResult,
) {
  const supabase = await createClient();
  if (!supabase) {
    return { tripId: null, error: "Supabase is not configured" };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { tripId: null, error: "Login is required to save trips" };
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
      notes: stop.reasons.join(" | "),
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
    model: result.confidence === "model" ? "gemini-2.5-flash" : "demo-scoring",
  });

  return { tripId: trip.id, error: null };
}

function mapProfile(row: ProfileRow): UserSkiProfile {
  return {
    seasons: row.seasons ?? 2,
    abilityLevel: row.ability_level ?? "intermediate",
    rentsGear: row.rents_gear ?? false,
    homeLocationLabel: row.home_location_label ?? "",
    homeLatitude: toOptionalNumber(row.home_latitude),
    homeLongitude: toOptionalNumber(row.home_longitude),
  };
}

function toOptionalNumber(value: number | string | null) {
  if (value === null) return undefined;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : undefined;
}
