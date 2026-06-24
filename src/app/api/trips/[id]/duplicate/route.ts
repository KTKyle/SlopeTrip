import { NextResponse } from "next/server";
import { apiError, formatZodError, parseJsonBody } from "@/lib/api";
import { logApiEvent } from "@/lib/observability";
import { duplicateTripForCurrentUser } from "@/lib/supabase/data";
import { tripDuplicateRequestSchema } from "@/lib/validation";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await parseJsonBody(request);
  if (body.error) return apiError(body.error, body.status ?? 400);

  const parsed = tripDuplicateRequestSchema.safeParse(body.data ?? {});
  if (!parsed.success) {
    return apiError("Invalid duplicate trip request", 400, formatZodError(parsed.error));
  }

  const { tripId, error } = await duplicateTripForCurrentUser(id, parsed.data.title);
  if (error || !tripId) {
    logApiEvent("trips.duplicate.failed", { tripId: id, reason: error });
    return apiError(error ?? "Trip could not be duplicated", 503);
  }

  logApiEvent("trips.duplicate.succeeded", { tripId, sourceTripId: id });
  return NextResponse.json({ tripId }, { status: 201 });
}
