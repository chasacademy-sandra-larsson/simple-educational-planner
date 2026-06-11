/**
 * Type definitions for the schedule solver
 */

// Time slot representation
export interface TimeSlot {
    dayOfWeek: number; // 1-5 (Monday-Friday)
    startMinutes: number; // Minutes from midnight (e.g., 480 = 08:00)
    endMinutes: number; // Minutes from midnight (e.g., 540 = 09:00)
}

// Input types for the solver
export interface SolverCourse {
    courseInstanceId: string;
    classId: string;
    courseCode: string;
    courseName: string;
    subject: string | null; // Skolverket subject for room allowedSubjects matching. NULL = not populated yet (preflight will flag).
    points: number;
    lessonsPerWeek: number; // Number of lessons needed per week (may be rounded up)
    minutesPerWeek: number; // Original minutes per week (before rounding lessons)
    lessonDuration: number; // Duration in minutes
    teacherId: string | null;
    roomId: string | null; // NULL = solver chooses; non-null = locked to this room
}

export interface SolverClass {
    id: string;
    classCode: string;
    studentCount?: number; // For room capacity matching
}

export interface SolverTeacher {
    id: string;
    name: string;
    subjects?: string[]; // Subjects they can teach (authorization, not subject of a specific lesson)
    servicePoints: number; // Tjänstegrad in points for the active academic year. Drives workDaysPerWeek step function.
}

export interface SolverRoom {
    id: string;
    roomNumber: string;
    capacity: number;
    roomType?: string;
    allowedSubjects: string[] | null; // null = all subjects allowed
}

export interface SolverProjectSettings {
    earliestLessonStart: number; // Minutes from midnight
    latestLessonEnd: number; // Minutes from midnight
    defaultLessonDuration: number; // Used for calculations (points to minutes conversion)
    minLessonDuration: number; // Minimum lesson duration in minutes (e.g., 40)
    maxLessonDuration: number; // Maximum lesson duration in minutes (e.g., 90)
    lunchDuration: number;
    earliestLunchTime: number; // Minutes from midnight
    latestLunchTime: number; // Minutes from midnight
    shortestBreakBetweenLessons: number;
    teacherBreakMinutes: number; // Minimum break between a teacher's lessons (typically 15)
    fullTimeServicePoints: number; // Service points that count as 100% tjänst (600 or 700 typically)
}

export interface SolverInput {
    projectId: string;
    academicYear: string;
    termType: 'fall' | 'spring';
    specificTerm?: string; // Optional: specific term (term1, term2, etc.)
    courses: SolverCourse[];
    classes: SolverClass[];
    teachers: SolverTeacher[];
    rooms: SolverRoom[];
    settings: SolverProjectSettings;
}

// Output types
export interface ScheduledLessonResult {
    courseInstanceId: string;
    classId: string;
    teacherId: string | null;
    roomId: string | null;
    dayOfWeek: number;
    startTime: string; // "HH:MM:SS" format
    endTime: string; // "HH:MM:SS" format
    lessonIndex: number;
    durationMinutes: number;
}

export type SolverStatus = 'OPTIMAL' | 'FEASIBLE' | 'INFEASIBLE' | 'TIMEOUT' | 'ERROR';

export interface SolverResult {
    success: boolean;
    status: SolverStatus;
    lessons: ScheduledLessonResult[];
    solverTimeMs: number;
    totalConflicts: number;
    message?: string;
}

// Internal solver state
export interface LessonAssignment {
    courseInstanceId: string;
    classId: string;
    teacherId: string | null;
    roomId: string | null;
    slot: TimeSlot;
    lessonIndex: number;
}

// Conflict types for diagnostics
export interface ScheduleConflict {
    type: 'TEACHER_DOUBLE_BOOKING' | 'ROOM_DOUBLE_BOOKING' | 'CLASS_DOUBLE_BOOKING' | 'LUNCH_VIOLATION' | 'ROOM_CAPACITY' | 'ROOM_SUBJECT';
    description: string;
    lessons: string[]; // IDs of conflicting lessons
}
