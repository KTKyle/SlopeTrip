import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PendingSubmitButton } from "@/components/ui/pending-submit-button";
import { signInWithPassword, signUpWithPassword } from "@/lib/supabase/actions";
import { getUserFacingErrorMessage } from "@/lib/user-facing-errors";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const errorMessage = getUserFacingErrorMessage(params.error);

  return (
    <AppShell>
      <main className="mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-6xl items-center gap-6 px-4 py-10 lg:grid-cols-[1fr_420px]">
        <section>
          <h1 className="max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">
            Save your ski style, compare resorts, and plan the next mountain day faster.
          </h1>
          <p className="mt-4 max-w-xl text-base text-muted-foreground">
            SlopeTrip accounts store trip preferences, home-region estimates, rental needs, and saved itineraries.
          </p>
        </section>
        <Card>
          <CardHeader>
            <CardTitle>Login or create an account</CardTitle>
            <CardDescription>
              Supabase Auth powers secure sessions. Local demo mode works after env setup.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {errorMessage && (
              <p className="mb-4 rounded-md border border-signal bg-signal/10 p-3 text-sm">
                {errorMessage}
              </p>
            )}
            <form className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" required placeholder="you@example.com" />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" name="password" type="password" required minLength={8} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <PendingSubmitButton formAction={signInWithPassword} pendingLabel="Logging in...">
                  Login
                </PendingSubmitButton>
                <PendingSubmitButton pendingLabel="Creating..." variant="outline" formAction={signUpWithPassword}>
                  Create account
                </PendingSubmitButton>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </AppShell>
  );
}
