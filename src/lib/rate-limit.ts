type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

export function getRateLimitKey(request: Request, namespace: string) {
  if (process.env.TRUST_PROXY_RATE_LIMIT_HEADERS !== "true") {
    return `${namespace}:global`;
  }

  const realIp = request.headers.get("x-real-ip")?.trim();
  const forwardedIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const clientIp = realIp || forwardedIp;

  return `${namespace}:${clientIp || "unknown"}`;
}

export function checkRateLimit(key: string, limit: number, windowMs = 60 * 60 * 1000) {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1 };
  }

  if (bucket.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: bucket.resetAt };
  }

  bucket.count += 1;
  return { allowed: true, remaining: limit - bucket.count, resetAt: bucket.resetAt };
}

export function clearRateLimitBuckets() {
  buckets.clear();
}
