// Domänlogik för kursplanering: kategorier, terminer, poängbudget och validering.
// UI-komponenterna (curriculum-workbench) ska inte räkna poäng själva.

import type { CourseAssignment, CourseCategory, TermId } from './api/types';
import {
    getCoursesByOrientation,
    getProgramSpecializationSubjects,
    getProgramMeta,
} from './syllabus-api';

/** En fullständig gymnasieexamen är alltid 2500 poäng. */
export const TOTAL_POINTS_REQUIRED = 2500;

export const TERM_IDS: TermId[] = ['term1', 'term2', 'term3', 'term4', 'term5', 'term6'];
export const TERM_SHORT = ['HT1', 'VT1', 'HT2', 'VT2', 'HT3', 'VT3'];
export const TERM_LABELS = ['HT år 1', 'VT år 1', 'HT år 2', 'VT år 2', 'HT år 3', 'VT år 3'];

/** Balansband per termin — samma spann som den gamla plannerns ValidateStep. */
export const BALANCE_MIN = 350;
export const BALANCE_MAX = 500;

export interface CategoryMeta {
    id: CourseCategory;
    label: string;
    /** CSS-variabel i globals.css. */
    color: string;
}

export const CATEGORIES: CategoryMeta[] = [
    { id: 'FOUNDATIONAL_SUBJECTS', label: 'Gymnasiegemensamma ämnen', color: 'var(--cat-foundational)' },
    { id: 'PROGRAMME_SPECIFIC_SUBJECTS', label: 'Programgemensamma ämnen', color: 'var(--cat-programme)' },
    { id: 'ORIENTATION', label: 'Inriktningsämnen', color: 'var(--cat-orientation)' },
    { id: 'PROGRAMME_SPECIALIZATION', label: 'Programfördjupning', color: 'var(--cat-specialization)' },
    { id: 'INDIVIDUAL_CHOICE', label: 'Individuellt val', color: 'var(--cat-individual)' },
    { id: 'GYMNASIEARBETE', label: 'Gymnasiearbete', color: 'var(--cat-diploma)' },
];

const CATEGORY_ORDER = CATEGORIES.map(c => c.id);

export function categoryMeta(id: CourseCategory): CategoryMeta {
    return CATEGORIES.find(c => c.id === id) || CATEGORIES[0];
}

export function compareByCategory(a: CourseCategory, b: CourseCategory): number {
    return CATEGORY_ORDER.indexOf(a) - CATEGORY_ORDER.indexOf(b);
}

// ---- terminer -------------------------------------------------------------

export function termIndex(term: TermId): number {
    return TERM_IDS.indexOf(term);
}

export function termFromIndex(index: number): TermId {
    return TERM_IDS[Math.max(0, Math.min(TERM_IDS.length - 1, index))];
}

/** År härleds ur terminerna — kursplanen har bara en terminsrepresentation. */
export function yearFromTerms(terms: TermId[]): 1 | 2 | 3 {
    const first = terms.length > 0 ? termIndex(terms[0]) : 0;
    return (Math.floor(first / 2) + 1) as 1 | 2 | 3;
}

/** Båda terminerna i det år som terminen ligger i. */
export function yearPair(index: number): [TermId, TermId] {
    const start = index % 2 === 0 ? index : index - 1;
    return [termFromIndex(start), termFromIndex(start + 1)];
}

/**
 * Äldre kursplaner (auto-initierade via Skolverket-hämtningen) har `['HT','VT']`
 * i `terms` i stället för `term1`..`term6`. Översätt med hjälp av `year`, precis
 * som solverns data-loader gör, så att gammal data inte blir osynlig i ytan.
 * Kursen skrivs om till den nya formen så fort planen sparas.
 */
export function normalizeTerms(terms: unknown, year: number): TermId[] {
    if (!Array.isArray(terms)) return [];
    const yearOffset = (Math.max(1, Math.min(3, year || 1)) - 1) * 2;
    const indexes = new Set<number>();

    for (const term of terms) {
        if (typeof term !== 'string') continue;
        const known = TERM_IDS.indexOf(term as TermId);
        if (known >= 0) {
            indexes.add(known);
        } else if (term === 'HT') {
            indexes.add(yearOffset);
        } else if (term === 'VT') {
            indexes.add(yearOffset + 1);
        }
    }

    return [...indexes].sort((a, b) => a - b).map(termFromIndex);
}

