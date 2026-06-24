export type AbilityLevel = "beginner" | "intermediate" | "expert";

export type ResortRegion = "northeast" | "midwest" | "rockies" | "west" | "pacific";

export type ResortPassAffiliation =
  | "epic"
  | "ikon"
  | "new-england"
  | "indy"
  | "independent";

export type TripStatus = "active" | "archived";

export type TripCostAssumptions = {
  lodgingNightlyUsd?: number;
  foodDailyUsd?: number;
  parkingDailyUsd?: number;
  fuelEstimateUsd?: number;
  rentalCarDailyUsd?: number;
  groupPlan?: TripGroupPlan;
};

export type TripGroupPlan = {
  adults: number;
  kids: number;
  nonSkiers: number;
  passHolders: number;
  lodgingPreference: "value" | "walkable" | "family" | "flexible";
  transportMode: "drive" | "fly" | "train-shuttle" | "mixed";
  bookingPriority: "lowest-cost" | "family-ease" | "best-snow" | "shortest-travel";
};

export type TripBudget = {
  maxTotalUsd: number;
  includeRentals: boolean;
  includeLodging: boolean;
  assumptions?: TripCostAssumptions;
};

export type ResortDifficultyProfile = {
  beginner: number;
  intermediate: number;
  expert: number;
};

export type ResortConditionSnapshot = {
  snowfall7DayIn: number;
  baseDepthIn: number;
  temperatureF: number;
  updatedAt: string;
  source: "seed" | "open-meteo" | "resort";
};

export type Resort = {
  id: string;
  name: string;
  slug: string;
  state: string;
  region: ResortRegion;
  latitude: number;
  longitude: number;
  elevationFt: number;
  acres: number;
  trails: number;
  difficulty: ResortDifficultyProfile;
  ticketEstimateUsd: number;
  rentalEstimateUsd: number;
  lodgingEstimateUsd: number;
  imageUrl: string;
  highlights: string[];
  passAffiliations: ResortPassAffiliation[];
  condition: ResortConditionSnapshot;
};

export type UserSkiProfile = {
  seasons: number;
  abilityLevel: AbilityLevel;
  rentsGear: boolean;
  homeLocationLabel: string;
  homeLatitude?: number;
  homeLongitude?: number;
  passAffiliations?: ResortPassAffiliation[];
};

export type TripRecommendationRequest = {
  days: number;
  budget: TripBudget;
  abilityLevel: AbilityLevel;
  rentsGear: boolean;
  maxDriveHours: number;
  preferredRegion?: ResortRegion;
  passAffiliations?: ResortPassAffiliation[];
  resortIds?: string[];
  homeLocationLabel?: string;
  homeLatitude?: number;
  homeLongitude?: number;
};

export type RecommendationFactor = {
  label: string;
  value: string;
  detail: string;
  tone: "positive" | "neutral" | "warning";
};

export type TripStopRecommendation = {
  resortId: string;
  resortName: string;
  day: number;
  estimatedCostUsd: number;
  score: number;
  reasons: string[];
  factors?: RecommendationFactor[];
};

export type TripRecommendationResult = {
  title: string;
  totalEstimatedCostUsd: number;
  confidence: "demo" | "model";
  summary: string;
  stops: TripStopRecommendation[];
  generatedAt?: string;
  modelMetadata?: {
    engine: "demo-scoring" | "gemini-2.5-flash";
    promptVersion: string;
    fallbackReason?: string;
  };
  safetyNotes?: string[];
};

export type PlannerTripSeed = {
  id: string;
  title: string;
  days: number;
  budgetUsd: number;
  abilityLevel: AbilityLevel;
  includeRentals: boolean;
  includeLodging: boolean;
  originLabel?: string;
  originLatitude?: number;
  originLongitude?: number;
  assumptions?: TripCostAssumptions;
  stops: Array<{
    resortId: string;
    day: number;
  }>;
};
