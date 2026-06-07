import { NextResponse } from "next/server";
import { apiError, formatZodError, parseJsonBody } from "@/lib/api";
import { saveGeneratedTripForCurrentUser } from "@/lib/supabase/data";
import { saveTripRequestSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const body = await parseJsonBody(request);
  if (body.error) {
    return apiError(body.error, 400);
  }

  const parsed = saveTripRequestSchema.safeParse(body.data);
  if (!parsed.success) {
    return apiError("Invalid saved trip request", 400, formatZodError(parsed.error));
  }

  const { tripId, error } = await saveGeneratedTripForCurrentUser(
    parsed.data.request,
    parsed.data.result,
  );

  if (error) {
    const status = error.includes("Login") ? 401 : 503;
    return apiError(error, status);
  }

  return NextResponse.json({ tripId }, { status: 201 });
}
