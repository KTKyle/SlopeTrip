import { NextResponse } from "next/server";
import { apiError, formatZodError, parseJsonBody } from "@/lib/api";
import { computeRouteMatrix } from "@/lib/route-estimates";
import { checkRateLimit } from "@/lib/rate-limit";
import { routeMatrixRequestSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "local";
  const limit = Number(process.env.ROUTE_MATRIX_RATE_LIMIT_PER_HOUR ?? 60);
  const rate = checkRateLimit(`routes:${ip}`, limit);

  if (!rate.allowed) {
    return apiError("Too many route requests", 429);
  }

  const body = await parseJsonBody(request);
  if (body.error) {
    return apiError(body.error, 400);
  }

  const parsed = routeMatrixRequestSchema.safeParse(body.data);
  if (!parsed.success) {
    return apiError("Invalid route matrix request", 400, formatZodError(parsed.error));
  }

  try {
    const routes = await computeRouteMatrix(parsed.data);
    return NextResponse.json({ routes });
  } catch {
    return apiError("Unable to estimate routes right now", 500);
  }
}
