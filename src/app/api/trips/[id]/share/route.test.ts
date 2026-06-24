import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/trips/[id]/share/route";
import { setTripSharingForCurrentUser } from "@/lib/supabase/data";

vi.mock("@/lib/supabase/data", () => ({
  setTripSharingForCurrentUser: vi.fn(),
}));

const params = { params: Promise.resolve({ id: "trip-123" }) };

describe("trip share API", () => {
  beforeEach(() => {
    vi.mocked(setTripSharingForCurrentUser).mockReset();
  });

  it("rejects malformed JSON", async () => {
    const response = await POST(
      new Request("http://slopetrip.test/api/trips/trip-123/share", {
        method: "POST",
        body: "{",
      }),
      params,
    );

    expect(response.status).toBe(400);
  });

  it("publishes a share token", async () => {
    vi.mocked(setTripSharingForCurrentUser).mockResolvedValue({
      shareToken: "share-token",
      error: null,
    });

    const response = await POST(
      new Request("http://slopetrip.test/api/trips/trip-123/share", {
        method: "POST",
        body: JSON.stringify({ isPublic: true }),
      }),
      params,
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      shareToken: "share-token",
      isPublic: true,
    });
  });

  it("rejects string booleans for the share toggle", async () => {
    const response = await POST(
      new Request("http://slopetrip.test/api/trips/trip-123/share", {
        method: "POST",
        body: JSON.stringify({ isPublic: "false" }),
      }),
      params,
    );

    expect(response.status).toBe(400);
    expect(setTripSharingForCurrentUser).not.toHaveBeenCalled();
  });
});
