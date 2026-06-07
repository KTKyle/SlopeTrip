import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { getCurrentUser } from "@/lib/supabase/auth";
import { getTripForCurrentUser } from "@/lib/supabase/data";

export default async function TripDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  const trip = user ? await getTripForCurrentUser(id) : null;

  return (
    <AppShell>
      <main className="mx-auto max-w-4xl px-4 py-8">
        {trip ? (
          <Card>
            <CardHeader>
              <Badge variant="outline">Saved trip</Badge>
              <CardTitle>{trip.title}</CardTitle>
              <CardDescription>
                {trip.days} days - ${trip.budget_usd.toLocaleString()} budget - {trip.ability_level} level
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <Metric label="Rentals" value={trip.include_rentals ? "Included" : "Not included"} />
                <Metric label="Lodging" value={trip.include_lodging ? "Included" : "Not included"} />
                <Metric label="Saved" value={new Date(trip.created_at).toLocaleDateString()} />
              </div>
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

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-white/72 p-3 shadow-sm">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}
