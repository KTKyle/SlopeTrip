import { NextResponse } from "next/server";
import { apiError, formatZodError, parseJsonBody } from "@/lib/api";
import { answerTripQuestion } from "@/lib/gemini";
import { checkRateLimit } from "@/lib/rate-limit";
import { tripChatRequestSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "local";
  const limit = Number(process.env.TRIP_CHAT_RATE_LIMIT_PER_HOUR ?? 40);
  const rate = checkRateLimit(`trip-chat:${ip}`, limit);

  if (!rate.allowed) {
    return apiError("Too many chat requests", 429);
  }

  const body = await parseJsonBody(request);
  if (body.error) {
    return apiError(body.error, 400);
  }

  const parsed = tripChatRequestSchema.safeParse(body.data);
  if (!parsed.success) {
    return apiError("Invalid chat request", 400, formatZodError(parsed.error));
  }

  try {
    const result = await answerTripQuestion(parsed.data);
    return NextResponse.json(result);
  } catch {
    return apiError("Unable to answer trip question right now", 500);
  }
}
