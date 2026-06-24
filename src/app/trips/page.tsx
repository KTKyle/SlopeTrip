import Link from "next/link";
import {
  Archive,
  CopyPlus,
  ExternalLink,
  Eye,
  Pencil,
  RotateCcw,
  Share2,
  Trash2,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { TripShareLink } from "@/components/trip-share-link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DestructiveSubmitButton } from "@/components/ui/destructive-submit-button";
import { Input } from "@/components/ui/input";
import { PendingSubmitButton } from "@/components/ui/pending-submit-button";
import {
  archiveTrip,
  deleteTrip,
  duplicateTrip,
  renameTrip,
  restoreTrip,
  updateTripSharing,
} from "@/lib/supabase/actions";
import { getCurrentUser } from "@/lib/supabase/auth";
import { getTripsForCurrentUser } from "@/lib/supabase/data";
import {
  bookingPriorityLabels,
  getGroupPlan,
  getGroupSize,
  getPerPersonCost,
  getReadinessScore,
} from "@/lib/trip-insights";
import { getUserFacingErrorMessage } from "@/lib/user-facing-errors";

export default async function TripsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const [user, trips, params] = await Promise.all([
    getCurrentUser(),
    getTripsForCurrentUser({ includeArchived: true }),
    searchParams,
  ]);

  const activeTrips = trips.filter((trip) => trip.status !== "archived");
  const archivedTrips = trips.filter((trip) => trip.status === "archived");
  const errorMessage = getUserFacingErrorMessage(params.error);

  return (
    <AppShell user={user}>
      <main className="mx-auto w-full max-w-6xl px-4 py-8">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-[color:var(--pine)]">
              Saved trips
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Return to itineraries, publish read-only links, duplicate strong plans, or reopen a route in the planner.
            </p>
          </div>
          <Link href="/plan">
            <Button>
              <Pencil className="size-4" />
              New trip
            </Button>
          </Link>
        </div>

        {errorMessage && (
          <p className="mb-4 rounded-md border border-signal bg-signal/10 p-3 text-sm">
            {errorMessage}
          </p>
        )}

        {!user ? (
          <Card>
            <CardHeader>
              <CardTitle>Login required</CardTitle>
              <CardDescription>
                Trip history is private to your account until you publish a share link.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/login">
                <Button>Login to view trips</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-5">
            {activeTrips.length === 0 && archivedTrips.length === 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle>No saved trips yet</CardTitle>
                  <CardDescription>
                    Generate a recommendation from the planner and save it to build your library.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Link href="/plan">
                    <Button>Plan a trip</Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <>
                <TripList title="Active library" trips={activeTrips} />
                {activeTrips.length > 1 && <TripComparison trips={activeTrips.slice(0, 4)} />}
                {archivedTrips.length > 0 && (
                  <TripList archived title="Archived" trips={archivedTrips} />
                )}
              </>
            )}
          </div>
        )}
      </main>
    </AppShell>
  );
}

