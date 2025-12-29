// Manual DBML generator that works around drizzle-dbml-generator limitations
// This script manually creates the DBML file with all constraints
// Use this when drizzle-dbml-generator can't handle unique constraints in extraConfig

import * as fs from 'fs';
import * as path from 'path';

const dbmlContent = `table class_curricula {
  id uuid [pk, not null, default: \`gen_random_uuid()\`]
  class_id uuid [not null]
  total_points integer [not null, default: 0]
  is_valid integer [not null, default: 0]
  status text [not null, default: 'draft']
  version integer [not null, default: 1]
  created_at timestamp [not null, default: \`now()\`]
  updated_at timestamp [not null, default: \`now()\`]
  
  Note: 'Curriculum (course plan) as its own resource. One class can have multiple curricula (versions). status: draft, approved, or archived. version: for versioning. total_points and is_valid moved from project_classes. is_valid = 1 if total_points === 2500'
}

table course_instances {
  id uuid [pk, not null, default: \`gen_random_uuid()\`]
  curriculum_id uuid [not null]
  class_id uuid [not null]
  teacher_id uuid
  room_id uuid
  course_code text [not null]
  course_name text [not null]
  points integer [not null]
  category text [not null]
  year integer [not null]
  terms jsonb [not null]
  lesson_duration integer
  created_at timestamp [not null, default: \`now()\`]
  updated_at timestamp [not null, default: \`now()\`]
  
  indexes {
    (class_id, course_code) [unique, name: 'unique_course_per_class']
  }
  
  Note: 'Courses assigned to a curriculum with a specific teacher and room. curriculum_id links to class_curricula. class_id is denormalized for faster queries. One course per class (one teacher per course-instance). teacher_id and room_id can be NULL if not assigned yet. terms: JSONB array of term IDs (e.g., ["term1", "term2"]). lesson_duration: lesson duration in minutes. NULL = use project defaultLessonDuration. If set, overrides default for this course.'
}

table project_classes {
  id uuid [pk, not null, default: \`gen_random_uuid()\`]
  project_id uuid [not null]
  class_code text [not null]
  program_code text [not null]
  program_name text [not null]
  orientation_code text [not null]
  orientation_name text [not null]
  start_year integer [not null]
  graduation_year integer [not null]
  is_active integer [not null, default: 1]
  created_at timestamp [not null, default: \`now()\`]
  
  indexes {
    (project_id, class_code) [unique, name: 'unique_class_code_per_project']
  }
  
  Note: 'Classes in a project. total_points and is_valid moved to class_curricula table.'
}

table projects {
  id uuid [pk, not null, default: \`gen_random_uuid()\`]
  user_id uuid [not null]
  name text [not null]
  description text
  earliest_lesson_start time
  latest_lesson_end time
  default_lesson_duration integer
  mentor_time_per_week integer
  lunch_duration integer
  earliest_lunch_time time
  latest_lunch_time time
  shortest_break_between_lessons integer
  longest_break_between_lessons integer
  created_at timestamp [not null, default: \`now()\`]
  updated_at timestamp [not null, default: \`now()\`]
  
  Note: 'Time settings for scheduling. earliest_lesson_start: when lessons can earliest start (e.g., 08:00:00). latest_lesson_end: when lessons can latest end (e.g., 17:00:00). default_lesson_duration: standard lesson duration in minutes (e.g., 60). mentor_time_per_week: mentor time per week in minutes (e.g., 30). lunch_duration: lunch duration in minutes (e.g., 45). earliest_lunch_time/latest_lunch_time: lunch time window. shortest_break_between_lessons/longest_break_between_lessons: break duration range in minutes.'
}

table rooms {
  id uuid [pk, not null, default: \`gen_random_uuid()\`]
  project_id uuid [not null]
  room_number text [not null]
  room_type text
  capacity integer [not null]
  allowed_subjects jsonb
  notes text
  created_at timestamp [not null, default: \`now()\`]
  
  indexes {
    (project_id, room_number) [unique, name: 'unique_room_number_per_project']
  }
  
  Note: 'Rooms in a project. room_number must be unique per project. capacity is required. allowed_subjects: JSONB array of allowed subjects (e.g., ["fysik", "kemi", "biologi"]). NULL = no restrictions.'
}

table service_distribution_courses {
  id uuid [pk, not null, default: \`gen_random_uuid()\`]
  service_distribution_id uuid [not null]
  course_instance_id uuid [not null]
  created_at timestamp [not null, default: \`now()\`]
  
  indexes {
    (service_distribution_id, course_instance_id) [unique, name: 'unique_course_instance_per_distribution']
  }
  
  Note: 'Links course instances to service distributions. A course instance can only be in one service distribution.'
}

table teacher_service_distributions {
  id uuid [pk, not null, default: \`gen_random_uuid()\`]
  teacher_id uuid [not null]
  project_id uuid [not null]
  academic_year text [not null]
  service_points integer [not null]
  assigned_points integer [not null, default: 0]
  created_at timestamp [not null, default: \`now()\`]
  updated_at timestamp [not null, default: \`now()\`]
  
  indexes {
    (teacher_id, project_id, academic_year) [unique, name: 'unique_distribution_per_teacher_per_year']
  }
  
  Note: 'Teacher service distribution per academic year. service_points = tjänstegrad (e.g., 600 points per year). assigned_points is calculated from linked course instances.'
}

table teachers {
  id uuid [pk, not null, default: \`gen_random_uuid()\`]
  project_id uuid [not null]
  name text [not null]
  email text
  subject text
  notes text
  created_at timestamp [not null, default: \`now()\`]
}

table users {
  id uuid [pk, not null, default: \`gen_random_uuid()\`]
  email text [not null, unique]
  name text [not null]
  password_hash text [not null]
  created_at timestamp [not null, default: \`now()\`]
}

ref: class_curricula.class_id > project_classes.id
ref: course_instances.curriculum_id > class_curricula.id
ref: course_instances.class_id > project_classes.id
ref: course_instances.teacher_id > teachers.id
ref: course_instances.room_id > rooms.id
ref: project_classes.project_id > projects.id
ref: projects.user_id > users.id
ref: rooms.project_id > projects.id
ref: teachers.project_id > projects.id
ref: service_distribution_courses.service_distribution_id > teacher_service_distributions.id
ref: service_distribution_courses.course_instance_id > course_instances.id
ref: teacher_service_distributions.teacher_id > teachers.id
ref: teacher_service_distributions.project_id > projects.id
`;

const outputPath = path.join(__dirname, '../../schema.dbml');

fs.writeFileSync(outputPath, dbmlContent, 'utf-8');
console.log('✅ DBML file generated successfully at:', outputPath);
console.log('   Includes:');
console.log('   - class_curricula table (curriculum as its own resource)');
console.log('   - course_instances table (courses linked to curriculum with teacher and room assignments)');
console.log('   - teacher_service_distributions (tjänstefördelning per år)');
console.log('   - service_distribution_courses (links courses to distributions)');
console.log('   - rooms with allowed_subjects constraints');
