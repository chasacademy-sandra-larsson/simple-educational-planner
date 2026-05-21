CREATE TABLE "class_curricula" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"class_id" uuid NOT NULL,
	"total_points" integer DEFAULT 0 NOT NULL,
	"is_valid" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
-- Add curriculum_id as nullable first (will be populated by migration script if needed)
ALTER TABLE "course_instances" ADD COLUMN "curriculum_id" uuid;--> statement-breakpoint
ALTER TABLE "class_curricula" ADD CONSTRAINT "class_curricula_class_id_project_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."project_classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
-- Add foreign key constraint (nullable for now, will be made NOT NULL after data migration)
ALTER TABLE "course_instances" ADD CONSTRAINT "course_instances_curriculum_id_class_curricula_id_fk" FOREIGN KEY ("curriculum_id") REFERENCES "public"."class_curricula"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
-- Make curriculum_id NOT NULL (safe since database was just reset)
-- If you have existing data, run db:migrate-curriculum first, then manually add: ALTER TABLE "course_instances" ALTER COLUMN "curriculum_id" SET NOT NULL;
ALTER TABLE "course_instances" ALTER COLUMN "curriculum_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "project_classes" DROP COLUMN "total_points";--> statement-breakpoint
ALTER TABLE "project_classes" DROP COLUMN "is_valid";