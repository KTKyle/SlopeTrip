import { NextResponse } from "next/server";
import { recommendTrip } from "@/lib/gemini";
import { checkRateLimit } from "@/lib/rate-limit";
import { tripRecommendationRequestSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "local";
  const limit = Number(process.env.TRIP_AI_RATE_LIMIT_PER_HOUR ?? 20);
  const rate = checkRateLimit(`ai:${ip}`, limit);

  if (!rate.allowed) {
    return NextResponse.json({ error: "Too many recommendation requests" }, { status: 429 });
  }

  const parsed = tripRecommendationRequestSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid recommendation request" }, { status: 400 });
  }

  const result = await recommendTrip(parsed.data);
  return NextResponse.json(result);
}
