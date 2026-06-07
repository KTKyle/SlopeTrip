import { AppShell } from "@/components/app-shell";
import { TripPlanner } from "@/components/trip-planner";
import { resorts } from "@/lib/resorts";
import { getCurrentUser } from "@/lib/supabase/auth";
import { getProfileForCurrentUser } from "@/lib/supabase/data";

export default async function PlanPage() {
  const [user, profile] = await Promise.all([
    getCurrentUser(),
    getProfileForCurrentUser(),
  ]);

  return (
    <AppShell>
      <TripPlanner resorts={resorts} profile={profile} userCanSave={!!user} />
    </AppShell>
  );
}
