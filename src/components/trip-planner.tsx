"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type * as Leaflet from "leaflet";
import {
  ArrowDown,
  ArrowUp,
  Bed,
  CalendarDays,
  Car,
  ChevronDown,
  DollarSign,
  ExternalLink,
  Filter,
  Fuel,
  GripVertical,
  HeartHandshake,
  MapPinned,
  Plane,
  Plus,
  RotateCcw,
  Route,
  Save,
  Search,
  ShieldCheck,
  Ticket,
  Trash2,
  Utensils,
  Users,
  X,
} from "lucide-react";
import type {
  AbilityLevel,
  PlannerTripSeed,
  Resort,
  ResortPassAffiliation,
  ResortRegion,
  TripCostAssumptions,
  TripGroupPlan,
  TripRecommendationRequest,
  TripRecommendationResult,
  UserSkiProfile,
} from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ToggleChip } from "@/components/ui/toggle-chip";
import { getConditionFreshness, getConditionSourceLabel } from "@/lib/conditions";
import { geocodeLocationLabel } from "@/lib/geocode";
import { estimateDriveHours, haversineMiles } from "@/lib/recommendation";
import {
  bookingPriorityLabels,
  getGroupPlan,
  getGroupSize,
  getPerPersonCost,
  getReadinessItems,
  getReadinessScore,
  getSkierCount,
  lodgingPreferenceLabels,
  transportModeLabels,
} from "@/lib/trip-insights";

type Props = {
  resorts: Resort[];
  initialTrip?: PlannerTripSeed;
  profile?: UserSkiProfile | null;
  userCanSave: boolean;
};

const regions: ResortRegion[] = ["northeast", "midwest", "rockies", "west", "pacific"];
const minimumAbilityFit = 20;
const initialTripDays = 3;
const maxTripDays = 14;
const mobileSteps = [
  { key: "constraints", label: "Setup" },
  { key: "board", label: "Resorts" },
  { key: "route", label: "Route" },
  { key: "review", label: "Review" },
] as const;

