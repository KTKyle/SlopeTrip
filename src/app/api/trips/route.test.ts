import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "@/app/api/trips/route";
import { getTripsForCurrentUser, saveGeneratedTripForCurrentUser } from "@/lib/supabase/data";

vi.mock("@/lib/supabase/data", () => ({
  getTripsForCurrentUser: vi.fn(),
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
    vi.mocked(getTripsForCurrentUser).mockReset();
    vi.mocked(saveGeneratedTripForCurrentUser).mockReset();
  });

  it("lists saved trips", async () => {
    vi.mocked(getTripsForCurrentUser).mockResolvedValue([
      {
        id: "trip-123",
        title: "Test trip",
        days: 3,
        budget_usd: 1200,
        ability_level: "intermediate",
        include_rentals: false,
        include_lodging: false,
        status: "active",
        created_at: "2026-02-10T12:00:00Z",
      },
    ]);

    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      trips: [
        expect.objectContaining({
          id: "trip-123",
          title: "Test trip",
        }),
      ],
    });
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
    expect(saveGeneratedTripForCurrentUser).toHaveBeenCalledWith(
      validPayload.request,
      validPayload.result,
      { sourceTripId: undefined },
    );
  });

  it("passes source trip ids for edited trip versions", async () => {
    vi.mocked(saveGeneratedTripForCurrentUser).mockResolvedValue({
      tripId: "trip-456",
      error: null,
    });

    const sourceTripId = "00000000-0000-4000-8000-000000000001";
    const response = await POST(
      new Request("http://slopetrip.test/api/trips", {
        method: "POST",
        body: JSON.stringify({ ...validPayload, sourceTripId }),
      }),
    );

    expect(response.status).toBe(201);
    expect(saveGeneratedTripForCurrentUser).toHaveBeenCalledWith(
      validPayload.request,
      validPayload.result,
      { sourceTripId },
    );
  });
});
