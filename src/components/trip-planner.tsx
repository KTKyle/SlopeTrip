"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowUp,
  Bed,
  CalendarDays,
  DollarSign,
  ExternalLink,
  Filter,
  GripVertical,
  MapPinned,
  Plus,
  RotateCcw,
  Route,
  Save,
  Search,
  Ticket,
  Trash2,
} from "lucide-react";
import type {
  AbilityLevel,
  Resort,
  ResortRegion,
  TripRecommendationRequest,
  TripRecommendationResult,
  UserSkiProfile,
} from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { estimateDriveHours, haversineMiles } from "@/lib/recommendation";

type Props = {
  resorts: Resort[];
  profile?: UserSkiProfile | null;
  userCanSave: boolean;
};

const regions: ResortRegion[] = ["northeast", "midwest", "rockies", "west", "pacific"];
const minimumAbilityFit = 20;
const initialTripDays = 3;
const maxTripDays = 14;

type BoardFilterSnapshot = {
  days: number;
  budget: number;
  abilityLevel: AbilityLevel;
  rentalMultiplier: number;
  maxDriveHours: number;
  preferredRegion: ResortRegion;
  homeLatitude?: number;
  homeLongitude?: number;
};

type GearRentalType =
  | "ski_package"
  | "snowboard_package"
  | "boots"
  | "helmet"
  | "poles"
  | "goggles"
  | "jacket"
  | "pants";

type GearRentalItem = {
  id: string;
  type: GearRentalType;
  quantity: number;
};

const rentalGearOptions: Array<{
  type: GearRentalType;
  label: string;
  costShare: number;
}> = [
  { type: "ski_package", label: "Skis, boots, poles", costShare: 1 },
  { type: "snowboard_package", label: "Snowboard and boots", costShare: 1 },
  { type: "boots", label: "Boots only", costShare: 0.35 },
  { type: "helmet", label: "Helmet", costShare: 0.18 },
  { type: "poles", label: "Poles", costShare: 0.12 },
  { type: "goggles", label: "Goggles", costShare: 0.15 },
  { type: "jacket", label: "Jacket", costShare: 0.28 },
  { type: "pants", label: "Pants", costShare: 0.28 },
];