// ---- katalog --------------------------------------------------------------

export interface CatalogCourse {
    courseCode: string;
    courseName: string;
    points: number;
    category: CourseCategory;
    subject?: string | null;
}

export type CategoryTargets = Record<CourseCategory, number>;

/**
 * Gymnasiegemensamma ämnen och programfördjupning delar på en gemensam pott.
 * Skolverket listar alternativen inom gymnasiegemensamma (Svenska *och*
 * Svenska som andraspråk, olika historienivåer) i samma lista, så summan av
 * katalogen är inte samma sak som kravet — för TE listas 1400 p där kravet är
 * 1100 p. Programfördjupningen är i sin tur ett urval ur 12 000+ poäng. Det som
 * går att kräva exakt är därför att de två tillsammans fyller resten upp till
 * 2500 p.
 */
export const SHARED_BUDGET_CATEGORIES: CourseCategory[] = [
    'FOUNDATIONAL_SUBJECTS',
    'PROGRAMME_SPECIALIZATION',
];

export interface Catalog {
    courses: CatalogCourse[];
    /** Exakta krav per kategori. 0 för kategorierna i den delade potten. */
    targets: CategoryTargets;
    /** Vad gymnasiegemensamma ämnen och programfördjupning ska summera till ihop. */
    sharedTarget: number;
}

function emptyTargets(): CategoryTargets {
    return {
        FOUNDATIONAL_SUBJECTS: 0,
        PROGRAMME_SPECIFIC_SUBJECTS: 0,
        ORIENTATION: 0,
        PROGRAMME_SPECIALIZATION: 0,
        INDIVIDUAL_CHOICE: 0,
        GYMNASIEARBETE: 0,
    };
}

const KNOWN_CATEGORIES = new Set<string>(CATEGORY_ORDER);

/**
 * Bygger kurskatalogen för en klass ur Skolverket-proxyn: gymnasiegemensamma,
 * programgemensamma och inriktningens kurser, programfördjupningen, samt
 * gymnasiearbetet och platshållare för individuellt val.
 */
export async function loadCatalog(programCode: string, orientationCode: string): Promise<Catalog> {
    const [programCourses, specializationCourses, meta] = await Promise.all([
        getCoursesByOrientation(programCode, orientationCode),
        getProgramSpecializationSubjects(programCode),
        getProgramMeta(programCode),
    ]);

    const courses: CatalogCourse[] = [];
    const seen = new Set<string>();

    const add = (course: CatalogCourse) => {
        if (seen.has(course.courseCode)) return;
        seen.add(course.courseCode);
        courses.push(course);
    };

    for (const course of [...programCourses, ...specializationCourses]) {
        if (!course.category || !KNOWN_CATEGORIES.has(course.category)) continue;
        add({
            courseCode: course.courseCode,
            courseName: course.name,
            points: course.points,
            category: course.category as CourseCategory,
            subject: course.subjectName ?? null,
        });
    }

    add({
        courseCode: meta.diplomaProject.code,
        courseName: meta.diplomaProject.name,
        points: meta.diplomaProject.points,
        category: 'GYMNASIEARBETE',
        subject: null,
    });

    // Individuellt val bokas som platshållare om 100 p tills eleven väljer kurs.
    const individualSlots = Math.max(1, Math.round(meta.individualOptionPoints / 100));
    for (let i = 1; i <= individualSlots; i++) {
        add({
            courseCode: `INDIVIDUAL_CHOICE_${i}`,
            courseName: `Individuellt val ${i}`,
            points: Math.round(meta.individualOptionPoints / individualSlots),
            category: 'INDIVIDUAL_CHOICE',
            subject: null,
        });
    }

    // Programgemensamma ämnen och inriktningens kurser är obligatoriska i sin
    // helhet — där är katalogsumman kravet. Gymnasiearbete och individuellt val
    // kommer som poängtal från Skolverket.
    const targets = emptyTargets();
    for (const course of courses) {
        if (SHARED_BUDGET_CATEGORIES.includes(course.category)) continue;
        targets[course.category] += course.points;
    }

    const fixedPoints = Object.values(targets).reduce((sum, points) => sum + points, 0);
    const sharedTarget = Math.max(0, TOTAL_POINTS_REQUIRED - fixedPoints);

    return { courses, targets, sharedTarget };
}

// ---- summor och validering ------------------------------------------------

