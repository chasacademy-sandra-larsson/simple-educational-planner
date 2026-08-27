"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    DndContext,
    DragOverlay,
    PointerSensor,
    useDraggable,
    useDroppable,
    useSensor,
    useSensors,
    type DragEndEvent,
    type DragStartEvent,
} from '@dnd-kit/core';
import { AlertTriangle, Check, Loader2, Lock, MoveHorizontal, X } from 'lucide-react';
import { api, ApiError } from '@/app/lib/api';
import type { CourseAssignment, CurriculumStatus, TermId } from '@/app/lib/api/types';
import {
    BALANCE_MAX,
    BALANCE_MIN,
    CATEGORIES,
    SHARED_BUDGET_CATEGORIES,
    TERM_IDS,
    TERM_SHORT,
    TOTAL_POINTS_REQUIRED,
    type Catalog,
    type CatalogCourse,
    categoryMeta,
    categoryTotals,
    compareByCategory,
    hasBlockingIssues,
    loadCatalog,
    normalizeTerms,
    sharedTotal,
    termFromIndex,
    termIndex,
    termLoad,
    totalPoints,
    validateCurriculum,
    yearFromTerms,
    yearPair,
} from '@/app/lib/curriculum';
import { useProject } from '@/app/projects/[id]/ProjectContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

const STATUS_BADGE: Record<CurriculumStatus, { label: string; className: string }> = {
    draft: { label: 'Utkast', className: 'bg-accent text-accent-foreground' },
    approved: { label: 'Godkänd', className: 'bg-primary text-primary-foreground' },
    archived: { label: 'Arkiverad', className: 'bg-muted text-muted-foreground' },
};

function tint(color: string): string {
    return `color-mix(in srgb, ${color} var(--category-tint), var(--card))`;
}

/**
 * Drag-id:n måste vara unika: en kurs finns både i katalogen och i en termin,
 * och en kurs som spänner över året renderas i två terminskolumner.
 * Formen är `catalog:KURSKOD` respektive `chip:KURSKOD:terminsindex`.
 */
function courseCodeFromDragId(id: string): string {
    return /^(?:catalog|chip):(.+?)(?::\d+)?$/.exec(id)?.[1] ?? id;
}

function courseFromCatalog(course: CatalogCourse, terms: TermId[]): CourseAssignment {
    return {
        courseCode: course.courseCode,
        courseName: course.courseName,
        subject: course.subject ?? null,
        points: course.points,
        category: course.category,
        terms,
        year: yearFromTerms(terms),
    };
}

