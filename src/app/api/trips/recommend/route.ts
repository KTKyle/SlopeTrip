import { NextResponse } from "next/server";
import { apiError, formatZodError, parseJsonBody } from "@/lib/api";
import { recommendTrip } from "@/lib/gemini";
import { addRateLimitHeaders, logApiEvent } from "@/lib/observability";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";
import { tripRecommendationRequestSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const rateLimitKey = getRateLimitKey(request, "ai");
  const limit = Number(process.env.TRIP_AI_RATE_LIMIT_PER_HOUR ?? 20);
  const rate = checkRateLimit(rateLimitKey, limit);

  if (!rate.allowed) {
    logApiEvent("trips.recommend.rate_limited", { rateLimitKey });
    return addRateLimitHeaders(apiError("Too many recommendation requests", 429), rate);
  }

  const body = await parseJsonBody(request);
  if (body.error) {
    return apiError(body.error, body.status ?? 400);
  }

  const parsed = tripRecommendationRequestSchema.safeParse(body.data);
  if (!parsed.success) {
    return apiError("Invalid recommendation request", 400, formatZodError(parsed.error));
  }

  try {
    const result = await recommendTrip(parsed.data);
    logApiEvent("trips.recommend.succeeded", {
      confidence: result.confidence,
      stopCount: result.stops.length,
    });
    return addRateLimitHeaders(NextResponse.json(result), rate);
  } catch {
    logApiEvent("trips.recommend.failed");
    return apiError("Unable to generate recommendation right now", 500);
  }
}