export function TripPlanner({ resorts, profile, userCanSave }: Props) {
  const [days, setDays] = useState(initialTripDays);
  const [budget, setBudget] = useState(1200);
  const [abilityLevel, setAbilityLevel] = useState<AbilityLevel>(
    profile?.abilityLevel ?? "intermediate",
  );
  const [rentalItems, setRentalItems] = useState<GearRentalItem[]>(() =>
    profile?.rentsGear
      ? [{ id: "initial-ski-package", type: "ski_package", quantity: 1 }]
      : [],
  );
  const [showLodgingFinder, setShowLodgingFinder] = useState(false);
  const [maxDriveHours, setMaxDriveHours] = useState(10);
  const [preferredRegion, setPreferredRegion] = useState<ResortRegion>("northeast");
  const [homeLocationLabel, setHomeLocationLabel] = useState(profile?.homeLocationLabel ?? "");
  const [selectedIds, setSelectedIds] = useState<string[]>(() =>
    getDefaultSelectedIds(resorts, initialTripDays),
  );
  const [routeDayIds, setRouteDayIds] = useState<string[]>(() =>
    getDefaultRouteDayIds(resorts, initialTripDays),
  );
  const [result, setResult] = useState<TripRecommendationResult | null>(null);
  const [lastRequest, setLastRequest] = useState<TripRecommendationRequest | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedTripId, setSavedTripId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [boardFilters, setBoardFilters] = useState<BoardFilterSnapshot | null>(null);

  const selected = useMemo(
    () => resorts.filter((resort) => selectedIds.includes(resort.id)),
    [resorts, selectedIds],
  );
  const rentsGear = useMemo(
    () => rentalItems.some((item) => item.quantity > 0),
    [rentalItems],
  );

  const effectiveRouteDayIds = useMemo(
    () => reconcileRouteDayIds(routeDayIds, selected, days),
    [days, routeDayIds, selected],
  );
  const tripDraft = useMemo(
    () => buildTripDraft(selected, {
      days,
      budget,
      rentalItems,
      routeDayIds: effectiveRouteDayIds,
    }),
    [budget, days, effectiveRouteDayIds, rentalItems, selected],
  );
  const manualCost = tripDraft.totalCost;
  const selectedRegionCount = selected.filter((resort) => resort.region === preferredRegion).length;
  const visibleBoardResorts = useMemo(
    () =>
      boardFilters
        ? resorts.filter((resort) => resortMatchesBoardFilters(resort, boardFilters))
        : resorts,
    [boardFilters, resorts],
  );
  const routeDayCounts = useMemo(() => countRouteDays(effectiveRouteDayIds), [effectiveRouteDayIds]);
  const rentalMultiplier = useMemo(
    () => getRentalCostMultiplier(rentalItems),
    [rentalItems],
  );

  function applyBoardFilters() {
    setBoardFilters({
      days,
      budget,
      abilityLevel,
      rentalMultiplier,
      maxDriveHours,
      preferredRegion,
      homeLatitude: profile?.homeLatitude,
      homeLongitude: profile?.homeLongitude,
    });
  }

  function updateTripDays(nextDays: number) {
    const boundedDays = Math.min(maxTripDays, Math.max(0, nextDays));
    const fillResorts = selected.length > 0 ? selected : getDefaultBoardResorts(resorts);
    const nextRouteDayIds = reconcileRouteDayIds(effectiveRouteDayIds, fillResorts, boundedDays);

    setDays(boundedDays);
    setRouteDayIds(nextRouteDayIds);
    setSelectedIds(getUniqueIds(nextRouteDayIds));
  }

  function addResortDay(resortId: string) {
    if (effectiveRouteDayIds.length >= maxTripDays) {
      return;
    }

    const nextRouteDayIds = [...effectiveRouteDayIds, resortId];
    setRouteDayIds(nextRouteDayIds);
    setSelectedIds(getUniqueIds(nextRouteDayIds));
    setDays(nextRouteDayIds.length);
  }

  function updateRouteDay(dayIndex: number, resortId: string) {
    const nextRouteDayIds = effectiveRouteDayIds.map((currentResortId, index) =>
      index === dayIndex ? resortId : currentResortId,
    );

    setRouteDayIds(nextRouteDayIds);
    setSelectedIds(getUniqueIds(nextRouteDayIds));
  }

  function moveRouteDay(fromIndex: number, toIndex: number) {
    const nextRouteDayIds = reorderRouteDays(effectiveRouteDayIds, fromIndex, toIndex);
    setRouteDayIds(nextRouteDayIds);
    setSelectedIds(getUniqueIds(nextRouteDayIds));
  }

  function removeRouteDay(dayIndex: number) {
    const nextRouteDayIds = effectiveRouteDayIds.filter((_, index) => index !== dayIndex);
    setRouteDayIds(nextRouteDayIds);
    setSelectedIds(getUniqueIds(nextRouteDayIds));
    setDays(nextRouteDayIds.length);
  }

  function addRentalItem() {
    setRentalItems((current) => [
      ...current,
      createRentalItem(current.length === 0 ? "ski_package" : "helmet"),
    ]);
  }

  function updateRentalItem(
    itemId: string,
    updates: Partial<Pick<GearRentalItem, "type" | "quantity">>,
  ) {
    setRentalItems((current) =>
      current.map((item) =>
        item.id === itemId
          ? {
              ...item,
              ...updates,
              quantity:
                updates.quantity !== undefined
                  ? Math.min(12, Math.max(1, updates.quantity))
                  : item.quantity,
            }
          : item,
      ),
    );
  }

  function removeRentalItem(itemId: string) {
    setRentalItems((current) => current.filter((item) => item.id !== itemId));
  }

  async function requestRecommendation() {
    if (effectiveRouteDayIds.length === 0) {
      setError("Choose at least one resort before generating a plan.");
      return;
    }

    const recommendationResortIds = getUniqueIds(effectiveRouteDayIds);
    const payload: TripRecommendationRequest = {
      days: effectiveRouteDayIds.length,
      abilityLevel,
      rentsGear,
      maxDriveHours,
      preferredRegion,
      resortIds: recommendationResortIds,
      homeLocationLabel: homeLocationLabel.trim() || undefined,
      homeLatitude: profile?.homeLatitude,
      homeLongitude: profile?.homeLongitude,
      budget: {
        maxTotalUsd: budget,
        includeRentals: rentsGear,
        includeLodging: false,
      },
    };

    setIsPending(true);
    setError(null);
    setSaveError(null);
    setSavedTripId(null);

    try {
      const response = await fetch("/api/trips/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Trip recommendation failed");
      }

      setResult(data as TripRecommendationResult);
      setLastRequest(payload);
    } catch (requestError) {
      setResult(null);
      setLastRequest(null);
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Trip recommendation failed",
      );
    } finally {
      setIsPending(false);
    }
  }

  async function saveTrip() {
    if (!result || !lastRequest) return;

    setIsSaving(true);
    setSaveError(null);

    try {
      const response = await fetch("/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ request: lastRequest, result }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Trip could not be saved");
      }

      setSavedTripId(data.tripId);
    } catch (requestError) {
      setSaveError(
        requestError instanceof Error ? requestError.message : "Trip could not be saved",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="slopetrip-planner mx-auto grid max-w-7xl grid-cols-1 gap-4 px-4 py-6 lg:grid-cols-[360px_1fr] lg:px-6">
      <section className="slopetrip-panel rounded-lg border p-5">
        <h1 className="text-2xl font-semibold text-[color:var(--pine)]">Plan Your Trip</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Tune the core constraints and let SlopeTrip compare cost, skill fit, and mountain conditions.
        </p>
        <div className="mt-6 flex flex-col gap-5">
          <Field icon={<CalendarDays className="size-4" />} label="Trip days">
            <Input
              type="number"
              min={0}
              max={maxTripDays}
              value={days}
              onChange={(event) => updateTripDays(Number(event.target.value))}
            />
          </Field>
          <Field icon={<DollarSign className="size-4" />} label="Total budget">
            <Input type="number" min={100} value={budget} onChange={(event) => setBudget(Number(event.target.value))} />
          </Field>
          <Field icon={<MapPinned className="size-4" />} label="Home base">
            <Input
              placeholder="City, state or ZIP"
              value={homeLocationLabel}
              onChange={(event) => setHomeLocationLabel(event.target.value)}
            />
          </Field>
          <Field icon={<Route className="size-4" />} label="Max drive hours">
            <Input
              type="number"
              min={1}
              max={40}
              value={maxDriveHours}
              onChange={(event) => setMaxDriveHours(Number(event.target.value))}
            />
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
          <div className="flex flex-col gap-2">
            <Label>Preferred region</Label>
            <div className="flex flex-wrap gap-2">
              {regions.map((region) => (
                <button
                  key={region}
                  type="button"
                  onClick={() => setPreferredRegion(region)}
                  className={`rounded-md border px-2.5 py-1.5 text-xs font-medium capitalize shadow-sm transition ${
                    preferredRegion === region
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-white/70 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                  }`}
                >
                  {region}
                </button>
              ))}
            </div>
            {selectedRegionCount === 0 && (
              <p className="text-xs text-muted-foreground">
                Your selected resorts are outside this preferred region, so board choices will take priority.
              </p>
            )}
          </div>
          <RentalGearSelector
            items={rentalItems}
            onAddItem={addRentalItem}
            onRemoveItem={removeRentalItem}
            onUpdateItem={updateRentalItem}
          />
          <label className="flex items-center justify-between rounded-md border border-border bg-white/72 p-3 text-sm shadow-sm">
            Show lodging finder?
            <input
              type="checkbox"
              checked={showLodgingFinder}
              onChange={(event) => setShowLodgingFinder(event.target.checked)}
              className="size-4 accent-primary"
            />
          </label>
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <Button type="button" variant="outline" onClick={applyBoardFilters}>
              <Filter className="size-4" />
              Filter board
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Reset board filters"
              onClick={() => setBoardFilters(null)}
              disabled={!boardFilters}
            >
              <RotateCcw className="size-4" />
            </Button>
          </div>
          {error && (
            <p className="rounded-md border border-signal bg-signal/10 p-3 text-sm text-[color:var(--pine)]">
              {error}
            </p>
          )}
          <Button className="bg-[linear-gradient(135deg,var(--signal),#ff9b52)] text-signal-foreground hover:opacity-95" type="button" onClick={requestRecommendation} disabled={isPending || effectiveRouteDayIds.length === 0}>
            <Route />
            {isPending ? "Planning..." : "Plan a trip for me"}
          </Button>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(280px,0.8fr)_minmax(0,1.35fr)]">
        <div className="slopetrip-panel rounded-lg border p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[color:var(--pine)]">Manual trip board</h2>
            <div className="flex items-center gap-2">
              {boardFilters && (
                <Badge variant="secondary">
                  {visibleBoardResorts.length}/{resorts.length}
                </Badge>
              )}
              <Badge variant="outline">${manualCost.toLocaleString()} est.</Badge>
            </div>
          </div>
          <div className="slopetrip-resort-scroll mt-4 max-h-[520px] overflow-y-auto pr-1">
            <div className="flex flex-col gap-3">
            {visibleBoardResorts.map((resort) => {
              const dayCount = routeDayCounts.get(resort.id) ?? 0;

              return (
              <div key={resort.id} className="slopetrip-list-row slopetrip-ticket-edge flex items-center justify-between gap-3 rounded-md border border-border bg-white/72 p-3 shadow-sm">
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-[color:var(--pine)]">{resort.name}</span>
                  <span className="text-xs text-muted-foreground">
                    ${resort.ticketEstimateUsd} ticket - {resort.condition.snowfall7DayIn}&quot; snow - {resort.region}
                  </span>
                </span>
                <div className="flex shrink-0 items-center gap-2">
                  {dayCount > 0 && (
                    <Badge variant="secondary">
                      {dayCount} day{dayCount === 1 ? "" : "s"}
                    </Badge>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addResortDay(resort.id)}
                    disabled={effectiveRouteDayIds.length >= maxTripDays}
                  >
                    <Plus className="size-4" />
                    Add day
                  </Button>
                </div>
              </div>
            );
            })}
            {visibleBoardResorts.length === 0 && (
              <p className="rounded-md border border-dashed border-border bg-white/62 p-4 text-sm text-muted-foreground">
                No resorts match the current board filters.
              </p>
            )}
            {effectiveRouteDayIds.length === 0 && (
              <p className="rounded-md border border-dashed border-border bg-white/62 p-4 text-sm text-muted-foreground">
                Add resorts from the board to build the trip view.
              </p>
            )}
            </div>
          </div>
        </div>

        <div className="slopetrip-panel rounded-lg border p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-[color:var(--pine)]">Trip view</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {selected.length} selected - {tripDraft.regionSummary}
              </p>
            </div>
            <Badge variant={tripDraft.isOverBudget ? "signal" : "outline"}>
              ${tripDraft.totalCost.toLocaleString()}
            </Badge>
          </div>
          {result ? (
            <GeneratedPlanView
              isSaving={isSaving}
              onSaveTrip={saveTrip}
              result={result}
              saveError={saveError}
              savedTripId={savedTripId}
              userCanSave={userCanSave}
            />
          ) : (
            <TripDraftView
              budget={budget}
              days={days}
              draft={tripDraft}
              onMoveRouteDay={moveRouteDay}
              onRemoveRouteDay={removeRouteDay}
              onRouteDayResortChange={updateRouteDay}
              routeDayIds={effectiveRouteDayIds}
              selected={selected}
              showLodgingFinder={showLodgingFinder}
            />
          )}
        </div>
      </section>
    </div>
  );
}

