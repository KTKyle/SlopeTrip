import { beforeEach, describe, expect, it } from "vitest";
import { POST } from "@/app/api/trips/recommend/route";
import { clearRateLimitBuckets } from "@/lib/rate-limit";

const validPayload = {
  days: 3,
  abilityLevel: "intermediate",
  rentsGear: false,
  maxDriveHours: 10,
  preferredRegion: "northeast",
  resortIds: ["stowe", "killington"],
  budget: {
    maxTotalUsd: 1200,
    includeRentals: false,
    includeLodging: false,
  },
};

describe("trip recommendation API", () => {
  beforeEach(() => {
    clearRateLimitBuckets();
    delete process.env.GEMINI_API_KEY;
    delete process.env.TRIP_AI_RATE_LIMIT_PER_HOUR;
    delete process.env.TRUST_PROXY_RATE_LIMIT_HEADERS;
  });

  it("returns a consistent error for malformed JSON", async () => {
    const response = await POST(
      new Request("http://slopetrip.test/api/trips/recommend", {
        method: "POST",
        body: "{",
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Malformed JSON request body",
    });
  });

  it("returns validation details for invalid requests", async () => {
    const response = await POST(
      new Request("http://slopetrip.test/api/trips/recommend", {
        method: "POST",
        body: JSON.stringify({ ...validPayload, days: 99 }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("Invalid recommendation request");
    expect(body.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: "days" }),
      ]),
    );
  });

  it("rate limits valid recommendation requests", async () => {
    process.env.TRIP_AI_RATE_LIMIT_PER_HOUR = "1";

    const first = await POST(
      new Request("http://slopetrip.test/api/trips/recommend", {
        method: "POST",
        body: JSON.stringify(validPayload),
      }),
    );
    const second = await POST(
      new Request("http://slopetrip.test/api/trips/recommend", {
        method: "POST",
        body: JSON.stringify(validPayload),
      }),
    );

    expect(first.status).toBe(200);
    expect(second.status).toBe(429);
    await expect(second.json()).resolves.toEqual({
      error: "Too many recommendation requests",
    });
  });

  it("does not trust spoofed forwarded IP headers by default", async () => {
    process.env.TRIP_AI_RATE_LIMIT_PER_HOUR = "1";

    const first = await POST(
      new Request("http://slopetrip.test/api/trips/recommend", {
        method: "POST",
        headers: { "x-forwarded-for": "203.0.113.10" },
        body: JSON.stringify(validPayload),
      }),
    );
    const second = await POST(
      new Request("http://slopetrip.test/api/trips/recommend", {
        method: "POST",
        headers: { "x-forwarded-for": "203.0.113.11" },
        body: JSON.stringify(validPayload),
      }),
    );

    expect(first.status).toBe(200);
    expect(second.status).toBe(429);
  });

  it("rejects oversized JSON bodies before parsing", async () => {
    const response = await POST(
      new Request("http://slopetrip.test/api/trips/recommend", {
        method: "POST",
        headers: { "content-length": "70000" },
        body: JSON.stringify(validPayload),
      }),
    );

    expect(response.status).toBe(413);
    await expect(response.json()).resolves.toEqual({
      error: "Request body is too large",
    });
  });

  it("rejects oversized JSON bodies without trusting content-length", async () => {
    const response = await POST(
      new Request("http://slopetrip.test/api/trips/recommend", {
        method: "POST",
        body: JSON.stringify({
          ...validPayload,
          homeLocationLabel: "A".repeat(70_000),
        }),
      }),
    );

    expect(response.status).toBe(413);
    await expect(response.json()).resolves.toEqual({
      error: "Request body is too large",
    });
  });
});
