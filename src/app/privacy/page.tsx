import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function PrivacyPage() {
  return (
    <AppShell>
      <main className="mx-auto max-w-3xl px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Privacy</CardTitle>
            <CardDescription>
              How SlopeTrip treats profile, trip, and recommendation data.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>
              SlopeTrip stores account profile preferences, saved trips, route assumptions, and generated recommendation summaries so you can return to trip plans later.
            </p>
            <p>
              Private trips are scoped to the account that created them. A trip becomes publicly readable only when you publish a share link, and turning sharing off disables that public token.
            </p>
            <p>
              AI prompts are limited to trip-planning context such as budget, ability level, resort choices, pass ownership, and broad origin labels. Exact addresses, health details, and sensitive personal traits should not be entered.
            </p>
            <p>
              You can archive or delete saved trips from the trip library. For a full account export or deletion workflow, add an account settings page before production launch.
            </p>
          </CardContent>
        </Card>
      </main>
    </AppShell>
  );
}
