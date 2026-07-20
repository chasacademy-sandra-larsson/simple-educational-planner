"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import type {
    ProjectWithDetails,
    Teacher,
    Room,
    GeneratedSchedule,
    ScheduledLesson,
    TermType,
    ScheduleStatus,
    PreflightWarning,
} from '@/app/lib/api/types';
import { api, ApiError } from '@/app/lib/api';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Zap, RefreshCw } from 'lucide-react';

interface ControlRoomProps {
    project: ProjectWithDetails;
    teachers: Teacher[];
    rooms: Room[];
}

const DAY_NAMES = ['', 'Mån', 'Tis', 'Ons', 'Tor', 'Fre'];

const TIMEOUT_OPTIONS = [
    { value: 60, label: 'Snabb (60 s)' },
    { value: 120, label: 'Normal (120 s)' },
    { value: 300, label: 'Grundlig (300 s)' },
];

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
    draft: { label: 'Utkast', className: 'bg-accent text-accent-foreground' },
    active: { label: 'Aktivt', className: 'bg-primary text-primary-foreground' },
    superseded: { label: 'Ersatt', className: 'bg-muted text-muted-foreground' },
    failed: { label: 'Misslyckad', className: 'bg-destructive/10 text-destructive' },
};

// "HH:MM:SS" | "HH:MM" -> minutes since midnight
function toMinutes(timeStr: string): number {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
}

function formatTime(timeStr: string): string {
    return timeStr.substring(0, 5);
}

// Consistent per-course color from a small palette
const COURSE_COLORS = [
    'bg-chart-1/15 border-chart-1',
    'bg-chart-2/15 border-chart-2',
    'bg-chart-3/15 border-chart-3',
    'bg-chart-4/15 border-chart-4',
    'bg-chart-5/15 border-chart-5',
    'bg-primary/10 border-primary',
    'bg-accent border-accent-foreground/40',
    'bg-muted border-border',
];
function getCourseColor(courseCode: string): string {
    let hash = 0;
    for (let i = 0; i < courseCode.length; i++) {
        hash = courseCode.charCodeAt(i) + ((hash << 5) - hash);
    }
    return COURSE_COLORS[Math.abs(hash) % COURSE_COLORS.length];
}

interface Gap {
    day: number;
    startMinutes: number;
    durationMinutes: number;
}

/**
 * Klass-håltid enligt CONTEXT.md: oanvända luckor > 20 min mellan en klasses
 * lektioner samma dag. Lunchen exkluderas (gap som överlappar lunchfönstret
 * får lunchDuration avdraget en gång per dag). Före första / efter sista
 * lektionen räknas inte.
 */
function computeClassGaps(
    lessons: ScheduledLesson[],
    project: ProjectWithDetails,
): { gaps: Gap[]; totalMinutes: number } {
    const lunchStart = toMinutes(project.earliestLunchTime || '11:30:00');
    const lunchEnd = toMinutes(project.latestLunchTime || '13:30:00');
    const lunchDuration = project.lunchDuration ?? 45;

    const gaps: Gap[] = [];
    let totalMinutes = 0;

    for (let day = 1; day <= 5; day++) {
        const dayLessons = lessons
            .filter(l => l.dayOfWeek === day)
            .sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime));

        let lunchConsumed = false;
        for (let i = 0; i < dayLessons.length - 1; i++) {
            const gapStart = toMinutes(dayLessons[i].endTime);
            const gapEnd = toMinutes(dayLessons[i + 1].startTime);
            let gapLength = gapEnd - gapStart;
            if (gapLength <= 0) continue;

            const overlapsLunch = gapStart < lunchEnd && gapEnd > lunchStart;
            if (overlapsLunch && !lunchConsumed) {
                gapLength -= lunchDuration;
                lunchConsumed = true;
            }

            if (gapLength > 20) {
                gaps.push({ day, startMinutes: gapStart, durationMinutes: gapEnd - gapStart });
                totalMinutes += gapLength;
            }
        }
    }

    return { gaps, totalMinutes };
}