function resortMatchesBoardFilters(resort: Resort, filters: BoardFilterSnapshot) {
  if (resort.region !== filters.preferredRegion) {
    return false;
  }

  if (resort.difficulty[filters.abilityLevel] < minimumAbilityFit) {
    return false;
  }

  const filteredTripCost =
    resort.ticketEstimateUsd * filters.days +
    estimateRentalCost(resort, filters.rentalMultiplier) * filters.days;

  if (filteredTripCost > filters.budget * 1.15) {
    return false;
  }

  if (filters.homeLatitude !== undefined && filters.homeLongitude !== undefined) {
    const miles = haversineMiles(
      { latitude: filters.homeLatitude, longitude: filters.homeLongitude },
      { latitude: resort.latitude, longitude: resort.longitude },
    );

    if (estimateDriveHours(miles) > filters.maxDriveHours) {
      return false;
    }
  }

  return true;
}

function RentalGearSelector({
  items,
  onAddItem,
  onRemoveItem,
  onUpdateItem,
}: {
  items: GearRentalItem[];
  onAddItem: () => void;
  onRemoveItem: (itemId: string) => void;
  onUpdateItem: (
    itemId: string,
    updates: Partial<Pick<GearRentalItem, "type" | "quantity">>,
  ) => void;
}) {
  const totalQuantity = items.reduce((total, item) => total + item.quantity, 0);

  return (
    <div className="rounded-md border border-border bg-white/72 p-3 text-sm shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <Label>Rental gear</Label>
        <Badge variant={totalQuantity > 0 ? "secondary" : "outline"}>
          {totalQuantity > 0 ? `${totalQuantity} item${totalQuantity === 1 ? "" : "s"}` : "None"}
        </Badge>
      </div>
      <div className="mt-3 flex flex-col gap-2">
        {items.map((item) => (
          <div
            key={item.id}
            className="grid grid-cols-[1fr_72px_auto] items-center gap-2"
          >
            <select
              aria-label="Rental gear type"
              value={item.type}
              onChange={(event) =>
                onUpdateItem(item.id, { type: event.target.value as GearRentalType })
              }
              className="h-9 min-w-0 rounded-md border border-border bg-white px-2 text-sm outline-none transition focus:border-primary"
            >
              {rentalGearOptions.map((option) => (
                <option key={option.type} value={option.type}>
                  {option.label}
                </option>
              ))}
            </select>
            <Input
              aria-label="Rental gear quantity"
              type="number"
              min={1}
              max={12}
              value={item.quantity}
              onChange={(event) =>
                onUpdateItem(item.id, { quantity: Number(event.target.value) })
              }
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Remove rental gear"
              onClick={() => onRemoveItem(item.id)}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}
        {items.length === 0 && (
          <p className="rounded-md border border-dashed border-border bg-white/62 p-3 text-xs text-muted-foreground">
            Add only the gear people need to rent for this trip.
          </p>
        )}
        <Button type="button" variant="outline" size="sm" onClick={onAddItem}>
          <Plus className="size-4" />
          Add rental gear
        </Button>
      </div>
    </div>
  );
}

function GeneratedPlanView({
  isSaving,
  onSaveTrip,
  result,
  saveError,
  savedTripId,
  userCanSave,
}: {
  isSaving: boolean;
  onSaveTrip: () => void;
  result: TripRecommendationResult;
  saveError: string | null;
  savedTripId: string | null;
  userCanSave: boolean;
}) {
  return (
    <div className="mt-4 flex flex-col gap-4">
      <div>
        <Badge variant={result.confidence === "model" ? "signal" : "secondary"}>
          {result.confidence === "model" ? "Gemini assisted" : "Demo scoring"}
        </Badge>
        {result.stops.length > 0 && (
          <Badge className="ml-2" variant="outline">
            ${result.totalEstimatedCostUsd.toLocaleString()} total
          </Badge>
        )}
        <h3 className="mt-3 text-xl font-semibold text-[color:var(--pine)]">{result.title}</h3>
        <p className="mt-2 text-sm text-muted-foreground">{result.summary}</p>
      </div>
      {result.stops.length > 0 ? (
        <div className="slopetrip-horizontal-strip">
          {result.stops.map((stop) => (
            <div
              key={`${stop.resortId}-${stop.day}`}
              className="slopetrip-result-stop slopetrip-ticket-edge min-w-[260px] rounded-md border border-border bg-white/72 p-3 shadow-sm"
            >
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
        <div className="rounded-md border border-dashed border-border bg-white/62 p-5 text-sm text-muted-foreground">
          No selected resort fits the current budget. Try raising the budget, turning off rentals, or selecting a lower-cost mountain.
        </div>
      )}
      {result.stops.length > 0 && (
        <div className="flex flex-col gap-2 border-t border-border/70 pt-4">
          {userCanSave ? (
            <Button type="button" onClick={onSaveTrip} disabled={isSaving || !!savedTripId}>
              <Save className="size-4" />
              {savedTripId ? "Trip saved" : isSaving ? "Saving..." : "Save this trip"}
            </Button>
          ) : (
            <Link href="/login">
              <Button className="w-full" variant="outline" type="button">
                Login to save trips
              </Button>
            </Link>
          )}
          {savedTripId && (
            <Link className="inline-flex items-center gap-2 text-sm font-medium text-primary" href={`/trips/${savedTripId}`}>
              View saved trip <ExternalLink className="size-4" />
            </Link>
          )}
          {saveError && (
            <p className="rounded-md border border-signal bg-signal/10 p-3 text-sm">
              {saveError}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

type TripDraft = {
  ticketCost: number;
  rentalCost: number;
  totalCost: number;
  remainingBudget: number;
  isOverBudget: boolean;
  regionSummary: string;
  dayPlan: Array<{
    day: number;
    resort: Resort;
  }>;
  resortDayGroups: Array<{
    resort: Resort;
    days: number[];
    ticketCost: number;
    rentalCost: number;
    totalCost: number;
  }>;
};

function TripDraftView({
  budget,
  days,
  draft,
  onMoveRouteDay,
  onRemoveRouteDay,
  onRouteDayResortChange,
  routeDayIds,
  selected,
  showLodgingFinder,
}: {
  budget: number;
  days: number;
  draft: TripDraft;
  onMoveRouteDay: (fromIndex: number, toIndex: number) => void;
  onRemoveRouteDay: (dayIndex: number) => void;
  onRouteDayResortChange: (dayIndex: number, resortId: string) => void;
  routeDayIds: string[];
  selected: Resort[];
  showLodgingFinder: boolean;
}) {
  const [draggedDayIndex, setDraggedDayIndex] = useState<number | null>(null);

  if (selected.length === 0) {
    return (
      <div className="mt-4 rounded-md border border-dashed border-border bg-white/62 p-5 text-sm text-muted-foreground">
        Select resorts from the manual board to build a live trip view.
      </div>
    );
  }

  return (
    <div className="mt-4 flex flex-col gap-4">
      <div className="slopetrip-horizontal-strip">
        <DraftMetric label="Tickets" value={`$${draft.ticketCost.toLocaleString()}`} />
        <DraftMetric label="Rentals" value={`$${draft.rentalCost.toLocaleString()}`} />
        <DraftMetric label="Lodging" value="Finder only" />
        <DraftMetric
          label={draft.isOverBudget ? "Over budget" : "Remaining"}
          value={`$${Math.abs(draft.remainingBudget).toLocaleString()}`}
          tone={draft.isOverBudget ? "signal" : "default"}
        />
      </div>

      <div className="rounded-md border border-border bg-white/72 p-3 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-medium text-[color:var(--pine)]">Budget fit</span>
          <Badge variant={draft.isOverBudget ? "signal" : "secondary"}>
            {draft.isOverBudget ? "Needs trimming" : "Within budget"}
          </Badge>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-secondary">
          <span
            className={`block h-full rounded-full ${draft.isOverBudget ? "bg-signal" : "bg-primary"}`}
            style={{ width: `${Math.min(100, (draft.totalCost / Math.max(1, budget)) * 100)}%` }}
          />
        </div>
      </div>

      <RouteStayBlocks
        dayGroups={draft.resortDayGroups}
        showLodgingFinder={showLodgingFinder}
      />

      <div className="rounded-md border border-border bg-white/72 p-3 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-[color:var(--pine)]">{days}-day day rail</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Move days around here; repeat-day totals live in the stay blocks.
            </p>
          </div>
          <Badge variant="outline">{draft.dayPlan.length} modules</Badge>
        </div>
        <div className="slopetrip-horizontal-strip mt-3">
          {draft.dayPlan.map(({ day, resort }, index) => {
            const resortDayCount =
              draft.resortDayGroups.find((group) => group.resort.id === resort.id)?.days.length ?? 1;

            return (
              <div
                key={`${day}-${routeDayIds[index] ?? resort.id}`}
                draggable
                onDragStart={() => setDraggedDayIndex(index)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => {
                  if (draggedDayIndex !== null && draggedDayIndex !== index) {
                    onMoveRouteDay(draggedDayIndex, index);
                  }
                  setDraggedDayIndex(null);
                }}
                onDragEnd={() => setDraggedDayIndex(null)}
                className={`slopetrip-route-day grid min-w-[380px] grid-cols-[32px_58px_minmax(0,1fr)_auto_auto] items-center gap-2 rounded-md border border-border bg-white/70 px-2 py-2 text-sm transition ${
                  draggedDayIndex === index ? "opacity-60" : ""
                }`}
              >
                <span className="flex size-8 cursor-grab items-center justify-center rounded-md text-muted-foreground active:cursor-grabbing">
                  <GripVertical className="size-4" />
                </span>
                <span className="font-medium text-muted-foreground">Day {day}</span>
                <div className="min-w-0">
                  <select
                    aria-label={`Resort for day ${day}`}
                    value={resort.id}
                    onChange={(event) => onRouteDayResortChange(index, event.target.value)}
                    className="h-9 w-full min-w-0 rounded-md border border-border bg-white px-2 text-sm font-medium text-[color:var(--pine)] shadow-sm outline-none transition focus:border-primary"
                  >
                    {selected.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-1">
                  <Badge variant={resortDayCount > 1 ? "secondary" : "outline"}>
                    {resortDayCount > 1 ? `${resortDayCount} days` : resort.state}
                  </Badge>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label={`Move day ${day} earlier`}
                    onClick={() => onMoveRouteDay(index, index - 1)}
                    disabled={index === 0}
                  >
                    <ArrowUp className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label={`Move day ${day} later`}
                    onClick={() => onMoveRouteDay(index, index + 1)}
                    disabled={index === draft.dayPlan.length - 1}
                  >
                    <ArrowDown className="size-4" />
                  </Button>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Remove day ${day}`}
                  onClick={() => onRemoveRouteDay(index)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-md border border-border bg-white/72 p-3 shadow-sm">
        <h3 className="text-sm font-semibold text-[color:var(--pine)]">Selected mountains</h3>
        <div className="slopetrip-horizontal-strip mt-3">
          {selected.map((resort) => (
            <div key={resort.id} className="slopetrip-selected-mountain flex min-w-[280px] items-start justify-between gap-3 rounded-md border border-border bg-white/70 p-3 text-sm">
              <div>
                <p className="font-medium text-[color:var(--pine)]">{resort.name}</p>
                <p className="text-xs text-muted-foreground">
                  {resort.region} - {resort.difficulty.beginner}% beginner / {resort.difficulty.intermediate}% intermediate / {resort.difficulty.expert}% expert
                </p>
              </div>
              <Badge variant="outline">
                {draft.resortDayGroups.find((group) => group.resort.id === resort.id)?.days.length ?? 0} days
              </Badge>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

function DraftMetric({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "signal";
}) {
  return (
    <div className="min-w-[150px] rounded-md border border-border bg-white/72 p-3 shadow-sm">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-1 font-semibold ${tone === "signal" ? "text-signal" : "text-[color:var(--pine)]"}`}>
        {value}
      </p>
    </div>
  );
}

function buildTripDraft(
  selected: Resort[],
  options: {
    days: number;
    budget: number;
    rentalItems: GearRentalItem[];
    routeDayIds: string[];
  },
): TripDraft {
  const routeDayIds = reconcileRouteDayIds(options.routeDayIds, selected, options.days);
  const resortById = new Map(selected.map((resort) => [resort.id, resort]));
  const dayPlan = routeDayIds
    .map((resortId, index) => {
      const resort = resortById.get(resortId);
      return resort ? { day: index + 1, resort } : null;
    })
    .filter((item): item is { day: number; resort: Resort } => Boolean(item));
  const ticketCost = dayPlan.reduce((total, { resort }) => total + resort.ticketEstimateUsd, 0);
  const rentalMultiplier = getRentalCostMultiplier(options.rentalItems);
  const rentalCost = dayPlan.reduce(
    (total, { resort }) => total + estimateRentalCost(resort, rentalMultiplier),
    0,
  );
  const totalCost = ticketCost + rentalCost;
  const remainingBudget = options.budget - totalCost;
  const resortDayGroups = Array.from(
    dayPlan.reduce((groups, { day, resort }) => {
      const current = groups.get(resort.id) ?? {
        resort,
        days: [],
        ticketCost: 0,
        rentalCost: 0,
        totalCost: 0,
      };
      current.days.push(day);
      current.ticketCost += resort.ticketEstimateUsd;
      current.rentalCost += estimateRentalCost(resort, rentalMultiplier);
      current.totalCost = current.ticketCost + current.rentalCost;
      groups.set(resort.id, current);
      return groups;
    }, new Map<string, { resort: Resort; days: number[]; ticketCost: number; rentalCost: number; totalCost: number }>()),
  ).map(([, group]) => group);

  return {
    ticketCost,
    rentalCost,
    totalCost,
    remainingBudget,
    isOverBudget: remainingBudget < 0,
    regionSummary: summarizeRegions(selected),
    dayPlan,
    resortDayGroups,
  };
}

function reconcileRouteDayIds(current: string[], selected: Resort[], days: number) {
  const selectedIds = selected.map((resort) => resort.id);

  if (selectedIds.length === 0 || days <= 0) {
    return [];
  }

  const selectedIdSet = new Set(selectedIds);
  const usableCurrent = current.filter((resortId) => selectedIdSet.has(resortId));

  return Array.from(
    { length: days },
    (_, index) => usableCurrent[index] ?? selectedIds[index % selectedIds.length],
  );
}

function createRentalItem(type: GearRentalType): GearRentalItem {
  return {
    id: `rental-${type}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    type,
    quantity: 1,
  };
}

function getRentalCostMultiplier(items: GearRentalItem[]) {
  return items.reduce((total, item) => {
    const option = rentalGearOptions.find((gearOption) => gearOption.type === item.type);
    return total + (option?.costShare ?? 0) * item.quantity;
  }, 0);
}

function estimateRentalCost(resort: Resort, rentalMultiplier: number) {
  return Math.round(resort.rentalEstimateUsd * rentalMultiplier);
}

function getDefaultBoardResorts(resorts: Resort[]) {
  const regionalResorts = resorts.filter((resort) => resort.region === "northeast").slice(0, 2);
  return regionalResorts.length > 0 ? regionalResorts : resorts.slice(0, 2);
}

function getDefaultRouteDayIds(resorts: Resort[], days: number) {
  return reconcileRouteDayIds([], getDefaultBoardResorts(resorts), days);
}

function getDefaultSelectedIds(resorts: Resort[], days: number) {
  return getUniqueIds(getDefaultRouteDayIds(resorts, days));
}

function getUniqueIds(ids: string[]) {
  return Array.from(new Set(ids));
}

function countRouteDays(routeDayIds: string[]) {
  return routeDayIds.reduce((counts, resortId) => {
    counts.set(resortId, (counts.get(resortId) ?? 0) + 1);
    return counts;
  }, new Map<string, number>());
}

function reorderRouteDays(current: string[], fromIndex: number, toIndex: number) {
  if (
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= current.length ||
    toIndex >= current.length ||
    fromIndex === toIndex
  ) {
    return current;
  }

  const next = [...current];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

function RouteStayBlocks({
  dayGroups,
  showLodgingFinder,
}: {
  dayGroups: Array<{
    resort: Resort;
    days: number[];
    ticketCost: number;
    rentalCost: number;
    totalCost: number;
  }>;
  showLodgingFinder: boolean;
}) {
  return (
    <div className="rounded-md border border-border bg-white/72 p-3 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-[color:var(--pine)]">
          <Ticket className="size-4" />
          Resort stay blocks
        </h3>
        <Badge variant="outline">
          {dayGroups.length} stop{dayGroups.length === 1 ? "" : "s"}
        </Badge>
      </div>
      <div className="slopetrip-horizontal-strip mt-3">
        {dayGroups.map(({ resort, days, rentalCost, ticketCost, totalCost }) => (
          <div
            key={resort.id}
            className="slopetrip-stay-block min-w-[260px] rounded-md border border-border bg-white/70 p-3 text-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-medium text-[color:var(--pine)]">{resort.name}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {days.map((day) => (
                    <span
                      key={`${resort.id}-${day}`}
                      className="rounded-md border border-border bg-white px-2 py-1 text-xs font-medium text-[color:var(--pine)]"
                    >
                      Day {day}
                    </span>
                  ))}
                </div>
              </div>
              <Badge variant={days.length > 1 ? "secondary" : "outline"}>
                {days.length} day{days.length === 1 ? "" : "s"}
              </Badge>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              <span>${ticketCost.toLocaleString()} tickets</span>
              <span>${rentalCost.toLocaleString()} rentals</span>
            </div>
            <div className="mt-3 flex items-center justify-between gap-3 border-t border-border/70 pt-3">
              <span className="text-xs text-muted-foreground">
                ${totalCost.toLocaleString()} skiing subtotal
              </span>
              {showLodgingFinder && (
                <a
                  className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-border bg-white px-2.5 text-xs font-medium transition hover:border-primary/50 hover:text-primary"
                  href={buildLodgingSearchUrl(resort)}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Bed className="size-3.5" />
                  <Search className="size-3.5" />
                  Lodging
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function buildLodgingSearchUrl(resort: Resort) {
  const query = encodeURIComponent(`best lodging near ${resort.name} ${resort.state}`);
  return `https://www.google.com/search?q=${query}`;
}

function summarizeRegions(selected: Resort[]) {
  if (selected.length === 0) return "no resorts selected";

  const regions = new Map<ResortRegion, number>();
  selected.forEach((resort) => {
    regions.set(resort.region, (regions.get(resort.region) ?? 0) + 1);
  });

  return Array.from(regions.entries())
    .map(([region, count]) => `${count} ${region}`)
    .join(", ");
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
