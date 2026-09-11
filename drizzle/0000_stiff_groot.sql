CREATE TABLE "app_account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" text NOT NULL,
	"stall_id" uuid,
	"action" text NOT NULL,
	"details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "photos" (
	"id" uuid PRIMARY KEY NOT NULL,
	"uploaded_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_rate_limit" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"count" integer NOT NULL,
	"last_request" bigint NOT NULL,
	CONSTRAINT "auth_rate_limit_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "ratings" (
	"stall_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"stars" integer NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ratings_stall_id_user_id_pk" PRIMARY KEY("stall_id","user_id"),
	CONSTRAINT "rating_range" CHECK ("ratings"."stars" between 1 and 5)
);
--> statement-breakpoint
CREATE TABLE "closure_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"stall_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"note" text NOT NULL,
	"day" text NOT NULL,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "request_limits" (
	"key" text PRIMARY KEY NOT NULL,
	"count" integer NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app_session" (
	"id" text PRIMARY KEY NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"user_id" text NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "app_session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "stall_photos" (
	"stall_id" uuid NOT NULL,
	"photo_id" uuid NOT NULL,
	"position" integer NOT NULL,
	CONSTRAINT "stall_photos_stall_id_position_pk" PRIMARY KEY("stall_id","position"),
	CONSTRAINT "photo_position_check" CHECK ("stall_photos"."position" in (0,1))
);
--> statement-breakpoint
CREATE TABLE "stalls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"area" text NOT NULL,
	"latitude" double precision NOT NULL,
	"longitude" double precision NOT NULL,
	"diets" text[] NOT NULL,
	"opens_at" text NOT NULL,
	"closes_at" text NOT NULL,
	"closed_until" timestamp with time zone,
	"menu" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"submitted_by" text NOT NULL,
	"owner_id" text,
	"relationship" text NOT NULL,
	"contact_phone" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"rejection_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"approved_at" timestamp with time zone,
	CONSTRAINT "stall_coords_check" CHECK ("stalls"."latitude" between 12.7 and 13.3 and "stalls"."longitude" between 77.3 and 77.9),
	CONSTRAINT "stall_status_check" CHECK ("stalls"."status" in ('pending','approved','rejected')),
	CONSTRAINT "stall_relationship_check" CHECK ("stalls"."relationship" in ('mine','other')),
	CONSTRAINT "stall_diets_check" CHECK (cardinality("stalls"."diets") between 1 and 3 and "stalls"."diets" <@ ARRAY['veg','non-veg','egg']::text[]),
	CONSTRAINT "stall_hours_check" CHECK ("stalls"."opens_at" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' and "stalls"."closes_at" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
	CONSTRAINT "stall_menu_check" CHECK (jsonb_typeof("stalls"."menu") = 'array' and jsonb_array_length("stalls"."menu") <= 100)
);
--> statement-breakpoint
CREATE TABLE "app_user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"role" text DEFAULT 'user' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "app_user_email_unique" UNIQUE("email"),
	CONSTRAINT "user_role_check" CHECK ("app_user"."role" in ('user','admin'))
);
--> statement-breakpoint
CREATE TABLE "app_verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "app_account" ADD CONSTRAINT "app_account_user_id_app_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_id_app_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."app_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_stall_id_stalls_id_fk" FOREIGN KEY ("stall_id") REFERENCES "public"."stalls"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "photos" ADD CONSTRAINT "photos_uploaded_by_app_user_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."app_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_stall_id_stalls_id_fk" FOREIGN KEY ("stall_id") REFERENCES "public"."stalls"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_user_id_app_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "closure_reports" ADD CONSTRAINT "closure_reports_stall_id_stalls_id_fk" FOREIGN KEY ("stall_id") REFERENCES "public"."stalls"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "closure_reports" ADD CONSTRAINT "closure_reports_user_id_app_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_session" ADD CONSTRAINT "app_session_user_id_app_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stall_photos" ADD CONSTRAINT "stall_photos_stall_id_stalls_id_fk" FOREIGN KEY ("stall_id") REFERENCES "public"."stalls"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stall_photos" ADD CONSTRAINT "stall_photos_photo_id_photos_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."photos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stalls" ADD CONSTRAINT "stalls_submitted_by_app_user_id_fk" FOREIGN KEY ("submitted_by") REFERENCES "public"."app_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stalls" ADD CONSTRAINT "stalls_owner_id_app_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."app_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_user_idx" ON "app_account" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "account_provider_idx" ON "app_account" USING btree ("provider_id","account_id");--> statement-breakpoint
CREATE INDEX "photos_uploader_idx" ON "photos" USING btree ("uploaded_by");--> statement-breakpoint
CREATE UNIQUE INDEX "report_daily_idx" ON "closure_reports" USING btree ("stall_id","user_id","day");--> statement-breakpoint
CREATE INDEX "reports_queue_idx" ON "closure_reports" USING btree ("resolved_at","created_at");--> statement-breakpoint
CREATE INDEX "session_user_idx" ON "app_session" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "photo_once_idx" ON "stall_photos" USING btree ("photo_id");--> statement-breakpoint
CREATE INDEX "stalls_nearby_idx" ON "stalls" USING btree ("status","latitude","longitude");--> statement-breakpoint
CREATE INDEX "stalls_owner_idx" ON "stalls" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "stalls_submitter_idx" ON "stalls" USING btree ("submitted_by");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "app_verification" USING btree ("identifier");