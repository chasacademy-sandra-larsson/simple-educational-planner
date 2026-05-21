"use client";

import { useState, useEffect } from 'react';
import type { ProjectWithDetails, ProjectScheduleCalculation, ClassScheduleInfo, CourseScheduleCalculation } from '@/app/lib/api/types';
import { api } from '@/app/lib/api';

interface WeeklyScheduleProps {
    project: ProjectWithDetails;
}

type TermId = 'term1' | 'term2' | 'term3' | 'term4' | 'term5' | 'term6';

const WEEKDAYS = ['Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag'];

const TERM_LABELS: Record<TermId, string> = {
    term1: 'År 1 - HT',
    term2: 'År 1 - VT',
    term3: 'År 2 - HT',
    term4: 'År 2 - VT',
    term5: 'År 3 - HT',
    term6: 'År 3 - VT',
};

export default function WeeklySchedule({ project }: WeeklyScheduleProps) {
    const [scheduleData, setScheduleData] = useState<ProjectScheduleCalculation | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedClassId, setSelectedClassId] = useState<string>('');
    const [selectedTerm, setSelectedTerm] = useState<TermId>('term1');

    // Load schedule calculation
    useEffect(() => {
        const loadSchedule = async () => {
            try {
                setLoading(true);
                const data = await api.schedule.calculateForProject(project.id);
                setScheduleData(data);

                // Select first class by default
                if (data.classes.length > 0 && !selectedClassId) {
                    setSelectedClassId(data.classes[0].classId);
                }
            } catch (err) {
                console.error('Failed to load schedule:', err);
                setError('Kunde inte ladda schema');
            } finally {
                setLoading(false);
            }
        };

        loadSchedule();
    }, [project.id]);

    // Get selected class schedule
    const selectedClass = scheduleData?.classes.find(c => c.classId === selectedClassId);

    // Filter courses by specific term (only courses that run during the selected term)
    const getCoursesForTerm = (courses: CourseScheduleCalculation[], term: TermId): CourseScheduleCalculation[] => {
        return courses.filter(c => c.terms.includes(term));
    };

    // Format minutes as hours and minutes
    const formatDuration = (minutes: number): string => {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        if (hours === 0) return `${mins} min`;
        if (mins === 0) return `${hours} tim`;
        return `${hours} tim ${mins} min`;
    };

    // Generate time slots for the schedule grid
    const generateTimeSlots = (): string[] => {
        const start = project.earliestLessonStart ? parseInt(project.earliestLessonStart.split(':')[0]) : 8;
        const end = project.latestLessonEnd ? parseInt(project.latestLessonEnd.split(':')[0]) : 17;
        const slots: string[] = [];
        for (let hour = start; hour <= end; hour++) {
            slots.push(`${hour.toString().padStart(2, '0')}:00`);
        }
        return slots;
    };

    if (loading) {
        return (
            <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-700 p-6">
                <div className="animate-pulse space-y-4">
                    <div className="h-6 bg-zinc-200 dark:bg-zinc-700 rounded w-1/3"></div>
                    <div className="h-64 bg-zinc-200 dark:bg-zinc-700 rounded"></div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-700 p-6">
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-800 dark:text-red-200">
                    {error}
                </div>
            </div>
        );
    }

    if (!scheduleData || scheduleData.classes.length === 0) {
        return (
            <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-700 p-6">
                <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Schema</h2>
                <div className="text-center py-8 text-zinc-500 dark:text-zinc-400">
                    <p>Inga klasser eller kurser har lagts till ännu.</p>
                    <p className="text-sm mt-2">Lägg till klasser och kurser för att se schemaberäkningen.</p>
                </div>
            </div>
        );
    }

    const coursesForTerm = selectedClass ? getCoursesForTerm(selectedClass.courses, selectedTerm) : [];
    const totalMinutesForTerm = coursesForTerm.reduce((sum, c) => sum + c.minutesPerWeek, 0);
    const timeSlots = generateTimeSlots();

    return (
        <div className="space-y-6">
            {/* Missing term dates warning */}
            {scheduleData.missingTermDates.length > 0 && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                    <h3 className="font-medium text-amber-800 dark:text-amber-200 mb-2">
                        Terminstider saknas
                    </h3>
                    <p className="text-sm text-amber-700 dark:text-amber-300 mb-2">
                        För att beräkna minuter per vecka behöver följande terminstider läggas till under Inställningar:
                    </p>
                    <ul className="list-disc list-inside text-sm text-amber-700 dark:text-amber-300">
                        {scheduleData.missingTermDates.map(({ year, academicYear }) => (
                            <li key={`${academicYear}-${year}`}>
                                År {year} ({academicYear})
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Schedule Controls */}
            <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-700 p-6">
                <div className="flex flex-wrap items-center gap-4 mb-6">
                    <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                            Klass
                        </label>
                        <select
                            value={selectedClassId}
                            onChange={(e) => setSelectedClassId(e.target.value)}
                            className="px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100"
                        >
                            {scheduleData.classes.map(cls => (
                                <option key={cls.classId} value={cls.classId}>
                                    {cls.classCode} - {cls.programName}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                            Termin
                        </label>
                        <select
                            value={selectedTerm}
                            onChange={(e) => setSelectedTerm(e.target.value as TermId)}
                            className="px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100"
                        >
                            {(Object.keys(TERM_LABELS) as TermId[]).map(term => (
                                <option key={term} value={term}>
                                    {TERM_LABELS[term]}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Summary Stats */}
                {selectedClass && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                            <p className="text-sm text-blue-700 dark:text-blue-300">Kurser denna termin</p>
                            <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                                {coursesForTerm.length}
                            </p>
                        </div>
                        <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                            <p className="text-sm text-purple-700 dark:text-purple-300">Minuter per vecka</p>
                            <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                                {totalMinutesForTerm}
                            </p>
                        </div>
                        <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                            <p className="text-sm text-green-700 dark:text-green-300">Timmar per vecka</p>
                            <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                                {formatDuration(totalMinutesForTerm)}
                            </p>
                        </div>
                        <div className="p-4 bg-zinc-100 dark:bg-zinc-700 rounded-lg">
                            <p className="text-sm text-zinc-600 dark:text-zinc-400">Lektionslängd</p>
                            <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                                {scheduleData.defaultLessonDuration} min
                            </p>
                        </div>
                    </div>
                )}

                {/* Courses List */}
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
                    Kursfördelning - {TERM_LABELS[selectedTerm]}
                </h3>

                {coursesForTerm.length === 0 ? (
                    <p className="text-zinc-500 dark:text-zinc-400 text-center py-4">
                        Inga kurser denna termin
                    </p>
                ) : (
                    <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg">
                        <table className="min-w-full divide-y divide-zinc-300 dark:divide-zinc-700">
                            <thead className="bg-zinc-50 dark:bg-zinc-900">
                                <tr>
                                    <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-zinc-900 dark:text-zinc-100 sm:pl-6">
                                        Kurs
                                    </th>
                                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                                        Poäng
                                    </th>
                                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                                        Terminer
                                    </th>
                                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                                        Veckor
                                    </th>
                                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                                        Min/vecka
                                    </th>
                                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                                        Lektioner/vecka
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700 bg-white dark:bg-zinc-800">
                                {coursesForTerm.map((course) => (
                                    <tr key={course.courseCode}>
                                        <td className="py-4 pl-4 pr-3 text-sm sm:pl-6">
                                            <div className="font-medium text-zinc-900 dark:text-zinc-100">{course.courseName}</div>
                                            <div className="text-zinc-500 dark:text-zinc-400">{course.courseCode}</div>
                                        </td>
                                        <td className="px-3 py-4 text-sm text-zinc-700 dark:text-zinc-300">
                                            {course.points}p
                                        </td>
                                        <td className="px-3 py-4 text-sm text-zinc-700 dark:text-zinc-300">
                                            <div className="flex flex-wrap gap-1">
                                                {course.terms.map(term => (
                                                    <span
                                                        key={term}
                                                        className={`px-2 py-0.5 text-xs rounded ${
                                                            ['term1', 'term3', 'term5'].includes(term)
                                                                ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                                                                : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                                                        }`}
                                                    >
                                                        {term.replace('term', 'T')}
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-3 py-4 text-sm text-zinc-700 dark:text-zinc-300">
                                            {course.totalWeeks > 0 ? course.totalWeeks : '-'}
                                        </td>
                                        <td className="px-3 py-4 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                                            {course.minutesPerWeek > 0 ? course.minutesPerWeek : '-'}
                                        </td>
                                        <td className="px-3 py-4 text-sm text-zinc-700 dark:text-zinc-300">
                                            {course.lessonsPerWeek > 0 ? course.lessonsPerWeek : '-'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="bg-zinc-50 dark:bg-zinc-900">
                                <tr>
                                    <td className="py-3.5 pl-4 pr-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100 sm:pl-6">
                                        Totalt
                                    </td>
                                    <td className="px-3 py-3.5 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                                        {coursesForTerm.reduce((sum, c) => sum + c.points, 0)}p
                                    </td>
                                    <td className="px-3 py-3.5 text-sm text-zinc-700 dark:text-zinc-300"></td>
                                    <td className="px-3 py-3.5 text-sm text-zinc-700 dark:text-zinc-300"></td>
                                    <td className="px-3 py-3.5 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                                        {totalMinutesForTerm} min
                                    </td>
                                    <td className="px-3 py-3.5 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                                        {coursesForTerm.reduce((sum, c) => sum + c.lessonsPerWeek, 0).toFixed(1)}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                )}
            </div>

            {/* Weekly Schedule Grid */}
            <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-700 p-6">
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
                    Veckoschema (mall)
                </h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
                    Detta är en översikt över tillgängliga tider. Faktisk schemaläggning kommer i nästa version.
                </p>

                <div className="overflow-x-auto">
                    <div className="min-w-[800px]">
                        {/* Header */}
                        <div className="grid grid-cols-6 gap-1 mb-1">
                            <div className="p-2 bg-zinc-100 dark:bg-zinc-700 rounded font-medium text-zinc-600 dark:text-zinc-400 text-sm">
                                Tid
                            </div>
                            {WEEKDAYS.map(day => (
                                <div key={day} className="p-2 bg-zinc-100 dark:bg-zinc-700 rounded font-medium text-zinc-900 dark:text-zinc-100 text-center text-sm">
                                    {day}
                                </div>
                            ))}
                        </div>

                        {/* Time slots */}
                        {timeSlots.map((time, index) => (
                            <div key={time} className="grid grid-cols-6 gap-1 mb-1">
                                <div className="p-2 bg-zinc-50 dark:bg-zinc-900 rounded text-zinc-600 dark:text-zinc-400 text-sm">
                                    {time}
                                </div>
                                {WEEKDAYS.map(day => {
                                    // Check if this is lunch time
                                    const hour = parseInt(time.split(':')[0]);
                                    const earliestLunch = project.earliestLunchTime ? parseInt(project.earliestLunchTime.split(':')[0]) : 11;
                                    const latestLunch = project.latestLunchTime ? parseInt(project.latestLunchTime.split(':')[0]) : 13;
                                    const isLunchTime = hour >= earliestLunch && hour < latestLunch;

                                    return (
                                        <div
                                            key={`${time}-${day}`}
                                            className={`p-2 rounded text-sm text-center ${
                                                isLunchTime
                                                    ? 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400 border border-dashed border-yellow-300 dark:border-yellow-700'
                                                    : 'bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer'
                                            }`}
                                        >
                                            {isLunchTime ? 'Lunch' : ''}
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
