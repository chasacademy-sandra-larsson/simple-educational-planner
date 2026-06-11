"use client";

import { useState, useEffect } from 'react';
import type {
    ProjectWithDetails,
    GeneratedSchedule,
    ScheduledLesson,
    TermType,
    ScheduleStatus,
    PreflightWarning,
} from '@/app/lib/api/types';
import { api, ApiError } from '@/app/lib/api';
import { Skeleton } from '@/components/ui/skeleton';

interface ScheduleGeneratorProps {
    project: ProjectWithDetails;
    onUpdate?: () => void;
}

// Day names in Swedish
const DAY_NAMES = ['', 'Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag'];

// Format time from "HH:MM:SS" to "HH:MM"
function formatTime(timeStr: string): string {
    return timeStr.substring(0, 5);
}

// Status badge colors
const STATUS_COLORS: Record<ScheduleStatus, string> = {
    draft: 'bg-accent text-accent-foreground',
    active: 'bg-primary text-primary-foreground',
    superseded: 'bg-muted text-muted-foreground',
    failed: 'bg-destructive/10 text-destructive',
    // Legacy statuses (pre ADR-0008)
    approved: 'bg-primary/10 text-primary',
    archived: 'bg-muted text-muted-foreground',
};

const STATUS_LABELS: Record<ScheduleStatus, string> = {
    draft: 'Utkast',
    active: 'Aktivt',
    superseded: 'Ersatt',
    failed: 'Misslyckad',
    // Legacy
    approved: 'Godkänd',
    archived: 'Arkiverad',
};

