import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { buildConditionSyncSnapshot } from "@/lib/conditions";
import { logApiEvent } from "@/lib/observability";
import { resorts } from "@/lib/resorts";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const expectedSecret = process.env.CRON_SECRET?.trim();
  const providedSecret = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  if (!expectedSecret) {
    logApiEvent("conditions.sync.misconfigured");
    return apiError("Condition sync authorization is not configured", 503);
  }

  if (providedSecret !== expectedSecret) {
    logApiEvent("conditions.sync.unauthorized");
    return apiError("Unauthorized", 401);
  }

  const supabase = createServiceClient();
  if (!supabase) {
    return apiError("Supabase service client is not configured", 503);
  }

  const observedAt = new Date();
  const snapshots = resorts.map((resort) => buildConditionSyncSnapshot(resort, observedAt));
  const { error } = await supabase.from("resort_conditions").insert(snapshots);

  if (error) {
    logApiEvent("conditions.sync.failed", { reason: error.message });
    return apiError("Condition sync failed", 503);
  }

  logApiEvent("conditions.sync.succeeded", { count: snapshots.length });
  return NextResponse.json({
    synced: snapshots.length,
    observedAt: observedAt.toISOString(),
  });
}