function TripList({
  archived = false,
  title,
  trips,
}: {
  archived?: boolean;
  title: string;
  trips: Awaited<ReturnType<typeof getTripsForCurrentUser>>;
}) {
  if (trips.length === 0) return null;

  return (
    <section className="grid gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-[color:var(--pine)]">{title}</h2>
        <Badge variant="outline">
          {trips.length} trip{trips.length === 1 ? "" : "s"}
        </Badge>
      </div>
      <div className="grid gap-3">
        {trips.map((trip) => (
          <Card key={trip.id}>
            <CardHeader className="gap-3">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={archived ? "outline" : "secondary"}>
                      {archived ? "Archived" : "Active"}
                    </Badge>
                    {trip.is_public && <Badge variant="signal">Public link on</Badge>}
                    <Badge variant="outline">v{trip.version ?? 1}</Badge>
                  </div>
                  <CardTitle className="mt-3">{trip.title}</CardTitle>
                  <CardDescription>
                    {trip.days} days - ${trip.budget_usd.toLocaleString()} budget - {trip.ability_level} level - saved{" "}
                    {new Date(trip.created_at).toLocaleDateString()}
                  </CardDescription>
                  <TripPlanningSnapshot trip={trip} />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link href={`/trips/${trip.id}`}>
                    <Button variant="outline" size="sm">
                      <Eye className="size-4" />
                      View
                    </Button>
                  </Link>
                  {!archived && (
                    <Link href={`/plan?tripId=${trip.id}`}>
                      <Button variant="outline" size="sm">
                        <Pencil className="size-4" />
                        Edit
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="grid gap-4">
              <form action={renameTrip} className="grid gap-2 sm:grid-cols-[1fr_auto]">
                <input type="hidden" name="tripId" value={trip.id} />
                <Input name="title" defaultValue={trip.title} aria-label={`Rename ${trip.title}`} />
                <PendingSubmitButton pendingLabel="Renaming..." variant="outline">
                  Rename
                </PendingSubmitButton>
              </form>

              <div className="grid gap-3 lg:grid-cols-[1fr_280px]">
                <div className="flex flex-wrap gap-2">
                  <form action={duplicateTrip}>
                    <input type="hidden" name="tripId" value={trip.id} />
                    <PendingSubmitButton pendingLabel="Duplicating..." variant="outline" size="sm">
                      <CopyPlus className="size-4" />
                      Duplicate
                    </PendingSubmitButton>
                  </form>
                  <form action={archived ? restoreTrip : archiveTrip}>
                    <input type="hidden" name="tripId" value={trip.id} />
                    <PendingSubmitButton pendingLabel={archived ? "Restoring..." : "Archiving..."} variant="outline" size="sm">
                      {archived ? <RotateCcw className="size-4" /> : <Archive className="size-4" />}
                      {archived ? "Restore" : "Archive"}
                    </PendingSubmitButton>
                  </form>
                  <form action={deleteTrip}>
                    <input type="hidden" name="tripId" value={trip.id} />
                    <DestructiveSubmitButton
                      confirmMessage={`Delete "${trip.title}"? This cannot be undone.`}
                      pendingLabel="Deleting..."
                      variant="ghost"
                      size="sm"
                    >
                      <Trash2 className="size-4" />
                      Delete
                    </DestructiveSubmitButton>
                  </form>
                  {trip.is_public && trip.share_token && (
                    <Link href={`/share/${trip.share_token}`} target="_blank">
                      <Button type="button" variant="outline" size="sm">
                        <ExternalLink className="size-4" />
                        Public view
                      </Button>
                    </Link>
                  )}
                </div>
                <form action={updateTripSharing}>
                  <input type="hidden" name="tripId" value={trip.id} />
                  <input type="hidden" name="isPublic" value={trip.is_public ? "false" : "true"} />
                  <PendingSubmitButton
                    pendingLabel={trip.is_public ? "Turning off..." : "Publishing..."}
                    variant={trip.is_public ? "outline" : "secondary"}
                    size="sm"
                    className="w-full"
                  >
                    <Share2 className="size-4" />
                    {trip.is_public ? "Turn off sharing" : "Publish share link"}
                  </PendingSubmitButton>
                </form>
              </div>

              {trip.is_public && trip.share_token && <TripShareLink token={trip.share_token} />}
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}

function TripPlanningSnapshot({
  trip,
}: {
  trip: Awaited<ReturnType<typeof getTripsForCurrentUser>>[number];
}) {
  const groupPlan = getGroupPlan(trip.assumptions);
  const readinessScore = getReadinessScore(groupPlan, trip.include_lodging);
  const perPersonBudget = getPerPersonCost(trip.budget_usd, groupPlan);

  return (
    <div className="mt-3 flex flex-wrap gap-2 text-xs">
      <Badge variant="outline">{getGroupSize(groupPlan)} people</Badge>
      <Badge variant="outline">${perPersonBudget.toLocaleString()} / person budget</Badge>
      <Badge variant={readinessScore >= 60 ? "secondary" : "outline"}>
        {readinessScore}% readiness
      </Badge>
      <Badge variant="outline">{bookingPriorityLabels[groupPlan.bookingPriority]}</Badge>
    </div>
  );
}

function TripComparison({
  trips,
}: {
  trips: Awaited<ReturnType<typeof getTripsForCurrentUser>>;
}) {
  return (
    <section className="grid gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-[color:var(--pine)]">Compare active plans</h2>
        <Badge variant="outline">{trips.length} versions</Badge>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {trips.map((trip) => {
          const groupPlan = getGroupPlan(trip.assumptions);
          const perPersonBudget = getPerPersonCost(trip.budget_usd, groupPlan);

          return (
            <Card key={`compare-${trip.id}`}>
              <CardHeader>
                <CardTitle className="text-base">{trip.title}</CardTitle>
                <CardDescription>
                  v{trip.version ?? 1} - {trip.days} days - {bookingPriorityLabels[groupPlan.bookingPriority]}
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-2 text-sm">
                <MetricLine label="Total budget" value={`$${trip.budget_usd.toLocaleString()}`} />
                <MetricLine label="Per person" value={`$${perPersonBudget.toLocaleString()}`} />
                <MetricLine label="Group" value={`${getGroupSize(groupPlan)} people`} />
                <MetricLine label="Readiness" value={`${getReadinessScore(groupPlan, trip.include_lodging)}%`} />
                <Link href={`/trips/${trip.id}`}>
                  <Button className="mt-2 w-full" variant="outline" size="sm">
                    Compare details
                  </Button>
                </Link>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}

function MetricLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border/60 pb-2 last:border-b-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-[color:var(--pine)]">{value}</span>
    </div>
  );
}
