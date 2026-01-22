"use client";

import { useState, useEffect } from 'react';
import type {
    ProjectWithDetails,
    GeneratedSchedule,
    ScheduledLesson,
    TermType,
    ScheduleStatus,
} from '@/app/lib/api/types';
import { api, ApiError } from '@/app/lib/api';

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
    draft: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
    approved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    archived: 'bg-zinc-100 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-300',
    failed: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
};

const STATUS_LABELS: Record<ScheduleStatus, string> = {
    draft: 'Utkast',
    approved: 'Godkänd',
    archived: 'Arkiverad',
    failed: 'Misslyckad',
};

// Color palette for different courses (consistent colors)
function getCourseColor(courseCode: string): string {
    const colors = [
        'bg-blue-100 dark:bg-blue-900/40 border-blue-300 dark:border-blue-700',
        'bg-green-100 dark:bg-green-900/40 border-green-300 dark:border-green-700',
        'bg-purple-100 dark:bg-purple-900/40 border-purple-300 dark:border-purple-700',
        'bg-orange-100 dark:bg-orange-900/40 border-orange-300 dark:border-orange-700',
        'bg-pink-100 dark:bg-pink-900/40 border-pink-300 dark:border-pink-700',
        'bg-teal-100 dark:bg-teal-900/40 border-teal-300 dark:border-teal-700',
        'bg-indigo-100 dark:bg-indigo-900/40 border-indigo-300 dark:border-indigo-700',
        'bg-yellow-100 dark:bg-yellow-900/40 border-yellow-300 dark:border-yellow-700',
        'bg-red-100 dark:bg-red-900/40 border-red-300 dark:border-red-700',
        'bg-cyan-100 dark:bg-cyan-900/40 border-cyan-300 dark:border-cyan-700',
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

        try {
            console.log('[ScheduleGenerator] Calling API with:', { projectId: project.id, academicYear: selectedYear, termType: selectedTerm });
            const result = await api.scheduleGenerator.generate(project.id, {
                name: scheduleName || undefined,
                academicYear: selectedYear,
                termType: selectedTerm,
            });
            console.log('[ScheduleGenerator] API response:', result);

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
            <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-700 p-6">
                <div className="animate-pulse space-y-4">
                    <div className="h-6 bg-zinc-200 dark:bg-zinc-700 rounded w-1/3"></div>
                    <div className="h-32 bg-zinc-200 dark:bg-zinc-700 rounded"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Generate Form */}
            <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-700 p-6">
                <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-6">
                    Generera schema
                </h2>

                {error && (
                    <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-800 dark:text-red-200">
                        {error}
                    </div>
                )}

                {success && (
                    <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-800 dark:text-green-200">
                        {success}
                    </div>
                )}

                {academicYears.length === 0 ? (
                    <div className="text-center py-8 text-zinc-500 dark:text-zinc-400">
                        <p>Inga klasser har lagts till ännu.</p>
                        <p className="text-sm mt-2">Lägg till klasser och kurser för att kunna generera schema.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                                    Läsår
                                </label>
                                <select
                                    value={selectedYear}
                                    onChange={(e) => setSelectedYear(e.target.value)}
                                    className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100"
                                >
                                    {academicYears.map(year => (
                                        <option key={year} value={year}>{year}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                                    Termin
                                </label>
                                <select
                                    value={selectedTerm}
                                    onChange={(e) => setSelectedTerm(e.target.value as TermType)}
                                    className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100"
                                >
                                    <option value="fall">Hösttermin (HT)</option>
                                    <option value="spring">Vårtermin (VT)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                                    Namn (valfritt)
                                </label>
                                <input
                                    type="text"
                                    value={scheduleName}
                                    onChange={(e) => setScheduleName(e.target.value)}
                                    placeholder={`Schema ${selectedYear} ${selectedTerm === 'fall' ? 'HT' : 'VT'}`}
                                    className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100"
                                />
                            </div>
                            <div className="flex items-end">
                                <button
                                    onClick={handleGenerate}
                                    disabled={generating || !selectedYear}
                                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {generating ? 'Genererar...' : 'Generera schema'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Schedules List */}
            <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-700 p-6">
                <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-6">
                    Genererade scheman
                </h2>

                {schedules.length === 0 ? (
                    <div className="text-center py-8 text-zinc-500 dark:text-zinc-400">
                        <p>Inga scheman har genererats ännu.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {schedules.map(schedule => (
                            <div
                                key={schedule.id}
                                className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                                    selectedSchedule?.id === schedule.id
                                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                        : 'border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700/50'
                                }`}
                                onClick={() => loadScheduleDetails(schedule)}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div>
                                            <h3 className="font-medium text-zinc-900 dark:text-zinc-100">
                                                {schedule.name}
                                            </h3>
                                            <p className="text-sm text-zinc-500 dark:text-zinc-400">
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
                                                className="text-sm px-2 py-1 border border-zinc-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100"
                                            >
                                                <option value="draft">Utkast</option>
                                                <option value="approved">Godkänd</option>
                                                <option value="archived">Arkiverad</option>
                                            </select>
                                        )}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDelete(schedule.id);
                                            }}
                                            className="text-sm px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                                        >
                                            Ta bort
                                        </button>
                                    </div>
                                </div>
                                {schedule.solverTimeMs !== null && (
                                    <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-2">
                                        Genererades på {schedule.solverTimeMs}ms
                                        {schedule.totalConflicts !== null && schedule.totalConflicts > 0 && (
                                            <span className="text-orange-500"> ({schedule.totalConflicts} konflikter)</span>
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
                <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-700 p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                                {selectedSchedule.name}
                            </h2>
                            <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                {filteredLessons.length} lektioner
                            </p>
                        </div>
                        <div className="flex items-center gap-4">
                            <div>
                                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                                    Filtrera klass
                                </label>
                                <select
                                    value={filterClass}
                                    onChange={(e) => setFilterClass(e.target.value)}
                                    className="px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100"
                                >
                                    <option value="all">Alla klasser</option>
                                    {getUniqueClasses().map(cls => (
                                        <option key={cls.id} value={cls.id}>{cls.code}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                                    Filtrera lärare
                                </label>
                                <select
                                    value={filterTeacher}
                                    onChange={(e) => setFilterTeacher(e.target.value)}
                                    className="px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100"
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
                                className="px-4 py-2 bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 rounded-lg hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors"
                            >
                                Stäng
                            </button>
                        </div>
                    </div>

                    {loadingLessons ? (
                        <div className="animate-pulse space-y-4">
                            <div className="h-64 bg-zinc-200 dark:bg-zinc-700 rounded"></div>
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
                <div className="grid grid-cols-[80px_repeat(5,1fr)] border-b border-zinc-200 dark:border-zinc-700">
                    <div className="p-2 bg-zinc-50 dark:bg-zinc-900 text-sm font-medium text-zinc-500 dark:text-zinc-400">
                        Tid
                    </div>
                    {[1, 2, 3, 4, 5].map(day => (
                        <div key={day} className="p-2 bg-zinc-50 dark:bg-zinc-900 text-center text-sm font-medium text-zinc-700 dark:text-zinc-300">
                            {DAY_NAMES[day]}
                        </div>
                    ))}
                </div>

                {/* Grid */}
                <div className="grid grid-cols-[80px_repeat(5,1fr)]">
                    {/* Time labels */}
                    <div className="border-r border-zinc-200 dark:border-zinc-700">
                        {hours.map(hour => (
                            <div key={hour} className="h-[60px] border-b border-zinc-100 dark:border-zinc-800 flex items-start justify-end pr-2 pt-1">
                                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                                    {hour.toString().padStart(2, '0')}:00
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* Day columns */}
                    {[1, 2, 3, 4, 5].map(day => (
                        <div key={day} className="relative border-r border-zinc-200 dark:border-zinc-700">
                            {/* Hour lines */}
                            {hours.map(hour => (
                                <div key={hour} className="h-[60px] border-b border-zinc-100 dark:border-zinc-800" />
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
                                        <div className="text-xs font-medium text-zinc-900 dark:text-zinc-100 truncate">
                                            {lesson.courseCode}
                                        </div>
                                        <div className="text-xs text-zinc-600 dark:text-zinc-400 truncate">
                                            {lesson.classCode}
                                        </div>
                                        {lesson.teacherName && (
                                            <div className="text-xs text-blue-600 dark:text-blue-400 truncate font-medium">
                                                {lesson.teacherName}
                                            </div>
                                        )}
                                        {height > 50 && (
                                            <>
                                                <div className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                                                    {formatTime(lesson.startTime)}-{formatTime(lesson.endTime)}
                                                </div>
                                                {lesson.roomNumber && (
                                                    <div className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
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
