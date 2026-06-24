import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/trips/[id]/duplicate/route";
import { duplicateTripForCurrentUser } from "@/lib/supabase/data";

vi.mock("@/lib/supabase/data", () => ({
  duplicateTripForCurrentUser: vi.fn(),
}));

const params = { params: Promise.resolve({ id: "trip-123" }) };

describe("trip duplicate API", () => {
  beforeEach(() => {
    vi.mocked(duplicateTripForCurrentUser).mockReset();
  });

  it("duplicates a trip", async () => {
    vi.mocked(duplicateTripForCurrentUser).mockResolvedValue({
      tripId: "trip-456",
      error: null,
    });

    const response = await POST(
      new Request("http://slopetrip.test/api/trips/trip-123/duplicate", {
        method: "POST",
        body: JSON.stringify({ title: "Copy" }),
      }),
      params,
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({ tripId: "trip-456" });
    expect(duplicateTripForCurrentUser).toHaveBeenCalledWith("trip-123", "Copy");
  });
});
