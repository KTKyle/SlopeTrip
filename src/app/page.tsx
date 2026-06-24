import { AppShell } from "@/components/app-shell";
import { ResortMap } from "@/components/resort-map";
import { Button } from "@/components/ui/button";
import { resorts } from "@/lib/resorts";
import Link from "next/link";

export default function Home() {
  return (
    <AppShell>
      <section className="mx-auto grid w-full max-w-[1920px] gap-3 px-3 pt-4">
        <div className="rounded-lg border border-border bg-white/82 p-4 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-[color:var(--pine)]">
                Plan the ski trip your group can actually agree on.
              </h1>
              <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
                Compare resorts by snow, budget, family fit, passes, and travel constraints, then turn the winner into a shareable itinerary.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/plan">
                <Button className="bg-[linear-gradient(135deg,var(--signal),#ff9b52)] text-signal-foreground hover:opacity-95">
                  Plan a group trip
                </Button>
              </Link>
              <a href="#resort-map">
                <Button variant="outline">Explore resorts</Button>
              </a>
            </div>
          </div>
        </div>
      </section>
      <div id="resort-map">
      <ResortMap resorts={resorts} />
      </div>
    </AppShell>
  );
}
