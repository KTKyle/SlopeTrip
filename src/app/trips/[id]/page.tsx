import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function TripDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <AppShell>
      <main className="mx-auto max-w-4xl px-4 py-8">
        <Card>
          <CardHeader>
            <Badge variant="outline">Saved trip</Badge>
            <CardTitle>Trip {id}</CardTitle>
            <CardDescription>
              This route is ready for Supabase-backed saved itinerary details.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Once trips are saved from the planner, this page will render trip stops, route matrix data,
              and recommendation reasoning for the authenticated user only.
            </p>
          </CardContent>
        </Card>
      </main>
    </AppShell>
  );
}
