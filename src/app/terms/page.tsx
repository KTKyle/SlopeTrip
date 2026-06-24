import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function TermsPage() {
  return (
    <AppShell>
      <main className="mx-auto max-w-3xl px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Terms</CardTitle>
            <CardDescription>
              Planning guidance, not a booking guarantee.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>
              SlopeTrip provides planning estimates for resort fit, costs, drive time, and snow context. Verify lift tickets, pass access, weather, road conditions, lodging, and resort operations before booking or traveling.
            </p>
            <p>
              Recommendation output is informational and may use AI-assisted summaries. The deterministic SlopeTrip scoring model remains the source of trip stop and cost calculations.
            </p>
            <p>
              Public share links are intended for read-only itinerary review. Do not publish private or sensitive information in trip titles, notes, or shared plans.
            </p>
          </CardContent>
        </Card>
      </main>
    </AppShell>
  );
}