export function categoryTotals(courses: CourseAssignment[]): CategoryTargets {
    const totals = emptyTargets();
    for (const course of courses) {
        if (!KNOWN_CATEGORIES.has(course.category)) continue;
        totals[course.category] += course.points;
    }
    return totals;
}

/** Summan i den delade potten: gymnasiegemensamma ämnen + programfördjupning. */
export function sharedTotal(totals: CategoryTargets): number {
    return SHARED_BUDGET_CATEGORIES.reduce((sum, category) => sum + totals[category], 0);
}

export function totalPoints(courses: CourseAssignment[]): number {
    return courses.reduce((sum, course) => sum + course.points, 0);
}

/**
 * Poänglast för en termin. En kurs som spänner över båda terminerna i ett år
 * belastar varje termin med halva poängen.
 */
export function termLoad(courses: CourseAssignment[], index: number): number {
    const term = termFromIndex(index);
    let load = 0;
    for (const course of courses) {
        if (course.terms.includes(term)) {
            load += course.points / Math.max(1, course.terms.length);
        }
    }
    return Math.round(load);
}

export interface CurriculumIssue {
    level: 'error' | 'warning';
    message: string;
}

/**
 * Blockerande fel (`error`) hindrar godkännande. Varningar är balansproblem
 * som planeraren får bedöma själv.
 */
export function validateCurriculum(
    courses: CourseAssignment[],
    catalog: Pick<Catalog, 'targets' | 'sharedTarget'>,
): CurriculumIssue[] {
    const issues: CurriculumIssue[] = [];
    const total = totalPoints(courses);
    const totals = categoryTotals(courses);

    if (total !== TOTAL_POINTS_REQUIRED) {
        issues.push({
            level: 'error',
            message: total < TOTAL_POINTS_REQUIRED
                ? `Kursplanen saknar ${TOTAL_POINTS_REQUIRED - total} p av ${TOTAL_POINTS_REQUIRED}.`
                : `Kursplanen ligger ${total - TOTAL_POINTS_REQUIRED} p över ${TOTAL_POINTS_REQUIRED}.`,
        });
    }

    for (const category of CATEGORIES) {
        if (SHARED_BUDGET_CATEGORIES.includes(category.id)) continue;
        const value = totals[category.id];
        const target = catalog.targets[category.id];
        if (value < target) {
            issues.push({
                level: 'error',
                message: `${category.label}: ${value} av ${target} p — saknar ${target - value} p.`,
            });
        } else if (value > target) {
            issues.push({
                level: 'error',
                message: `${category.label}: ${value} p — ${value - target} p över taket ${target} p.`,
            });
        }
    }

    const shared = sharedTotal(totals);
    if (shared !== catalog.sharedTarget) {
        issues.push({
            level: 'error',
            message: `Gymnasiegemensamma ämnen och programfördjupning ska tillsammans vara `
                + `${catalog.sharedTarget} p — nu ${shared} p.`,
        });
    }

    const unplaced = courses.filter(course => course.terms.length === 0);
    for (const course of unplaced) {
        issues.push({ level: 'error', message: `${course.courseName} saknar termin.` });
    }

    const diploma = courses.find(course => course.category === 'GYMNASIEARBETE');
    if (diploma && diploma.terms.length > 0 && yearFromTerms(diploma.terms) !== 3) {
        issues.push({
            level: 'warning',
            message: `Gymnasiearbetet ligger i ${TERM_LABELS[termIndex(diploma.terms[0])]} — normalt sista året.`,
        });
    }

    for (let i = 0; i < TERM_IDS.length; i++) {
        const load = termLoad(courses, i);
        if (load === 0) {
            issues.push({ level: 'warning', message: `${TERM_LABELS[i]} är tom.` });
        } else if (load > BALANCE_MAX) {
            issues.push({
                level: 'warning',
                message: `${TERM_LABELS[i]} har ${load} p — över balansbandet ${BALANCE_MIN}–${BALANCE_MAX} p.`,
            });
        } else if (load < BALANCE_MIN) {
            issues.push({
                level: 'warning',
                message: `${TERM_LABELS[i]} har ${load} p — under balansbandet ${BALANCE_MIN}–${BALANCE_MAX} p.`,
            });
        }
    }

    return issues;
}

export function hasBlockingIssues(issues: CurriculumIssue[]): boolean {
    return issues.some(issue => issue.level === 'error');
}
