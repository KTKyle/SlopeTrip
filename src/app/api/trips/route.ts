import { NextResponse } from "next/server";
import { apiError, formatZodError, parseJsonBody } from "@/lib/api";
import { logApiEvent } from "@/lib/observability";
import { getTripsForCurrentUser, saveGeneratedTripForCurrentUser } from "@/lib/supabase/data";
import { saveTripRequestSchema } from "@/lib/validation";

export async function GET() {
  const trips = await getTripsForCurrentUser({ includeArchived: true });
  logApiEvent("trips.list", { count: trips.length });
  return NextResponse.json({ trips });
}

export async function POST(request: Request) {
  const body = await parseJsonBody(request);
  if (body.error) {
    return apiError(body.error, body.status ?? 400);
  }

  const parsed = saveTripRequestSchema.safeParse(body.data);
  if (!parsed.success) {
    return apiError("Invalid saved trip request", 400, formatZodError(parsed.error));
  }

  const { tripId, error } = await saveGeneratedTripForCurrentUser(
    parsed.data.request,
    parsed.data.result,
    { sourceTripId: parsed.data.sourceTripId },
  );

  if (error) {
    const status = error.includes("Login") ? 401 : 503;
    logApiEvent("trips.save.failed", { status, reason: error });
    return apiError(error, status);
  }

  logApiEvent("trips.save.succeeded", { tripId });
  return NextResponse.json({ tripId }, { status: 201 });
}