// Color palette for different courses (consistent colors)
function getCourseColor(courseCode: string): string {
    const colors = [
        'bg-accent border-primary',
        'bg-primary/10 border-primary',
        'bg-muted border-border',
        'bg-accent border-border',
        'bg-muted border-border',
        'bg-primary/10 border-primary',
        'bg-accent border-border',
        'bg-accent border-border',
        'bg-destructive/10 border-destructive',
        'bg-muted border-border',
    ];
    // Simple hash function to get consistent color for same course code
    let hash = 0;
    for (let i = 0; i < courseCode.length; i++) {
        hash = courseCode.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
}

export default function ScheduleGenerator({ project, onUpdate }: ScheduleGeneratorProps) {
    const [schedules, setSchedules] = useState<GeneratedSchedule[]>([]);
    const [academicYears, setAcademicYears] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [preflightWarnings, setPreflightWarnings] = useState<PreflightWarning[]>([]);

    // Form state
    const [selectedYear, setSelectedYear] = useState('');
    const [selectedTerm, setSelectedTerm] = useState<TermType>('fall');
    const [scheduleName, setScheduleName] = useState('');

    // Selected schedule view
    const [selectedSchedule, setSelectedSchedule] = useState<GeneratedSchedule | null>(null);
    const [scheduleLessons, setScheduleLessons] = useState<ScheduledLesson[]>([]);
    const [loadingLessons, setLoadingLessons] = useState(false);

    // Filter state for schedule view
    const [filterClass, setFilterClass] = useState<string>('all');
    const [filterTeacher, setFilterTeacher] = useState<string>('all');

    // Load schedules and academic years
    useEffect(() => {
        const loadData = async () => {
            try {
                setLoading(true);
                const [schedulesData, yearsData] = await Promise.all([
                    api.scheduleGenerator.getAll(project.id),
                    api.scheduleGenerator.getAcademicYears(project.id).catch(() => ({ academicYears: [] })),
                ]);
                setSchedules(schedulesData);
                setAcademicYears(yearsData.academicYears);
                if (yearsData.academicYears.length > 0 && !selectedYear) {
                    setSelectedYear(yearsData.academicYears[0]);
                }
            } catch (err) {
                console.error('Failed to load schedules:', err);
                setError('Kunde inte ladda scheman');
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [project.id]);

    // Load lessons when a schedule is selected
    const loadScheduleDetails = async (schedule: GeneratedSchedule) => {
        try {
            setLoadingLessons(true);
            const data = await api.scheduleGenerator.getById(project.id, schedule.id);
            setSelectedSchedule(data.schedule);
            setScheduleLessons(data.lessons);
        } catch (err) {
            console.error('Failed to load schedule details:', err);
            setError('Kunde inte ladda schemat');
        } finally {
            setLoadingLessons(false);
        }
    };

    // Generate new schedule
    const handleGenerate = async () => {
        console.log('[ScheduleGenerator] handleGenerate called');
        console.log('[ScheduleGenerator] selectedYear:', selectedYear, 'selectedTerm:', selectedTerm);

        if (!selectedYear || !selectedTerm) {
            setError('Välj läsår och termin');
            return;
        }

        setGenerating(true);
        setError('');
        setSuccess('');
        setPreflightWarnings([]);

        try {
            console.log('[ScheduleGenerator] Calling API with:', { projectId: project.id, academicYear: selectedYear, termType: selectedTerm });
            const result = await api.scheduleGenerator.generate(project.id, {
                name: scheduleName || undefined,
                academicYear: selectedYear,
                termType: selectedTerm,
            });
            console.log('[ScheduleGenerator] API response:', result);

            setPreflightWarnings(result.preflight || []);

            if (result.result.success) {
                setSuccess(`Schema genererat! ${result.result.lessonCount} lektioner på ${result.result.solverTimeMs}ms`);
                // Reload schedules list
                const schedulesData = await api.scheduleGenerator.getAll(project.id);
                setSchedules(schedulesData);
                setScheduleName('');
                // Show the new schedule
                loadScheduleDetails(result.schedule);
            } else {
                setError(`Schemaläggning misslyckades: ${result.result.message}`);
            }
        } catch (err) {
            console.error('[ScheduleGenerator] Error:', err);
            if (err instanceof ApiError) {
                setError(err.message);
            } else {
                setError('Kunde inte generera schema');
            }
        } finally {
            setGenerating(false);
        }
    };

    // Delete schedule
    const handleDelete = async (scheduleId: string) => {
        if (!confirm('Är du säker på att du vill ta bort detta schema?')) return;

        try {
            await api.scheduleGenerator.delete(project.id, scheduleId);
            setSchedules(schedules.filter(s => s.id !== scheduleId));
            if (selectedSchedule?.id === scheduleId) {
                setSelectedSchedule(null);
                setScheduleLessons([]);
            }
            setSuccess('Schema borttaget');
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError('Kunde inte ta bort schemat');
        }
    };

    // Update schedule status
    const handleStatusChange = async (scheduleId: string, newStatus: ScheduleStatus) => {
        try {
            const updated = await api.scheduleGenerator.updateStatus(project.id, scheduleId, newStatus);
            setSchedules(schedules.map(s => s.id === scheduleId ? updated : s));
            if (selectedSchedule?.id === scheduleId) {
                setSelectedSchedule(updated);
            }
        } catch (err) {
            setError('Kunde inte uppdatera status');
        }
    };

    // Get unique classes from lessons
    const getUniqueClasses = (): { id: string; code: string }[] => {
        const classMap = new Map<string, string>();
        scheduleLessons.forEach(lesson => {
            if (lesson.classCode && !classMap.has(lesson.classId)) {
                classMap.set(lesson.classId, lesson.classCode);
            }
        });
        return Array.from(classMap.entries()).map(([id, code]) => ({ id, code })).sort((a, b) => a.code.localeCompare(b.code));
    };

    // Get unique teachers from lessons
    const getUniqueTeachers = (): { id: string; name: string }[] => {
        const teacherMap = new Map<string, string>();
        scheduleLessons.forEach(lesson => {
            if (lesson.teacherId && lesson.teacherName && !teacherMap.has(lesson.teacherId)) {
                teacherMap.set(lesson.teacherId, lesson.teacherName);
            }
        });
        return Array.from(teacherMap.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
    };

    // Filter lessons by class and/or teacher
    const filteredLessons = scheduleLessons.filter(l => {
        const matchesClass = filterClass === 'all' || l.classId === filterClass;
        const matchesTeacher = filterTeacher === 'all' || l.teacherId === filterTeacher;
        return matchesClass && matchesTeacher;
    });

    // Group lessons by day for the weekly view
    const lessonsByDay = filteredLessons.reduce((acc, lesson) => {
        if (!acc[lesson.dayOfWeek]) {
            acc[lesson.dayOfWeek] = [];
        }
        acc[lesson.dayOfWeek].push(lesson);
        return acc;
    }, {} as Record<number, ScheduledLesson[]>);

    // Calculate time range for the grid
    const getTimeRange = (): { start: number; end: number } => {
        if (filteredLessons.length === 0) return { start: 8, end: 17 };

        let minHour = 24;
        let maxHour = 0;

        filteredLessons.forEach(lesson => {
            const startHour = parseInt(lesson.startTime.split(':')[0]);
            const endHour = parseInt(lesson.endTime.split(':')[0]);
            minHour = Math.min(minHour, startHour);
            maxHour = Math.max(maxHour, endHour + 1);
        });

        return { start: Math.max(7, minHour), end: Math.min(18, maxHour) };
    };

    if (loading) {
        return (
            <div className="rounded-xl border bg-card p-6 space-y-4">
                <Skeleton className="h-6 w-1/3" />
                <Skeleton className="h-32 w-full" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Generate Form */}
            <div className="bg-card rounded-xl shadow-sm border border-border p-6">
                <h2 className="text-xl font-semibold text-foreground mb-6">
                    Generera schema
                </h2>

                {error && (
                    <div className="mb-4 p-4 bg-destructive/10 border border-destructive rounded-lg text-destructive">
                        {error}
                    </div>
                )}

                {success && (
                    <div className="mb-4 p-4 bg-primary/10 border border-primary rounded-lg text-primary">
                        {success}
                    </div>
                )}

                {preflightWarnings.length > 0 && (
                    <div className="mb-4 p-4 bg-accent/40 border border-border rounded-lg">
                        <h3 className="text-sm font-semibold text-foreground mb-2">
                            Preflight-varningar ({preflightWarnings.length})
                        </h3>
                        <ul className="space-y-1 text-sm">
                            {preflightWarnings.map((w, i) => (
                                <li key={i} className="flex items-start gap-2">
                                    <span className={`mt-0.5 inline-block w-2 h-2 rounded-full flex-shrink-0 ${
                                        w.severity === 'error' ? 'bg-destructive' : 'bg-accent-foreground'
                                    }`} />
                                    <span className="text-foreground">{w.message}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {academicYears.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        <p>Inga klasser har lagts till ännu.</p>
                        <p className="text-sm mt-2">Lägg till klasser och kurser för att kunna generera schema.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-muted-foreground mb-1">
                                    Läsår
                                </label>
                                <select
                                    value={selectedYear}
                                    onChange={(e) => setSelectedYear(e.target.value)}
                                    className="w-full px-3 py-2 border border-border rounded-lg bg-card text-foreground"
                                >
                                    {academicYears.map(year => (
                                        <option key={year} value={year}>{year}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-muted-foreground mb-1">
                                    Termin
                                </label>
                                <select
                                    value={selectedTerm}
                                    onChange={(e) => setSelectedTerm(e.target.value as TermType)}
                                    className="w-full px-3 py-2 border border-border rounded-lg bg-card text-foreground"
                                >
                                    <option value="fall">Hösttermin (HT)</option>
                                    <option value="spring">Vårtermin (VT)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-muted-foreground mb-1">
                                    Namn (valfritt)
                                </label>
                                <input
                                    type="text"
                                    value={scheduleName}
                                    onChange={(e) => setScheduleName(e.target.value)}
                                    placeholder={`Schema ${selectedYear} ${selectedTerm === 'fall' ? 'HT' : 'VT'}`}
                                    className="w-full px-3 py-2 border border-border rounded-lg bg-card text-foreground"
                                />
                            </div>
                            <div className="flex items-end">
                                <button
                                    onClick={handleGenerate}
                                    disabled={generating || !selectedYear}
                                    className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {generating ? 'Genererar...' : 'Generera schema'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Schedules List */}
            <div className="bg-card rounded-xl shadow-sm border border-border p-6">
                <h2 className="text-xl font-semibold text-foreground mb-6">
                    Genererade scheman
                </h2>

                {schedules.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        <p>Inga scheman har genererats ännu.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {schedules.map(schedule => (
                            <div
                                key={schedule.id}
                                className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                                    selectedSchedule?.id === schedule.id
                                        ? 'border-primary bg-accent'
                                        : 'border-border hover:bg-muted'
                                }`}
                                onClick={() => loadScheduleDetails(schedule)}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div>
                                            <h3 className="font-medium text-foreground">
                                                {schedule.name}
                                            </h3>
                                            <p className="text-sm text-muted-foreground">
                                                {schedule.academicYear} - {schedule.termType === 'fall' ? 'Hösttermin' : 'Vårtermin'}
                                            </p>
                                        </div>
                                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${STATUS_COLORS[schedule.status as ScheduleStatus]}`}>
                                            {STATUS_LABELS[schedule.status as ScheduleStatus]}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {schedule.status !== 'failed' && (
                                            <select
                                                value={schedule.status}
                                                onChange={(e) => {
                                                    e.stopPropagation();
                                                    handleStatusChange(schedule.id, e.target.value as ScheduleStatus);
                                                }}
                                                onClick={(e) => e.stopPropagation()}
                                                className="text-sm px-2 py-1 border border-border rounded bg-card text-foreground"
                                            >
                                                <option value="draft">Utkast</option>
                                                <option value="active">Aktivt</option>
                                                <option value="superseded">Ersatt</option>
                                            </select>
                                        )}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDelete(schedule.id);
                                            }}
                                            className="text-sm px-3 py-1 bg-destructive/10 text-destructive rounded hover:bg-destructive/20 transition-colors"
                                        >
                                            Ta bort
                                        </button>
                                    </div>
                                </div>
                                {schedule.solverTimeMs !== null && (
                                    <p className="text-xs text-muted-foreground mt-2">
                                        Genererades på {schedule.solverTimeMs}ms
                                        {schedule.totalConflicts !== null && schedule.totalConflicts > 0 && (
                                            <span className="text-accent-foreground"> ({schedule.totalConflicts} konflikter)</span>
                                        )}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Schedule View */}
            {selectedSchedule && (
                <div className="bg-card rounded-xl shadow-sm border border-border p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h2 className="text-xl font-semibold text-foreground">
                                {selectedSchedule.name}
                            </h2>
                            <p className="text-sm text-muted-foreground">
                                {filteredLessons.length} lektioner
                            </p>
                        </div>
                        <div className="flex items-center gap-4">
                            <div>
                                <label className="block text-sm font-medium text-muted-foreground mb-1">
                                    Filtrera klass
                                </label>
                                <select
                                    value={filterClass}
                                    onChange={(e) => setFilterClass(e.target.value)}
                                    className="px-3 py-2 border border-border rounded-lg bg-card text-foreground"
                                >
                                    <option value="all">Alla klasser</option>
                                    {getUniqueClasses().map(cls => (
                                        <option key={cls.id} value={cls.id}>{cls.code}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-muted-foreground mb-1">
                                    Filtrera lärare
                                </label>
                                <select
                                    value={filterTeacher}
                                    onChange={(e) => setFilterTeacher(e.target.value)}
                                    className="px-3 py-2 border border-border rounded-lg bg-card text-foreground"
                                >
                                    <option value="all">Alla lärare</option>
                                    {getUniqueTeachers().map(teacher => (
                                        <option key={teacher.id} value={teacher.id}>{teacher.name}</option>
                                    ))}
                                </select>
                            </div>
                            <button
                                onClick={() => {
                                    setSelectedSchedule(null);
                                    setScheduleLessons([]);
                                    setFilterClass('all');
                                    setFilterTeacher('all');
                                }}
                                className="px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted transition-colors"
                            >
                                Stäng
                            </button>
                        </div>
                    </div>

                    {loadingLessons ? (
                        <div className="space-y-4">
                            <Skeleton className="h-64 w-full" />
                        </div>
                    ) : (
                        <WeeklyGrid
                            lessons={filteredLessons}
                            lessonsByDay={lessonsByDay}
                            timeRange={getTimeRange()}
                        />
                    )}
                </div>
            )}
        </div>
    );
}

// Weekly grid component
function WeeklyGrid({
    lessons,
    lessonsByDay,
    timeRange,
}: {
    lessons: ScheduledLesson[];
    lessonsByDay: Record<number, ScheduledLesson[]>;
    timeRange: { start: number; end: number };
}) {
    const { start: startHour, end: endHour } = timeRange;
    const hours = Array.from({ length: endHour - startHour }, (_, i) => startHour + i);

    // Convert time string to grid position
    const timeToPosition = (timeStr: string): number => {
        const [hours, minutes] = timeStr.split(':').map(Number);
        return ((hours - startHour) + (minutes / 60)) * 60; // pixels (60px per hour)
    };

    return (
        <div className="overflow-x-auto">
            <div className="min-w-[800px]">
                {/* Header */}
                <div className="grid grid-cols-[80px_repeat(5,1fr)] border-b border-border">
                    <div className="p-2 bg-muted text-sm font-medium text-muted-foreground">
                        Tid
                    </div>
                    {[1, 2, 3, 4, 5].map(day => (
                        <div key={day} className="p-2 bg-muted text-center text-sm font-medium text-muted-foreground">
                            {DAY_NAMES[day]}
                        </div>
                    ))}
                </div>

                {/* Grid */}
                <div className="grid grid-cols-[80px_repeat(5,1fr)]">
                    {/* Time labels */}
                    <div className="border-r border-border">
                        {hours.map(hour => (
                            <div key={hour} className="h-[60px] border-b border-border flex items-start justify-end pr-2 pt-1">
                                <span className="text-xs text-muted-foreground">
                                    {hour.toString().padStart(2, '0')}:00
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* Day columns */}
                    {[1, 2, 3, 4, 5].map(day => (
                        <div key={day} className="relative border-r border-border">
                            {/* Hour lines */}
                            {hours.map(hour => (
                                <div key={hour} className="h-[60px] border-b border-border" />
                            ))}

                            {/* Lessons */}
                            {(lessonsByDay[day] || []).map((lesson, idx) => {
                                const top = timeToPosition(lesson.startTime);
                                const height = (lesson.durationMinutes / 60) * 60; // pixels

                                return (
                                    <div
                                        key={`${lesson.id}-${idx}`}
                                        className={`absolute left-1 right-1 rounded border p-1 overflow-hidden ${getCourseColor(lesson.courseCode || '')}`}
                                        style={{
                                            top: `${top}px`,
                                            height: `${height}px`,
                                        }}
                                        title={`${lesson.courseName}\n${lesson.classCode}\n${lesson.teacherName || 'Ingen lärare'}\n${lesson.roomNumber || 'Inget rum'}`}
                                    >
                                        <div className="text-xs font-medium text-foreground truncate">
                                            {lesson.courseCode}
                                        </div>
                                        <div className="text-xs text-muted-foreground truncate">
                                            {lesson.classCode}
                                        </div>
                                        {lesson.teacherName && (
                                            <div className="text-xs text-primary truncate font-medium">
                                                {lesson.teacherName}
                                            </div>
                                        )}
                                        {height > 50 && (
                                            <>
                                                <div className="text-xs text-muted-foreground truncate">
                                                    {formatTime(lesson.startTime)}-{formatTime(lesson.endTime)}
                                                </div>
                                                {lesson.roomNumber && (
                                                    <div className="text-xs text-muted-foreground truncate">
                                                        {lesson.roomNumber}
                                                    </div>
                                                )}
                                            </>
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
