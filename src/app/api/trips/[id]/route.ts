import { NextResponse } from "next/server";
import { apiError, formatZodError, parseJsonBody } from "@/lib/api";
import { logApiEvent } from "@/lib/observability";
import { deleteTripForCurrentUser, updateTripForCurrentUser } from "@/lib/supabase/data";
import { tripUpdateRequestSchema } from "@/lib/validation";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await parseJsonBody(request);
  if (body.error) return apiError(body.error, body.status ?? 400);

  const parsed = tripUpdateRequestSchema.safeParse(body.data);
  if (!parsed.success) {
    return apiError("Invalid trip update request", 400, formatZodError(parsed.error));
  }

  const { error } = await updateTripForCurrentUser(id, parsed.data);
  if (error) {
    logApiEvent("trips.update.failed", { tripId: id, reason: error });
    return apiError(error, error.includes("Login") ? 401 : 503);
  }

  logApiEvent("trips.update.succeeded", { tripId: id });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { error } = await deleteTripForCurrentUser(id);
  if (error) {
    logApiEvent("trips.delete.failed", { tripId: id, reason: error });
    return apiError(error, error.includes("Login") ? 401 : 503);
  }

  logApiEvent("trips.delete.succeeded", { tripId: id });
  return NextResponse.json({ ok: true });
}
