import { z } from "zod";
import type { Coordinates } from "./config";

const placeSchema = z.object({
  city: z.string().trim().max(200).optional(),
  locality: z.string().trim().max(200).optional(),
  principalSubdivision: z.string().trim().max(200).optional(),
  countryName: z.string().trim().max(200).optional(),
});

export function parseLocationName(value: unknown): string | null {
  const result = placeSchema.safeParse(value);
  if (!result.success) return null;
  const { locality, city, principalSubdivision, countryName } = result.data;
  return (
    [...new Set([locality, city].filter(Boolean))].join(", ") ||
    principalSubdivision ||
    countryName ||
    null
  );
}

// The free endpoint must be called directly by the browser with its current GPS fix.
// Never call this with stall coordinates, fixtures, or an IP-based fallback.
export async function resolveLocationName(coordinates: Coordinates): Promise<string | null> {
  const params = new URLSearchParams({
    latitude: String(coordinates.latitude),
    longitude: String(coordinates.longitude),
    localityLanguage: "en",
  });
  const response = await fetch(`https://api-bdc.net/data/reverse-geocode-client?${params}`, {
    signal: AbortSignal.timeout(8000),
    credentials: "omit",
    referrerPolicy: "no-referrer",
  });
  if (!response.ok) throw new Error("Location name unavailable");
  return parseLocationName(await response.json());
}
