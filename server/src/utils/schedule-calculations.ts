/**
 * Schedule calculation utilities for Swedish gymnasium
 *
 * Key concepts:
 * - 1 course point = 60 minutes of total instruction time
 * - Terms: term1-term6 mapped to gymnasium years and semesters
 *   - Year 1: term1 (fall/höst) + term2 (spring/vår)
 *   - Year 2: term3 (fall/höst) + term4 (spring/vår)
 *   - Year 3: term5 (fall/höst) + term6 (spring/vår)
 */

export interface TermDateInfo {
    fallTermStart: Date;
    fallTermEnd: Date;
    springTermStart: Date;
    springTermEnd: Date;
}

export interface CourseScheduleCalculation {
    courseCode: string;
    courseName: string;
    points: number;
    terms: string[];
    totalMinutes: number;
    totalWeeks: number;
    minutesPerWeek: number;
    lessonsPerWeek: number;
    lessonDuration: number;
}

// Maps term names to gymnasium year and semester
const termMapping: Record<string, { year: number; isFall: boolean }> = {
    term1: { year: 1, isFall: true },
    term2: { year: 1, isFall: false },
    term3: { year: 2, isFall: true },
    term4: { year: 2, isFall: false },
    term5: { year: 3, isFall: true },
    term6: { year: 3, isFall: false },
};

/**
 * Calculate the number of weeks between two dates
 */
export function calculateWeeksBetweenDates(startDate: Date, endDate: Date): number {
    const millisecondsPerWeek = 7 * 24 * 60 * 60 * 1000;
    const diffMs = endDate.getTime() - startDate.getTime();
    return Math.ceil(diffMs / millisecondsPerWeek);
}

/**
 * Calculate total weeks for a set of terms based on term dates
 *
 * @param terms - Array of term names (e.g., ["term1", "term2"])
 * @param termDatesMap - Map of gymnasium year (1, 2, 3) to term date info
 * @returns Total number of weeks across all specified terms
 */
export function calculateWeeksForTerms(
    terms: string[],
    termDatesMap: Map<number, TermDateInfo>
): number {
    let totalWeeks = 0;

    for (const term of terms) {
        const mapping = termMapping[term];
        if (!mapping) continue;

        const { year, isFall } = mapping;
        const termDates = termDatesMap.get(year);

        if (!termDates) continue;

        const startDate = isFall ? termDates.fallTermStart : termDates.springTermStart;
        const endDate = isFall ? termDates.fallTermEnd : termDates.springTermEnd;

        const weeks = calculateWeeksBetweenDates(startDate, endDate);
        totalWeeks += weeks;
    }

    return totalWeeks;
}

/**
 * Calculate minutes per week for a course
 *
 * Formula: (coursePoints × 60) / numberOfWeeks
 *
 * @param coursePoints - Total points for the course
 * @param numberOfWeeks - Number of weeks the course runs
 * @returns Minutes per week (rounded to nearest integer)
 */
export function calculateMinutesPerWeek(coursePoints: number, numberOfWeeks: number): number {
    if (numberOfWeeks === 0) return 0;
    const totalMinutes = coursePoints * 60;
    return Math.round(totalMinutes / numberOfWeeks);
}

/**
 * Calculate number of lessons per week based on lesson duration
 *
 * @param minutesPerWeek - Total minutes per week
 * @param lessonDurationMinutes - Duration of each lesson in minutes
 * @returns Number of lessons per week (decimal, as courses might need partial lessons)
 */
export function calculateLessonsPerWeek(
    minutesPerWeek: number,
    lessonDurationMinutes: number
): number {
    if (lessonDurationMinutes === 0) return 0;
    return Math.round((minutesPerWeek / lessonDurationMinutes) * 10) / 10;
}

/**
 * Calculate full schedule info for a course
 */
export function calculateCourseSchedule(
    courseCode: string,
    courseName: string,
    points: number,
    terms: string[],
    termDatesMap: Map<number, TermDateInfo>,
    lessonDuration: number
): CourseScheduleCalculation {
    const totalMinutes = points * 60;
    const totalWeeks = calculateWeeksForTerms(terms, termDatesMap);
    const minutesPerWeek = calculateMinutesPerWeek(points, totalWeeks);
    const lessonsPerWeek = calculateLessonsPerWeek(minutesPerWeek, lessonDuration);

    return {
        courseCode,
        courseName,
        points,
        terms,
        totalMinutes,
        totalWeeks,
        minutesPerWeek,
        lessonsPerWeek,
        lessonDuration,
    };
}

/**
 * Get the academic year string from a start year
 * E.g., 2026 -> "2026/2027"
 */
export function getAcademicYear(startYear: number, gymnasiumYear: 1 | 2 | 3): string {
    const actualYear = startYear + gymnasiumYear - 1;
    return `${actualYear}/${actualYear + 1}`;
}

/**
 * Parse term dates from database format to TermDateInfo
 */
export function parseTermDates(dbTermDates: {
    fallTermStart: string;
    fallTermEnd: string;
    springTermStart: string;
    springTermEnd: string;
}): TermDateInfo {
    return {
        fallTermStart: new Date(dbTermDates.fallTermStart),
        fallTermEnd: new Date(dbTermDates.fallTermEnd),
        springTermStart: new Date(dbTermDates.springTermStart),
        springTermEnd: new Date(dbTermDates.springTermEnd),
    };
}
