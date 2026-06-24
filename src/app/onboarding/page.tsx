import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PendingSubmitButton } from "@/components/ui/pending-submit-button";
import { saveProfile } from "@/lib/supabase/actions";
import { requireUser } from "@/lib/supabase/auth";
import type { ResortPassAffiliation } from "@/lib/types";

const passOptions: Array<{ value: ResortPassAffiliation; label: string }> = [
  { value: "epic", label: "Epic" },
  { value: "ikon", label: "Ikon" },
  { value: "new-england", label: "New England" },
  { value: "indy", label: "Indy" },
  { value: "independent", label: "Independent/local" },
];

export default async function OnboardingPage() {
  const user = await requireUser();

  return (
    <AppShell user={user}>
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
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
              <div className="grid gap-2 sm:col-span-2">
                <Label>Do you already own a ski pass?</Label>
                <div className="grid gap-2 sm:grid-cols-2">
                  {passOptions.map((option) => (
                    <label key={option.value} className="flex items-center justify-between rounded-md border border-border bg-background p-3 text-sm">
                      {option.label}
                      <input
                        name="passAffiliations"
                        type="checkbox"
                        value={option.value}
                        className="size-4 accent-primary"
                      />
                    </label>
                  ))}
                </div>
              </div>
              <PendingSubmitButton className="sm:col-span-2" pendingLabel="Saving profile...">
                Save profile and plan a trip
              </PendingSubmitButton>
            </form>
          </CardContent>
        </Card>
      </main>
    </AppShell>
  );
}
