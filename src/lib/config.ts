export const APP_NAME = "HungryOwl";
export const TIME_ZONE = "Asia/Kolkata";
export const DEFAULT_RADIUS_KM = 5;
export const MAX_RADIUS_KM = 30;
export const NEW_STALL_DAYS = 14;
// Vercel Functions accept request bodies up to 4.5 MB. Leave space for the
// multipart envelope so valid browser uploads do not fail at the platform.
export const MAX_PHOTO_BYTES = 4 * 1024 * 1024;
export const DIETS = ["veg", "non-veg", "egg"] as const;
export const DIET_LABELS = { veg: "Veg", "non-veg": "Non-veg", egg: "Egg" };
export type Diet = (typeof DIETS)[number];
export type Coordinates = { latitude: number; longitude: number };
export type Stall = {
  id: string;
  name: string;
  description: string;
  area: string;
  latitude: number;
  longitude: number;
  diets: Diet[];
  opensAt: string;
  closesAt: string;
  closedUntil: string | null;
  photos: string[];
  menu: { name: string; price: number | null; diet: Diet }[];
  ownerId: string | null;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  approvedAt: string | null;
  rating: number | null;
  ratingCount: number;
  distance?: number;
};
export type Viewer = { id: string; name: string; email: string; role: "user" | "admin" };
export type StallDetails = Stall & {
  canManage?: boolean;
  submission?: {
    relationship: "mine" | "other";
    contactPhone: string;
    rejectionReason: string | null;
  };
};
