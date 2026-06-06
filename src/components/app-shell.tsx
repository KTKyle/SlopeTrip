import Link from "next/link";
import { Mountain, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/supabase/auth";
import { signOut } from "@/lib/supabase/actions";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <span className="grid size-9 place-items-center rounded-md bg-primary text-primary-foreground">
              <Mountain className="size-5" />
            </span>
            <span className="text-lg">SlopeTrip</span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            <Link className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground" href="/">
              Explore Resorts
            </Link>
            <Link className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground" href="/plan">
              Plan Your Trip
            </Link>
            <Link className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground" href="/profile">
              Profile
            </Link>
          </nav>
          <div className="flex items-center gap-2">
            {user ? (
              <form action={signOut}>
                <Button variant="outline" size="sm" type="submit">
                  <UserRound />
                  Sign out
                </Button>
              </form>
            ) : (
              <Link href="/login">
                <Button size="sm">
                  <UserRound />
                  Login
                </Button>
              </Link>
            )}
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}
