import { AppShell } from "@/components/app-shell";
import { TripPlanner } from "@/components/trip-planner";
import { resorts } from "@/lib/resorts";
import { getCurrentUser } from "@/lib/supabase/auth";
import { getProfileForCurrentUser, getTripForCurrentUser, toPlannerTripSeed } from "@/lib/supabase/data";

export default async function PlanPage({
  searchParams,
}: {
  searchParams: Promise<{ tripId?: string }>;
}) {
  const params = await searchParams;
  const [user, profile, savedTrip] = await Promise.all([
    getCurrentUser(),
    getProfileForCurrentUser(),
    params.tripId ? getTripForCurrentUser(params.tripId) : Promise.resolve(null),
  ]);

  return (
    <AppShell user={user}>
      <TripPlanner
        resorts={resorts}
        profile={profile}
        initialTrip={savedTrip ? toPlannerTripSeed(savedTrip) : undefined}
        userCanSave={!!user}
      />
    </AppShell>
  );
}
