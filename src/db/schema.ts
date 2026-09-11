import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  doublePrecision,
  jsonb,
  uuid,
  primaryKey,
  index,
  uniqueIndex,
  check,
  bigint,
} from "drizzle-orm/pg-core";
import type { Diet } from "../lib/config";
export const user = pgTable(
  "app_user",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    emailVerified: boolean("email_verified").notNull().default(false),
    image: text("image"),
    role: text("role", { enum: ["user", "admin"] })
      .notNull()
      .default("user"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [check("user_role_check", sql`${t.role} in ('user','admin')`)],
);
export const session = pgTable(
  "app_session",
  {
    id: text("id").primaryKey(),
    token: text("token").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("session_user_idx").on(t.userId)],
);
export const account = pgTable(
  "app_account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("account_user_idx").on(t.userId),
    uniqueIndex("account_provider_idx").on(t.providerId, t.accountId),
  ],
);
export const verification = pgTable(
  "app_verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("verification_identifier_idx").on(t.identifier)],
);
export const rateLimit = pgTable("auth_rate_limit", {
  id: text("id").primaryKey(),
  key: text("key").notNull().unique(),
  count: integer("count").notNull(),
  lastRequest: bigint("last_request", { mode: "number" }).notNull(),
});
export const stalls = pgTable(
  "stalls",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    description: text("description").notNull(),
    area: text("area").notNull(),
    latitude: doublePrecision("latitude").notNull(),
    longitude: doublePrecision("longitude").notNull(),
    diets: text("diets").array().$type<Diet[]>().notNull(),
    opensAt: text("opens_at").notNull(),
    closesAt: text("closes_at").notNull(),
    closedUntil: timestamp("closed_until", { withTimezone: true }),
    menu: jsonb("menu")
      .$type<{ name: string; price: number | null; diet: Diet }[]>()
      .notNull()
      .default([]),
    submittedBy: text("submitted_by")
      .notNull()
      .references(() => user.id),
    ownerId: text("owner_id").references(() => user.id),
    relationship: text("relationship", { enum: ["mine", "other"] }).notNull(),
    contactPhone: text("contact_phone").notNull(),
    status: text("status", { enum: ["pending", "approved", "rejected"] })
      .notNull()
      .default("pending"),
    rejectionReason: text("rejection_reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
  },
  (t) => [
    index("stalls_nearby_idx").on(t.status, t.latitude, t.longitude),
    index("stalls_owner_idx").on(t.ownerId),
    index("stalls_submitter_idx").on(t.submittedBy),
    check(
      "stall_coords_check",
      sql`${t.latitude} between 12.7 and 13.3 and ${t.longitude} between 77.3 and 77.9`,
    ),
    check("stall_status_check", sql`${t.status} in ('pending','approved','rejected')`),
    check("stall_relationship_check", sql`${t.relationship} in ('mine','other')`),
    check(
      "stall_diets_check",
      sql`cardinality(${t.diets}) between 1 and 3 and ${t.diets} <@ ARRAY['veg','non-veg','egg']::text[]`,
    ),
    check(
      "stall_hours_check",
      sql`${t.opensAt} ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' and ${t.closesAt} ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'`,
    ),
    check(
      "stall_menu_check",
      sql`jsonb_typeof(${t.menu}) = 'array' and jsonb_array_length(${t.menu}) <= 100`,
    ),
  ],
);
export const photos = pgTable(
  "photos",
  {
    id: uuid("id").primaryKey(),
    uploadedBy: text("uploaded_by")
      .notNull()
      .references(() => user.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("photos_uploader_idx").on(t.uploadedBy)],
);
export const stallPhotos = pgTable(
  "stall_photos",
  {
    stallId: uuid("stall_id")
      .notNull()
      .references(() => stalls.id, { onDelete: "cascade" }),
    photoId: uuid("photo_id")
      .notNull()
      .references(() => photos.id),
    position: integer("position").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.stallId, t.position] }),
    uniqueIndex("photo_once_idx").on(t.photoId),
    check("photo_position_check", sql`${t.position} in (0,1)`),
  ],
);
export const ratings = pgTable(
  "ratings",
  {
    stallId: uuid("stall_id")
      .notNull()
      .references(() => stalls.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    stars: integer("stars").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.stallId, t.userId] }),
    check("rating_range", sql`${t.stars} between 1 and 5`),
  ],
);
export const reports = pgTable(
  "closure_reports",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    stallId: uuid("stall_id")
      .notNull()
      .references(() => stalls.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id),
    note: text("note").notNull(),
    day: text("day").notNull(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("report_daily_idx").on(t.stallId, t.userId, t.day),
    index("reports_queue_idx").on(t.resolvedAt, t.createdAt),
  ],
);
export const auditLog = pgTable("audit_log", {
  id: uuid("id").defaultRandom().primaryKey(),
  actorId: text("actor_id")
    .notNull()
    .references(() => user.id),
  stallId: uuid("stall_id").references(() => stalls.id),
  action: text("action").notNull(),
  details: jsonb("details").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
export const requestLimits = pgTable("request_limits", {
  key: text("key").primaryKey(),
  count: integer("count").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});
