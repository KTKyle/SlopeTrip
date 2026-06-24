import { NextResponse } from "next/server";
import { apiError, formatZodError, parseJsonBody } from "@/lib/api";
import { computeRouteMatrix } from "@/lib/route-estimates";
import { addRateLimitHeaders, logApiEvent } from "@/lib/observability";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";
import { routeMatrixRequestSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const rateLimitKey = getRateLimitKey(request, "routes");
  const limit = Number(process.env.ROUTE_MATRIX_RATE_LIMIT_PER_HOUR ?? 60);
  const rate = checkRateLimit(rateLimitKey, limit);

  if (!rate.allowed) {
    logApiEvent("routes.matrix.rate_limited", { rateLimitKey });
    return addRateLimitHeaders(apiError("Too many route requests", 429), rate);
  }

  const body = await parseJsonBody(request);
  if (body.error) {
    return apiError(body.error, body.status ?? 400);
  }

  const parsed = routeMatrixRequestSchema.safeParse(body.data);
  if (!parsed.success) {
    return apiError("Invalid route matrix request", 400, formatZodError(parsed.error));
  }

  try {
    const routes = await computeRouteMatrix(parsed.data);
    logApiEvent("routes.matrix.succeeded", { count: routes.length });
    return addRateLimitHeaders(NextResponse.json({ routes }), rate);
  } catch {
    logApiEvent("routes.matrix.failed");
    return apiError("Unable to estimate routes right now", 500);
  }
}
