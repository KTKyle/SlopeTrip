import { NextResponse } from "next/server";
import { answerTripQuestion } from "@/lib/gemini";
import { checkRateLimit } from "@/lib/rate-limit";
import { tripChatRequestSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "local";
  const limit = Number(process.env.TRIP_CHAT_RATE_LIMIT_PER_HOUR ?? 40);
  const rate = checkRateLimit(`trip-chat:${ip}`, limit);

  if (!rate.allowed) {
    return NextResponse.json({ error: "Too many chat requests" }, { status: 429 });
  }

  const parsed = tripChatRequestSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid chat request" }, { status: 400 });
  }

  const result = await answerTripQuestion(parsed.data);
  return NextResponse.json(result);
}
