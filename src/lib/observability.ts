type ApiEventContext = Record<string, string | number | boolean | null | undefined>;

export function logApiEvent(event: string, context: ApiEventContext = {}) {
  console.info(
    JSON.stringify({
      event,
      at: new Date().toISOString(),
      ...context,
    }),
  );
}

export function addRateLimitHeaders(
  response: Response,
  rate: { remaining: number; resetAt?: number },
) {
  response.headers.set("X-RateLimit-Remaining", String(rate.remaining));
  if (rate.resetAt) {
    response.headers.set("X-RateLimit-Reset", new Date(rate.resetAt).toISOString());
  }

  return response;
}