export default function CurriculumWorkbench() {
    const { project, fetchProject } = useProject();
    const classes = useMemo(() => project?.classes || [], [project?.classes]);

    const [selectedClassId, setSelectedClassId] = useState('');
    const [courses, setCourses] = useState<CourseAssignment[]>([]);
    const [status, setStatus] = useState<CurriculumStatus>('draft');
    const [catalog, setCatalog] = useState<Catalog | null>(null);
    const [catalogError, setCatalogError] = useState('');
    const [loadingCatalog, setLoadingCatalog] = useState(false);
    const [query, setQuery] = useState('');
    const [armedCode, setArmedCode] = useState<string | null>(null);
    const [draggingCode, setDraggingCode] = useState<string | null>(null);
    const [saveState, setSaveState] = useState<SaveState>('idle');
    const [saveError, setSaveError] = useState('');
    const [statusBusy, setStatusBusy] = useState(false);

    const classesRef = useRef(classes);
    classesRef.current = classes;
    const catalogCache = useRef(new Map<string, Catalog>());
    const saveChain = useRef<Promise<void>>(Promise.resolve());

    const selectedClass = classes.find(c => c.id === selectedClassId);
    const locked = status === 'approved' || status === 'archived';

    // Välj första klassen, och håll valet giltigt när klasslistan ändras.
    useEffect(() => {
        if (classes.length === 0) return;
        setSelectedClassId(prev => (classes.some(c => c.id === prev) ? prev : classes[0].id));
    }, [classes]);

    // Ladda kursplanen när klassvalet byts — inte vid varje projektuppdatering,
    // annars skrivs pågående redigering över.
    useEffect(() => {
        if (!selectedClassId) return;
        const cls = classesRef.current.find(c => c.id === selectedClassId);
        const curriculum = cls?.curriculum;

        setCourses(
            (curriculum?.courses || []).map(course => ({
                ...course,
                terms: normalizeTerms(course.terms, course.year),
            })),
        );
        setStatus(curriculum?.status || 'draft');
        setArmedCode(null);
        setSaveState('idle');
        setSaveError('');
    }, [selectedClassId]);

    // Kurskatalogen beror bara på program + inriktning, så den cachas per par.
    const programCode = selectedClass?.programCode;
    const orientationCode = selectedClass?.orientationCode;
    useEffect(() => {
        if (!programCode || !orientationCode) return;
        const key = `${programCode}:${orientationCode}`;
        const cached = catalogCache.current.get(key);
        if (cached) {
            setCatalog(cached);
            setCatalogError('');
            return;
        }

        let cancelled = false;
        setLoadingCatalog(true);
        setCatalogError('');
        loadCatalog(programCode, orientationCode)
            .then(result => {
                if (cancelled) return;
                catalogCache.current.set(key, result);
                setCatalog(result);
            })
            .catch(() => {
                if (!cancelled) setCatalogError('Kunde inte hämta kurser från Skolverket.');
            })
            .finally(() => {
                if (!cancelled) setLoadingCatalog(false);
            });

        return () => { cancelled = true; };
    }, [programCode, orientationCode]);

    // Sparade kursplaner kan ha fel kategori eller poäng (äldre init-vägar
    // stämplade det mesta som gymnasiegemensamt). Skolverkets katalog är
    // auktoritativ — rätta i arbetskopian så budgeten visar sanningen. Ändringen
    // skrivs till databasen vid nästa redigering.
    useEffect(() => {
        if (!catalog) return;
        setCourses(prev => {
            let changed = false;
            const next = prev.map(course => {
                const authoritative = catalog.courses.find(c => c.courseCode === course.courseCode);
                if (!authoritative) return course;
                if (authoritative.category === course.category && authoritative.points === course.points) {
                    return course;
                }
                changed = true;
                return {
                    ...course,
                    category: authoritative.category,
                    points: authoritative.points,
                    subject: course.subject ?? authoritative.subject ?? null,
                };
            });
            return changed ? next : prev;
        });
    }, [catalog]);

    const persist = useCallback((classId: string, next: CourseAssignment[]) => {
        setSaveState('saving');
        setSaveError('');
        saveChain.current = saveChain.current
            .then(async () => {
                await api.projects.updateCurriculum(classId, { courses: next });
                setSaveState('saved');
                await fetchProject();
            })
            .catch((err: unknown) => {
                setSaveState('error');
                setSaveError(err instanceof ApiError ? err.message : 'Kunde inte spara kursplanen.');
            });
    }, [fetchProject]);

    const applyCourses = useCallback((next: CourseAssignment[]) => {
        if (!selectedClassId) return;
        setCourses(next);
        persist(selectedClassId, next);
    }, [persist, selectedClassId]);

    const placeCourse = useCallback((courseCode: string, index: number) => {
        if (locked || !catalog) return;
        const terms = [termFromIndex(index)];
        const existing = courses.find(c => c.courseCode === courseCode);

        if (existing) {
            if (existing.terms.length === 1 && existing.terms[0] === terms[0]) {
                setArmedCode(null);
                return;
            }
            applyCourses(courses.map(course => (
                course.courseCode === courseCode
                    ? { ...course, terms, year: yearFromTerms(terms) }
                    : course
            )));
        } else {
            const fromCatalog = catalog.courses.find(c => c.courseCode === courseCode);
            if (!fromCatalog) return;
            applyCourses([...courses, courseFromCatalog(fromCatalog, terms)]);
        }
        setArmedCode(null);
    }, [applyCourses, catalog, courses, locked]);

    const toggleSpan = useCallback((courseCode: string) => {
        if (locked) return;
        applyCourses(courses.map(course => {
            if (course.courseCode !== courseCode) return course;
            const first = termIndex(course.terms[0]);
            const terms = course.terms.length > 1 ? [course.terms[0]] : [...yearPair(first)];
            return { ...course, terms, year: yearFromTerms(terms) };
        }));
    }, [applyCourses, courses, locked]);

    const removeCourse = useCallback((courseCode: string) => {
        if (locked) return;
        applyCourses(courses.filter(course => course.courseCode !== courseCode));
    }, [applyCourses, courses, locked]);

    const changeStatus = useCallback(async (next: CurriculumStatus) => {
        if (!selectedClassId) return;
        setStatusBusy(true);
        setSaveError('');
        try {
            const updated = await api.projects.updateCurriculumStatus(selectedClassId, next);
            setStatus(updated.status);
            await fetchProject();
        } catch (err) {
            setSaveError(err instanceof ApiError ? err.message : 'Kunde inte ändra status.');
        } finally {
            setStatusBusy(false);
        }
    }, [fetchProject, selectedClassId]);

    // ---- härledda värden --------------------------------------------------

    const placedCodes = useMemo(() => new Set(courses.map(c => c.courseCode)), [courses]);
    const totals = useMemo(() => categoryTotals(courses), [courses]);
    const total = useMemo(() => totalPoints(courses), [courses]);
    const sharedPoints = useMemo(() => sharedTotal(totals), [totals]);
    const issues = useMemo(
        () => (catalog ? validateCurriculum(courses, catalog) : []),
        [catalog, courses],
    );
    const blocked = hasBlockingIssues(issues);
    const errorCount = issues.filter(i => i.level === 'error').length;
    const warningCount = issues.filter(i => i.level === 'warning').length;
    const loads = useMemo(
        () => TERM_IDS.map((_, index) => termLoad(courses, index)),
        [courses],
    );

    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

    const handleDragStart = (event: DragStartEvent) => {
        setDraggingCode(courseCodeFromDragId(String(event.active.id)));
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const code = courseCodeFromDragId(String(event.active.id));
        setDraggingCode(null);
        if (!event.over) return;
        const index = Number(String(event.over.id).replace('term:', ''));
        if (Number.isNaN(index)) return;
        placeCourse(code, index);
    };

    const draggingCourse = draggingCode
        ? courses.find(c => c.courseCode === draggingCode) || catalog?.courses.find(c => c.courseCode === draggingCode)
        : null;

    if (classes.length === 0) {
        return (
            <div className="rounded-xl border border-border bg-card p-12 text-center text-muted-foreground">
                Inga klasser ännu. Lägg till en klass för att planera kurser.
            </div>
        );
    }

    return (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className="space-y-4">
                {/* ---- topprad ---- */}
                <div className="flex flex-wrap items-center gap-3">
                    <div>
                        <h2 className="text-lg font-semibold text-foreground">
                            Kursplan för {selectedClass?.classCode || '—'}
                        </h2>
                        <p className="text-sm text-muted-foreground">
                            {selectedClass?.programName}
                            {selectedClass?.orientationName && selectedClass.orientationName !== selectedClass.programName && (
                                <span> &bull; {selectedClass.orientationName}</span>
                            )}
                        </p>
                    </div>
                    <div className="ml-auto flex items-center gap-3">
                        <SaveIndicator state={saveState} />
                        <Badge className={STATUS_BADGE[status].className}>{STATUS_BADGE[status].label}</Badge>
                    </div>
                </div>

                {(saveError || catalogError) && (
                    <div className="rounded-lg border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
                        {saveError || catalogError}
                    </div>
                )}

                {/* ---- fyra zoner ---- */}
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-[160px_260px_minmax(0,1fr)_300px] items-start">

                    {/* Klasser */}
                    <div className="rounded-xl border border-border bg-card overflow-hidden">
                        <div className="px-3 py-2 border-b border-border flex items-center justify-between">
                            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Klasser</h3>
                            <span className="text-xs text-muted-foreground">{classes.length}</span>
                        </div>
                        <div className="p-1.5 space-y-0.5 max-h-[32rem] overflow-y-auto">
                            {classes.map(cls => {
                                const clsStatus = cls.curriculum?.status || 'draft';
                                const clsPoints = cls.curriculum?.totalPoints ?? 0;
                                return (
                                    <button
                                        key={cls.id}
                                        onClick={() => setSelectedClassId(cls.id)}
                                        aria-current={cls.id === selectedClassId}
                                        className={`w-full text-left px-2.5 py-1.5 rounded-lg text-sm transition-colors ${
                                            cls.id === selectedClassId
                                                ? 'bg-accent text-primary font-medium'
                                                : 'text-foreground hover:bg-muted'
                                        }`}
                                    >
                                        <span className="flex items-center gap-2">
                                            <span
                                                className={`inline-block w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                                                    clsStatus === 'approved' ? 'bg-primary' : 'bg-chart-4'
                                                }`}
                                                aria-hidden
                                            />
                                            <span className="truncate">{cls.classCode}</span>
                                            <span className="ml-auto text-xs tabular-nums text-muted-foreground">{clsPoints} p</span>
                                        </span>
                                        <span className="block text-xs text-muted-foreground truncate">
                                            {cls.orientationName || cls.programName}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Kurskatalog */}
                    <div className="rounded-xl border border-border bg-card overflow-hidden">
                        <div className="px-3 py-2 border-b border-border flex items-center justify-between">
                            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Kurskatalog</h3>
                            <span className="text-xs text-muted-foreground">{catalog?.courses.length ?? 0} kurser</span>
                        </div>
                        <div className="p-2">
                            <input
                                value={query}
                                onChange={e => setQuery(e.target.value)}
                                placeholder="Sök kurs eller kod…"
                                aria-label="Sök i kurskatalogen"
                                className="w-full px-2.5 py-1.5 text-sm rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                            />
                        </div>
                        <div className="px-1.5 pb-2 space-y-0.5 max-h-[36rem] overflow-y-auto">
                            {loadingCatalog ? (
                                <div className="p-2 space-y-2">
                                    <Skeleton className="h-6 w-full" />
                                    <Skeleton className="h-6 w-full" />
                                    <Skeleton className="h-6 w-full" />
                                </div>
                            ) : (
                                <CatalogList
                                    catalog={catalog}
                                    totals={totals}
                                    query={query}
                                    placedCodes={placedCodes}
                                    placedTerms={courses}
                                    armedCode={armedCode}
                                    locked={locked}
                                    onArm={code => setArmedCode(prev => (prev === code ? null : code))}
                                />
                            )}
                        </div>
                    </div>

                    {/* Terminer */}
                    <div className="rounded-xl border border-border bg-card overflow-hidden">
                        <div className="px-4 py-2 border-b border-border flex flex-wrap items-center gap-3">
                            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Terminer</h3>
                            <span className="text-xs text-muted-foreground">
                                {locked
                                    ? 'Godkänd kursplan — återöppna för att ändra'
                                    : armedCode
                                        ? 'Välj termin för den markerade kursen'
                                        : 'Dra en kurs hit, eller klicka kurs och sedan termin'}
                            </span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 px-3 pt-3">
                            {[1, 2, 3].map(year => (
                                <div
                                    key={year}
                                    className="col-span-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground border-b border-border pb-1.5"
                                >
                                    År {year}
                                </div>
                            ))}
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 p-3 min-h-[32rem]">
                            {TERM_IDS.map((_, index) => (
                                <TermColumn
                                    key={index}
                                    index={index}
                                    load={loads[index]}
                                    courses={courses}
                                    armed={!!armedCode}
                                    locked={locked}
                                    onPlaceArmed={() => armedCode && placeCourse(armedCode, index)}
                                    onToggleSpan={toggleSpan}
                                    onRemove={removeCourse}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Poängbudget, validering och status */}
                    <div className="space-y-4">
                        <div className="rounded-xl border border-border bg-card overflow-hidden">
                            <div className="px-3 py-2 border-b border-border flex items-center justify-between">
                                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Poängbudget</h3>
                                <span className="text-xs text-muted-foreground">mål {TOTAL_POINTS_REQUIRED} p</span>
                            </div>
                            <div className="p-3 space-y-2">
                                <div className="flex items-baseline gap-2">
                                    <span className="text-3xl font-semibold tabular-nums text-foreground">{total}</span>
                                    <span className="text-sm text-muted-foreground tabular-nums">/ {TOTAL_POINTS_REQUIRED} p</span>
                                    <span className={`ml-auto text-sm font-medium ${
                                        total === TOTAL_POINTS_REQUIRED ? 'text-primary' : 'text-destructive'
                                    }`}>
                                        {total === TOTAL_POINTS_REQUIRED
                                            ? 'Fullständig'
                                            : total > TOTAL_POINTS_REQUIRED
                                                ? `${total - TOTAL_POINTS_REQUIRED} p över`
                                                : `${TOTAL_POINTS_REQUIRED - total} p kvar`}
                                    </span>
                                </div>
                                <div className="flex h-2.5 rounded-full overflow-hidden bg-muted border border-border">
                                    {CATEGORIES.map(category => {
                                        const value = totals[category.id];
                                        if (!value) return null;
                                        return (
                                            <span
                                                key={category.id}
                                                title={`${category.label}: ${value} p`}
                                                style={{
                                                    width: `${Math.min(value, TOTAL_POINTS_REQUIRED) / TOTAL_POINTS_REQUIRED * 100}%`,
                                                    background: category.color,
                                                }}
                                            />
                                        );
                                    })}
                                </div>
                            </div>
                            <div className="border-t border-border">
                                {CATEGORIES.map(category => {
                                    const value = totals[category.id];
                                    const shared = SHARED_BUDGET_CATEGORIES.includes(category.id);
                                    const target = catalog?.targets[category.id] ?? 0;
                                    const diff = value - target;
                                    return (
                                        <div
                                            key={category.id}
                                            className="flex items-center gap-2 px-3 py-1.5 border-b border-border last:border-b-0"
                                        >
                                            <span
                                                className="w-2 h-2 rounded-sm flex-shrink-0"
                                                style={{ background: category.color }}
                                                aria-hidden
                                            />
                                            <span className="text-sm text-foreground truncate">{category.label}</span>
                                            {shared ? (
                                                <span className="ml-auto text-sm tabular-nums text-muted-foreground">
                                                    {value} p
                                                </span>
                                            ) : (
                                                <span className={`ml-auto text-sm tabular-nums flex items-center gap-1.5 ${
                                                    diff === 0 ? 'text-foreground' : diff < 0 ? 'text-chart-4' : 'text-destructive'
                                                }`}>
                                                    {value} / {target}
                                                    <span className="text-xs">
                                                        {diff === 0 ? '✓' : diff < 0 ? diff : `+${diff}`}
                                                    </span>
                                                </span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                            {catalog && (
                                <div className="px-3 py-2 border-t border-border space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-muted-foreground">
                                            Gymnasiegemensamma + programfördjupning
                                        </span>
                                        <span className={`ml-auto text-sm tabular-nums ${
                                            sharedPoints === catalog.sharedTarget ? 'text-foreground' : 'text-chart-4'
                                        }`}>
                                            {sharedPoints} / {catalog.sharedTarget}
                                        </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground leading-relaxed">
                                        De två delar på en pott: Skolverket listar alternativen inom gymnasiegemensamma
                                        ämnen (till exempel Svenska och Svenska som andraspråk), så bara deras
                                        gemensamma summa går att kräva exakt.
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="rounded-xl border border-border bg-card overflow-hidden">
                            <div className="px-3 py-2 border-b border-border flex items-center justify-between">
                                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Validering</h3>
                                <span className="text-xs text-muted-foreground">
                                    {errorCount > 0
                                        ? `${errorCount} blockerar`
                                        : warningCount > 0
                                            ? `${warningCount} att se över`
                                            : 'klar'}
                                </span>
                            </div>
                            <div className="max-h-72 overflow-y-auto">
                                {issues.length === 0 ? (
                                    <p className="p-3 text-sm text-muted-foreground">
                                        {catalog ? 'Kursplanen uppfyller alla krav.' : 'Väntar på kurskatalogen…'}
                                    </p>
                                ) : (
                                    [...issues]
                                        .sort((a, b) => (a.level === b.level ? 0 : a.level === 'error' ? -1 : 1))
                                        .map((issue, i) => (
                                            <div key={i} className="flex gap-2 p-3 border-b border-border last:border-b-0">
                                                <span
                                                    className={`mt-1.5 inline-block w-2 h-2 rounded-full flex-shrink-0 ${
                                                        issue.level === 'error' ? 'bg-destructive' : 'bg-chart-4'
                                                    }`}
                                                    aria-hidden
                                                />
                                                <p className={`text-xs leading-relaxed ${
                                                    issue.level === 'error' ? 'text-foreground' : 'text-muted-foreground'
                                                }`}>
                                                    {issue.message}
                                                </p>
                                            </div>
                                        ))
                                )}
                            </div>
                        </div>

                        <div className="rounded-xl border border-border bg-card overflow-hidden">
                            <div className="px-3 py-2 border-b border-border">
                                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</h3>
                            </div>
                            <div className="p-3 space-y-2">
                                {status === 'approved' ? (
                                    <Button
                                        variant="outline"
                                        className="w-full"
                                        disabled={statusBusy}
                                        onClick={() => changeStatus('draft')}
                                    >
                                        {statusBusy ? 'Återöppnar…' : 'Återöppna som utkast'}
                                    </Button>
                                ) : (
                                    <Button
                                        className="w-full"
                                        disabled={blocked || statusBusy || !catalog}
                                        onClick={() => changeStatus('approved')}
                                    >
                                        {statusBusy ? 'Godkänner…' : 'Godkänn kursplan'}
                                    </Button>
                                )}
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    {status === 'approved'
                                        ? 'Den godkända kursplanen används vid schemagenerering. Återöppning gör den redigerbar igen och skapar en ny version.'
                                        : blocked
                                            ? 'Öppnas när valideringen inte har några blockerande fel.'
                                            : 'Alla krav uppfyllda — kursplanen kan godkännas och användas vid schemagenerering.'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <DragOverlay dropAnimation={null}>
                {draggingCourse && (
                    <div
                        className="px-2 py-1.5 rounded-lg border text-xs shadow-md"
                        style={{
                            background: tint(categoryMeta(draggingCourse.category).color),
                            borderColor: categoryMeta(draggingCourse.category).color,
                        }}
                    >
                        {draggingCourse.courseName}
                    </div>
                )}
            </DragOverlay>
        </DndContext>
    );
}

// ---- delkomponenter -------------------------------------------------------

function SaveIndicator({ state }: { state: SaveState }) {
    if (state === 'idle') return null;
    if (state === 'saving') {
        return (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Loader2 className="w-3 h-3 animate-spin" /> Sparar…
            </span>
        );
    }
    if (state === 'saved') {
        return (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Check className="w-3 h-3" /> Sparat
            </span>
        );
    }
    return (
        <span className="flex items-center gap-1.5 text-xs text-destructive">
            <AlertTriangle className="w-3 h-3" /> Kunde inte spara
        </span>
    );
}

function CatalogList({
    catalog,
    totals,
    query,
    placedCodes,
    placedTerms,
    armedCode,
    locked,
    onArm,
}: {
    catalog: Catalog | null;
    totals: Record<string, number>;
    query: string;
    placedCodes: Set<string>;
    placedTerms: CourseAssignment[];
    armedCode: string | null;
    locked: boolean;
    onArm: (code: string) => void;
}) {
    if (!catalog) {
        return <p className="p-3 text-xs text-muted-foreground">Kurskatalogen kunde inte laddas.</p>;
    }

    const needle = query.trim().toLowerCase();
    const grouped = CATEGORIES
        .map(category => ({
            category,
            rows: catalog.courses.filter(course => (
                course.category === category.id &&
                (!needle || `${course.courseName} ${course.courseCode}`.toLowerCase().includes(needle))
            )),
        }))
        .filter(section => section.rows.length > 0);
    const shown = grouped.reduce((count, section) => count + section.rows.length, 0);

    const sections = grouped.map(({ category, rows }) => {
        const value = totals[category.id] ?? 0;
        const target = catalog.targets[category.id] ?? 0;

        return (
            <div key={category.id}>
                <div className="flex items-baseline gap-1.5 px-1.5 pt-3 pb-1">
                    <span className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: category.color }} aria-hidden />
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground truncate">
                        {category.label}
                    </span>
                    {SHARED_BUDGET_CATEGORIES.includes(category.id) ? (
                        <span className="ml-auto text-[11px] tabular-nums text-muted-foreground">{value} p</span>
                    ) : (
                        <span className={`ml-auto text-[11px] tabular-nums ${
                            value === target ? 'text-primary' : value > target ? 'text-destructive' : 'text-muted-foreground'
                        }`}>
                            {value}/{target}
                        </span>
                    )}
                </div>
                {rows.map(course => {
                    const placed = placedCodes.has(course.courseCode);
                    const assignment = placed
                        ? placedTerms.find(c => c.courseCode === course.courseCode)
                        : undefined;
                    return (
                        <CatalogRow
                            key={course.courseCode}
                            course={course}
                            color={category.color}
                            placed={placed}
                            placedLabel={assignment?.terms.map(t => TERM_SHORT[termIndex(t)]).join('+') || ''}
                            armed={armedCode === course.courseCode}
                            locked={locked}
                            onArm={onArm}
                        />
                    );
                })}
            </div>
        );
    });

    return (
        <>
            {sections}
            {shown === 0 && (
                <p className="p-3 text-xs text-muted-foreground text-center">
                    Ingen kurs matchar &rdquo;{query}&rdquo;.
                </p>
            )}
        </>
    );
}

function CatalogRow({
    course,
    color,
    placed,
    placedLabel,
    armed,
    locked,
    onArm,
}: {
    course: CatalogCourse;
    color: string;
    placed: boolean;
    placedLabel: string;
    armed: boolean;
    locked: boolean;
    onArm: (code: string) => void;
}) {
    const draggable = !placed && !locked;
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: `catalog:${course.courseCode}`,
        disabled: !draggable,
    });

    return (
        <button
            ref={setNodeRef}
            {...(draggable ? listeners : {})}
            {...(draggable ? attributes : {})}
            type="button"
            disabled={placed || locked}
            aria-pressed={armed}
            onClick={() => draggable && onArm(course.courseCode)}
            className={`w-full flex items-center gap-2 px-1.5 py-1 rounded-lg border text-left transition-colors ${
                armed ? 'border-primary bg-accent' : 'border-transparent hover:bg-muted'
            } ${placed || locked ? 'opacity-45 cursor-default' : 'cursor-grab'} ${isDragging ? 'opacity-30' : ''}`}
        >
            <span className="w-0.5 self-stretch rounded-sm flex-shrink-0" style={{ background: color }} aria-hidden />
            <span className="flex-1 min-w-0">
                <span className="block text-xs text-foreground leading-tight truncate">{course.courseName}</span>
                <span className="block text-[10px] font-mono text-muted-foreground truncate">{course.courseCode}</span>
            </span>
            <span className="text-[11px] font-mono tabular-nums text-muted-foreground flex-shrink-0">
                {placed ? placedLabel : `${course.points} p`}
            </span>
        </button>
    );
}

function TermColumn({
    index,
    load,
    courses,
    armed,
    locked,
    onPlaceArmed,
    onToggleSpan,
    onRemove,
}: {
    index: number;
    load: number;
    courses: CourseAssignment[];
    armed: boolean;
    locked: boolean;
    onPlaceArmed: () => void;
    onToggleSpan: (code: string) => void;
    onRemove: (code: string) => void;
}) {
    const { setNodeRef, isOver } = useDroppable({ id: `term:${index}`, disabled: locked });
    const term = termFromIndex(index);
    const outsideBand = load > BALANCE_MAX || load < BALANCE_MIN;

    const inTerm = courses
        .filter(course => course.terms.includes(term))
        .sort((a, b) => compareByCategory(a.category, b.category) || a.courseName.localeCompare(b.courseName, 'sv'));

    return (
        <div
            ref={setNodeRef}
            className={`flex flex-col gap-1.5 p-1.5 rounded-lg border border-dashed transition-colors ${
                isOver ? 'border-primary bg-accent' : armed ? 'border-primary/40 bg-muted/50' : 'border-transparent bg-muted/50'
            }`}
        >
            <div className="px-1">
                <div className="text-xs font-semibold text-foreground">{TERM_SHORT[index]}</div>
                <div
                    className={`text-[11px] font-mono tabular-nums ${outsideBand ? 'text-chart-4' : 'text-muted-foreground'}`}
                    title={`Balansband ${BALANCE_MIN}–${BALANCE_MAX} p per termin`}
                >
                    {load} p
                </div>
                <div className="mt-1 h-1 rounded-sm bg-border overflow-hidden">
                    <span
                        className={`block h-full ${outsideBand ? 'bg-chart-4' : 'bg-primary'}`}
                        style={{ width: `${Math.min(100, Math.round(load / 600 * 100))}%` }}
                    />
                </div>
            </div>

            {armed && !locked && (
                <button
                    type="button"
                    onClick={onPlaceArmed}
                    className="text-[11px] py-1 rounded-md border border-primary text-primary hover:bg-accent transition-colors"
                >
                    Lägg i {TERM_SHORT[index]}
                </button>
            )}

            {inTerm.map(course => (
                <CourseChip
                    key={course.courseCode}
                    course={course}
                    termIndexValue={index}
                    locked={locked}
                    onToggleSpan={onToggleSpan}
                    onRemove={onRemove}
                />
            ))}
        </div>
    );
}

function CourseChip({
    course,
    termIndexValue,
    locked,
    onToggleSpan,
    onRemove,
}: {
    course: CourseAssignment;
    termIndexValue: number;
    locked: boolean;
    onToggleSpan: (code: string) => void;
    onRemove: (code: string) => void;
}) {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: `chip:${course.courseCode}:${termIndexValue}`,
        disabled: locked,
    });
    const meta = categoryMeta(course.category);
    const spans = course.terms.length > 1;
    const isContinuation = spans && termIndex(course.terms[0]) !== termIndexValue;

    return (
        <div
            ref={setNodeRef}
            className={`group relative rounded-lg border pl-2 pr-1.5 py-1 ${isDragging ? 'opacity-30' : ''}`}
            style={{
                background: tint(meta.color),
                borderColor: `color-mix(in srgb, ${meta.color} 40%, var(--border))`,
                borderLeftWidth: isContinuation ? 1 : 3,
                borderLeftColor: isContinuation ? `color-mix(in srgb, ${meta.color} 40%, var(--border))` : meta.color,
                // Streckad kant mot den termin kursen fortsätter i.
                borderRightStyle: spans && !isContinuation ? 'dashed' : undefined,
                borderLeftStyle: isContinuation ? 'dashed' : undefined,
            }}
        >
            <div
                {...(locked ? {} : listeners)}
                {...(locked ? {} : attributes)}
                className={locked ? '' : 'cursor-grab'}
            >
                <span className="block text-[10px] font-mono text-foreground/70 truncate">{course.courseCode}</span>
                <span className="block text-xs text-foreground leading-tight pr-8">{course.courseName}</span>
                <span className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[10px] font-mono tabular-nums text-foreground/70">{course.points} p</span>
                    {spans && (
                        <span className="text-[9px] uppercase tracking-wide px-1 rounded-sm border border-foreground/30 text-foreground/70">
                            hela året
                        </span>
                    )}
                </span>
            </div>

            {!locked && (
                <div className="absolute top-1 right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                    <button
                        type="button"
                        onClick={() => onToggleSpan(course.courseCode)}
                        title={spans ? 'Lägg i en termin' : 'Spänn över hela året'}
                        aria-label={spans ? `Lägg ${course.courseName} i en termin` : `Spänn ${course.courseName} över hela året`}
                        className="w-4 h-4 flex items-center justify-center rounded-sm bg-card/80 text-muted-foreground hover:bg-foreground hover:text-card transition-colors"
                    >
                        <MoveHorizontal className="w-3 h-3" />
                    </button>
                    <button
                        type="button"
                        onClick={() => onRemove(course.courseCode)}
                        title="Ta bort ur kursplanen"
                        aria-label={`Ta bort ${course.courseName}`}
                        className="w-4 h-4 flex items-center justify-center rounded-sm bg-card/80 text-muted-foreground hover:bg-destructive hover:text-white transition-colors"
                    >
                        <X className="w-3 h-3" />
                    </button>
                </div>
            )}

            {locked && termIndexValue === termIndex(course.terms[0]) && (
                <Lock className="absolute top-1 right-1 w-3 h-3 text-muted-foreground" aria-hidden />
            )}
        </div>
    );
}
