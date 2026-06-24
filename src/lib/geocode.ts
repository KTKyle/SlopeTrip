type GeocodedLocation = {
  label: string;
  latitude: number;
  longitude: number;
  precision: "city" | "state" | "zip-prefix";
};

const knownLocations: GeocodedLocation[] = [
  { label: "Boston, MA", latitude: 42.3601, longitude: -71.0589, precision: "city" },
  { label: "New York, NY", latitude: 40.7128, longitude: -74.006, precision: "city" },
  { label: "Burlington, VT", latitude: 44.4759, longitude: -73.2121, precision: "city" },
  { label: "Portland, ME", latitude: 43.6591, longitude: -70.2568, precision: "city" },
  { label: "Manchester, NH", latitude: 42.9956, longitude: -71.4548, precision: "city" },
  { label: "Denver, CO", latitude: 39.7392, longitude: -104.9903, precision: "city" },
  { label: "Salt Lake City, UT", latitude: 40.7608, longitude: -111.891, precision: "city" },
  { label: "Seattle, WA", latitude: 47.6062, longitude: -122.3321, precision: "city" },
  { label: "San Francisco, CA", latitude: 37.7749, longitude: -122.4194, precision: "city" },
  { label: "Los Angeles, CA", latitude: 34.0522, longitude: -118.2437, precision: "city" },
  { label: "Chicago, IL", latitude: 41.8781, longitude: -87.6298, precision: "city" },
  { label: "Detroit, MI", latitude: 42.3314, longitude: -83.0458, precision: "city" },
];

const stateCentroids: Record<string, Omit<GeocodedLocation, "precision">> = {
  CA: { label: "California", latitude: 36.7783, longitude: -119.4179 },
  CO: { label: "Colorado", latitude: 39.5501, longitude: -105.7821 },
  IL: { label: "Illinois", latitude: 40.6331, longitude: -89.3985 },
  MA: { label: "Massachusetts", latitude: 42.4072, longitude: -71.3824 },
  ME: { label: "Maine", latitude: 45.2538, longitude: -69.4455 },
  MI: { label: "Michigan", latitude: 44.3148, longitude: -85.6024 },
  NH: { label: "New Hampshire", latitude: 43.1939, longitude: -71.5724 },
  NY: { label: "New York", latitude: 43.2994, longitude: -74.2179 },
  OR: { label: "Oregon", latitude: 43.8041, longitude: -120.5542 },
  UT: { label: "Utah", latitude: 39.321, longitude: -111.0937 },
  VT: { label: "Vermont", latitude: 44.5588, longitude: -72.5778 },
  WA: { label: "Washington", latitude: 47.7511, longitude: -120.7401 },
  WY: { label: "Wyoming", latitude: 43.076, longitude: -107.2903 },
};

const zipPrefixHints: Array<{ prefix: string; location: GeocodedLocation }> = [
  { prefix: "021", location: knownLocations[0] },
  { prefix: "100", location: knownLocations[1] },
  { prefix: "054", location: knownLocations[2] },
  { prefix: "041", location: knownLocations[3] },
  { prefix: "031", location: knownLocations[4] },
  { prefix: "802", location: knownLocations[5] },
  { prefix: "841", location: knownLocations[6] },
  { prefix: "981", location: knownLocations[7] },
  { prefix: "941", location: knownLocations[8] },
  { prefix: "900", location: knownLocations[9] },
];

export function geocodeLocationLabel(label: string | undefined | null) {
  const normalized = normalizeLocation(label);
  if (!normalized) return null;

  const zipMatch = normalized.match(/\b\d{5}\b/);
  if (zipMatch) {
    const hinted = zipPrefixHints.find((item) => zipMatch[0].startsWith(item.prefix));
    if (hinted) {
      return { ...hinted.location, precision: "zip-prefix" as const };
    }
  }

  const direct = knownLocations.find((location) => {
    const normalizedKnown = normalizeLocation(location.label);
    return normalizedKnown === normalized || normalized.includes(normalizedKnown);
  });
  if (direct) return direct;

  const stateCode = Object.keys(stateCentroids).find((code) =>
    new RegExp(`\\b${code.toLowerCase()}\\b`).test(normalized),
  );

  if (!stateCode) return null;

  return {
    ...stateCentroids[stateCode],
    precision: "state" as const,
  };
}

function normalizeLocation(label: string | undefined | null) {
  return (label ?? "")
    .trim()
    .toLowerCase()
    .replaceAll(".", "")
    .replaceAll(",", " ")
    .replace(/\s+/g, " ")
    .trim();
}
