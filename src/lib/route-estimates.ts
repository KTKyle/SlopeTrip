import { getResortById } from "@/lib/resorts";

type MatrixResult = {
  resortId: string;
  distanceMiles: number;
  driveHours: number;
  source: "estimate";
};

export async function computeRouteMatrix(input: {
  origin: { latitude?: number; longitude?: number; label: string };
  resortIds: string[];
}): Promise<MatrixResult[]> {
  const origin =
    input.origin.latitude && input.origin.longitude
      ? { latitude: input.origin.latitude, longitude: input.origin.longitude }
      : null;

  return input.resortIds.flatMap((resortId) => {
    const resort = getResortById(resortId);
    if (!resort) return [];
    const distanceMiles = origin
      ? roughDistance(origin, { latitude: resort.latitude, longitude: resort.longitude })
      : 450;

    return {
      resortId: resort.id,
      distanceMiles: Math.round(distanceMiles),
      driveHours: Number(Math.max(1, distanceMiles / 55).toFixed(1)),
      source: "estimate" as const,
    };
  });
}

function roughDistance(
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number },
) {
  const radiusMiles = 3958.8;
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const dLat = toRadians(to.latitude - from.latitude);
  const dLon = toRadians(to.longitude - from.longitude);
  const lat1 = toRadians(from.latitude);
  const lat2 = toRadians(to.latitude);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return radiusMiles * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
