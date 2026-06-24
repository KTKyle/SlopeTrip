import { NextResponse } from "next/server";
import { apiError, formatZodError, parseJsonBody } from "@/lib/api";
import { answerTripQuestion } from "@/lib/gemini";
import { addRateLimitHeaders, logApiEvent } from "@/lib/observability";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";
import { tripChatRequestSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const rateLimitKey = getRateLimitKey(request, "trip-chat");
  const limit = Number(process.env.TRIP_CHAT_RATE_LIMIT_PER_HOUR ?? 40);
  const rate = checkRateLimit(rateLimitKey, limit);

  if (!rate.allowed) {
    logApiEvent("trips.chat.rate_limited", { rateLimitKey });
    return addRateLimitHeaders(apiError("Too many chat requests", 429), rate);
  }

  const body = await parseJsonBody(request);
  if (body.error) {
    return apiError(body.error, body.status ?? 400);
  }

  const parsed = tripChatRequestSchema.safeParse(body.data);
  if (!parsed.success) {
    return apiError("Invalid chat request", 400, formatZodError(parsed.error));
  }

  try {
    const result = await answerTripQuestion(parsed.data);
    logApiEvent("trips.chat.succeeded", { confidence: result.confidence });
    return addRateLimitHeaders(NextResponse.json(result), rate);
  } catch {
    logApiEvent("trips.chat.failed");
    return apiError("Unable to answer trip question right now", 500);
  }
}
