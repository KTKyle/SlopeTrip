import { NextResponse } from "next/server";
import { apiError, formatZodError, parseJsonBody } from "@/lib/api";
import { recommendTrip } from "@/lib/gemini";
import { checkRateLimit } from "@/lib/rate-limit";
import { tripRecommendationRequestSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "local";
  const limit = Number(process.env.TRIP_AI_RATE_LIMIT_PER_HOUR ?? 20);
  const rate = checkRateLimit(`ai:${ip}`, limit);

  if (!rate.allowed) {
    return apiError("Too many recommendation requests", 429);
  }

  const body = await parseJsonBody(request);
  if (body.error) {
    return apiError(body.error, 400);
  }

  const parsed = tripRecommendationRequestSchema.safeParse(body.data);
  if (!parsed.success) {
    return apiError("Invalid recommendation request", 400, formatZodError(parsed.error));
  }

  try {
    const result = await recommendTrip(parsed.data);
    return NextResponse.json(result);
  } catch {
    return apiError("Unable to generate recommendation right now", 500);
  }
}
