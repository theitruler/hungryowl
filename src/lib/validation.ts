import { z } from "zod";
import { DIETS, MAX_RADIUS_KM } from "./config";
import { inBangalore, servesLateNight } from "./geo-time";
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const contactPhone = z.string().trim().regex(/^(\+91)?[6-9]\d{9}$/, "Enter a valid Indian mobile number for owner verification.");
export const coordinatesSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});
export const nearbySchema = coordinatesSchema.extend({
  radius: z.number().min(1).max(MAX_RADIUS_KM),
  offset: z.number().int().min(0).max(10000).default(0),
  q: z.string().trim().max(100).default(""),
  diet: z.enum(["all", ...DIETS]).default("all"),
  sort: z.enum(["distance", "rating"]).default("distance"),
});
export const menuItemSchema = z.object({
  name: z.string().trim().min(1).max(100),
  price: z.number().min(0).max(100000).nullable(),
  diet: z.enum(DIETS),
});
export const stallFieldsSchema = z.object({
  name: z.string().trim().min(3).max(100),
  description: z.string().trim().max(1000),
  area: z.string().trim().min(2).max(100),
  diets: z
    .array(z.enum(DIETS))
    .min(1)
    .max(3)
    .transform((v) => [...new Set(v)]),
  opensAt: time,
  closesAt: time,
  menu: z.array(menuItemSchema).max(100),
});
export const stallCreateSchema = stallFieldsSchema
  .extend({
    latitude: coordinatesSchema.shape.latitude,
    longitude: coordinatesSchema.shape.longitude,
    locationCapturedAt: z
      .number()
      .refine(
        (t) => t <= Date.now() + 30000 && t >= Date.now() - 10 * 60000,
        "Capture your current location again.",
      ),
    accuracy: z.number().positive().max(200, "Move outdoors for a more accurate location."),
    relationship: z.enum(["mine", "other"]),
    contactPhone,
    photoIds: z
      .array(z.uuid())
      .length(2)
      .refine((v) => new Set(v).size === 2, "Use two different photos."),
  })
  .refine(inBangalore, "HungryOwl currently accepts stalls in Bangalore.")
  .refine((v) => servesLateNight(v.opensAt, v.closesAt), "Hours must overlap 11 pm–6 am.");
export const stallUpdateSchema = stallFieldsSchema
  .extend({
    contactPhone: contactPhone.optional(),
    location: coordinatesSchema
      .extend({
        locationCapturedAt: z
          .number()
          .refine(
            (t) => t >= Date.now() - 600000 && t <= Date.now() + 30000,
            "Capture your location again.",
          ),
        accuracy: z.number().positive().max(200),
      })
      .refine(inBangalore, "Choose a current location within Bangalore.")
      .optional(),
    closedUntil: z.iso
      .datetime()
      .nullable()
      .refine(
        (v) =>
          !v ||
          (new Date(v).getTime() > Date.now() &&
            new Date(v).getTime() < Date.now() + 90 * 86400000),
        "Choose a future reopening time within 90 days.",
      ),
    photoIds: z
      .array(z.uuid())
      .length(2)
      .refine((v) => new Set(v).size === 2)
      .optional(),
  })
  .refine((v) => servesLateNight(v.opensAt, v.closesAt), "Hours must overlap 11 pm–6 am.");
export const ratingSchema = z.object({ stars: z.number().int().min(1).max(5) });
export const reportSchema = z.object({ note: z.string().trim().max(500).default("") });
export const moderationSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("approve") }),
  z.object({ action: z.literal("reject"), reason: z.string().trim().min(5).max(500) }),
  z.object({ action: z.literal("claim"), email: z.email(), callConfirmed: z.literal(true) }),
  z.object({ action: z.literal("close"), hours: z.number().int().min(1).max(168) }),
]);
