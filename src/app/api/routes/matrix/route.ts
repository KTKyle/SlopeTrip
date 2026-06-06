import { NextResponse } from "next/server";
import { computeRouteMatrix } from "@/lib/route-estimates";
import { checkRateLimit } from "@/lib/rate-limit";
import { routeMatrixRequestSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "local";
  const limit = Number(process.env.ROUTE_MATRIX_RATE_LIMIT_PER_HOUR ?? 60);
  const rate = checkRateLimit(`routes:${ip}`, limit);

  if (!rate.allowed) {
    return NextResponse.json({ error: "Too many route requests" }, { status: 429 });
  }

  const parsed = routeMatrixRequestSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid route matrix request" }, { status: 400 });
  }

  const routes = await computeRouteMatrix(parsed.data);
  return NextResponse.json({ routes });
}
