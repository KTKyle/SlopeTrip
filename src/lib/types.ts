export type AbilityLevel = "beginner" | "intermediate" | "expert";

export type ResortRegion = "northeast" | "midwest" | "rockies" | "west" | "pacific";

export type TripBudget = {
  maxTotalUsd: number;
  includeRentals: boolean;
  includeLodging: boolean;
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
  condition: ResortConditionSnapshot;
};

export type UserSkiProfile = {
  seasons: number;
  abilityLevel: AbilityLevel;
  rentsGear: boolean;
  homeLocationLabel: string;
  homeLatitude?: number;
  homeLongitude?: number;
};

export type TripRecommendationRequest = {
  days: number;
  budget: TripBudget;
  abilityLevel: AbilityLevel;
  rentsGear: boolean;
  maxDriveHours: number;
  preferredRegion?: ResortRegion;
  homeLocationLabel?: string;
  homeLatitude?: number;
  homeLongitude?: number;
};

export type TripStopRecommendation = {
  resortId: string;
  resortName: string;
  day: number;
  estimatedCostUsd: number;
  score: number;
  reasons: string[];
};

export type TripRecommendationResult = {
  title: string;
  totalEstimatedCostUsd: number;
  confidence: "demo" | "model";
  summary: string;
  stops: TripStopRecommendation[];
};