type BoardFilterSnapshot = {
  days: number;
  budget: number;
  abilityLevel: AbilityLevel;
  rentalMultiplier: number;
  maxDriveHours: number;
  preferredRegion: ResortRegion;
  passAffiliations: ResortPassAffiliation[];
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

export function TripPlanner({ resorts, initialTrip, profile, userCanSave }: Props) {
  const initialRouteDayIds = useMemo(
    () => getInitialRouteDayIds(resorts, initialTrip),
    [initialTrip, resorts],
  );
  const initialDays = initialTrip?.days ?? initialTripDays;
  const initialAssumptions = initialTrip?.assumptions ?? {};
  const [days, setDays] = useState(initialDays);
  const [budget, setBudget] = useState(initialTrip?.budgetUsd ?? 1200);
  const [abilityLevel, setAbilityLevel] = useState<AbilityLevel>(
    initialTrip?.abilityLevel ?? profile?.abilityLevel ?? "intermediate",
  );
  const [rentalItems, setRentalItems] = useState<GearRentalItem[]>(() =>
    initialTrip?.includeRentals || profile?.rentsGear
      ? [{ id: "initial-ski-package", type: "ski_package", quantity: 1 }]
      : [],
  );
  const [showLodgingFinder, setShowLodgingFinder] = useState(initialTrip?.includeLodging ?? false);
  const [includeLodging, setIncludeLodging] = useState(initialTrip?.includeLodging ?? false);
  const [lodgingNightlyUsd, setLodgingNightlyUsd] = useState(initialAssumptions.lodgingNightlyUsd ?? 180);
  const [foodDailyUsd, setFoodDailyUsd] = useState(initialAssumptions.foodDailyUsd ?? 55);
  const [parkingDailyUsd, setParkingDailyUsd] = useState(initialAssumptions.parkingDailyUsd ?? 25);
  const [fuelEstimateUsd, setFuelEstimateUsd] = useState(initialAssumptions.fuelEstimateUsd ?? 120);
  const [rentalCarDailyUsd, setRentalCarDailyUsd] = useState(initialAssumptions.rentalCarDailyUsd ?? 0);
  const initialGroupPlan = getGroupPlan(initialAssumptions);
  const [adultCount, setAdultCount] = useState(initialGroupPlan.adults);
  const [kidCount, setKidCount] = useState(initialGroupPlan.kids);
  const [nonSkierCount, setNonSkierCount] = useState(initialGroupPlan.nonSkiers);
  const [passHolderCount, setPassHolderCount] = useState(initialGroupPlan.passHolders);
  const [lodgingPreference, setLodgingPreference] =
    useState<TripGroupPlan["lodgingPreference"]>(initialGroupPlan.lodgingPreference);
  const [transportMode, setTransportMode] =
    useState<TripGroupPlan["transportMode"]>(initialGroupPlan.transportMode);
  const [bookingPriority, setBookingPriority] =
    useState<TripGroupPlan["bookingPriority"]>(initialGroupPlan.bookingPriority);
  const [mobileStep, setMobileStep] = useState<"constraints" | "board" | "route" | "review">("constraints");
  const [maxDriveHours, setMaxDriveHours] = useState(10);
  const [preferredRegion, setPreferredRegion] = useState<ResortRegion>("northeast");
  const [homeLocationLabel, setHomeLocationLabel] = useState(
    initialTrip?.originLabel ?? profile?.homeLocationLabel ?? "",
  );
  const [selectedIds, setSelectedIds] = useState<string[]>(() => getUniqueIds(initialRouteDayIds));
  const [routeDayIds, setRouteDayIds] = useState<string[]>(() => initialRouteDayIds);
  const [result, setResult] = useState<TripRecommendationResult | null>(null);
  const [lastRequest, setLastRequest] = useState<TripRecommendationRequest | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedTripId, setSavedTripId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [boardFilters, setBoardFilters] = useState<BoardFilterSnapshot | null>(null);
  const [isFinalizeOpen, setIsFinalizeOpen] = useState(false);
  const [isFinalized, setIsFinalized] = useState(false);

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
  const costAssumptions = useMemo<TripCostAssumptions>(
    () => ({
      lodgingNightlyUsd,
      foodDailyUsd,
      parkingDailyUsd,
      fuelEstimateUsd,
      rentalCarDailyUsd,
      groupPlan: {
        adults: adultCount,
        kids: kidCount,
        nonSkiers: nonSkierCount,
        passHolders: passHolderCount,
        lodgingPreference,
        transportMode,
        bookingPriority,
      },
    }),
    [
      adultCount,
      bookingPriority,
      foodDailyUsd,
      fuelEstimateUsd,
      kidCount,
      lodgingNightlyUsd,
      lodgingPreference,
      nonSkierCount,
      parkingDailyUsd,
      passHolderCount,
      rentalCarDailyUsd,
      transportMode,
    ],
  );
  const groupPlan = getGroupPlan(costAssumptions);
  const tripDraft = useMemo(
    () => buildTripDraft(selected, {
      days,
      budget,
      costAssumptions,
      includeLodging,
      passAffiliations: profile?.passAffiliations ?? [],
      rentalItems,
      routeDayIds: effectiveRouteDayIds,
    }),
    [budget, costAssumptions, days, effectiveRouteDayIds, includeLodging, profile?.passAffiliations, rentalItems, selected],
  );
  const finalizationSummary = useMemo(
    () =>
      buildTripFinalizationSummary({
        budget,
        draft: tripDraft,
        groupPlan,
        homeLocationLabel,
        includeLodging,
        initialTripTitle: initialTrip?.title,
        maxDriveHours,
        result,
      }),
    [budget, groupPlan, homeLocationLabel, includeLodging, initialTrip?.title, maxDriveHours, result, tripDraft],
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
  const geocodedOrigin = useMemo(
    () => geocodeLocationLabel(homeLocationLabel),
    [homeLocationLabel],
  );
  const originLatitude =
    geocodedOrigin?.latitude ?? initialTrip?.originLatitude ?? profile?.homeLatitude;
  const originLongitude =
    geocodedOrigin?.longitude ?? initialTrip?.originLongitude ?? profile?.homeLongitude;
  const passAffiliations = profile?.passAffiliations ?? [];

  function applyBoardFilters() {
    setBoardFilters({
      days,
      budget,
      abilityLevel,
      rentalMultiplier,
      maxDriveHours,
      preferredRegion,
      passAffiliations,
      homeLatitude: originLatitude,
      homeLongitude: originLongitude,
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
      passAffiliations,
      resortIds: recommendationResortIds,
      homeLocationLabel: homeLocationLabel.trim() || undefined,
      homeLatitude: originLatitude,
      homeLongitude: originLongitude,
      budget: {
        maxTotalUsd: budget,
        includeRentals: rentsGear,
        includeLodging,
        assumptions: costAssumptions,
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
        body: JSON.stringify({ request: lastRequest, result, sourceTripId: initialTrip?.id }),
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
    <div className="slopetrip-planner mx-auto flex max-w-[1680px] flex-col gap-3 px-4 py-4 lg:h-[calc(100vh-4rem)] lg:overflow-hidden lg:px-6">
      <header className="slopetrip-panel shrink-0 rounded-lg border p-3">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-[color:var(--pine)]">
              Plan Your Trip
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              {initialTrip
                ? `Editing ${initialTrip.title}. Review the board, route, map, and totals before saving a new version.`
                : "Build an ordered resort itinerary, check the route, and review the trip before booking."}
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="grid grid-cols-3 gap-2 text-sm sm:min-w-[360px]">
              <HeaderMetric label="Days" value={String(tripDraft.dayPlan.length)} />
              <HeaderMetric label="Resorts" value={String(tripDraft.resortDayGroups.length)} />
              <HeaderMetric label="Estimate" value={`$${tripDraft.totalCost.toLocaleString()}`} />
            </div>
            <Button
              className="bg-[linear-gradient(135deg,var(--signal),#ff9b52)] text-signal-foreground hover:opacity-95"
              type="button"
              onClick={() => setIsFinalizeOpen(true)}
            >
              <ShieldCheck className="size-4" />
              Finalize Trip
            </Button>
          </div>
        </div>
      </header>

      <div className="slopetrip-mobile-stepper sticky top-[7.5rem] z-30 grid grid-cols-4 gap-2 rounded-lg border border-border bg-white/88 p-2 shadow-sm backdrop-blur lg:hidden" role="tablist" aria-label="Planner steps">
        {mobileSteps.map((step) => (
          <Button
            key={step.key}
            aria-selected={mobileStep === step.key}
            type="button"
            variant={mobileStep === step.key ? "default" : "outline"}
            size="sm"
            role="tab"
            onClick={() => setMobileStep(step.key)}
          >
            {step.label}
          </Button>
        ))}
      </div>

      <div className="slopetrip-workbench grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-[300px_minmax(0,1fr)] lg:overflow-hidden xl:grid-cols-[300px_minmax(420px,1fr)_390px]">
      <section aria-busy={isPending} className={`${mobileStep === "constraints" ? "flex" : "hidden"} slopetrip-panel slopetrip-workbench-panel min-h-0 flex-col rounded-lg border p-3 lg:flex lg:overflow-hidden`}>
        <div className="shrink-0">
          <h2 className="text-lg font-semibold text-[color:var(--pine)]">Plan Your Trip</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Set the core constraints. Advanced details stay tucked away until needed.
          </p>
        </div>
        <div className="slopetrip-module-scroll mt-3 flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-2">
          <div className="grid grid-cols-2 gap-2">
            <Field icon={<CalendarDays className="size-4" />} label="Trip days">
              <Input
                type="number"
                min={0}
                max={maxTripDays}
                value={days}
                onChange={(event) =>
                  updateTripDays(parseBoundedNumber(event.currentTarget.value, days, 0, maxTripDays))
                }
              />
            </Field>
            <Field icon={<DollarSign className="size-4" />} label="Budget">
              <Input
                type="number"
                min={100}
                value={budget}
                onChange={(event) =>
                  setBudget(parseBoundedNumber(event.currentTarget.value, budget, 100))
                }
              />
            </Field>
          </div>
          <Field icon={<MapPinned className="size-4" />} label="Home base">
            <Input
              placeholder="City, state or ZIP"
              value={homeLocationLabel}
              onChange={(event) => setHomeLocationLabel(event.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              {originLatitude && originLongitude
                ? `${geocodedOrigin?.label ?? "Saved profile origin"} used for drive estimates.`
                : "Add a recognizable city, state, or ZIP to improve drive estimates."}
            </p>
          </Field>
          <Field icon={<Route className="size-4" />} label="Max drive hours">
            <Input
              type="number"
              min={1}
              max={40}
              value={maxDriveHours}
              onChange={(event) =>
                setMaxDriveHours(parseBoundedNumber(event.currentTarget.value, maxDriveHours, 1, 40))
              }
            />
          </Field>
          <div className="flex flex-col gap-2">
            <Label>Ability level</Label>
            <div className="grid grid-cols-3 gap-2" role="group" aria-label="Ability level">
              {(["beginner", "intermediate", "expert"] as AbilityLevel[]).map((level) => (
                <Button
                  key={level}
                  aria-pressed={abilityLevel === level}
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
            <div className="flex flex-wrap gap-2" role="group" aria-label="Preferred region">
              {regions.map((region) => (
                <ToggleChip
                  key={region}
                  onClick={() => setPreferredRegion(region)}
                  pressed={preferredRegion === region}
                >
                  {region}
                </ToggleChip>
              ))}
            </div>
            {selectedRegionCount === 0 && (
              <p className="text-xs text-muted-foreground">
                Your selected resorts are outside this preferred region, so board choices will take priority.
              </p>
            )}
          </div>
          <PlannerConfigSection
            label="Group and family"
            value={`${getGroupSize(groupPlan)} people`}
          >
            <GroupPlanInputs
              adultCount={adultCount}
              bookingPriority={bookingPriority}
              kidCount={kidCount}
              lodgingPreference={lodgingPreference}
              nonSkierCount={nonSkierCount}
              onAdultCountChange={setAdultCount}
              onBookingPriorityChange={setBookingPriority}
              onKidCountChange={setKidCount}
              onLodgingPreferenceChange={setLodgingPreference}
              onNonSkierCountChange={setNonSkierCount}
              onPassHolderCountChange={setPassHolderCount}
              onTransportModeChange={setTransportMode}
              passHolderCount={passHolderCount}
              transportMode={transportMode}
            />
          </PlannerConfigSection>
          <PlannerConfigSection label="Rental gear" value={rentsGear ? "Included" : "None"}>
            <RentalGearSelector
              items={rentalItems}
              onAddItem={addRentalItem}
              onRemoveItem={removeRentalItem}
              onUpdateItem={updateRentalItem}
            />
          </PlannerConfigSection>
          <PlannerConfigSection
            label="Cost assumptions"
            value={includeLodging ? "Lodging included" : "No lodging"}
          >
            <TripCostModel
              foodDailyUsd={foodDailyUsd}
              fuelEstimateUsd={fuelEstimateUsd}
              includeLodging={includeLodging}
              lodgingNightlyUsd={lodgingNightlyUsd}
              onFoodDailyUsdChange={setFoodDailyUsd}
              onFuelEstimateUsdChange={setFuelEstimateUsd}
              onIncludeLodgingChange={setIncludeLodging}
              onLodgingNightlyUsdChange={setLodgingNightlyUsd}
              onParkingDailyUsdChange={setParkingDailyUsd}
              onRentalCarDailyUsdChange={setRentalCarDailyUsd}
              parkingDailyUsd={parkingDailyUsd}
              rentalCarDailyUsd={rentalCarDailyUsd}
            />
          </PlannerConfigSection>
          {passAffiliations.length > 0 && (
            <p className="rounded-md border border-border bg-white/72 p-3 text-xs text-muted-foreground shadow-sm">
              Pass ownership applied: {passAffiliations.map(formatPassAffiliation).join(", ")}.
            </p>
          )}
          <label className="flex items-center justify-between rounded-md border border-border bg-white/72 p-2.5 text-sm shadow-sm">
            Show lodging finder?
            <input
              type="checkbox"
              checked={showLodgingFinder}
              onChange={(event) => setShowLodgingFinder(event.target.checked)}
              className="size-4 accent-primary"
            />
          </label>
          <div className="grid grid-cols-[1fr_44px] gap-2">
            <Button className="justify-center" type="button" variant="outline" onClick={applyBoardFilters}>
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
            <p className="rounded-md border border-signal bg-signal/10 p-3 text-sm text-[color:var(--pine)]" role="alert">
              {error}
            </p>
          )}
          <Button aria-live="polite" className="mt-1 w-full bg-[linear-gradient(135deg,var(--signal),#ff9b52)] text-signal-foreground hover:opacity-95" type="button" onClick={requestRecommendation} disabled={isPending || effectiveRouteDayIds.length === 0}>
            <Route />
            {isPending ? "Planning..." : "Plan a trip for me"}
          </Button>
        </div>
      </section>

      <section className={`${mobileStep === "board" || mobileStep === "review" ? "grid" : "hidden"} min-h-0 gap-3 lg:grid lg:grid-rows-[minmax(0,1fr)_minmax(0,1fr)] lg:overflow-hidden`}>
        <div className="slopetrip-panel min-h-[420px] flex-col rounded-lg border p-3 lg:flex lg:min-h-0 lg:overflow-hidden">
          <div className="flex shrink-0 items-center justify-between">
            <h2 className="text-lg font-semibold text-[color:var(--pine)]">Manual Trip Board</h2>
            <div className="flex items-center gap-2">
              {boardFilters && (
                <Badge variant="secondary">
                  {visibleBoardResorts.length}/{resorts.length}
                </Badge>
              )}
              <Badge variant="outline">${manualCost.toLocaleString()} est.</Badge>
            </div>
          </div>
          <div className="slopetrip-resort-scroll slopetrip-module-scroll mt-3 min-h-0 flex-1 overflow-y-auto pr-1">
            <div className="flex flex-col gap-2">
            {visibleBoardResorts.map((resort) => {
              const dayCount = routeDayCounts.get(resort.id) ?? 0;
              const freshness = getConditionFreshness(resort.condition);

              return (
              <div key={resort.id} className="slopetrip-list-row slopetrip-ticket-edge grid gap-3 rounded-md border border-border bg-white/72 p-3 shadow-sm sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-[color:var(--pine)]">{resort.name}</span>
                  <span className="text-xs text-muted-foreground">
                    ${getPassAdjustedTicketCost(resort, passAffiliations)} ticket - {resort.condition.snowfall7DayIn}&quot; snow - {freshness.label} {getConditionSourceLabel(resort.condition.source)}
                  </span>
                  <span className="mt-2 flex flex-wrap gap-1.5">
                    {getResortTradeoffLabels(resort).map((label) => (
                      <Badge key={label} variant="outline">
                        {label}
                      </Badge>
                    ))}
                  </span>
                </span>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  {dayCount > 0 && (
                    <Badge variant="secondary">
                      {dayCount} day{dayCount === 1 ? "" : "s"}
                    </Badge>
                  )}
                  <Button
                    className="w-full sm:w-auto"
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

        <div className="slopetrip-panel min-h-[420px] flex-col rounded-lg border p-3 lg:flex lg:min-h-0 lg:overflow-hidden">
          <div className="flex shrink-0 items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-[color:var(--pine)]">Ordered Itinerary</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {selected.length} selected - {tripDraft.regionSummary}
              </p>
            </div>
            <Badge variant={tripDraft.isOverBudget ? "signal" : "outline"}>
              ${tripDraft.totalCost.toLocaleString()}
            </Badge>
          </div>
          <div className="slopetrip-module-scroll mt-3 min-h-0 flex-1 overflow-y-auto pr-1">
            {result ? (
              <GeneratedPlanView
                isEditing={!!initialTrip}
                isSaving={isSaving}
                onSaveTrip={saveTrip}
                groupPlan={groupPlan}
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
                groupPlan={groupPlan}
                onMoveRouteDay={moveRouteDay}
                onRemoveRouteDay={removeRouteDay}
                onRouteDayResortChange={updateRouteDay}
                routeDayIds={effectiveRouteDayIds}
                selected={selected}
                showLodgingFinder={showLodgingFinder}
              />
            )}
          </div>
        </div>
      </section>

      <aside className={`${mobileStep === "route" || mobileStep === "review" ? "grid" : "hidden"} min-h-0 gap-3 lg:grid lg:grid-rows-[minmax(0,1fr)_auto] lg:overflow-hidden`}>
        <TripPathMap dayPlan={tripDraft.dayPlan} />
        <TripReviewPanel
          budget={budget}
          draft={tripDraft}
          groupPlan={groupPlan}
          onFinalize={() => setIsFinalizeOpen(true)}
        />
      </aside>
      </div>

      {isFinalizeOpen && (
        <FinalizeTripModal
          isFinalized={isFinalized}
          onClose={() => setIsFinalizeOpen(false)}
          onConfirm={() => setIsFinalized(true)}
          onSaveDraft={result && lastRequest ? saveTrip : undefined}
          saveDraftDisabled={Boolean(savedTripId) || isSaving}
          saveDraftLabel={
            savedTripId
              ? "Draft saved"
              : isSaving
                ? "Saving..."
                : result && lastRequest
                  ? "Save draft"
                  : "Save draft unavailable"
          }
          saveError={saveError}
          summary={finalizationSummary}
          userCanSave={userCanSave}
        />
      )}
    </div>
  );
}

function HeaderMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-white/72 px-3 py-2 shadow-sm">
      <p className="text-[11px] font-medium uppercase text-muted-foreground">{label}</p>
      <p className="mt-0.5 truncate text-sm font-semibold text-[color:var(--pine)]">{value}</p>
    </div>
  );
}

function TripPathMap({ dayPlan }: { dayPlan: TripDraft["dayPlan"] }) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const leafletRef = useRef<typeof Leaflet | null>(null);
  const leafletMapRef = useRef<Leaflet.Map | null>(null);
  const layerRef = useRef<Leaflet.LayerGroup | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const routeStops = useMemo(
    () => dayPlan.filter(({ resort }) => hasCoordinates(resort)),
    [dayPlan],
  );
  const missingCoordinateCount = dayPlan.length - routeStops.length;

  useEffect(() => {
    if (!mapRef.current || leafletMapRef.current) return;
    let isMounted = true;

    async function createMap() {
      const L = await import("leaflet");
      if (!isMounted || !mapRef.current) return;

      const map = L.map(mapRef.current, {
        center: [39.5, -98.35],
        zoom: 4,
        minZoom: 3,
        maxZoom: 12,
        zoomControl: true,
        scrollWheelZoom: false,
      });

      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);

      leafletRef.current = L;
      layerRef.current = L.layerGroup().addTo(map);
      leafletMapRef.current = map;
      window.setTimeout(() => map.invalidateSize(), 0);
      setMapReady(true);
    }

    createMap();

    return () => {
      isMounted = false;
      setMapReady(false);
      leafletMapRef.current?.remove();
      leafletRef.current = null;
      leafletMapRef.current = null;
      layerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const L = leafletRef.current;
    const map = leafletMapRef.current;
    const layer = layerRef.current;
    if (!mapReady || !L || !map || !layer) return;

    layer.clearLayers();

    if (routeStops.length === 0) {
      map.setView([39.5, -98.35], 4, { animate: false });
      return;
    }

    const latLngs = routeStops.map(({ resort }) => [resort.latitude, resort.longitude] as [number, number]);

    routeStops.forEach(({ day, resort }, index) => {
      const marker = L.marker([resort.latitude, resort.longitude], {
        icon: createTripDayIcon(L, String(day), index === 0, index === routeStops.length - 1),
        title: `Day ${day}: ${resort.name}`,
      });
      marker.bindPopup(
        `<strong>Day ${day}: ${escapeHtml(resort.name)}</strong><br>${escapeHtml(resort.state)}`,
      );
      marker.addTo(layer);
    });

    if (latLngs.length > 1) {
      L.polyline(latLngs, {
        color: "#f27d2f",
        dashArray: "7 8",
        lineCap: "round",
        opacity: 0.92,
        weight: 4,
      }).addTo(layer);
    }

    const bounds = L.latLngBounds(latLngs);
    if (latLngs.length === 1) {
      map.setView(latLngs[0], 7, { animate: false });
    } else {
      map.fitBounds(bounds, { animate: false, padding: [36, 36], maxZoom: 7 });
    }
  }, [mapReady, routeStops]);

  return (
    <section className="slopetrip-panel flex min-h-[360px] flex-col overflow-hidden rounded-lg border lg:min-h-0">
      <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border/70 p-3">
        <div>
          <h2 className="text-lg font-semibold text-[color:var(--pine)]">Trip Path Map</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Ordered by day, so resort changes and reorder actions update the path.
          </p>
        </div>
        <Badge variant={routeStops.length > 1 ? "secondary" : "outline"}>
          {routeStops.length} stop{routeStops.length === 1 ? "" : "s"}
        </Badge>
      </div>
      <div className="slopetrip-map-frame relative min-h-[240px] flex-1 overflow-hidden bg-map">
        <div ref={mapRef} className="absolute inset-0" />
        {!mapReady && (
          <div className="absolute inset-0 z-[450] grid place-items-center bg-map/80 text-sm font-medium text-[color:var(--pine)]">
            Loading trip map...
          </div>
        )}
        {mapReady && dayPlan.length === 0 && (
          <MapEmptyState title="No resorts selected" detail="Add resorts from the Manual Trip Board to draw your route." />
        )}
        {mapReady && dayPlan.length > 0 && routeStops.length === 0 && (
          <MapEmptyState title="Missing coordinates" detail="Selected resorts do not have usable map coordinates yet." />
        )}
        {mapReady && routeStops.length === 1 && (
          <div className="absolute left-4 top-4 z-[500] rounded-md border border-border bg-white/90 px-3 py-2 text-xs font-medium text-[color:var(--pine)] shadow-sm">
            Single-resort trip
          </div>
        )}
      </div>
      <div className="grid shrink-0 gap-2 border-t border-border/70 p-3 text-xs text-muted-foreground">
        <div className="flex items-center justify-between gap-3">
          <span>{summarizeRouteDistance(dayPlan)}</span>
          {missingCoordinateCount > 0 && (
            <Badge variant="signal">{missingCoordinateCount} missing coords</Badge>
          )}
        </div>
      </div>
    </section>
  );
}

function MapEmptyState({ detail, title }: { detail: string; title: string }) {
  return (
    <div className="absolute left-1/2 top-1/2 z-[500] w-[min(320px,calc(100%-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-md border border-border bg-white/92 p-4 text-center shadow-sm">
      <p className="text-sm font-semibold text-[color:var(--pine)]">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}

function TripReviewPanel({
  budget,
  draft,
  groupPlan,
  onFinalize,
}: {
  budget: number;
  draft: TripDraft;
  groupPlan: TripGroupPlan;
  onFinalize: () => void;
}) {
  const readinessItems = getReadinessItems(groupPlan, draft.lodgingCost > 0);

  return (
    <section className="slopetrip-panel overflow-hidden rounded-lg border p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[color:var(--pine)]">Review</h2>
          <p className="mt-1 text-xs text-muted-foreground">Concise totals before the full summary.</p>
        </div>
        <Badge variant={draft.readinessScore >= 60 ? "secondary" : "outline"}>
          {draft.readinessScore}% ready
        </Badge>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <DraftMetric label="Tickets" value={`$${draft.ticketCost.toLocaleString()}`} />
        <DraftMetric label="Lodging" value={`$${draft.lodgingCost.toLocaleString()}`} />
        <DraftMetric
          label="Travel"
          value={`$${(draft.parkingCost + draft.fuelCost + draft.rentalCarCost).toLocaleString()}`}
        />
        <DraftMetric
          label={draft.isOverBudget ? "Over budget" : "Remaining"}
          value={`$${Math.abs(draft.remainingBudget).toLocaleString()}`}
          tone={draft.isOverBudget ? "signal" : "default"}
        />
      </div>
      <div className="mt-3 rounded-md border border-border bg-white/72 p-2.5">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-medium text-[color:var(--pine)]">Budget fit</span>
          <Badge variant={draft.isOverBudget ? "signal" : "secondary"}>
            ${draft.totalCost.toLocaleString()} / ${budget.toLocaleString()}
          </Badge>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-secondary">
          <span
            className={`block h-full rounded-full ${draft.isOverBudget ? "bg-signal" : "bg-primary"}`}
            style={{ width: `${Math.min(100, (draft.totalCost / Math.max(1, budget)) * 100)}%` }}
          />
        </div>
      </div>
      <div className="mt-3 grid gap-2">
        {readinessItems.slice(0, 3).map((item) => (
          <div key={item.label} className="flex items-start justify-between gap-3 rounded-md border border-border bg-white/70 p-2 text-xs">
            <span>
              <span className="block font-medium text-[color:var(--pine)]">{item.label}</span>
              <span className="text-muted-foreground">{item.detail}</span>
            </span>
            <Badge variant={item.done ? "secondary" : "outline"}>
              {item.done ? "Started" : "Open"}
            </Badge>
          </div>
        ))}
      </div>
      <Button className="mt-3 w-full" type="button" onClick={onFinalize}>
        <ShieldCheck className="size-4" />
        Finalize Trip
      </Button>
    </section>
  );
}

function createTripDayIcon(
  L: typeof Leaflet,
  label: string,
  isFirst: boolean,
  isLast: boolean,
) {
  const className = isFirst
    ? "slopetrip-trip-pin slopetrip-trip-pin-start"
    : isLast
      ? "slopetrip-trip-pin slopetrip-trip-pin-end"
      : "slopetrip-trip-pin";

  return L.divIcon({
    className: "",
    html: `<span class="${className}">${escapeHtml(label)}</span>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  });
}

function hasCoordinates(resort: Resort) {
  return Number.isFinite(resort.latitude) && Number.isFinite(resort.longitude);
}

function estimateRouteMiles(dayPlan: TripDraft["dayPlan"]) {
  return dayPlan.reduce((total, current, index) => {
    const previous = dayPlan[index - 1];
    if (!previous || !hasCoordinates(previous.resort) || !hasCoordinates(current.resort)) {
      return total;
    }

    return (
      total +
      Math.round(
        haversineMiles(
          { latitude: previous.resort.latitude, longitude: previous.resort.longitude },
          { latitude: current.resort.latitude, longitude: current.resort.longitude },
        ),
      )
    );
  }, 0);
}

function getLongestRouteLeg(dayPlan: TripDraft["dayPlan"]) {
  return dayPlan.reduce<{ from: string; to: string; miles: number } | null>((longest, current, index) => {
    const previous = dayPlan[index - 1];
    if (!previous || !hasCoordinates(previous.resort) || !hasCoordinates(current.resort)) {
      return longest;
    }

    const miles = Math.round(
      haversineMiles(
        { latitude: previous.resort.latitude, longitude: previous.resort.longitude },
        { latitude: current.resort.latitude, longitude: current.resort.longitude },
      ),
    );

    if (!longest || miles > longest.miles) {
      return { from: previous.resort.name, to: current.resort.name, miles };
    }

    return longest;
  }, null);
}

function summarizeRouteDistance(dayPlan: TripDraft["dayPlan"]) {
  if (dayPlan.length === 0) {
    return "No route yet";
  }
  if (dayPlan.length === 1) {
    return `Single stop at ${dayPlan[0].resort.name}`;
  }

  const routeMiles = estimateRouteMiles(dayPlan);
  const longestLeg = getLongestRouteLeg(dayPlan);

  if (!longestLeg) {
    return "Route distance unavailable";
  }

  return `${routeMiles.toLocaleString()} estimated route miles; longest leg ${longestLeg.miles.toLocaleString()} miles`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function resortMatchesBoardFilters(resort: Resort, filters: BoardFilterSnapshot) {
  if (resort.region !== filters.preferredRegion) {
    return false;
  }

  if (resort.difficulty[filters.abilityLevel] < minimumAbilityFit) {
    return false;
  }

  const filteredTripCost =
    getPassAdjustedTicketCost(resort, filters.passAffiliations) * filters.days +
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

function parseBoundedNumber(
  value: string,
  fallback: number,
  min = Number.NEGATIVE_INFINITY,
  max = Number.POSITIVE_INFINITY,
) {
  if (value.trim() === "") return fallback;

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;

  return Math.min(max, Math.max(min, parsed));
}

function PlannerConfigSection({
  children,
  defaultOpen = false,
  label,
  value,
}: {
  children: React.ReactNode;
  defaultOpen?: boolean;
  label: string;
  value: string;
}) {
  return (
    <details className="slopetrip-config-section group rounded-md border border-border bg-white/72 shadow-sm" open={defaultOpen}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5 text-sm font-medium text-[color:var(--pine)] marker:hidden">
        <span>{label}</span>
        <span className="flex min-w-0 items-center gap-2 text-xs font-normal text-muted-foreground">
          <span className="truncate">{value}</span>
          <ChevronDown className="size-4 shrink-0 transition group-open:rotate-180" />
        </span>
      </summary>
      <div className="border-t border-border/70 p-3">{children}</div>
    </details>
  );
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
    <div className="text-sm">
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
            className="grid grid-cols-[minmax(0,1fr)_64px_auto] items-center gap-2 sm:grid-cols-[minmax(0,1fr)_72px_auto]"
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
                onUpdateItem(item.id, {
                  quantity: parseBoundedNumber(event.currentTarget.value, item.quantity, 1, 12),
                })
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

function GroupPlanInputs({
  adultCount,
  bookingPriority,
  kidCount,
  lodgingPreference,
  nonSkierCount,
  onAdultCountChange,
  onBookingPriorityChange,
  onKidCountChange,
  onLodgingPreferenceChange,
  onNonSkierCountChange,
  onPassHolderCountChange,
  onTransportModeChange,
  passHolderCount,
  transportMode,
}: {
  adultCount: number;
  bookingPriority: TripGroupPlan["bookingPriority"];
  kidCount: number;
  lodgingPreference: TripGroupPlan["lodgingPreference"];
  nonSkierCount: number;
  onAdultCountChange: (value: number) => void;
  onBookingPriorityChange: (value: TripGroupPlan["bookingPriority"]) => void;
  onKidCountChange: (value: number) => void;
  onLodgingPreferenceChange: (value: TripGroupPlan["lodgingPreference"]) => void;
  onNonSkierCountChange: (value: number) => void;
  onPassHolderCountChange: (value: number) => void;
  onTransportModeChange: (value: TripGroupPlan["transportMode"]) => void;
  passHolderCount: number;
  transportMode: TripGroupPlan["transportMode"];
}) {
  const totalPeople = Math.max(1, adultCount + kidCount + nonSkierCount);
  const skierCount = Math.max(1, adultCount + kidCount - nonSkierCount);

  return (
    <div className="text-sm">
      <div className="flex items-center justify-between gap-3">
        <Label className="flex items-center gap-2 text-[color:var(--pine)]">
          <Users className="size-4" />
          Group plan
        </Label>
        <Badge variant="secondary">
          {totalPeople} people / {skierCount} skiing
        </Badge>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <MiniNumberField
          icon={<Users className="size-3.5" />}
          label="Adults"
          value={adultCount}
          onChange={(value) => onAdultCountChange(Math.min(40, Math.max(0, value)))}
        />
        <MiniNumberField
          icon={<Users className="size-3.5" />}
          label="Kids"
          value={kidCount}
          onChange={(value) => onKidCountChange(Math.min(40, Math.max(0, value)))}
        />
        <MiniNumberField
          icon={<HeartHandshake className="size-3.5" />}
          label="Non-skiers"
          value={nonSkierCount}
          onChange={(value) => onNonSkierCountChange(Math.min(40, Math.max(0, value)))}
        />
        <MiniNumberField
          icon={<Ticket className="size-3.5" />}
          label="Pass holders"
          value={passHolderCount}
          onChange={(value) => onPassHolderCountChange(Math.min(40, Math.max(0, value)))}
        />
      </div>
      <div className="mt-3 grid gap-2">
        <MiniSelectField
          icon={<Bed className="size-3.5" />}
          label="Lodging"
          value={lodgingPreference}
          options={lodgingPreferenceLabels}
          onChange={onLodgingPreferenceChange}
        />
        <MiniSelectField
          icon={<Plane className="size-3.5" />}
          label="Transport"
          value={transportMode}
          options={transportModeLabels}
          onChange={onTransportModeChange}
        />
        <MiniSelectField
          icon={<ShieldCheck className="size-3.5" />}
          label="Decision priority"
          value={bookingPriority}
          options={bookingPriorityLabels}
          onChange={onBookingPriorityChange}
        />
      </div>
    </div>
  );
}

function TripCostModel({
  foodDailyUsd,
  fuelEstimateUsd,
  includeLodging,
  lodgingNightlyUsd,
  onFoodDailyUsdChange,
  onFuelEstimateUsdChange,
  onIncludeLodgingChange,
  onLodgingNightlyUsdChange,
  onParkingDailyUsdChange,
  onRentalCarDailyUsdChange,
  parkingDailyUsd,
  rentalCarDailyUsd,
}: {
  foodDailyUsd: number;
  fuelEstimateUsd: number;
  includeLodging: boolean;
  lodgingNightlyUsd: number;
  onFoodDailyUsdChange: (value: number) => void;
  onFuelEstimateUsdChange: (value: number) => void;
  onIncludeLodgingChange: (value: boolean) => void;
  onLodgingNightlyUsdChange: (value: number) => void;
  onParkingDailyUsdChange: (value: number) => void;
  onRentalCarDailyUsdChange: (value: number) => void;
  parkingDailyUsd: number;
  rentalCarDailyUsd: number;
}) {
  return (
    <div className="text-sm">
      <label className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 font-medium text-[color:var(--pine)]">
          <Bed className="size-4" />
          Lodging in budget
        </span>
        <input
          type="checkbox"
          checked={includeLodging}
          onChange={(event) => onIncludeLodgingChange(event.target.checked)}
          className="size-4 accent-primary"
        />
      </label>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <MiniNumberField
          disabled={!includeLodging}
          icon={<Bed className="size-3.5" />}
          label="Lodging/night"
          value={lodgingNightlyUsd}
          onChange={onLodgingNightlyUsdChange}
        />
        <MiniNumberField
          icon={<Utensils className="size-3.5" />}
          label="Food/day"
          value={foodDailyUsd}
          onChange={onFoodDailyUsdChange}
        />
        <MiniNumberField
          icon={<MapPinned className="size-3.5" />}
          label="Parking/day"
          value={parkingDailyUsd}
          onChange={onParkingDailyUsdChange}
        />
        <MiniNumberField
          icon={<Fuel className="size-3.5" />}
          label="Fuel"
          value={fuelEstimateUsd}
          onChange={onFuelEstimateUsdChange}
        />
        <MiniNumberField
          icon={<Car className="size-3.5" />}
          label="Rental car/day"
          value={rentalCarDailyUsd}
          onChange={onRentalCarDailyUsdChange}
        />
      </div>
    </div>
  );
}

function MiniSelectField<TValue extends string>({
  icon,
  label,
  onChange,
  options,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  onChange: (value: TValue) => void;
  options: Record<TValue, string>;
  value: TValue;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs">
      <span className="flex items-center gap-1.5 text-muted-foreground">
        {icon}
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.currentTarget.value as TValue)}
        className="h-9 rounded-md border border-border bg-white px-2 text-sm outline-none transition focus:border-primary"
      >
        {Object.entries(options).map(([optionValue, labelText]) => (
          <option key={optionValue} value={optionValue}>
            {String(labelText)}
          </option>
        ))}
      </select>
    </label>
  );
}

function MiniNumberField({
  disabled = false,
  icon,
  label,
  onChange,
  value,
}: {
  disabled?: boolean;
  icon: React.ReactNode;
  label: string;
  onChange: (value: number) => void;
  value: number;
}) {
  return (
    <label className={`flex flex-col gap-1 text-xs ${disabled ? "opacity-50" : ""}`}>
      <span className="flex items-center gap-1.5 text-muted-foreground">
        {icon}
        {label}
      </span>
      <Input
        type="number"
        min={0}
        disabled={disabled}
        value={value}
        onChange={(event) =>
          onChange(parseBoundedNumber(event.currentTarget.value, value, 0))
        }
      />
    </label>
  );
}

function GeneratedPlanView({
  groupPlan,
  isEditing,
  isSaving,
  onSaveTrip,
  result,
  saveError,
  savedTripId,
  userCanSave,
}: {
  groupPlan: TripGroupPlan;
  isEditing: boolean;
  isSaving: boolean;
  onSaveTrip: () => void;
  result: TripRecommendationResult;
  saveError: string | null;
  savedTripId: string | null;
  userCanSave: boolean;
}) {
  const perPersonCost = getPerPersonCost(result.totalEstimatedCostUsd, groupPlan);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Badge variant={result.confidence === "model" ? "signal" : "secondary"}>
          {result.confidence === "model" ? "Gemini assisted" : "Demo scoring"}
        </Badge>
        {result.stops.length > 0 && (
          <Badge className="ml-2" variant="outline">
            ${result.totalEstimatedCostUsd.toLocaleString()} total
          </Badge>
        )}
        {result.stops.length > 0 && (
          <Badge className="ml-2" variant="outline">
            ${perPersonCost.toLocaleString()} / person
          </Badge>
        )}
        <h3 className="mt-3 text-xl font-semibold text-[color:var(--pine)]">{result.title}</h3>
        <p className="mt-2 text-sm text-muted-foreground">{result.summary}</p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          {result.modelMetadata && (
            <Badge variant="outline">
              {result.modelMetadata.engine} - {result.modelMetadata.promptVersion}
            </Badge>
          )}
          {result.generatedAt && (
            <Badge variant="outline">
              Generated {new Date(result.generatedAt).toLocaleString()}
            </Badge>
          )}
          {result.modelMetadata?.fallbackReason && (
            <Badge variant="signal">{result.modelMetadata.fallbackReason}</Badge>
          )}
        </div>
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
              {stop.factors && stop.factors.length > 0 && (
                <div className="mt-3 grid gap-2">
                  {stop.factors.map((factor) => (
                    <div
                      key={`${stop.resortId}-${stop.day}-${factor.label}`}
                      className="rounded-md border border-border bg-white/72 p-2 text-xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-[color:var(--pine)]">{factor.label}</span>
                        <Badge
                          variant={
                            factor.tone === "positive"
                              ? "secondary"
                              : factor.tone === "warning"
                                ? "signal"
                                : "outline"
                          }
                        >
                          {factor.value}
                        </Badge>
                      </div>
                      <p className="mt-1 text-muted-foreground">{factor.detail}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-md border border-dashed border-border bg-white/62 p-5 text-sm text-muted-foreground">
          No selected resort fits the current budget. Try raising the budget, turning off rentals, or selecting a lower-cost mountain.
        </div>
      )}
      {result.safetyNotes && result.safetyNotes.length > 0 && (
        <div className="rounded-md border border-border bg-white/72 p-3 text-xs text-muted-foreground shadow-sm">
          <p className="font-medium text-[color:var(--pine)]">Before booking</p>
          <ul className="mt-2 list-inside list-disc">
            {result.safetyNotes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </div>
      )}
      {result.stops.length > 0 && (
        <div className="rounded-md border border-border bg-white/72 p-3 text-xs text-muted-foreground shadow-sm">
          <p className="font-medium text-[color:var(--pine)]">Next steps after saving</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <span>Share the trip for group feedback.</span>
            <span>Compare versions before booking.</span>
            <span>Shortlist {lodgingPreferenceLabels[groupPlan.lodgingPreference].toLowerCase()}.</span>
            <span>Confirm {transportModeLabels[groupPlan.transportMode].toLowerCase()} logistics.</span>
          </div>
        </div>
      )}
      {result.stops.length > 0 && (
        <div className="flex flex-col gap-2 border-t border-border/70 pt-4" aria-live="polite">
          {userCanSave ? (
            <Button type="button" onClick={onSaveTrip} disabled={isSaving || !!savedTripId}>
              <Save className="size-4" />
              {savedTripId
                ? "Trip saved"
                : isSaving
                  ? "Saving..."
                  : isEditing
                    ? "Save as new version"
                    : "Save this trip"}
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
            <p className="rounded-md border border-signal bg-signal/10 p-3 text-sm" role="alert">
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
  lodgingCost: number;
  foodCost: number;
  parkingCost: number;
  fuelCost: number;
  rentalCarCost: number;
  passSavings: number;
  totalCost: number;
  perPersonCost: number;
  groupSize: number;
  skierCount: number;
  readinessScore: number;
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

type TripFinalizationSummary = {
  title: string;
  datesLabel: string;
  routeLabel: string;
  geographyLabel: string;
  financialRows: Array<{ label: string; value: string; missing?: boolean }>;
  readinessRows: Array<{ label: string; detail: string; done: boolean }>;
  blockers: string[];
  warnings: string[];
  dayPlan: TripDraft["dayPlan"];
  totalCost: number;
  readinessScore: number;
};

function TripDraftView({
  budget,
  days,
  draft,
  groupPlan,
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
  groupPlan: TripGroupPlan;
  onMoveRouteDay: (fromIndex: number, toIndex: number) => void;
  onRemoveRouteDay: (dayIndex: number) => void;
  onRouteDayResortChange: (dayIndex: number, resortId: string) => void;
  routeDayIds: string[];
  selected: Resort[];
  showLodgingFinder: boolean;
}) {
  const [draggedDayIndex, setDraggedDayIndex] = useState<number | null>(null);
  const readinessItems = getReadinessItems(groupPlan, draft.lodgingCost > 0);

  if (selected.length === 0) {
    return (
      <div className="mt-4 rounded-md border border-dashed border-border bg-white/62 p-5 text-sm text-muted-foreground">
        Select resorts from the manual board to build a live trip view.
      </div>
    );
  }

  return (
    <div className="slopetrip-trip-canvas">
      <div className="slopetrip-trip-topline">
        <div className="slopetrip-horizontal-strip">
          <DraftMetric label="Tickets" value={`$${draft.ticketCost.toLocaleString()}`} />
          <DraftMetric label="Rentals" value={`$${draft.rentalCost.toLocaleString()}`} />
          <DraftMetric label="Lodging" value={`$${draft.lodgingCost.toLocaleString()}`} />
          <DraftMetric
            label="Food + travel"
            value={`$${(draft.foodCost + draft.parkingCost + draft.fuelCost + draft.rentalCarCost).toLocaleString()}`}
          />
          <DraftMetric label="Per person" value={`$${draft.perPersonCost.toLocaleString()}`} />
          <DraftMetric
            label="Group"
            value={`${draft.groupSize} people / ${draft.skierCount} skiing`}
          />
          {draft.passSavings > 0 && (
            <DraftMetric label="Pass savings" value={`$${draft.passSavings.toLocaleString()}`} />
          )}
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
          <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
            <Badge variant="outline">{bookingPriorityLabels[groupPlan.bookingPriority]}</Badge>
            <Badge variant="outline">{lodgingPreferenceLabels[groupPlan.lodgingPreference]}</Badge>
            <Badge variant="outline">{transportModeLabels[groupPlan.transportMode]}</Badge>
          </div>
        </div>
      </div>

      <div className="slopetrip-readiness-module rounded-md border border-border bg-white/72 p-3 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-[color:var(--pine)]">
            <ShieldCheck className="size-4" />
            Trip readiness
          </h3>
          <Badge variant={draft.readinessScore >= 60 ? "secondary" : "outline"}>
            {draft.readinessScore}%
          </Badge>
        </div>
        <div className="mt-3 grid gap-2">
          {readinessItems.map((item) => (
            <div key={item.label} className="grid gap-1 rounded-md border border-border bg-white/70 p-2 text-xs">
              <span className="flex items-center justify-between gap-2 font-medium text-[color:var(--pine)]">
                {item.label}
                <Badge variant={item.done ? "secondary" : "outline"}>
                  {item.done ? "Started" : "Open"}
                </Badge>
              </span>
              <span className="text-muted-foreground">{item.detail}</span>
            </div>
          ))}
        </div>
      </div>

      <RouteStayBlocks
        dayGroups={draft.resortDayGroups}
        showLodgingFinder={showLodgingFinder}
      />

      <div className="slopetrip-day-rail-module rounded-md border border-border bg-white/72 p-3 shadow-sm">
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
                data-dragging={draggedDayIndex === index ? "true" : undefined}
                className={`slopetrip-route-day flex min-w-[min(380px,calc(100vw-3rem))] flex-wrap items-center gap-2 rounded-md border border-border bg-white/70 px-2 py-2 text-sm transition sm:min-w-[380px] sm:flex-nowrap ${
                  draggedDayIndex === index ? "opacity-60" : ""
                }`}
              >
                <span className="flex size-9 cursor-grab items-center justify-center rounded-md text-muted-foreground active:cursor-grabbing">
                  <GripVertical className="size-4" />
                </span>
                <span className="w-14 font-medium text-muted-foreground">Day {day}</span>
                <div className="min-w-[190px] flex-1">
                  <select
                    aria-label={`Resort for day ${day}`}
                    value={resort.id}
                    onChange={(event) => onRouteDayResortChange(index, event.target.value)}
                    className="h-10 w-full min-w-0 rounded-md border border-border bg-white px-2 text-sm font-medium text-[color:var(--pine)] shadow-sm outline-none transition focus:border-primary focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {selected.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-wrap items-center gap-1">
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

      <div className="slopetrip-selected-module rounded-md border border-border bg-white/72 p-3 shadow-sm">
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

function FinalizeTripModal({
  isFinalized,
  onClose,
  onConfirm,
  onSaveDraft,
  saveDraftDisabled,
  saveDraftLabel,
  saveError,
  summary,
  userCanSave,
}: {
  isFinalized: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onSaveDraft?: () => void;
  saveDraftDisabled: boolean;
  saveDraftLabel: string;
  saveError: string | null;
  summary: TripFinalizationSummary;
  userCanSave: boolean;
}) {
  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-[rgb(8_42_49_/_42%)] p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="finalize-trip-title">
      <div className="slopetrip-panel max-h-[min(860px,calc(100vh-2rem))] w-full max-w-5xl overflow-y-auto rounded-lg border shadow-2xl">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-border/70 bg-white/94 p-4">
          <div>
            <Badge variant={summary.blockers.length > 0 ? "signal" : "secondary"}>
              {summary.blockers.length > 0 ? "Needs review" : isFinalized ? "Finalized" : "Ready to finalize"}
            </Badge>
            <h2 id="finalize-trip-title" className="mt-2 text-2xl font-semibold text-[color:var(--pine)]">
              {summary.title}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {summary.datesLabel} - {summary.routeLabel}
            </p>
          </div>
          <Button type="button" variant="ghost" size="icon" aria-label="Close finalize trip summary" onClick={onClose}>
            <X className="size-4" />
          </Button>
        </div>

        <div className="grid gap-4 p-4 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="grid gap-4">
            <div className="rounded-md border border-border bg-white/72 p-3">
              <h3 className="text-sm font-semibold text-[color:var(--pine)]">Itinerary</h3>
              <div className="mt-3 grid gap-2">
                {summary.dayPlan.length > 0 ? (
                  summary.dayPlan.map(({ day, resort }) => (
                    <div key={`${day}-${resort.id}`} className="grid gap-1 rounded-md border border-border bg-white/70 p-2 text-sm sm:grid-cols-[72px_minmax(0,1fr)_auto] sm:items-center">
                      <span className="font-medium text-muted-foreground">Day {day}</span>
                      <span className="min-w-0 truncate font-semibold text-[color:var(--pine)]">{resort.name}</span>
                      <Badge variant="outline">{resort.state}</Badge>
                    </div>
                  ))
                ) : (
                  <p className="rounded-md border border-dashed border-border bg-white/62 p-3 text-sm text-muted-foreground">
                    No resorts selected yet.
                  </p>
                )}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <SummaryBlock title="Geographic Snapshot">
                <p>{summary.geographyLabel}</p>
                <p className="mt-2">{summary.routeLabel}</p>
              </SummaryBlock>
              <SummaryBlock title="Important Notes">
                <SummaryList
                  empty="No major warnings found from the current trip data."
                  items={[...summary.blockers, ...summary.warnings]}
                />
              </SummaryBlock>
            </div>
          </section>

          <aside className="grid gap-4">
            <div className="rounded-md border border-border bg-white/72 p-3">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-[color:var(--pine)]">Financial Summary</h3>
                <Badge variant="outline">${summary.totalCost.toLocaleString()}</Badge>
              </div>
              <div className="mt-3 grid gap-2">
                {summary.financialRows.map((row) => (
                  <div key={row.label} className="flex items-center justify-between gap-3 rounded-md border border-border bg-white/70 p-2 text-sm">
                    <span className="text-muted-foreground">{row.label}</span>
                    <span className={row.missing ? "font-medium text-signal" : "font-semibold text-[color:var(--pine)]"}>
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-md border border-border bg-white/72 p-3">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-[color:var(--pine)]">Trip Readiness</h3>
                <Badge variant={summary.readinessScore >= 60 ? "secondary" : "outline"}>
                  {summary.readinessScore}%
                </Badge>
              </div>
              <div className="mt-3 grid gap-2">
                {summary.readinessRows.map((item) => (
                  <div key={item.label} className="grid gap-1 rounded-md border border-border bg-white/70 p-2 text-xs">
                    <span className="flex items-center justify-between gap-2 font-medium text-[color:var(--pine)]">
                      {item.label}
                      <Badge variant={item.done ? "secondary" : "outline"}>
                        {item.done ? "Started" : "Open"}
                      </Badge>
                    </span>
                    <span className="text-muted-foreground">{item.detail}</span>
                  </div>
                ))}
              </div>
            </div>

            {saveError && (
              <p className="rounded-md border border-signal bg-signal/10 p-3 text-sm" role="alert">
                {saveError}
              </p>
            )}

            <div className="grid gap-2 border-t border-border/70 pt-4">
              <Button type="button" onClick={onConfirm} disabled={summary.blockers.length > 0}>
                <ShieldCheck className="size-4" />
                {isFinalized ? "Trip finalized" : "Confirm final trip"}
              </Button>
              <Button type="button" variant="outline" onClick={onClose}>
                Go back and edit
              </Button>
              {userCanSave && onSaveDraft ? (
                <Button type="button" variant="outline" onClick={onSaveDraft} disabled={saveDraftDisabled}>
                  <Save className="size-4" />
                  {saveDraftLabel}
                </Button>
              ) : (
                <p className="rounded-md border border-dashed border-border bg-white/62 p-3 text-xs text-muted-foreground">
                  Save draft is available after generating a trip recommendation and signing in.
                </p>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function SummaryBlock({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <div className="rounded-md border border-border bg-white/72 p-3 text-sm text-muted-foreground">
      <h3 className="text-sm font-semibold text-[color:var(--pine)]">{title}</h3>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function SummaryList({ empty, items }: { empty: string; items: string[] }) {
  if (items.length === 0) {
    return <p>{empty}</p>;
  }

  return (
    <ul className="grid gap-2">
      {items.map((item) => (
        <li key={item} className="rounded-md border border-border bg-white/70 p-2">
          {item}
        </li>
      ))}
    </ul>
  );
}

function buildTripFinalizationSummary({
  budget,
  draft,
  groupPlan,
  homeLocationLabel,
  includeLodging,
  initialTripTitle,
  maxDriveHours,
  result,
}: {
  budget: number;
  draft: TripDraft;
  groupPlan: TripGroupPlan;
  homeLocationLabel: string;
  includeLodging: boolean;
  initialTripTitle?: string;
  maxDriveHours: number;
  result: TripRecommendationResult | null;
}): TripFinalizationSummary {
  const title =
    result?.title ??
    initialTripTitle ??
    (draft.resortDayGroups.length > 0
      ? `${draft.resortDayGroups[0].resort.name} ski trip`
      : "Untitled ski trip");
  const readinessRows = getReadinessItems(groupPlan, includeLodging).map((item) =>
    item.label === "Confirm lodging"
      ? { ...item, done: includeLodging }
      : item,
  );
  const longestLeg = getLongestRouteLeg(draft.dayPlan);
  const blockers: string[] = [];
  const warnings: string[] = [];

  if (draft.dayPlan.length === 0) {
    blockers.push("Add at least one resort day before finalizing.");
  }
  if (draft.dayPlan.length > 0 && draft.dayPlan.length < Math.max(1, draft.resortDayGroups.length)) {
    warnings.push("Some selected resorts may not have a dedicated day.");
  }
  if (draft.isOverBudget) {
    warnings.push(`Trip is $${Math.abs(draft.remainingBudget).toLocaleString()} over the current budget.`);
  }
  if (!includeLodging) {
    warnings.push("Lodging costs are not included in the current estimate.");
  }
  if (!homeLocationLabel.trim()) {
    warnings.push("Home base is missing, so drive estimates are route-only between resorts.");
  }
  if (longestLeg && estimateDriveHours(longestLeg.miles) > maxDriveHours) {
    warnings.push(`Longest resort-to-resort leg is about ${longestLeg.miles} miles, above the drive-hour preference.`);
  }

  return {
    title,
    datesLabel: `${draft.dayPlan.length} day${draft.dayPlan.length === 1 ? "" : "s"} planned`,
    routeLabel: summarizeRouteDistance(draft.dayPlan),
    geographyLabel: draft.regionSummary,
    financialRows: [
      { label: "Estimated lodging", value: includeLodging ? `$${draft.lodgingCost.toLocaleString()}` : "Missing", missing: !includeLodging },
      { label: "Estimated resort costs", value: `$${(draft.ticketCost + draft.rentalCost).toLocaleString()}` },
      { label: "Transportation/travel", value: `$${(draft.parkingCost + draft.fuelCost + draft.rentalCarCost).toLocaleString()}` },
      { label: "Taxes/fees", value: "Not available", missing: true },
      { label: "Total estimated trip cost", value: `$${draft.totalCost.toLocaleString()}` },
      { label: "Budget", value: `$${budget.toLocaleString()}` },
    ],
    readinessRows,
    blockers,
    warnings,
    dayPlan: draft.dayPlan,
    totalCost: draft.totalCost,
    readinessScore: draft.readinessScore,
  };
}

function buildTripDraft(
  selected: Resort[],
  options: {
    days: number;
    budget: number;
    costAssumptions: TripCostAssumptions;
    includeLodging: boolean;
    passAffiliations: ResortPassAffiliation[];
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
  const ticketCost = dayPlan.reduce(
    (total, { resort }) => total + getPassAdjustedTicketCost(resort, options.passAffiliations),
    0,
  );
  const passSavings = dayPlan.reduce(
    (total, { resort }) =>
      total + resort.ticketEstimateUsd - getPassAdjustedTicketCost(resort, options.passAffiliations),
    0,
  );
  const rentalMultiplier = getRentalCostMultiplier(options.rentalItems);
  const rentalCost = dayPlan.reduce(
    (total, { resort }) => total + estimateRentalCost(resort, rentalMultiplier),
    0,
  );
  const lodgingCost = options.includeLodging
    ? (options.costAssumptions.lodgingNightlyUsd ?? 0) * Math.max(1, options.days - 1)
    : 0;
  const foodCost = (options.costAssumptions.foodDailyUsd ?? 0) * options.days;
  const parkingCost = (options.costAssumptions.parkingDailyUsd ?? 0) * options.days;
  const fuelCost = options.costAssumptions.fuelEstimateUsd ?? 0;
  const rentalCarCost = (options.costAssumptions.rentalCarDailyUsd ?? 0) * options.days;
  const totalCost =
    ticketCost + rentalCost + lodgingCost + foodCost + parkingCost + fuelCost + rentalCarCost;
  const groupPlan = getGroupPlan(options.costAssumptions);
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
      current.ticketCost += getPassAdjustedTicketCost(resort, options.passAffiliations);
      current.rentalCost += estimateRentalCost(resort, rentalMultiplier);
      current.totalCost = current.ticketCost + current.rentalCost;
      groups.set(resort.id, current);
      return groups;
    }, new Map<string, { resort: Resort; days: number[]; ticketCost: number; rentalCost: number; totalCost: number }>()),
  ).map(([, group]) => group);

  return {
    ticketCost,
    rentalCost,
    lodgingCost,
    foodCost,
    parkingCost,
    fuelCost,
    rentalCarCost,
    passSavings,
    totalCost,
    perPersonCost: getPerPersonCost(totalCost, groupPlan),
    groupSize: getGroupSize(groupPlan),
    skierCount: getSkierCount(groupPlan),
    readinessScore: getReadinessScore(groupPlan, options.includeLodging),
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

function getPassAdjustedTicketCost(resort: Resort, passAffiliations: ResortPassAffiliation[]) {
  const hasPassAccess = resort.passAffiliations.some(
    (pass) => pass !== "independent" && passAffiliations.includes(pass),
  );

  return hasPassAccess ? 0 : resort.ticketEstimateUsd;
}

function getResortTradeoffLabels(resort: Resort) {
  const labels: string[] = [];

  if (resort.difficulty.beginner >= 25 || resort.highlights.some((highlight) => highlight.toLowerCase().includes("family"))) {
    labels.push("Family-friendly");
  }
  if (resort.difficulty.intermediate >= 40 && resort.difficulty.expert >= 25) {
    labels.push("Mixed-ability fit");
  }
  if (resort.ticketEstimateUsd <= 130 || resort.passAffiliations.includes("indy")) {
    labels.push("Lower-cost option");
  }
  if (resort.condition.snowfall7DayIn >= 10) {
    labels.push("Snow upside");
  }

  return labels.slice(0, 3);
}

function getDefaultBoardResorts(resorts: Resort[]) {
  const regionalResorts = resorts.filter((resort) => resort.region === "northeast").slice(0, 2);
  return regionalResorts.length > 0 ? regionalResorts : resorts.slice(0, 2);
}

function getDefaultRouteDayIds(resorts: Resort[], days: number) {
  return reconcileRouteDayIds([], getDefaultBoardResorts(resorts), days);
}

function getInitialRouteDayIds(resorts: Resort[], initialTrip?: PlannerTripSeed) {
  if (!initialTrip || initialTrip.stops.length === 0) {
    return getDefaultRouteDayIds(resorts, initialTripDays);
  }

  const resortIds = new Set(resorts.map((resort) => resort.id));
  const routeDayIds = initialTrip.stops
    .slice()
    .sort((a, b) => a.day - b.day)
    .map((stop) => stop.resortId)
    .filter((resortId) => resortIds.has(resortId));

  return routeDayIds.length > 0 ? routeDayIds : getDefaultRouteDayIds(resorts, initialTrip.days);
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
    <div className="slopetrip-stay-module rounded-md border border-border bg-white/72 p-3 shadow-sm">
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

function formatPassAffiliation(pass: ResortPassAffiliation) {
  const labels: Record<ResortPassAffiliation, string> = {
    epic: "Epic",
    ikon: "Ikon",
    "new-england": "New England",
    indy: "Indy",
    independent: "Independent/local",
  };

  return labels[pass];
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
