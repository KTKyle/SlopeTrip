import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveProfile } from "@/lib/supabase/actions";
import { requireUser } from "@/lib/supabase/auth";

export default async function OnboardingPage() {
  await requireUser();

  return (
    <AppShell>
      <main className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-3xl items-center px-4 py-10">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Tell us your ski style</CardTitle>
            <CardDescription>
              This first-pass survey personalizes resort fit, trip cost, and rental assumptions.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={saveProfile} className="grid gap-5 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="seasons">How many seasons have you been skiing?</Label>
                <Input id="seasons" name="seasons" type="number" min={0} max={80} defaultValue={2} />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="abilityLevel">Level</Label>
                <select
                  id="abilityLevel"
                  name="abilityLevel"
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                  defaultValue="intermediate"
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="expert">Expert</option>
                </select>
              </div>
              <div className="flex flex-col gap-2 sm:col-span-2">
                <Label htmlFor="homeLocationLabel">Where do you live?</Label>
                <Input
                  id="homeLocationLabel"
                  name="homeLocationLabel"
                  placeholder="City, state or ZIP"
                  required
                />
              </div>
              <label className="flex items-center justify-between rounded-md border border-border bg-background p-3 text-sm sm:col-span-2">
                Are you renting gear for the season?
                <input name="rentsGear" type="checkbox" className="size-4 accent-primary" />
              </label>
              <Button className="sm:col-span-2" type="submit">
                Save profile and plan a trip
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </AppShell>
  );
}
