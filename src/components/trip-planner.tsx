"use client";

import { useMemo, useState } from "react";
import { CalendarDays, DollarSign, Route } from "lucide-react";
import type { AbilityLevel, Resort, TripRecommendationResult } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

type Props = {
  resorts: Resort[];
};

export function TripPlanner({ resorts }: Props) {
  const [days, setDays] = useState(3);
  const [budget, setBudget] = useState(1200);
  const [abilityLevel, setAbilityLevel] = useState<AbilityLevel>("intermediate");
  const [rentsGear, setRentsGear] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>(["stowe", "killington"]);
  const [result, setResult] = useState<TripRecommendationResult | null>(null);
  const [isPending, setIsPending] = useState(false);

  const selected = useMemo(
    () => resorts.filter((resort) => selectedIds.includes(resort.id)),
    [resorts, selectedIds],
  );
  const manualCost = selected.reduce(
    (total, resort) =>
      total + resort.ticketEstimateUsd * days + (rentsGear ? resort.rentalEstimateUsd * days : 0),
    0,
  );

  async function requestRecommendation() {
    setIsPending(true);
    const response = await fetch("/api/trips/recommend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        days,
        abilityLevel,
        rentsGear,
        maxDriveHours: 10,
        preferredRegion: "northeast",
        budget: {
          maxTotalUsd: budget,
          includeRentals: rentsGear,
          includeLodging: true,
        },
      }),
    });
    const data = (await response.json()) as TripRecommendationResult;
    setResult(data);
    setIsPending(false);
  }

  return (
    <div className="mx-auto grid max-w-7xl grid-cols-1 gap-4 px-4 py-6 lg:grid-cols-[360px_1fr] lg:px-6">
      <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <h1 className="text-2xl font-semibold">Plan Your Trip</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Tune the core constraints and let SlopeTrip compare cost, skill fit, and mountain conditions.
        </p>
        <div className="mt-6 flex flex-col gap-5">
          <Field icon={<CalendarDays className="size-4" />} label="Trip days">
            <Input type="number" min={1} max={14} value={days} onChange={(event) => setDays(Number(event.target.value))} />
          </Field>
          <Field icon={<DollarSign className="size-4" />} label="Total budget">
            <Input type="number" min={100} value={budget} onChange={(event) => setBudget(Number(event.target.value))} />
          </Field>
          <div className="flex flex-col gap-2">
            <Label>Ability level</Label>
            <div className="grid grid-cols-3 gap-2">
              {(["beginner", "intermediate", "expert"] as AbilityLevel[]).map((level) => (
                <Button
                  key={level}
                  type="button"
                  size="sm"
                  variant={abilityLevel === level ? "default" : "outline"}
                  onClick={() => setAbilityLevel(level)}
                >
                  {level}
                </Button>
              ))}
            </div>
          </div>
          <label className="flex items-center justify-between rounded-md border border-border bg-background p-3 text-sm">
            Renting gear for this trip?
            <input
              type="checkbox"
              checked={rentsGear}
              onChange={(event) => setRentsGear(event.target.checked)}
              className="size-4 accent-primary"
            />
          </label>
          <Button type="button" onClick={requestRecommendation} disabled={isPending}>
            <Route />
            {isPending ? "Planning..." : "Plan a trip for me"}
          </Button>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Manual trip board</h2>
            <Badge variant="outline">${manualCost.toLocaleString()} est.</Badge>
          </div>
          <div className="mt-4 flex flex-col gap-3">
            {resorts.slice(0, 6).map((resort) => (
              <label key={resort.id} className="flex items-center justify-between rounded-md border border-border bg-background p-3">
                <span>
                  <span className="block text-sm font-medium">{resort.name}</span>
                  <span className="text-xs text-muted-foreground">
                    ${resort.ticketEstimateUsd} ticket - {resort.condition.snowfall7DayIn}&quot; snow
                  </span>
                </span>
                <input
                  type="checkbox"
                  checked={selectedIds.includes(resort.id)}
                  onChange={(event) =>
                    setSelectedIds((current) =>
                      event.target.checked
                        ? [...current, resort.id]
                        : current.filter((id) => id !== resort.id),
                    )
                  }
                  className="size-4 accent-primary"
                />
              </label>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Recommended itinerary</h2>
          {result ? (
            <div className="mt-4 flex flex-col gap-4">
              <div>
                <Badge variant={result.confidence === "model" ? "signal" : "secondary"}>
                  {result.confidence === "model" ? "Gemini assisted" : "Demo scoring"}
                </Badge>
                <h3 className="mt-3 text-xl font-semibold">{result.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{result.summary}</p>
              </div>
              {result.stops.map((stop) => (
                <div key={`${stop.resortId}-${stop.day}`} className="rounded-md border border-border bg-background p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">Day {stop.day}: {stop.resortName}</span>
                    <Badge variant="outline">Score {stop.score}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    ${stop.estimatedCostUsd.toLocaleString()} estimated
                  </p>
                  <ul className="mt-2 list-inside list-disc text-xs text-muted-foreground">
                    {stop.reasons.map((reason) => (
                      <li key={reason}>{reason}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-md border border-dashed border-border bg-background p-5 text-sm text-muted-foreground">
              Generate a plan to see a day-by-day resort recommendation.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function Field({
  label,
  icon,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label className="flex items-center gap-2">
        {icon}
        {label}
      </Label>
      {children}
    </div>
  );
}
