-- Generated schedules table
CREATE TABLE IF NOT EXISTS "generated_schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"name" text NOT NULL,
	"academic_year" text NOT NULL,
	"term_type" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"solver_status" text,
	"solver_time_ms" integer,
	"total_conflicts" integer DEFAULT 0,
	"generated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
-- Scheduled lessons table
CREATE TABLE IF NOT EXISTS "scheduled_lessons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"schedule_id" uuid NOT NULL,
	"course_instance_id" uuid NOT NULL,
	"class_id" uuid NOT NULL,
	"teacher_id" uuid,
	"room_id" uuid,
	"day_of_week" integer NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time NOT NULL,
	"lesson_index" integer NOT NULL,
	"duration_minutes" integer NOT NULL,
	"is_locked" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
-- Add foreign key constraints
DO $$ BEGIN
 ALTER TABLE "generated_schedules" ADD CONSTRAINT "generated_schedules_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "scheduled_lessons" ADD CONSTRAINT "scheduled_lessons_schedule_id_generated_schedules_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."generated_schedules"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "scheduled_lessons" ADD CONSTRAINT "scheduled_lessons_course_instance_id_course_instances_id_fk" FOREIGN KEY ("course_instance_id") REFERENCES "public"."course_instances"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "scheduled_lessons" ADD CONSTRAINT "scheduled_lessons_class_id_project_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."project_classes"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "scheduled_lessons" ADD CONSTRAINT "scheduled_lessons_teacher_id_teachers_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."teachers"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "scheduled_lessons" ADD CONSTRAINT "scheduled_lessons_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
