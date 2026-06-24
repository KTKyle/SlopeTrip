import { beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE, PATCH } from "@/app/api/trips/[id]/route";
import { deleteTripForCurrentUser, updateTripForCurrentUser } from "@/lib/supabase/data";

vi.mock("@/lib/supabase/data", () => ({
  deleteTripForCurrentUser: vi.fn(),
  updateTripForCurrentUser: vi.fn(),
}));

const params = { params: Promise.resolve({ id: "trip-123" }) };

describe("trip item API", () => {
  beforeEach(() => {
    vi.mocked(deleteTripForCurrentUser).mockReset();
    vi.mocked(updateTripForCurrentUser).mockReset();
  });

  it("rejects invalid update payloads", async () => {
    const response = await PATCH(
      new Request("http://slopetrip.test/api/trips/trip-123", {
        method: "PATCH",
        body: JSON.stringify({}),
      }),
      params,
    );

    expect(response.status).toBe(400);
  });

  it("updates trip fields", async () => {
    vi.mocked(updateTripForCurrentUser).mockResolvedValue({ error: null });

    const response = await PATCH(
      new Request("http://slopetrip.test/api/trips/trip-123", {
        method: "PATCH",
        body: JSON.stringify({ title: "Renamed trip" }),
      }),
      params,
    );

    expect(response.status).toBe(200);
    expect(updateTripForCurrentUser).toHaveBeenCalledWith("trip-123", {
      title: "Renamed trip",
    });
  });

  it("deletes trips", async () => {
    vi.mocked(deleteTripForCurrentUser).mockResolvedValue({ error: null });

    const response = await DELETE(
      new Request("http://slopetrip.test/api/trips/trip-123", { method: "DELETE" }),
      params,
    );

    expect(response.status).toBe(200);
    expect(deleteTripForCurrentUser).toHaveBeenCalledWith("trip-123");
  });
});
