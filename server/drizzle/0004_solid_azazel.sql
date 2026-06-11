-- Scheduler v1: add subject to courses, full-time service points and teacher break minutes to projects
-- See docs/SCHEDULER-V1-PLAN.md and docs/adr/0002, docs/adr/0001
ALTER TABLE "course_instances" ADD COLUMN "subject" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "teacher_break_minutes" integer DEFAULT 15 NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "full_time_service_points" integer DEFAULT 600 NOT NULL;