export default function ControlRoom({ project, teachers, rooms }: ControlRoomProps) {
    const [schedules, setSchedules] = useState<GeneratedSchedule[]>([]);
    const [academicYears, setAcademicYears] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);

    const [selectedYear, setSelectedYear] = useState('');
    const [selectedTerm, setSelectedTerm] = useState<TermType>('fall');
    const [timeoutSeconds, setTimeoutSeconds] = useState(120);

    const [viewMode, setViewMode] = useState<'class' | 'teacher'>('class');
    const [selectedEntityId, setSelectedEntityId] = useState<string>('');

    const [selectedSchedule, setSelectedSchedule] = useState<GeneratedSchedule | null>(null);
    const [scheduleLessons, setScheduleLessons] = useState<ScheduledLesson[]>([]);
    const [loadingLessons, setLoadingLessons] = useState(false);

    const [generating, setGenerating] = useState(false);
    const [activating, setActivating] = useState(false);
    const [error, setError] = useState('');
    const [preflightWarnings, setPreflightWarnings] = useState<PreflightWarning[]>([]);

    const classes = useMemo(() => project.classes || [], [project.classes]);

    // --- data loading -------------------------------------------------------

    const loadSchedules = useCallback(async () => {
        const [schedulesData, yearsData] = await Promise.all([
            api.scheduleGenerator.getAll(project.id),
            api.scheduleGenerator.getAcademicYears(project.id).catch(() => ({ academicYears: [] })),
        ]);
        setSchedules(schedulesData);
        setAcademicYears(yearsData.academicYears);
        return { schedulesData, yearsData };
    }, [project.id]);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                setLoading(true);
                const { yearsData } = await loadSchedules();
                if (!cancelled && yearsData.academicYears.length > 0) {
                    setSelectedYear(prev => prev || yearsData.academicYears[0]);
                }
            } catch (err) {
                console.error('Failed to load schedules:', err);
                if (!cancelled) setError('Kunde inte ladda scheman');
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [loadSchedules]);

    // Default entity selection when list or view mode changes
    useEffect(() => {
        if (viewMode === 'class' && classes.length > 0) {
            setSelectedEntityId(prev => classes.some(c => c.id === prev) ? prev : classes[0].id);
        } else if (viewMode === 'teacher' && teachers.length > 0) {
            setSelectedEntityId(prev => teachers.some(t => t.id === prev) ? prev : teachers[0].id);
        }
    }, [viewMode, classes, teachers]);

    // Pick the schedule to display for (year, term): active first, else latest draft
    const termSchedules = useMemo(
        () => schedules.filter(s => s.academicYear === selectedYear && s.termType === selectedTerm && s.status !== 'failed'),
        [schedules, selectedYear, selectedTerm],
    );

    useEffect(() => {
        if (termSchedules.length === 0) {
            setSelectedSchedule(null);
            setScheduleLessons([]);
            return;
        }
        // Keep current selection if it still belongs to this term
        if (selectedSchedule && termSchedules.some(s => s.id === selectedSchedule.id)) return;
        const active = termSchedules.find(s => s.status === 'active');
        const pick = active || termSchedules[0];
        loadScheduleDetails(pick.id);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [termSchedules]);

    const loadScheduleDetails = async (scheduleId: string) => {
        try {
            setLoadingLessons(true);
            const data = await api.scheduleGenerator.getById(project.id, scheduleId);
            setSelectedSchedule(data.schedule);
            setScheduleLessons(data.lessons);
        } catch (err) {
            console.error('Failed to load schedule details:', err);
            setError('Kunde inte ladda schemat');
        } finally {
            setLoadingLessons(false);
        }
    };

    // --- actions ------------------------------------------------------------

    const handleGenerate = async () => {
        if (!selectedYear) {
            setError('Välj läsår');
            return;
        }
        setGenerating(true);
        setError('');
        setPreflightWarnings([]);
        try {
            const result = await api.scheduleGenerator.generate(project.id, {
                academicYear: selectedYear,
                termType: selectedTerm,
                timeoutSeconds,
            });
            setPreflightWarnings(result.preflight || []);
            await loadSchedules();
            if (result.result.success) {
                await loadScheduleDetails(result.schedule.id);
            } else {
                setError(`Schemaläggning misslyckades: ${result.result.message}`);
            }
        } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Kunde inte generera schema');
        } finally {
            setGenerating(false);
        }
    };

    const handleActivate = async () => {
        if (!selectedSchedule) return;
        setActivating(true);
        setError('');
        try {
            const updated = await api.scheduleGenerator.updateStatus(project.id, selectedSchedule.id, 'active' as ScheduleStatus);
            setSelectedSchedule(updated);
            await loadSchedules();
        } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Kunde inte aktivera schemat');
        } finally {
            setActivating(false);
        }
    };

    // --- derived view data --------------------------------------------------

    const entityLessons = useMemo(() => {
        if (!selectedEntityId) return [];
        return scheduleLessons.filter(l =>
            viewMode === 'class' ? l.classId === selectedEntityId : l.teacherId === selectedEntityId
        );
    }, [scheduleLessons, viewMode, selectedEntityId]);

    // Gaps for the selected class (markers) — class view only, per ADR-0007
    const selectedClassGaps = useMemo(() => {
        if (viewMode !== 'class') return { gaps: [] as Gap[], totalMinutes: 0 };
        return computeClassGaps(entityLessons, project);
    }, [viewMode, entityLessons, project]);

    // Total klass-håltid over all classes — the solver objective, per ADR-0008
    const totalGapMinutes = useMemo(() => {
        let total = 0;
        for (const cls of classes) {
            const clsLessons = scheduleLessons.filter(l => l.classId === cls.id);
            total += computeClassGaps(clsLessons, project).totalMinutes;
        }
        return total;
    }, [scheduleLessons, classes, project]);

    const selectedEntityLabel = viewMode === 'class'
        ? classes.find(c => c.id === selectedEntityId)?.classCode
        : teachers.find(t => t.id === selectedEntityId)?.name;

    const preflightErrors = preflightWarnings.filter(w => w.severity === 'error');
    const preflightSoft = preflightWarnings.filter(w => w.severity !== 'error');

    // --- render ---------------------------------------------------------------

    if (loading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-12 w-full" />
                <div className="grid grid-cols-[220px_1fr_300px] gap-4">
                    <Skeleton className="h-96" />
                    <Skeleton className="h-96" />
                    <Skeleton className="h-96" />
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* ---- Topbar: termin, vy, timeout, generera ---- */}
            <div className="flex flex-wrap items-end gap-4 pb-4 border-b border-border">
                <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Läsår</label>
                    <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(e.target.value)}
                        className="px-3 py-1.5 border border-border rounded-lg bg-card text-foreground text-sm"
                    >
                        {academicYears.length === 0 && <option value="">Inga klasser ännu</option>}
                        {academicYears.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                </div>

                <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Termin</label>
                    <div className="inline-flex rounded-lg border border-border overflow-hidden">
                        {(['fall', 'spring'] as TermType[]).map(term => (
                            <button
                                key={term}
                                onClick={() => setSelectedTerm(term)}
                                className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                                    selectedTerm === term
                                        ? 'bg-primary text-primary-foreground'
                                        : 'bg-card text-muted-foreground hover:bg-muted'
                                }`}
                            >
                                {term === 'fall' ? 'HT' : 'VT'}
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Visa per</label>
                    <div className="inline-flex rounded-lg border border-border overflow-hidden">
                        <button
                            onClick={() => setViewMode('class')}
                            className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                                viewMode === 'class' ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:bg-muted'
                            }`}
                        >
                            Klass
                        </button>
                        <button
                            onClick={() => setViewMode('teacher')}
                            className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                                viewMode === 'teacher' ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:bg-muted'
                            }`}
                        >
                            Lärare
                        </button>
                    </div>
                </div>

                <div className="flex-1" />

                <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Sökdjup</label>
                    <select
                        value={timeoutSeconds}
                        onChange={(e) => setTimeoutSeconds(Number(e.target.value))}
                        className="px-3 py-1.5 border border-border rounded-lg bg-card text-foreground text-sm"
                    >
                        {TIMEOUT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                </div>

                <Button onClick={handleGenerate} disabled={generating || !selectedYear} className="gap-2">
                    {generating
                        ? <><RefreshCw className="w-4 h-4 animate-spin" /> Genererar…</>
                        : <><Zap className="w-4 h-4" /> Generera schema</>}
                </Button>
            </div>

            {error && (
                <div className="p-3 bg-destructive/10 border border-destructive rounded-lg text-sm text-destructive">
                    {error}
                </div>
            )}

            {/* ---- Tre zoner ---- */}
            <div className="grid grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)_300px] gap-4 items-start">

                {/* Vänsterrail: resurser */}
                <div className="space-y-4">
                    <div className="rounded-xl border border-border bg-card overflow-hidden">
                        <div className="px-3 py-2 border-b border-border flex items-center justify-between">
                            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                {viewMode === 'class' ? 'Klasser' : 'Lärare'}
                            </h3>
                            <span className="text-xs text-muted-foreground">
                                {viewMode === 'class' ? classes.length : teachers.length}
                            </span>
                        </div>
                        <div className="p-1.5 space-y-0.5 max-h-72 overflow-y-auto">
                            {(viewMode === 'class' ? classes : teachers).map((entity) => {
                                const label = 'classCode' in entity ? entity.classCode : entity.name;
                                const sub = 'classCode' in entity
                                    ? entity.programName
                                    : (entity as Teacher).subject || '';
                                return (
                                    <button
                                        key={entity.id}
                                        onClick={() => setSelectedEntityId(entity.id)}
                                        className={`w-full text-left px-2.5 py-1.5 rounded-lg text-sm transition-colors ${
                                            selectedEntityId === entity.id
                                                ? 'bg-accent text-primary font-medium'
                                                : 'text-foreground hover:bg-muted'
                                        }`}
                                    >
                                        <div className="truncate">{label}</div>
                                        {sub && <div className="text-xs text-muted-foreground truncate">{sub}</div>}
                                    </button>
                                );
                            })}
                            {(viewMode === 'class' ? classes : teachers).length === 0 && (
                                <p className="px-2.5 py-3 text-xs text-muted-foreground">
                                    {viewMode === 'class' ? 'Inga klasser ännu.' : 'Inga lärare ännu.'}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="rounded-xl border border-border bg-card overflow-hidden">
                        <div className="px-3 py-2 border-b border-border flex items-center justify-between">
                            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Salar</h3>
                            <span className="text-xs text-muted-foreground">{rooms.length}</span>
                        </div>
                        <div className="p-2.5 space-y-1.5 max-h-48 overflow-y-auto">
                            {rooms.map(room => (
                                <div key={room.id} className="flex items-center gap-2 text-sm">
                                    <code className="px-1.5 py-0.5 text-xs bg-muted rounded border border-border">
                                        {room.roomNumber}
                                    </code>
                                    <span className="text-xs text-muted-foreground truncate">
                                        {room.roomType || 'alla ämnen'}
                                    </span>
                                </div>
                            ))}
                            {rooms.length === 0 && (
                                <p className="text-xs text-muted-foreground py-1">Inga salar ännu.</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Centrum: veckoschema */}
                <div className="rounded-xl border border-border bg-card overflow-hidden">
                    <div className="px-4 py-3 border-b border-border flex flex-wrap items-baseline gap-3">
                        <h2 className="text-base font-semibold text-foreground">
                            {selectedEntityLabel || '—'}
                        </h2>
                        <span className="text-sm text-muted-foreground">
                            {entityLessons.length} lektioner/vecka
                        </span>
                        {viewMode === 'class' && selectedSchedule && (
                            <span className="ml-auto text-sm font-medium tabular-nums text-foreground">
                                Håltid: <span className={selectedClassGaps.totalMinutes > 0 ? 'text-destructive' : 'text-primary'}>
                                    {selectedClassGaps.totalMinutes} min
                                </span>
                            </span>
                        )}
                    </div>

                    {loadingLessons ? (
                        <div className="p-4"><Skeleton className="h-96 w-full" /></div>
                    ) : !selectedSchedule ? (
                        <div className="p-12 text-center text-muted-foreground">
                            <p className="font-medium mb-1">Inget schema för {selectedYear || '—'} {selectedTerm === 'fall' ? 'HT' : 'VT'}</p>
                            <p className="text-sm">Klicka på &quot;Generera schema&quot; för att skapa ett utkast.</p>
                        </div>
                    ) : (
                        <WeeklyGrid
                            lessons={entityLessons}
                            gaps={viewMode === 'class' ? selectedClassGaps.gaps : []}
                            viewMode={viewMode}
                        />
                    )}
                </div>

                {/* Högerrail: status + preflight */}
                <div className="space-y-4">
                    <div className="rounded-xl border border-border bg-card overflow-hidden">
                        <div className="px-3 py-2 border-b border-border">
                            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Aktuellt schema</h3>
                        </div>
                        {selectedSchedule ? (
                            <div className="p-3 space-y-3">
                                <div className="flex items-center gap-2">
                                    <Badge className={STATUS_BADGE[selectedSchedule.status]?.className || ''}>
                                        {STATUS_BADGE[selectedSchedule.status]?.label || selectedSchedule.status}
                                    </Badge>
                                    {selectedSchedule.solverTimeMs !== null && (
                                        <span className="text-xs text-muted-foreground tabular-nums">
                                            {(selectedSchedule.solverTimeMs / 1000).toFixed(1)} s
                                        </span>
                                    )}
                                </div>
                                <div className="text-sm text-foreground">
                                    Total klass-håltid:{' '}
                                    <span className="font-semibold tabular-nums">{totalGapMinutes} min</span>
                                </div>
                                {selectedSchedule.status === 'draft' && (
                                    <Button
                                        onClick={handleActivate}
                                        disabled={activating}
                                        variant="outline"
                                        className="w-full"
                                    >
                                        {activating ? 'Aktiverar…' : 'Använd som aktivt schema'}
                                    </Button>
                                )}
                            </div>
                        ) : (
                            <p className="p-3 text-sm text-muted-foreground">Inget schema aktiverat ännu.</p>
                        )}
                    </div>

                    <div className="rounded-xl border border-border bg-card overflow-hidden">
                        <div className="px-3 py-2 border-b border-border flex items-center justify-between">
                            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Preflight</h3>
                            {preflightWarnings.length > 0 && (
                                <span className="text-xs text-muted-foreground">{preflightWarnings.length}</span>
                            )}
                        </div>
                        {preflightWarnings.length === 0 ? (
                            <p className="p-3 text-sm text-muted-foreground">
                                Körs vid generering — varningar visas här.
                            </p>
                        ) : (
                            <div className="divide-y divide-border max-h-80 overflow-y-auto">
                                {[...preflightErrors, ...preflightSoft].map((w, i) => (
                                    <div key={i} className="p-3 flex gap-2">
                                        <span className={`mt-1 inline-block w-2 h-2 rounded-full flex-shrink-0 ${
                                            w.severity === 'error' ? 'bg-destructive' : 'bg-chart-4'
                                        }`} />
                                        <p className="text-xs text-foreground leading-relaxed">{w.message}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {termSchedules.length > 1 && (
                        <div className="rounded-xl border border-border bg-card overflow-hidden">
                            <div className="px-3 py-2 border-b border-border">
                                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Historik</h3>
                            </div>
                            <div className="p-1.5 space-y-0.5 max-h-56 overflow-y-auto">
                                {termSchedules.map(s => (
                                    <button
                                        key={s.id}
                                        onClick={() => loadScheduleDetails(s.id)}
                                        className={`w-full text-left px-2.5 py-1.5 rounded-lg text-sm transition-colors flex items-center justify-between gap-2 ${
                                            selectedSchedule?.id === s.id ? 'bg-accent' : 'hover:bg-muted'
                                        }`}
                                    >
                                        <span className="truncate text-foreground">{s.name}</span>
                                        <Badge className={`${STATUS_BADGE[s.status]?.className || ''} text-[10px] flex-shrink-0`}>
                                            {STATUS_BADGE[s.status]?.label || s.status}
                                        </Badge>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------

function WeeklyGrid({
    lessons,
    gaps,
    viewMode,
}: {
    lessons: ScheduledLesson[];
    gaps: Gap[];
    viewMode: 'class' | 'teacher';
}) {
    // Time range: fit lessons, minimum 08–16
    let startHour = 8;
    let endHour = 16;
    lessons.forEach(l => {
        startHour = Math.min(startHour, Math.floor(toMinutes(l.startTime) / 60));
        endHour = Math.max(endHour, Math.ceil(toMinutes(l.endTime) / 60));
    });
    const hours = Array.from({ length: endHour - startHour }, (_, i) => startHour + i);
    const PX_PER_MIN = 1; // 60px per hour

    const toY = (minutes: number) => (minutes - startHour * 60) * PX_PER_MIN;

    const lessonsByDay = lessons.reduce((acc, l) => {
        (acc[l.dayOfWeek] ||= []).push(l);
        return acc;
    }, {} as Record<number, ScheduledLesson[]>);

    return (
        <div className="overflow-x-auto">
            <div className="min-w-[560px]">
                {/* Header */}
                <div className="grid grid-cols-[48px_repeat(5,1fr)] border-b border-border">
                    <div />
                    {[1, 2, 3, 4, 5].map(day => (
                        <div key={day} className="py-2 text-center text-xs font-semibold text-muted-foreground">
                            {DAY_NAMES[day]}
                        </div>
                    ))}
                </div>

                {/* Grid */}
                <div className="grid grid-cols-[48px_repeat(5,1fr)]">
                    <div className="relative border-r border-border" style={{ height: `${(endHour - startHour) * 60}px` }}>
                        {hours.map(hour => (
                            <span
                                key={hour}
                                className="absolute right-1.5 -translate-y-1/2 text-[10px] text-muted-foreground tabular-nums"
                                style={{ top: `${toY(hour * 60)}px` }}
                            >
                                {hour.toString().padStart(2, '0')}:00
                            </span>
                        ))}
                    </div>

                    {[1, 2, 3, 4, 5].map(day => (
                        <div
                            key={day}
                            className="relative border-r border-border last:border-r-0"
                            style={{ height: `${(endHour - startHour) * 60}px` }}
                        >
                            {hours.map(hour => (
                                <div
                                    key={hour}
                                    className="absolute left-0 right-0 border-b border-border/50"
                                    style={{ top: `${toY(hour * 60)}px`, height: '60px' }}
                                />
                            ))}

                            {/* Håltids-markörer */}
                            {gaps.filter(g => g.day === day).map((g, i) => (
                                <div
                                    key={`gap-${i}`}
                                    className="absolute left-1.5 right-1.5 rounded border border-dashed border-destructive/50 bg-destructive/5 flex items-center justify-center"
                                    style={{ top: `${toY(g.startMinutes) + 2}px`, height: `${g.durationMinutes * PX_PER_MIN - 4}px` }}
                                >
                                    <span className="text-[10px] font-medium text-destructive tabular-nums">
                                        hål {g.durationMinutes} min
                                    </span>
                                </div>
                            ))}

                            {/* Lektioner */}
                            {(lessonsByDay[day] || []).map((lesson, idx) => {
                                const top = toY(toMinutes(lesson.startTime));
                                const height = lesson.durationMinutes * PX_PER_MIN;
                                return (
                                    <div
                                        key={`${lesson.id}-${idx}`}
                                        className={`absolute left-1 right-1 rounded border-l-2 border p-1 overflow-hidden ${getCourseColor(lesson.courseCode || '')}`}
                                        style={{ top: `${top}px`, height: `${height - 2}px` }}
                                        title={`${lesson.courseName}\n${formatTime(lesson.startTime)}–${formatTime(lesson.endTime)}\n${lesson.teacherName || 'Ingen lärare'} · ${lesson.roomNumber || 'Inget rum'}`}
                                    >
                                        <div className="text-xs font-medium text-foreground truncate leading-tight">
                                            {lesson.courseName || lesson.courseCode}
                                        </div>
                                        <div className="text-[10px] text-muted-foreground tabular-nums truncate">
                                            {formatTime(lesson.startTime)}–{formatTime(lesson.endTime)}
                                        </div>
                                        {height > 45 && (
                                            <div className="text-[10px] text-muted-foreground truncate">
                                                {lesson.roomNumber && <code>{lesson.roomNumber}</code>}
                                                {' '}
                                                {viewMode === 'class' ? (lesson.teacherName || '') : (lesson.classCode || '')}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
