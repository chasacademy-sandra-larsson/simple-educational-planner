/**
 * Preflight checks — arithmetic sanity checks run before the CP-SAT solver.
 * See docs/SCHEDULER-V1-PLAN.md "Preflight". Warnings only, never blocks.
 */

import { SolverInput } from './types';

export type PreflightSeverity = 'warning' | 'error';

export interface PreflightWarning {
    severity: PreflightSeverity;
    type: string;
    message: string;
    courseInstanceId?: string;
    teacherId?: string;
    classId?: string;
}

/**
 * Step function from ADR-0002: tjänstegrad → free days per week.
 */
function freeDaysForPercent(pct: number): number {
    const floored = Math.floor(pct);
    if (floored < 50) return 3;
    if (floored < 80) return 2;
    if (floored === 80) return 1;
    return 0;
}

export function runPreflight(input: SolverInput): PreflightWarning[] {
    const warnings: PreflightWarning[] = [];
    const { settings, courses, teachers, classes, rooms } = input;

    // Approximate slots per day: usable minutes (day length minus lunch) divided by min lesson duration.
    const usableMinPerDay = Math.max(
        0,
        settings.latestLessonEnd - settings.earliestLessonStart - settings.lunchDuration,
    );
    const slotsPerDay = Math.max(1, Math.floor(usableMinPerDay / Math.max(settings.minLessonDuration, 1)));

    // Lookup maps for friendlier error messages
    const teacherById = new Map(teachers.map(t => [t.id, t]));
    const classById = new Map(classes.map(c => [c.id, c]));

    // --- Per-course checks ----------------------------------------------------
    for (const c of courses) {
        const label = `${c.courseName} (${c.courseCode})`;
        // Pseudo-courses (mentor time, etc.) have an underscore prefix and skip user-facing checks.
        const isPseudo = c.courseCode.startsWith('_');

        // lessonsPerWeek = 0 → won't be scheduled
        if (c.lessonsPerWeek === 0) {
            warnings.push({
                severity: 'warning',
                type: 'COURSE_NOT_SCHEDULED',
                message: `${label}: 0 lektioner/vecka — kursen schemaläggs inte. Justera lessonDuration eller minutesPerWeek.`,
                courseInstanceId: c.courseInstanceId,
            });
            continue; // No further checks make sense
        }

        // > 5 lessons/week — INFEASIBLE per AllDifferent constraint
        if (c.lessonsPerWeek > 5) {
            warnings.push({
                severity: 'error',
                type: 'COURSE_TOO_MANY_LESSONS',
                message: `${label}: ${c.lessonsPerWeek} lektioner/vecka — max 5 möjligt (en lektion/dag/kurs).`,
                courseInstanceId: c.courseInstanceId,
            });
        }

        // Rounding diff > 5 min/week
        const actualMin = c.lessonsPerWeek * c.lessonDuration;
        const diff = Math.abs(actualMin - c.minutesPerWeek);
        if (diff > 5) {
            warnings.push({
                severity: 'error',
                type: 'COURSE_ROUNDING_DIFF',
                message: `${label}: schemalägger ${actualMin} min/vecka, målet är ${c.minutesPerWeek} min/vecka (diff ${diff} min). Ändra lessonsPerWeek eller sätt lessonDuration-override.`,
                courseInstanceId: c.courseInstanceId,
            });
        }

        // No teacher assigned
        if (!c.teacherId) {
            warnings.push({
                severity: 'error',
                type: 'COURSE_NO_TEACHER',
                message: `${label}: saknar lärare. Kursen är inte redo för schemaläggning.`,
                courseInstanceId: c.courseInstanceId,
            });
        }

        // No subject — rooms with allowedSubjects can't be subject-matched (skip for pseudo-courses)
        if (!c.subject && !isPseudo) {
            warnings.push({
                severity: 'warning',
                type: 'COURSE_NO_SUBJECT',
                message: `${label}: saknar ämne. Solvern kan bara använda rum utan ämnesbegränsning. Fyll i ämne (från Skolverket) för korrekt rumstilldelning.`,
                courseInstanceId: c.courseInstanceId,
            });
        }
    }

    // --- Per-teacher workload check ------------------------------------------
    const lessonsPerTeacher = new Map<string, number>();
    for (const c of courses) {
        if (!c.teacherId || c.lessonsPerWeek === 0) continue;
        lessonsPerTeacher.set(c.teacherId, (lessonsPerTeacher.get(c.teacherId) ?? 0) + c.lessonsPerWeek);
    }
    for (const t of teachers) {
        const lessonCount = lessonsPerTeacher.get(t.id) ?? 0;
        if (lessonCount === 0) continue;
        const pct = (t.servicePoints / Math.max(settings.fullTimeServicePoints, 1)) * 100;
        const freeDays = freeDaysForPercent(pct);
        const workDays = 5 - freeDays;
        const maxLessons = workDays * slotsPerDay;
        if (lessonCount > maxLessons) {
            warnings.push({
                severity: 'warning',
                type: 'TEACHER_OVERLOAD',
                message: `${t.name}: ${lessonCount} lektioner/vecka men har bara ${workDays} arbetsdagar × ~${slotsPerDay} lektioner/dag = ~${maxLessons} max. Sänk antalet kurser eller höj tjänstegraden.`,
                teacherId: t.id,
            });
        }
    }

    // --- Per-class workload check --------------------------------------------
    const lessonsPerClass = new Map<string, number>();
    for (const c of courses) {
        if (c.lessonsPerWeek === 0) continue;
        lessonsPerClass.set(c.classId, (lessonsPerClass.get(c.classId) ?? 0) + c.lessonsPerWeek);
    }
    for (const [classId, lessonCount] of lessonsPerClass) {
        const maxLessons = 5 * slotsPerDay;
        if (lessonCount > maxLessons) {
            const cls = classById.get(classId);
            const label = cls?.classCode ?? classId.slice(0, 8);
            warnings.push({
                severity: 'warning',
                type: 'CLASS_OVERLOAD',
                message: `${label}: ${lessonCount} lektioner/vecka men max ~${maxLessons} ryms i veckan (5 dagar × ~${slotsPerDay} lektioner/dag).`,
                classId,
            });
        }
    }

    // --- Per-subject room capacity check -------------------------------------
    const lessonMinutesBySubject = new Map<string, number>();
    for (const c of courses) {
        if (!c.subject || c.lessonsPerWeek === 0) continue;
        const cur = lessonMinutesBySubject.get(c.subject) ?? 0;
        lessonMinutesBySubject.set(c.subject, cur + c.lessonsPerWeek * c.lessonDuration);
    }
    const dayMinutes = settings.latestLessonEnd - settings.earliestLessonStart;
    for (const [subject, neededMin] of lessonMinutesBySubject) {
        const matchingRoomCount = rooms.filter(r => {
            const allowed = r.allowedSubjects;
            return allowed === null || (Array.isArray(allowed) && allowed.includes(subject));
        }).length;
        const availableMin = matchingRoomCount * 5 * dayMinutes;
        if (neededMin > availableMin) {
            warnings.push({
                severity: 'warning',
                type: 'SUBJECT_ROOM_SHORTAGE',
                message: `Ämne '${subject}' behöver ${neededMin} min/vecka i lämpligt rum, men ${matchingRoomCount} rum × 5 dagar × ${dayMinutes} min = ${availableMin} min tillgängligt. Lägg till rum eller minska timmar.`,
            });
        }
    }

    return warnings;
}
