import { AppShell } from "@/components/app-shell";
import { TripShareLink } from "@/components/trip-share-link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DestructiveSubmitButton } from "@/components/ui/destructive-submit-button";
import { PendingSubmitButton } from "@/components/ui/pending-submit-button";
import {
  archiveTrip,
  deleteTrip,
  duplicateTrip,
  restoreTrip,
  updateTripSharing,
} from "@/lib/supabase/actions";
import Link from "next/link";
import { getCurrentUser } from "@/lib/supabase/auth";
import { getTripForCurrentUser } from "@/lib/supabase/data";
import {
  bookingPriorityLabels,
  getGroupPlan,
  getGroupSize,
  getPerPersonCost,
  getReadinessItems,
  getReadinessScore,
  getSkierCount,
  lodgingPreferenceLabels,
  transportModeLabels,
} from "@/lib/trip-insights";

export default async function TripDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  const trip = user ? await getTripForCurrentUser(id) : null;
  const groupPlan = getGroupPlan(trip?.assumptions);
  const estimatedTotal = trip?.stops.reduce((total, stop) => total + stop.estimatedCostUsd, 0) ?? 0;
  const planningTotal = estimatedTotal || trip?.budget_usd || 0;

  return (
    <AppShell user={user}>
      <main className="mx-auto max-w-4xl px-4 py-8">
        {trip ? (
          <Card>
            <CardHeader>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">Saved trip</Badge>
                <Badge variant={trip.status === "archived" ? "outline" : "secondary"}>
                  {trip.status === "archived" ? "Archived" : "Active"}
                </Badge>
                {trip.is_public && <Badge variant="signal">Public link on</Badge>}
                <Badge variant="outline">v{trip.version ?? 1}</Badge>
              </div>
              <CardTitle className="mt-2">{trip.title}</CardTitle>
              <CardDescription>
                {trip.days} days - ${trip.budget_usd.toLocaleString()} budget - {trip.ability_level} level
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <Metric label="Rentals" value={trip.include_rentals ? "Included" : "Not included"} />
                <Metric label="Lodging" value={trip.include_lodging ? "Included" : "Not included"} />
                <Metric label="Saved" value={new Date(trip.created_at).toLocaleDateString()} />
                <Metric label="Group" value={`${getGroupSize(groupPlan)} people`} />
                <Metric label="Skiers" value={String(getSkierCount(groupPlan))} />
                <Metric label="Per person" value={`$${getPerPersonCost(planningTotal, groupPlan).toLocaleString()}`} />
              </div>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Group decision frame</CardTitle>
                  <CardDescription>
                    Use this version to compare cost, convenience, lodging, and booking readiness before the group commits.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-2">
                  <Metric label="Priority" value={bookingPriorityLabels[groupPlan.bookingPriority]} />
                  <Metric label="Lodging target" value={lodgingPreferenceLabels[groupPlan.lodgingPreference]} />
                  <Metric label="Transport" value={transportModeLabels[groupPlan.transportMode]} />
                  <Metric label="Readiness" value={`${getReadinessScore(groupPlan, trip.include_lodging)}%`} />
                </CardContent>
              </Card>
              <ReadinessChecklist includeLodging={trip.include_lodging} groupPlan={groupPlan} />
              <div className="flex flex-wrap gap-2">
                {trip.status !== "archived" && (
                  <Link href={`/plan?tripId=${trip.id}`}>
                    <Button variant="outline">Edit in planner</Button>
                  </Link>
                )}
                <form action={duplicateTrip}>
                  <input type="hidden" name="tripId" value={trip.id} />
                  <PendingSubmitButton pendingLabel="Duplicating..." variant="outline">Duplicate</PendingSubmitButton>
                </form>
                <form action={trip.status === "archived" ? restoreTrip : archiveTrip}>
                  <input type="hidden" name="tripId" value={trip.id} />
                  <PendingSubmitButton pendingLabel={trip.status === "archived" ? "Restoring..." : "Archiving..."} variant="outline">
                    {trip.status === "archived" ? "Restore" : "Archive"}
                  </PendingSubmitButton>
                </form>
                <form action={updateTripSharing}>
                  <input type="hidden" name="tripId" value={trip.id} />
                  <input type="hidden" name="isPublic" value={trip.is_public ? "false" : "true"} />
                  <PendingSubmitButton
                    pendingLabel={trip.is_public ? "Turning off..." : "Publishing..."}
                    variant={trip.is_public ? "outline" : "secondary"}
                  >
                    {trip.is_public ? "Turn off sharing" : "Publish share link"}
                  </PendingSubmitButton>
                </form>
                <form action={deleteTrip}>
                  <input type="hidden" name="tripId" value={trip.id} />
                  <DestructiveSubmitButton
                    confirmMessage={`Delete "${trip.title}"? This cannot be undone.`}
                    pendingLabel="Deleting..."
                    variant="ghost"
                  >
                    Delete
                  </DestructiveSubmitButton>
                </form>
              </div>
              {trip.is_public && trip.share_token && <TripShareLink token={trip.share_token} />}
              <div className="space-y-3">
                {trip.stops.map((stop) => (
                  <div key={`${stop.resortId}-${stop.day}`} className="slopetrip-ticket-edge rounded-md border border-border bg-white/72 p-4 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                      <h2 className="font-semibold text-[color:var(--pine)]">
                        Day {stop.day}: {stop.resortName}
                      </h2>
                      <Badge variant="outline">${stop.estimatedCostUsd.toLocaleString()}</Badge>
                    </div>
                    {stop.notes && (
                      <p className="mt-2 text-sm text-muted-foreground">{stop.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <Badge variant="outline">{user ? "Unavailable" : "Login required"}</Badge>
              <CardTitle>{user ? "Trip not found" : "Sign in to view saved trips"}</CardTitle>
              <CardDescription>
                {user
                  ? "This trip does not exist or is not available to your account."
                  : "Saved itineraries are scoped to the account that created them."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href={user ? "/plan" : "/login"}>
                <Button>{user ? "Plan another trip" : "Login"}</Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </main>
    </AppShell>
  );
}

function ReadinessChecklist({
  groupPlan,
  includeLodging,
}: {
  groupPlan: ReturnType<typeof getGroupPlan>;
  includeLodging: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Booking checklist</CardTitle>
        <CardDescription>
          Planning estimates are not reservations. Confirm prices, road conditions, and availability before booking.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-2 sm:grid-cols-2">
        {getReadinessItems(groupPlan, includeLodging).map((item) => (
          <div key={item.label} className="rounded-md border border-border bg-white/72 p-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-[color:var(--pine)]">{item.label}</p>
              <Badge variant={item.done ? "secondary" : "outline"}>
                {item.done ? "Started" : "Open"}
              </Badge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{item.detail}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-white/72 p-3 shadow-sm">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}
