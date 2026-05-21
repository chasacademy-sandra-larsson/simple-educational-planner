#!/usr/bin/env python3
"""
OR-Tools based school schedule solver.
Reads input from stdin as JSON, outputs result as JSON to stdout.
"""

import json
import sys
import time
from typing import List, Dict, Any, Tuple

# Check for ortools early and provide clear error message
try:
    from ortools.sat.python import cp_model
except ImportError as e:
    error_result = {
        'success': False,
        'status': 'ERROR',
        'lessons': [],
        'solverTimeMs': 0,
        'totalConflicts': 0,
        'message': f"ortools not installed. Please run: pip install ortools>=9.8.0. Error: {str(e)}"
    }
    print(json.dumps(error_result))
    sys.exit(1)


def time_to_minutes(time_str: str) -> int:
    """Convert HH:MM:SS or HH:MM to minutes from midnight."""
    parts = time_str.split(':')
    return int(parts[0]) * 60 + int(parts[1])


def minutes_to_time(minutes: int) -> str:
    """Convert minutes from midnight to HH:MM:SS format."""
    hours = minutes // 60
    mins = minutes % 60
    return f"{hours:02d}:{mins:02d}:00"


class ScheduleSolver:
    def __init__(self, input_data: Dict[str, Any]):
        self.input = input_data
        self.settings = input_data['settings']
        self.courses = input_data['courses']
        self.classes = {c['id']: c for c in input_data['classes']}
        self.teachers = {t['id']: t for t in input_data['teachers']}
        self.rooms = {r['id']: r for r in input_data['rooms']}

        # Time slot configuration
        self.slot_duration = 15  # 15-minute increments
        self.days = list(range(1, 6))  # Monday=1 to Friday=5
        self.num_days = 5

        # Lesson duration settings (with fallback defaults)
        self.min_lesson_duration = self.settings.get('minLessonDuration', 40)
        self.max_lesson_duration = self.settings.get('maxLessonDuration', 90)
        self.default_lesson_duration = self.settings.get('defaultLessonDuration', 60)

        # Break and lunch settings
        self.lunch_duration = self.settings.get('lunchDuration', 45)
        self.earliest_lunch = self.settings.get('earliestLunchTime', 11 * 60 + 30)  # 11:30
        self.latest_lunch = self.settings.get('latestLunchTime', 13 * 60 + 30)  # 13:30
        self.break_between_lessons = self.settings.get('shortestBreakBetweenLessons', 5)

        # Round to slot_duration increments (use round for nearest, not floor)
        self.min_lesson_duration = max(self.slot_duration,
            round(self.min_lesson_duration / self.slot_duration) * self.slot_duration)
        self.max_lesson_duration = round(self.max_lesson_duration / self.slot_duration) * self.slot_duration

        # Calculate time slots
        self.earliest_start = self.settings['earliestLessonStart']
        self.latest_end = self.settings['latestLessonEnd']
        self.day_length = self.latest_end - self.earliest_start

        # Generate all possible start times (in 15-min increments)
        self.start_times = []
        t = self.earliest_start
        while t + self.slot_duration <= self.latest_end:
            self.start_times.append(t)
            t += self.slot_duration

        self.model = cp_model.CpModel()
        self.solver = cp_model.CpSolver()

        # Variables
        self.day_vars: Dict[int, Any] = {}
        self.start_vars: Dict[int, Any] = {}
        self.duration_vars: Dict[int, Any] = {}  # Variable duration per lesson
        # Combined time variable (day * day_length + start_within_day) for efficient no-overlap
        self.time_vars: Dict[int, Any] = {}
        self.interval_vars: Dict[int, Any] = {}
        self.lesson_info: List[Dict] = []

        print(f"[Python Solver] Lesson duration range: {self.min_lesson_duration}-{self.max_lesson_duration} min", file=sys.stderr)

    def calculate_optimal_duration(self, course: Dict) -> int:
        """Calculate optimal lesson duration for a course within min/max bounds.

        Strategy: Calculate the ideal duration based on minutesPerWeek / lessonsPerWeek,
        then clamp to [minLessonDuration, maxLessonDuration] and round to slot_duration.
        """
        minutes_per_week = course.get('minutesPerWeek', 0)
        lessons_per_week = course.get('lessonsPerWeek', 1)

        if lessons_per_week <= 0:
            return self.default_lesson_duration

        # Calculate ideal duration
        ideal_duration = minutes_per_week / lessons_per_week

        # Clamp to min/max
        duration = max(self.min_lesson_duration, min(self.max_lesson_duration, ideal_duration))

        # Round to nearest slot_duration (15 min)
        duration = round(duration / self.slot_duration) * self.slot_duration

        # Ensure within bounds after rounding
        duration = max(self.min_lesson_duration, min(self.max_lesson_duration, duration))

        return int(duration)

    def create_lessons(self) -> List[Dict]:
        """Create list of all lessons that need to be scheduled."""
        lessons = []
        for course in self.courses:
            # Calculate optimal duration for this course
            duration = self.calculate_optimal_duration(course)

            for i in range(course['lessonsPerWeek']):
                lessons.append({
                    'index': len(lessons),
                    'courseInstanceId': course['courseInstanceId'],
                    'classId': course['classId'],
                    'courseCode': course['courseCode'],
                    'courseName': course['courseName'],
                    'duration': duration,
                    'lessonIndex': i + 1,
                    'preferredTeacherId': course.get('preferredTeacherId'),
                    'preferredRoomId': course.get('preferredRoomId'),
                })
        return lessons

    def get_valid_start_times(self, duration: int) -> List[int]:
        """Get valid start times for a lesson of given duration."""
        valid = []
        for start in self.start_times:
            end = start + duration
            if end <= self.latest_end:
                valid.append(start)
        return valid

    def build_model(self):
        """Build the CP-SAT model with all constraints using efficient interval variables."""
        self.lesson_info = self.create_lessons()

        if not self.lesson_info:
            return

        print(f"[Python Solver] Building model for {len(self.lesson_info)} lessons", file=sys.stderr)

        # Create decision variables for each lesson
        # Use a combined "time" variable that spans all days
        # time = (day-1) * day_length + (start - earliest_start)
        # This allows using AddNoOverlap which is much more efficient

        max_time = self.num_days * self.day_length

        for lesson in self.lesson_info:
            idx = lesson['index']
            duration = lesson['duration']
            valid_starts = self.get_valid_start_times(duration)

            if not valid_starts:
                continue

            # Day variable: which day (1-5)
            self.day_vars[idx] = self.model.NewIntVarFromDomain(
                cp_model.Domain.FromValues(self.days),
                f"day_{idx}"
            )

            # Start time within day (relative to earliest_start)
            relative_starts = [s - self.earliest_start for s in valid_starts]
            start_in_day = self.model.NewIntVarFromDomain(
                cp_model.Domain.FromValues(relative_starts),
                f"start_in_day_{idx}"
            )

            # Actual start time
            self.start_vars[idx] = self.model.NewIntVar(
                min(valid_starts), max(valid_starts), f"start_{idx}"
            )
            # Link: start = earliest_start + start_in_day
            self.model.Add(self.start_vars[idx] == self.earliest_start + start_in_day)

            # Combined time variable for no-overlap constraint
            # time = (day - 1) * day_length + start_in_day
            self.time_vars[idx] = self.model.NewIntVar(0, max_time, f"time_{idx}")
            self.model.Add(
                self.time_vars[idx] == (self.day_vars[idx] - 1) * self.day_length + start_in_day
            )

            # Create interval variable for this lesson
            self.interval_vars[idx] = self.model.NewIntervalVar(
                self.time_vars[idx],  # start
                duration,              # size (fixed)
                self.time_vars[idx] + duration,  # end
                f"interval_{idx}"
            )

        print(f"[Python Solver] Created {len(self.interval_vars)} interval variables", file=sys.stderr)

        # Constraint: No class double-booking using AddNoOverlap
        lessons_by_class: Dict[str, List[int]] = {}
        for lesson in self.lesson_info:
            idx = lesson['index']
            if idx not in self.interval_vars:
                continue
            class_id = lesson['classId']
            if class_id not in lessons_by_class:
                lessons_by_class[class_id] = []
            lessons_by_class[class_id].append(idx)

        for class_id, indices in lessons_by_class.items():
            if len(indices) > 1:
                intervals = [self.interval_vars[idx] for idx in indices]
                self.model.AddNoOverlap(intervals)

        print(f"[Python Solver] Added no-overlap constraints for {len(lessons_by_class)} classes", file=sys.stderr)

        # Constraint: No teacher double-booking
        lessons_by_teacher: Dict[str, List[int]] = {}
        for lesson in self.lesson_info:
            idx = lesson['index']
            if idx not in self.interval_vars:
                continue
            teacher_id = lesson.get('preferredTeacherId')
            if teacher_id:
                if teacher_id not in lessons_by_teacher:
                    lessons_by_teacher[teacher_id] = []
                lessons_by_teacher[teacher_id].append(idx)

        for teacher_id, indices in lessons_by_teacher.items():
            if len(indices) > 1:
                intervals = [self.interval_vars[idx] for idx in indices]
                self.model.AddNoOverlap(intervals)

        print(f"[Python Solver] Added no-overlap constraints for {len(lessons_by_teacher)} teachers", file=sys.stderr)

        # Constraint: No room double-booking
        lessons_by_room: Dict[str, List[int]] = {}
        for lesson in self.lesson_info:
            idx = lesson['index']
            if idx not in self.interval_vars:
                continue
            room_id = lesson.get('preferredRoomId')
            if room_id:
                if room_id not in lessons_by_room:
                    lessons_by_room[room_id] = []
                lessons_by_room[room_id].append(idx)

        for room_id, indices in lessons_by_room.items():
            if len(indices) > 1:
                intervals = [self.interval_vars[idx] for idx in indices]
                self.model.AddNoOverlap(intervals)

        print(f"[Python Solver] Added no-overlap constraints for {len(lessons_by_room)} rooms", file=sys.stderr)

        # Constraint: Lunch break - protect a "core lunch period" where no lessons can be scheduled
        # The core lunch is centered in the lunch window with duration = lunch_duration
        # Example: lunch window 11:00-13:00 with 45 min lunch → core lunch 11:37-12:22 (centered)
        # We'll use a simpler approach: no lesson can START during the core lunch period
        lunch_window_duration = self.latest_lunch - self.earliest_lunch
        if lunch_window_duration > self.lunch_duration:
            # Core lunch starts after a buffer from earliest_lunch
            buffer = (lunch_window_duration - self.lunch_duration) // 2
            core_lunch_start = self.earliest_lunch + buffer
            core_lunch_end = core_lunch_start + self.lunch_duration
        else:
            # Lunch window is smaller than lunch duration, use entire window
            core_lunch_start = self.earliest_lunch
            core_lunch_end = self.latest_lunch

        print(f"[Python Solver] Core lunch period: {minutes_to_time(core_lunch_start)} - {minutes_to_time(core_lunch_end)}", file=sys.stderr)

        lunch_constraints_added = 0
        for class_id, indices in lessons_by_class.items():
            for idx in indices:
                if idx not in self.start_vars:
                    continue
                lesson = self.lesson_info[idx]
                duration = lesson['duration']

                # Lesson must not overlap with core lunch period
                # This means: lesson must end before core_lunch_start OR start after core_lunch_end
                ends_before_lunch = self.model.NewBoolVar(f"ends_before_lunch_{idx}")
                starts_after_lunch = self.model.NewBoolVar(f"starts_after_lunch_{idx}")

                # Lesson ends before core lunch starts
                self.model.Add(self.start_vars[idx] + duration <= core_lunch_start).OnlyEnforceIf(ends_before_lunch)
                self.model.Add(self.start_vars[idx] + duration > core_lunch_start).OnlyEnforceIf(ends_before_lunch.Not())

                # Lesson starts after core lunch ends
                self.model.Add(self.start_vars[idx] >= core_lunch_end).OnlyEnforceIf(starts_after_lunch)
                self.model.Add(self.start_vars[idx] < core_lunch_end).OnlyEnforceIf(starts_after_lunch.Not())

                # Must satisfy one of the conditions
                self.model.AddBoolOr([ends_before_lunch, starts_after_lunch])
                lunch_constraints_added += 1

        print(f"[Python Solver] Added {lunch_constraints_added} lunch break constraints", file=sys.stderr)

        # Constraint: Minimum break between consecutive lessons for same class
        # We use the interval's end time + break_between_lessons as the effective "size" for spacing
        if self.break_between_lessons > 0:
            break_constraints_added = 0
            for class_id, indices in lessons_by_class.items():
                if len(indices) <= 1:
                    continue

                # For each pair of lessons on the same day, ensure break between them
                for i, idx1 in enumerate(indices):
                    for idx2 in indices[i+1:]:
                        if idx1 not in self.day_vars or idx2 not in self.day_vars:
                            continue

                        # Check if same day
                        same_day = self.model.NewBoolVar(f"same_day_{idx1}_{idx2}")
                        self.model.Add(self.day_vars[idx1] == self.day_vars[idx2]).OnlyEnforceIf(same_day)
                        self.model.Add(self.day_vars[idx1] != self.day_vars[idx2]).OnlyEnforceIf(same_day.Not())

                        lesson1 = self.lesson_info[idx1]
                        lesson2 = self.lesson_info[idx2]
                        dur1 = lesson1['duration']
                        dur2 = lesson2['duration']

                        # If same day: either lesson1 ends + break <= lesson2 starts
                        # OR lesson2 ends + break <= lesson1 starts
                        l1_before_l2 = self.model.NewBoolVar(f"l1_before_l2_{idx1}_{idx2}")
                        l2_before_l1 = self.model.NewBoolVar(f"l2_before_l1_{idx1}_{idx2}")

                        self.model.Add(self.start_vars[idx1] + dur1 + self.break_between_lessons <= self.start_vars[idx2]).OnlyEnforceIf(l1_before_l2)
                        self.model.Add(self.start_vars[idx2] + dur2 + self.break_between_lessons <= self.start_vars[idx1]).OnlyEnforceIf(l2_before_l1)

                        # If same day, one of these must be true
                        self.model.AddBoolOr([l1_before_l2, l2_before_l1, same_day.Not()])
                        break_constraints_added += 1

            print(f"[Python Solver] Added {break_constraints_added} break-between-lessons constraints for classes", file=sys.stderr)

        # Constraint: Minimum 15-minute break between consecutive lessons for same teacher
        teacher_break_duration = 15  # minutes
        teacher_break_constraints_added = 0
        for teacher_id, indices in lessons_by_teacher.items():
            if len(indices) <= 1:
                continue

            # For each pair of lessons on the same day, ensure break between them
            for i, idx1 in enumerate(indices):
                for idx2 in indices[i+1:]:
                    if idx1 not in self.day_vars or idx2 not in self.day_vars:
                        continue

                    # Check if same day
                    same_day_t = self.model.NewBoolVar(f"same_day_teacher_{idx1}_{idx2}")
                    self.model.Add(self.day_vars[idx1] == self.day_vars[idx2]).OnlyEnforceIf(same_day_t)
                    self.model.Add(self.day_vars[idx1] != self.day_vars[idx2]).OnlyEnforceIf(same_day_t.Not())

                    lesson1 = self.lesson_info[idx1]
                    lesson2 = self.lesson_info[idx2]
                    dur1 = lesson1['duration']
                    dur2 = lesson2['duration']

                    # If same day: either lesson1 ends + teacher_break <= lesson2 starts
                    # OR lesson2 ends + teacher_break <= lesson1 starts
                    t1_before_t2 = self.model.NewBoolVar(f"t1_before_t2_{idx1}_{idx2}")
                    t2_before_t1 = self.model.NewBoolVar(f"t2_before_t1_{idx1}_{idx2}")

                    self.model.Add(self.start_vars[idx1] + dur1 + teacher_break_duration <= self.start_vars[idx2]).OnlyEnforceIf(t1_before_t2)
                    self.model.Add(self.start_vars[idx2] + dur2 + teacher_break_duration <= self.start_vars[idx1]).OnlyEnforceIf(t2_before_t1)

                    # If same day, one of these must be true
                    self.model.AddBoolOr([t1_before_t2, t2_before_t1, same_day_t.Not()])
                    teacher_break_constraints_added += 1

        print(f"[Python Solver] Added {teacher_break_constraints_added} break-between-lessons constraints for teachers (15 min)", file=sys.stderr)

        # Optimization: Penalize single-lesson days for teachers
        # This helps part-time teachers by consolidating lessons to fewer days
        # We use a soft constraint approach: penalize days where a teacher has exactly 1 lesson
        single_lesson_day_penalties = []

        for teacher_id, indices in lessons_by_teacher.items():
            if len(indices) <= 1:
                continue  # Only one lesson total, can't optimize

            for day in self.days:
                # Count lessons on this day for this teacher
                lesson_on_day_vars = []
                for idx in indices:
                    if idx not in self.day_vars:
                        continue
                    is_on_day = self.model.NewBoolVar(f"lesson_{idx}_on_day_{day}_opt")
                    self.model.Add(self.day_vars[idx] == day).OnlyEnforceIf(is_on_day)
                    self.model.Add(self.day_vars[idx] != day).OnlyEnforceIf(is_on_day.Not())
                    lesson_on_day_vars.append(is_on_day)

                if len(lesson_on_day_vars) >= 2:
                    # Create a variable for "exactly one lesson on this day"
                    # This is true when sum == 1
                    count_on_day = self.model.NewIntVar(0, len(lesson_on_day_vars), f"count_{teacher_id[:8]}_day_{day}")
                    self.model.Add(count_on_day == sum(lesson_on_day_vars))

                    # Penalty variable: 1 if exactly one lesson, 0 otherwise
                    is_single = self.model.NewBoolVar(f"single_{teacher_id[:8]}_day_{day}")
                    self.model.Add(count_on_day == 1).OnlyEnforceIf(is_single)
                    self.model.Add(count_on_day != 1).OnlyEnforceIf(is_single.Not())
                    single_lesson_day_penalties.append(is_single)

        # Minimize single-lesson days
        if single_lesson_day_penalties:
            self.model.Minimize(sum(single_lesson_day_penalties))
            print(f"[Python Solver] Added optimization: minimize single-lesson days ({len(single_lesson_day_penalties)} penalty variables)", file=sys.stderr)

        # Diagnostic: Check if scheduling is feasible
        total_lessons = len(self.interval_vars)
        minutes_per_day = self.latest_end - self.earliest_start
        total_minutes_available = minutes_per_day * self.num_days  # per class

        # Calculate lessons per class
        # Use original minutesPerWeek from course data (not recalculated from lessons)
        # to avoid showing inflated values due to Math.ceil rounding
        lessons_per_class = {}
        minutes_per_class = {}
        course_minutes_map = {}  # Map courseInstanceId -> original minutesPerWeek
        courses_by_class = {}  # Track which courses belong to each class
        
        # Build map of original minutes per week from course data
        # Check for duplicate course instances
        seen_course_ids = set()
        for course in self.courses:
            course_id = course['courseInstanceId']
            class_id = course['classId']
            minutes_per_week = course.get('minutesPerWeek', 0)
            lessons_per_week = course.get('lessonsPerWeek', 0)
            lesson_duration = course.get('lessonDuration', 60)
            
            # Check for duplicates
            if course_id in seen_course_ids:
                print(f"[Python Solver] WARNING: Duplicate course instance {course_id[:8]}... for class {class_id[:8]}...", file=sys.stderr)
            seen_course_ids.add(course_id)
            
            # Debug: log if minutesPerWeek is missing or seems wrong
            if minutes_per_week == 0:
                print(f"[Python Solver] WARNING: Course {course_id[:8]}... has minutesPerWeek=0", file=sys.stderr)
            
            # Calculate what minutes would be if we used lessonsPerWeek * lessonDuration
            calculated_minutes = lessons_per_week * lesson_duration
            if abs(calculated_minutes - minutes_per_week) > 5:  # More than 5 min difference
                print(f"[Python Solver] DEBUG: Course {course_id[:8]}... class {class_id[:8]}...: "
                      f"minutesPerWeek={minutes_per_week}, lessonsPerWeek={lessons_per_week}, "
                      f"calculated={calculated_minutes} (diff={calculated_minutes - minutes_per_week})", 
                      file=sys.stderr)
            
            # Only store the first occurrence (in case of duplicates)
            if course_id not in course_minutes_map:
                course_minutes_map[course_id] = minutes_per_week
            
            # Track courses per class (to sum minutes once per course, not per lesson)
            if class_id not in courses_by_class:
                courses_by_class[class_id] = set()
            courses_by_class[class_id].add(course_id)
        
        # Count lessons per class
        for lesson in self.lesson_info:
            cid = lesson['classId']
            lessons_per_class[cid] = lessons_per_class.get(cid, 0) + 1
        
        # Sum original minutesPerWeek once per course per class
        # IMPORTANT: We sum minutesPerWeek once per course, not per lesson
        # This ensures we match the UI which shows minutesPerWeek per course
        for class_id, course_ids in courses_by_class.items():
            total_minutes_for_class = 0
            for course_id in course_ids:
                original_minutes = course_minutes_map.get(course_id, 0)
                total_minutes_for_class += original_minutes
            minutes_per_class[class_id] = total_minutes_for_class

        # Show which term we're generating for
        term_type = self.input.get('termType', 'unknown')
        specific_term = self.input.get('specificTerm')
        term_info = f"{term_type}"
        if specific_term:
            term_info += f" ({specific_term})"
        print(f"[Python Solver] Generating schedule for: {term_info}", file=sys.stderr)
        print(f"[Python Solver] Available time per class: {minutes_per_day} min/day × 5 days = {total_minutes_available} min/week", file=sys.stderr)
        print(f"[Python Solver] NOTE: minutesPerWeek is calculated based on ALL terms each course runs,", file=sys.stderr)
        print(f"[Python Solver]       not just the selected term. This matches the UI calculation.", file=sys.stderr)
        for cid, count in sorted(lessons_per_class.items(), key=lambda x: -x[1])[:5]:
            mins = minutes_per_class.get(cid, 0)
            pct = (mins / total_minutes_available) * 100 if total_minutes_available > 0 else 0
            
            # Debug: show breakdown of courses for this class
            class_courses = [c for c in self.courses if c['classId'] == cid]
            total_course_minutes = sum(c.get('minutesPerWeek', 0) for c in class_courses)
            print(f"[Python Solver]   Class {cid[:8]}...: {count} lessons, {mins} min ({pct:.1f}% of available time)", file=sys.stderr)
            
            # Show detailed breakdown
            print(f"[Python Solver]     DEBUG: {len(class_courses)} courses, sum of minutesPerWeek={total_course_minutes}, calculated total={mins}", file=sys.stderr)
            if abs(total_course_minutes - mins) > 1:
                print(f"[Python Solver]     WARNING: Mismatch! Sum={total_course_minutes} vs calculated={mins}", file=sys.stderr)
            
            # Show top courses by minutes
            top_courses = sorted(class_courses, key=lambda c: c.get('minutesPerWeek', 0), reverse=True)[:5]
            for course in top_courses:
                print(f"[Python Solver]       Course {course['courseCode']}: {course.get('minutesPerWeek', 0)} min/week, {course.get('lessonsPerWeek', 0)} lessons/week", file=sys.stderr)

        # Check teacher load
        lessons_per_teacher = {}
        for lesson in self.lesson_info:
            tid = lesson.get('preferredTeacherId')
            if tid:
                lessons_per_teacher[tid] = lessons_per_teacher.get(tid, 0) + 1

        if lessons_per_teacher:
            max_teacher = max(lessons_per_teacher.items(), key=lambda x: x[1])
            print(f"[Python Solver] Most loaded teacher: {max_teacher[1]} lessons", file=sys.stderr)

    def _diagnose_infeasibility(self) -> str:
        """Analyze why the schedule might be infeasible."""
        issues = []

        minutes_per_day = self.latest_end - self.earliest_start
        total_minutes_available = minutes_per_day * self.num_days

        # Check class overload using original minutesPerWeek (not recalculated from lessons)
        minutes_per_class = {}
        courses_by_class = {}
        
        # Build map of original minutes per week from course data
        for course in self.courses:
            course_id = course['courseInstanceId']
            class_id = course['classId']
            original_minutes = course.get('minutesPerWeek', 0)
            
            if class_id not in courses_by_class:
                courses_by_class[class_id] = set()
            courses_by_class[class_id].add(course_id)
            
            # Sum original minutesPerWeek once per course
            minutes_per_class[class_id] = minutes_per_class.get(class_id, 0) + original_minutes

        overloaded_classes = [(cid, mins) for cid, mins in minutes_per_class.items()
                              if mins > total_minutes_available * 0.9]
        if overloaded_classes:
            issues.append(f"{len(overloaded_classes)} klasser har för många lektioner för tillgänglig tid")

        # Check teacher overload using original minutesPerWeek
        teacher_minutes = {}
        teacher_courses = {}  # Track courses per teacher to avoid double counting
        
        for course in self.courses:
            tid = course.get('preferredTeacherId')
            if tid:
                course_id = course['courseInstanceId']
                original_minutes = course.get('minutesPerWeek', 0)
                
                if tid not in teacher_courses:
                    teacher_courses[tid] = set()
                
                # Only count each course once per teacher
                if course_id not in teacher_courses[tid]:
                    teacher_courses[tid].add(course_id)
                    teacher_minutes[tid] = teacher_minutes.get(tid, 0) + original_minutes

        overloaded_teachers = [(tid, mins) for tid, mins in teacher_minutes.items()
                               if mins > total_minutes_available]
        if overloaded_teachers:
            issues.append(f"{len(overloaded_teachers)} lärare har fler lektioner än vad som ryms på en vecka")

        # Check if same teacher teaches too many different classes
        teacher_classes = {}
        for lesson in self.lesson_info:
            tid = lesson.get('preferredTeacherId')
            cid = lesson['classId']
            if tid:
                if tid not in teacher_classes:
                    teacher_classes[tid] = set()
                teacher_classes[tid].add(cid)

        multi_class_teachers = [(tid, len(classes)) for tid, classes in teacher_classes.items()
                                if len(classes) > 3]
        if multi_class_teachers:
            max_t = max(multi_class_teachers, key=lambda x: x[1])
            issues.append(f"En lärare undervisar {max_t[1]} olika klasser vilket kan orsaka konflikter")

        if not issues:
            issues.append("Kontrollera att lärare/rum inte är dubbelbokade")

        return " | ".join(issues)

    def solve(self, time_limit_seconds: int = 300) -> Dict[str, Any]:
        """Solve the model and return results."""
        start_time = time.time()

        if not self.lesson_info:
            return {
                'success': True,
                'status': 'OPTIMAL',
                'lessons': [],
                'solverTimeMs': int((time.time() - start_time) * 1000),
                'totalConflicts': 0,
                'message': 'No lessons to schedule'
            }

        # Configure solver for faster solutions on large problems
        self.solver.parameters.max_time_in_seconds = time_limit_seconds
        self.solver.parameters.num_search_workers = 8  # Use multiple threads
        # Note: log_search_progress writes to stdout which corrupts JSON output, so we disable it

        print(f"[Python Solver] Starting with {len(self.lesson_info)} lessons, time limit {time_limit_seconds}s", file=sys.stderr)
        status = self.solver.Solve(self.model)
        print(f"[Python Solver] Finished with status {status} after {int((time.time() - start_time) * 1000)}ms", file=sys.stderr)

        solve_time_ms = int((time.time() - start_time) * 1000)

        status_map = {
            cp_model.OPTIMAL: 'OPTIMAL',
            cp_model.FEASIBLE: 'FEASIBLE',
            cp_model.INFEASIBLE: 'INFEASIBLE',
            cp_model.MODEL_INVALID: 'ERROR',
            cp_model.UNKNOWN: 'TIMEOUT'
        }

        result_status = status_map.get(status, 'ERROR')
        success = status in [cp_model.OPTIMAL, cp_model.FEASIBLE]

        lessons = []
        total_conflicts = 0

        if success:
            for lesson in self.lesson_info:
                idx = lesson['index']

                if idx not in self.day_vars or idx not in self.start_vars:
                    total_conflicts += 1
                    continue

                day = self.solver.Value(self.day_vars[idx])
                start = self.solver.Value(self.start_vars[idx])
                duration = lesson['duration']

                lessons.append({
                    'courseInstanceId': lesson['courseInstanceId'],
                    'classId': lesson['classId'],
                    'teacherId': lesson.get('preferredTeacherId'),
                    'roomId': lesson.get('preferredRoomId'),
                    'dayOfWeek': day,
                    'startTime': minutes_to_time(start),
                    'endTime': minutes_to_time(start + duration),
                    'lessonIndex': lesson['lessonIndex'],
                    'durationMinutes': duration
                })

        message = f"Scheduled {len(lessons)}/{len(self.lesson_info)} lessons"
        if result_status == 'INFEASIBLE':
            # Analyze why it's infeasible
            diagnosis = self._diagnose_infeasibility()
            message = f"Could not find a valid schedule. {diagnosis}"
        elif result_status == 'TIMEOUT':
            message = "Solver timed out - partial solution may be available"

        return {
            'success': success,
            'status': result_status,
            'lessons': lessons,
            'solverTimeMs': solve_time_ms,
            'totalConflicts': total_conflicts,
            'message': message
        }


def main():
    try:
        # Read input from stdin
        input_data = json.load(sys.stdin)

        # Create and run solver
        solver = ScheduleSolver(input_data)
        solver.build_model()
        result = solver.solve(time_limit_seconds=120)

        # Output result as JSON
        print(json.dumps(result))

    except Exception as e:
        import traceback
        # Return error as JSON
        error_result = {
            'success': False,
            'status': 'ERROR',
            'lessons': [],
            'solverTimeMs': 0,
            'totalConflicts': 0,
            'message': f"Solver error: {str(e)}\n{traceback.format_exc()}"
        }
        print(json.dumps(error_result))
        sys.exit(1)


if __name__ == '__main__':
    main()
