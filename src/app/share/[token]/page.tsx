import Link from "next/link";
import { CalendarDays, DollarSign, LockKeyhole, MapPinned } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getPublicTripByShareToken } from "@/lib/supabase/data";
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

export default async function PublicSharedTripPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const trip = await getPublicTripByShareToken(token);
  const groupPlan = getGroupPlan(trip?.assumptions);
  const estimatedTotal = trip?.stops.reduce((total, stop) => total + stop.estimatedCostUsd, 0) ?? 0;
  const planningTotal = estimatedTotal || trip?.budget_usd || 0;

  return (
    <AppShell>
      <main className="mx-auto max-w-5xl px-4 py-8">
        {trip ? (
          <div className="grid gap-5">
            <section className="rounded-lg border border-border bg-white/78 p-5 shadow-sm">
              <div className="flex flex-wrap gap-2">
                <Badge variant="signal">Shared itinerary</Badge>
                <Badge variant="outline">Read-only</Badge>
              </div>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight text-[color:var(--pine)]">
                {trip.title}
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                This public link shows the trip plan, group assumptions, and booking checklist. Editing, deleting, and private profile details stay with the owner account.
              </p>
            </section>

            <div className="grid gap-3 sm:grid-cols-4">
              <Metric icon={<CalendarDays className="size-4" />} label="Days" value={String(trip.days)} />
              <Metric icon={<DollarSign className="size-4" />} label="Budget" value={`$${trip.budget_usd.toLocaleString()}`} />
              <Metric icon={<MapPinned className="size-4" />} label="Level" value={trip.ability_level} />
              <Metric
                icon={<LockKeyhole className="size-4" />}
                label="Visibility"
                value={trip.is_public ? "Public" : "Private"}
              />
              <Metric icon={<DollarSign className="size-4" />} label="Per person" value={`$${getPerPersonCost(planningTotal, groupPlan).toLocaleString()}`} />
              <Metric icon={<MapPinned className="size-4" />} label="Group" value={`${getGroupSize(groupPlan)} people`} />
              <Metric icon={<CalendarDays className="size-4" />} label="Skiers" value={String(getSkierCount(groupPlan))} />
              <Metric icon={<LockKeyhole className="size-4" />} label="Readiness" value={`${getReadinessScore(groupPlan, trip.include_lodging)}%`} />
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Group assumptions</CardTitle>
                <CardDescription>
                  These planning inputs help everyone understand the tradeoffs behind the itinerary.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-3">
                <MetricText label="Decision priority" value={bookingPriorityLabels[groupPlan.bookingPriority]} />
                <MetricText label="Lodging target" value={lodgingPreferenceLabels[groupPlan.lodgingPreference]} />
                <MetricText label="Transport plan" value={transportModeLabels[groupPlan.transportMode]} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>What still needs booking</CardTitle>
                <CardDescription>
                  Prices, conditions, roads, and availability are estimates until confirmed with providers.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-2 sm:grid-cols-2">
                {getReadinessItems(groupPlan, trip.include_lodging).map((item) => (
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

            <Card>
              <CardHeader>
                <CardTitle>Route</CardTitle>
                <CardDescription>
                  Estimated costs are planning numbers and should be checked before booking.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3">
                {trip.stops.map((stop) => (
                  <div key={`${stop.resortId}-${stop.day}`} className="slopetrip-ticket-edge rounded-md border border-border bg-white/72 p-4 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h2 className="font-semibold text-[color:var(--pine)]">
                        Day {stop.day}: {stop.resortName}
                      </h2>
                      <Badge variant="outline">${stop.estimatedCostUsd.toLocaleString()}</Badge>
                    </div>
                    {stop.notes && <p className="mt-2 text-sm text-muted-foreground">{stop.notes}</p>}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card>
            <CardHeader>
              <Badge variant="outline">Unavailable</Badge>
              <CardTitle>Shared trip not found</CardTitle>
              <CardDescription>
                This share link may be private, expired, or mistyped.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/plan">
                <Button>Plan your own trip</Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </main>
    </AppShell>
  );
}

function Metric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md border border-border bg-white/72 p-3 shadow-sm">
      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        {icon}
        {label}
      </p>
      <p className="mt-1 font-semibold capitalize text-[color:var(--pine)]">{value}</p>
    </div>
  );
}

function MetricText({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-white/72 p-3 shadow-sm">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-semibold text-[color:var(--pine)]">{value}</p>
    </div>
  );
}
