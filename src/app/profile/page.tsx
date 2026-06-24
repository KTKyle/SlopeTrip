import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PendingSubmitButton } from "@/components/ui/pending-submit-button";
import { saveProfile } from "@/lib/supabase/actions";
import { getCurrentUser } from "@/lib/supabase/auth";
import { getProfileForCurrentUser } from "@/lib/supabase/data";
import type { ResortPassAffiliation } from "@/lib/types";

const passOptions: Array<{ value: ResortPassAffiliation; label: string }> = [
  { value: "epic", label: "Epic" },
  { value: "ikon", label: "Ikon" },
  { value: "new-england", label: "New England" },
  { value: "indy", label: "Indy" },
  { value: "independent", label: "Independent/local" },
];

export default async function ProfilePage() {
  const [user, profile] = await Promise.all([
    getCurrentUser(),
    getProfileForCurrentUser(),
  ]);

  return (
    <AppShell user={user}>
      <main className="mx-auto max-w-3xl px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>
              Keep SlopeTrip recommendations aligned with your current skill, gear, and home base.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {user ? (
              <form action={saveProfile} className="grid gap-5 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="seasons">Seasons</Label>
                  <Input id="seasons" name="seasons" type="number" min={0} max={80} defaultValue={profile?.seasons ?? 2} />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="abilityLevel">Level</Label>
                  <select
                    id="abilityLevel"
                    name="abilityLevel"
                    className="h-10 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    defaultValue={profile?.abilityLevel ?? "intermediate"}
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="expert">Expert</option>
                  </select>
                </div>
                <div className="flex flex-col gap-2 sm:col-span-2">
                  <Label htmlFor="homeLocationLabel">Home location</Label>
                  <Input id="homeLocationLabel" name="homeLocationLabel" placeholder="City, state or ZIP" defaultValue={profile?.homeLocationLabel ?? ""} />
                </div>
                <label className="flex items-center justify-between rounded-md border border-border bg-background p-3 text-sm sm:col-span-2">
                  Renting gear?
                  <input name="rentsGear" type="checkbox" className="size-4 accent-primary" defaultChecked={profile?.rentsGear ?? false} />
                </label>
                <div className="grid gap-2 sm:col-span-2">
                  <Label>Pass ownership</Label>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {passOptions.map((option) => (
                      <label key={option.value} className="flex items-center justify-between rounded-md border border-border bg-background p-3 text-sm">
                        {option.label}
                        <input
                          name="passAffiliations"
                          type="checkbox"
                          value={option.value}
                          className="size-4 accent-primary"
                          defaultChecked={profile?.passAffiliations?.includes(option.value) ?? false}
                        />
                      </label>
                    ))}
                  </div>
                </div>
                <PendingSubmitButton className="sm:col-span-2" pendingLabel="Saving profile...">
                  Save profile
                </PendingSubmitButton>
              </form>
            ) : (
              <p className="text-sm text-muted-foreground">Login to save profile data and trip history.</p>
            )}
          </CardContent>
        </Card>
      </main>
    </AppShell>
  );
}
