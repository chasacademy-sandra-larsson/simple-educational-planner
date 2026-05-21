CREATE TABLE "course_instances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"class_id" uuid NOT NULL,
	"teacher_id" uuid,
	"room_id" uuid,
	"course_code" text NOT NULL,
	"course_name" text NOT NULL,
	"points" integer NOT NULL,
	"category" text NOT NULL,
	"year" integer NOT NULL,
	"terms" jsonb NOT NULL,
	"lesson_duration" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "unique_course_per_class" UNIQUE("class_id","course_code")
);
--> statement-breakpoint
CREATE TABLE "project_classes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"class_code" text NOT NULL,
	"program_code" text NOT NULL,
	"program_name" text NOT NULL,
	"orientation_code" text NOT NULL,
	"orientation_name" text NOT NULL,
	"start_year" integer NOT NULL,
	"graduation_year" integer NOT NULL,
	"is_active" integer DEFAULT 1 NOT NULL,
	"total_points" integer DEFAULT 0 NOT NULL,
	"is_valid" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "unique_class_code_per_project" UNIQUE("project_id","class_code")
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"earliest_lesson_start" time,
	"latest_lesson_end" time,
	"default_lesson_duration" integer,
	"mentor_time_per_week" integer,
	"lunch_duration" integer,
	"earliest_lunch_time" time,
	"latest_lunch_time" time,
	"shortest_break_between_lessons" integer,
	"longest_break_between_lessons" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rooms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"room_number" text NOT NULL,
	"room_type" text,
	"capacity" integer NOT NULL,
	"allowed_subjects" jsonb,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "unique_room_number_per_project" UNIQUE("project_id","room_number")
);
--> statement-breakpoint
CREATE TABLE "service_distribution_courses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"service_distribution_id" uuid NOT NULL,
	"course_instance_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "unique_course_instance_per_distribution" UNIQUE("service_distribution_id","course_instance_id")
);
--> statement-breakpoint
CREATE TABLE "teacher_service_distributions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"teacher_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"academic_year" text NOT NULL,
	"service_points" integer NOT NULL,
	"assigned_points" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "unique_distribution_per_teacher_per_year" UNIQUE("teacher_id","project_id","academic_year")
);
--> statement-breakpoint
CREATE TABLE "teachers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"subject" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"password_hash" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "course_instances" ADD CONSTRAINT "course_instances_class_id_project_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."project_classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_instances" ADD CONSTRAINT "course_instances_teacher_id_teachers_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."teachers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_instances" ADD CONSTRAINT "course_instances_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_classes" ADD CONSTRAINT "project_classes_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_distribution_courses" ADD CONSTRAINT "service_distribution_courses_service_distribution_id_teacher_service_distributions_id_fk" FOREIGN KEY ("service_distribution_id") REFERENCES "public"."teacher_service_distributions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_distribution_courses" ADD CONSTRAINT "service_distribution_courses_course_instance_id_course_instances_id_fk" FOREIGN KEY ("course_instance_id") REFERENCES "public"."course_instances"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_service_distributions" ADD CONSTRAINT "teacher_service_distributions_teacher_id_teachers_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."teachers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_service_distributions" ADD CONSTRAINT "teacher_service_distributions_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teachers" ADD CONSTRAINT "teachers_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;