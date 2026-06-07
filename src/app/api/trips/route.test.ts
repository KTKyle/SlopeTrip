import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/trips/route";
import { saveGeneratedTripForCurrentUser } from "@/lib/supabase/data";

vi.mock("@/lib/supabase/data", () => ({
  saveGeneratedTripForCurrentUser: vi.fn(),
}));

const validPayload = {
  request: {
    days: 3,
    abilityLevel: "intermediate",
    rentsGear: false,
    maxDriveHours: 10,
    preferredRegion: "northeast",
    resortIds: ["stowe"],
    budget: {
      maxTotalUsd: 1200,
      includeRentals: false,
      includeLodging: false,
    },
  },
  result: {
    title: "3-day intermediate ski plan",
    totalEstimatedCostUsd: 537,
    confidence: "demo",
    summary: "Generated locally.",
    stops: [
      {
        resortId: "stowe",
        resortName: "Stowe Mountain Resort",
        day: 1,
        estimatedCostUsd: 179,
        score: 82,
        reasons: ["Strong terrain fit"],
      },
    ],
  },
};

describe("saved trip API", () => {
  beforeEach(() => {
    vi.mocked(saveGeneratedTripForCurrentUser).mockReset();
  });

  it("rejects malformed JSON", async () => {
    const response = await POST(
      new Request("http://slopetrip.test/api/trips", {
        method: "POST",
        body: "{",
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Malformed JSON request body",
    });
  });

  it("requires a valid generated trip payload", async () => {
    const response = await POST(
      new Request("http://slopetrip.test/api/trips", {
        method: "POST",
        body: JSON.stringify({ ...validPayload, result: { ...validPayload.result, stops: [] } }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("Invalid saved trip request");
    expect(body.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: "result.stops" }),
      ]),
    );
  });

  it("returns 401 when persistence reports that login is required", async () => {
    vi.mocked(saveGeneratedTripForCurrentUser).mockResolvedValue({
      tripId: null,
      error: "Login is required to save trips",
    });

    const response = await POST(
      new Request("http://slopetrip.test/api/trips", {
        method: "POST",
        body: JSON.stringify(validPayload),
      }),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "Login is required to save trips",
    });
  });

  it("returns the saved trip id", async () => {
    vi.mocked(saveGeneratedTripForCurrentUser).mockResolvedValue({
      tripId: "trip-123",
      error: null,
    });

    const response = await POST(
      new Request("http://slopetrip.test/api/trips", {
        method: "POST",
        body: JSON.stringify(validPayload),
      }),
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({ tripId: "trip-123" });
  });
});
