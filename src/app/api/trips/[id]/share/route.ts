import { NextResponse } from "next/server";
import { apiError, formatZodError, parseJsonBody } from "@/lib/api";
import { logApiEvent } from "@/lib/observability";
import { setTripSharingForCurrentUser } from "@/lib/supabase/data";
import { tripShareRequestSchema } from "@/lib/validation";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await parseJsonBody(request);
  if (body.error) return apiError(body.error, body.status ?? 400);

  const parsed = tripShareRequestSchema.safeParse(body.data);
  if (!parsed.success) {
    return apiError("Invalid trip share request", 400, formatZodError(parsed.error));
  }

  const { shareToken, error } = await setTripSharingForCurrentUser(id, parsed.data.isPublic);
  if (error) {
    logApiEvent("trips.share.failed", { tripId: id, reason: error });
    return apiError(error, error.includes("Login") ? 401 : 503);
  }

  logApiEvent("trips.share.succeeded", { tripId: id, isPublic: parsed.data.isPublic });
  return NextResponse.json({ shareToken, isPublic: parsed.data.isPublic });
}
