import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/conditions/sync/route";
import { createServiceClient } from "@/lib/supabase/server";

vi.mock("@/lib/supabase/server", () => ({
  createServiceClient: vi.fn(),
}));

describe("conditions sync API", () => {
  beforeEach(() => {
    vi.mocked(createServiceClient).mockReset();
    delete process.env.CRON_SECRET;
  });

  it("fails closed when the cron secret is missing", async () => {
    const response = await POST(
      new Request("http://slopetrip.test/api/conditions/sync", { method: "POST" }),
    );

    expect(response.status).toBe(503);
    expect(createServiceClient).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({
      error: "Condition sync authorization is not configured",
    });
  });

  it("rejects requests without the configured bearer token", async () => {
    process.env.CRON_SECRET = "secret";

    const response = await POST(
      new Request("http://slopetrip.test/api/conditions/sync", { method: "POST" }),
    );

    expect(response.status).toBe(401);
    expect(createServiceClient).not.toHaveBeenCalled();
  });

  it("inserts condition snapshots for authorized scheduler requests", async () => {
    process.env.CRON_SECRET = "secret";
    const insert = vi.fn().mockResolvedValue({ error: null });
    vi.mocked(createServiceClient).mockReturnValue({
      from: vi.fn().mockReturnValue({ insert }),
    } as unknown as ReturnType<typeof createServiceClient>);

    const response = await POST(
      new Request("http://slopetrip.test/api/conditions/sync", {
        method: "POST",
        headers: { authorization: "Bearer secret" },
      }),
    );

    expect(response.status).toBe(200);
    expect(insert).toHaveBeenCalledWith(expect.arrayContaining([expect.objectContaining({ resort_id: "stowe" })]));
  });
});
