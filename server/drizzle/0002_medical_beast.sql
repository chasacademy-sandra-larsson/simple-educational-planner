CREATE TABLE "term_dates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"academic_year" text NOT NULL,
	"year" integer NOT NULL,
	"fall_term_start" date NOT NULL,
	"fall_term_end" date NOT NULL,
	"spring_term_start" date NOT NULL,
	"spring_term_end" date NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "unique_term_dates_per_project_year" UNIQUE("project_id","academic_year","year")
);
--> statement-breakpoint
ALTER TABLE "term_dates" ADD CONSTRAINT "term_dates_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;