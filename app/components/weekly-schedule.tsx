"use client";

import { useState, useEffect } from 'react';
import type { ProjectWithDetails, ProjectScheduleCalculation, ClassScheduleInfo, CourseScheduleCalculation } from '@/app/lib/api/types';
import { api } from '@/app/lib/api';
import { Skeleton } from '@/components/ui/skeleton';

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
            <div className="rounded-xl border bg-card p-6 space-y-4">
                <Skeleton className="h-6 w-1/3" />
                <Skeleton className="h-64 w-full" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-card rounded-xl shadow-sm border border-border p-6">
                <div className="p-4 bg-destructive/10 border border-destructive rounded-lg text-destructive">
                    {error}
                </div>
            </div>
        );
    }

    if (!scheduleData || scheduleData.classes.length === 0) {
        return (
            <div className="bg-card rounded-xl shadow-sm border border-border p-6">
                <h2 className="text-xl font-semibold text-foreground mb-4">Schema</h2>
                <div className="text-center py-8 text-muted-foreground">
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
                <div className="bg-accent border border-border rounded-lg p-4">
                    <h3 className="font-medium text-accent-foreground mb-2">
                        Terminstider saknas
                    </h3>
                    <p className="text-sm text-accent-foreground mb-2">
                        För att beräkna minuter per vecka behöver följande terminstider läggas till under Inställningar:
                    </p>
                    <ul className="list-disc list-inside text-sm text-accent-foreground">
                        {scheduleData.missingTermDates.map(({ year, academicYear }) => (
                            <li key={`${academicYear}-${year}`}>
                                År {year} ({academicYear})
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Schedule Controls */}
            <div className="bg-card rounded-xl shadow-sm border border-border p-6">
                <div className="flex flex-wrap items-center gap-4 mb-6">
                    <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-1">
                            Klass
                        </label>
                        <select
                            value={selectedClassId}
                            onChange={(e) => setSelectedClassId(e.target.value)}
                            className="px-3 py-2 border border-border rounded-lg bg-card text-foreground"
                        >
                            {scheduleData.classes.map(cls => (
                                <option key={cls.classId} value={cls.classId}>
                                    {cls.classCode} - {cls.programName}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-1">
                            Termin
                        </label>
                        <select
                            value={selectedTerm}
                            onChange={(e) => setSelectedTerm(e.target.value as TermId)}
                            className="px-3 py-2 border border-border rounded-lg bg-card text-foreground"
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
                        <div className="p-4 bg-accent rounded-lg">
                            <p className="text-sm text-primary">Kurser denna termin</p>
                            <p className="text-2xl font-bold text-foreground">
                                {coursesForTerm.length}
                            </p>
                        </div>
                        <div className="p-4 bg-muted rounded-lg">
                            <p className="text-sm text-accent-foreground">Minuter per vecka</p>
                            <p className="text-2xl font-bold text-foreground">
                                {totalMinutesForTerm}
                            </p>
                        </div>
                        <div className="p-4 bg-primary/10 rounded-lg">
                            <p className="text-sm text-primary">Timmar per vecka</p>
                            <p className="text-2xl font-bold text-foreground">
                                {formatDuration(totalMinutesForTerm)}
                            </p>
                        </div>
                        <div className="p-4 bg-muted rounded-lg">
                            <p className="text-sm text-muted-foreground">Lektionslängd</p>
                            <p className="text-2xl font-bold text-foreground">
                                {scheduleData.defaultLessonDuration} min
                            </p>
                        </div>
                    </div>
                )}

                {/* Courses List */}
                <h3 className="text-lg font-semibold text-foreground mb-4">
                    Kursfördelning - {TERM_LABELS[selectedTerm]}
                </h3>

                {coursesForTerm.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">
                        Inga kurser denna termin
                    </p>
                ) : (
                    <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg">
                        <table className="min-w-full divide-y divide-border">
                            <thead className="bg-muted">
                                <tr>
                                    <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-foreground sm:pl-6">
                                        Kurs
                                    </th>
                                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-foreground">
                                        Poäng
                                    </th>
                                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-foreground">
                                        Terminer
                                    </th>
                                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-foreground">
                                        Veckor
                                    </th>
                                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-foreground">
                                        Min/vecka
                                    </th>
                                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-foreground">
                                        Lektioner/vecka
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border bg-card">
                                {coursesForTerm.map((course) => (
                                    <tr key={course.courseCode}>
                                        <td className="py-4 pl-4 pr-3 text-sm sm:pl-6">
                                            <div className="font-medium text-foreground">{course.courseName}</div>
                                            <div className="text-muted-foreground">{course.courseCode}</div>
                                        </td>
                                        <td className="px-3 py-4 text-sm text-muted-foreground">
                                            {course.points}p
                                        </td>
                                        <td className="px-3 py-4 text-sm text-muted-foreground">
                                            <div className="flex flex-wrap gap-1">
                                                {course.terms.map(term => (
                                                    <span
                                                        key={term}
                                                        className={`px-2 py-0.5 text-xs rounded ${
                                                            ['term1', 'term3', 'term5'].includes(term)
                                                                ? 'bg-accent text-accent-foreground'
                                                                : 'bg-primary/10 text-primary'
                                                        }`}
                                                    >
                                                        {term.replace('term', 'T')}
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-3 py-4 text-sm text-muted-foreground">
                                            {course.totalWeeks > 0 ? course.totalWeeks : '-'}
                                        </td>
                                        <td className="px-3 py-4 text-sm font-medium text-foreground">
                                            {course.minutesPerWeek > 0 ? course.minutesPerWeek : '-'}
                                        </td>
                                        <td className="px-3 py-4 text-sm text-muted-foreground">
                                            {course.lessonsPerWeek > 0 ? course.lessonsPerWeek : '-'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="bg-muted">
                                <tr>
                                    <td className="py-3.5 pl-4 pr-3 text-sm font-semibold text-foreground sm:pl-6">
                                        Totalt
                                    </td>
                                    <td className="px-3 py-3.5 text-sm font-semibold text-foreground">
                                        {coursesForTerm.reduce((sum, c) => sum + c.points, 0)}p
                                    </td>
                                    <td className="px-3 py-3.5 text-sm text-muted-foreground"></td>
                                    <td className="px-3 py-3.5 text-sm text-muted-foreground"></td>
                                    <td className="px-3 py-3.5 text-sm font-semibold text-foreground">
                                        {totalMinutesForTerm} min
                                    </td>
                                    <td className="px-3 py-3.5 text-sm font-semibold text-foreground">
                                        {coursesForTerm.reduce((sum, c) => sum + c.lessonsPerWeek, 0).toFixed(1)}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                )}
            </div>

            {/* Weekly Schedule Grid */}
            <div className="bg-card rounded-xl shadow-sm border border-border p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">
                    Veckoschema (mall)
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                    Detta är en översikt över tillgängliga tider. Faktisk schemaläggning kommer i nästa version.
                </p>

                <div className="overflow-x-auto">
                    <div className="min-w-[800px]">
                        {/* Header */}
                        <div className="grid grid-cols-6 gap-1 mb-1">
                            <div className="p-2 bg-muted rounded font-medium text-muted-foreground text-sm">
                                Tid
                            </div>
                            {WEEKDAYS.map(day => (
                                <div key={day} className="p-2 bg-muted rounded font-medium text-foreground text-center text-sm">
                                    {day}
                                </div>
                            ))}
                        </div>

                        {/* Time slots */}
                        {timeSlots.map((time, index) => (
                            <div key={time} className="grid grid-cols-6 gap-1 mb-1">
                                <div className="p-2 bg-muted rounded text-muted-foreground text-sm">
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
                                                    ? 'bg-accent text-accent-foreground border border-dashed border-border'
                                                    : 'bg-card border border-border hover:bg-accent cursor-pointer'
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
