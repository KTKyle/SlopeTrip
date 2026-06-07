import Link from "next/link";
import { Mountain, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/supabase/auth";
import { signOut } from "@/lib/supabase/actions";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  return (
    <div className="min-h-screen text-foreground">
      <header className="sticky top-0 z-40 border-b border-white/15 bg-[linear-gradient(135deg,var(--pine),#0a5665_62%,#0b7185)] text-primary-foreground shadow-[0_10px_34px_rgb(8_42_49_/_18%)] backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1920px] items-center justify-between px-3 sm:px-5">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <span className="grid size-9 place-items-center rounded-md border border-white/20 bg-white/12 text-primary-foreground shadow-inner">
              <Mountain className="size-5" />
            </span>
            <span className="text-lg tracking-[0.02em]">SlopeTrip</span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            <Link className="rounded-md px-3 py-2 text-sm font-medium text-white/76 hover:bg-white/10 hover:text-white" href="/">
              Explore Resorts
            </Link>
            <Link className="rounded-md px-3 py-2 text-sm font-medium text-white/76 hover:bg-white/10 hover:text-white" href="/plan">
              Plan Your Trip
            </Link>
            <Link className="rounded-md px-3 py-2 text-sm font-medium text-white/76 hover:bg-white/10 hover:text-white" href="/profile">
              Profile
            </Link>
          </nav>
          <div className="flex items-center gap-2">
            {user ? (
              <form action={signOut}>
                <Button className="border-white/30 bg-white/10 text-white hover:bg-white/18" variant="outline" size="sm" type="submit">
                  <UserRound />
                  Sign out
                </Button>
              </form>
            ) : (
              <Link href="/login">
                <Button className="bg-signal text-signal-foreground hover:bg-signal/90" size="sm">
                  <UserRound />
                  Login
                </Button>
              </Link>
            )}
          </div>
        </div>
        <nav className="mx-auto grid max-w-[1920px] grid-cols-3 border-t border-white/10 px-2 pb-2 md:hidden">
          <Link className="rounded-md px-2 py-2 text-center text-xs font-medium text-white/78 hover:bg-white/10 hover:text-white" href="/">
            Explore
          </Link>
          <Link className="rounded-md px-2 py-2 text-center text-xs font-medium text-white/78 hover:bg-white/10 hover:text-white" href="/plan">
            Plan
          </Link>
          <Link className="rounded-md px-2 py-2 text-center text-xs font-medium text-white/78 hover:bg-white/10 hover:text-white" href="/profile">
            Profile
          </Link>
        </nav>
      </header>
      {children}
    </div>
  );
}
