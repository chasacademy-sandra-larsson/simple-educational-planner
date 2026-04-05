"use client";

import { useState, useEffect, useCallback } from 'react';
import { api, ApiError } from '@/app/lib/api';
import type { CreateTeacherRequest } from '@/app/lib/api/types';
import { useProject } from '../ProjectContext';

// Helper: extract subject from course code/name
function extractSubject(courseCode: string, courseName: string): string {
    const codeToSubject: Record<string, string> = {
        'MAT': 'Matematik', 'SVE': 'Svenska', 'ENG': 'Engelska',
        'FYS': 'Fysik', 'KEM': 'Kemi', 'BIO': 'Biologi',
        'HIS': 'Historia', 'SAM': 'Samhällskunskap', 'GEO': 'Geografi',
        'REL': 'Religion', 'IDH': 'Idrott', 'TEK': 'Teknik',
        'SPR': 'Modern språk', 'GYM': 'Gymnasiearbete',
        'PRR': 'Programmering', 'PSY': 'Psykologi', 'FIL': 'Filosofi',
        'NAK': 'Naturkunskap', 'MOD': 'Moderna språk', 'EXA': 'Gymnasiearbete',
        'IND': 'Individuellt val',
    };

    if (courseCode) {
        const codeMatch = courseCode.match(/^([A-Z]{2,3})/);
        if (codeMatch && codeToSubject[codeMatch[1]]) {
            return codeToSubject[codeMatch[1]];
        }
    }

    if (courseName) {
        const patterns: Array<[RegExp, string]> = [
            [/^Matematik/i, 'Matematik'], [/^Svenska/i, 'Svenska'], [/^Engelska/i, 'Engelska'],
            [/^Fysik/i, 'Fysik'], [/^Kemi/i, 'Kemi'], [/^Biologi/i, 'Biologi'],
            [/^Historia/i, 'Historia'], [/^Samhällskunskap/i, 'Samhällskunskap'],
            [/^Geografi/i, 'Geografi'], [/^Religion/i, 'Religion'], [/^Idrott/i, 'Idrott'],
            [/^Gymnasiearbete/i, 'Gymnasiearbete'], [/^Teknik/i, 'Teknik'],
            [/^Programmering/i, 'Programmering'], [/^Psykologi/i, 'Psykologi'],
            [/^Filosofi/i, 'Filosofi'], [/^Moderna språk/i, 'Moderna språk'],
            [/^Naturkunskap/i, 'Naturkunskap'], [/^Individuellt val/i, 'Individuellt val'],
            [/^Naturvetenskaplig/i, 'Naturkunskap'],
        ];

        for (const [pattern, subject] of patterns) {
            if (pattern.test(courseName)) return subject;
        }

        const cleanName = courseName.replace(/\s*\d+[a-z]?\s*$/, '').replace(/\s+\(.*?\)$/, '').trim();
        return cleanName;
    }

    return courseCode || 'Okänt ämne';
}

function formatAcademicYear(startYear: number, year: number): string {
    const academicStartYear = startYear + (year - 1);
    return `${academicStartYear}/${academicStartYear + 1}`;
}

interface TeacherAssignment {
    id: string;
    teacherId?: string;
    name: string;
    capacity: number;
    courses: string[];
}

interface CourseForYear {
    id: string;
    code: string;
    name: string;
    year: number;
    classStartYear: number;
    points: number;
    teacherId?: string | null;
    teacherName?: string | null;
}

export default function TeachersPage() {
    const { projectId, project, teachers, fetchTeachers } = useProject();

    const [teacherCapacity, setTeacherCapacity] = useState(600);
    const [showTeacherForm, setShowTeacherForm] = useState(false);
    const [newTeacher, setNewTeacher] = useState<CreateTeacherRequest>({ name: '', email: '', subject: '', notes: '' });
    const [creatingTeacher, setCreatingTeacher] = useState(false);
    const [teacherError, setTeacherError] = useState('');
    const [existingDistributions, setExistingDistributions] = useState<Record<string, { count: number; totalPoints: number }>>({});
    const [assignmentViewAcademicYear, setAssignmentViewAcademicYear] = useState<string | null>(null);
    const [teacherAssignments, setTeacherAssignments] = useState<TeacherAssignment[]>([]);

    const fetchServiceDistributions = useCallback(async () => {
        try {
            const distributions = await api.serviceDistributions.getAll(projectId);
            const byYear: Record<string, { count: number; totalPoints: number }> = {};
            for (const dist of distributions) {
                const existing = byYear[dist.academicYear] || { count: 0, totalPoints: 0 };
                byYear[dist.academicYear] = {
                    count: existing.count + 1,
                    totalPoints: existing.totalPoints + (dist.servicePoints || 0),
                };
            }
            setExistingDistributions(byYear);
        } catch (err) {
            console.error('Failed to fetch service distributions:', err);
        }
    }, [projectId]);

    useEffect(() => {
        fetchServiceDistributions();
    }, [fetchServiceDistributions]);

    if (!project) return null;

    const handleCreateTeacher = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreatingTeacher(true);
        setTeacherError('');
        try {
            await api.teachers.create(projectId, newTeacher);
            setShowTeacherForm(false);
            setNewTeacher({ name: '', email: '', subject: '', notes: '' });
            await fetchTeachers();
        } catch (err) {
            if (err instanceof ApiError) setTeacherError(err.message);
            else setTeacherError('Failed to create teacher');
        } finally {
            setCreatingTeacher(false);
        }
    };

    // Build course data grouped by academic year and subject
    const coursesByAcademicYear = new Map<string, Map<string, CourseForYear[]>>();

    project.classes?.forEach(cls => {
        if (cls.curriculum?.courses && Array.isArray(cls.curriculum.courses)) {
            cls.curriculum.courses.forEach(course => {
                const academicYear = formatAcademicYear(cls.startYear, course.year);
                const subject = extractSubject(course.courseCode, course.courseName);

                if (!coursesByAcademicYear.has(academicYear)) {
                    coursesByAcademicYear.set(academicYear, new Map());
                }
                const subjectsMap = coursesByAcademicYear.get(academicYear)!;
                if (!subjectsMap.has(subject)) {
                    subjectsMap.set(subject, []);
                }
                const coursesList = subjectsMap.get(subject)!;
                if (!coursesList.some(c => c.code === course.courseCode)) {
                    coursesList.push({
                        id: course.id || '',
                        code: course.courseCode,
                        name: course.courseName,
                        year: course.year,
                        classStartYear: cls.startYear,
                        points: course.points || 0,
                        teacherId: course.teacherId,
                        teacherName: course.teacherName,
                    });
                }
            });
        }
    });

    // Calculate points per academic year
    const pointsByAcademicYear = new Map<string, number>();
    project.classes?.forEach(cls => {
        if (cls.curriculum?.courses && Array.isArray(cls.curriculum.courses)) {
            cls.curriculum.courses.forEach(course => {
                const academicYear = formatAcademicYear(cls.startYear, course.year);
                pointsByAcademicYear.set(academicYear, (pointsByAcademicYear.get(academicYear) || 0) + (course.points || 0));
            });
        }
    });

    const totalPoints = Array.from(pointsByAcademicYear.values()).reduce((sum, p) => sum + p, 0);
    const sortedAcademicYears = Array.from(coursesByAcademicYear.keys()).sort((a, b) => parseInt(a) - parseInt(b));

    // Helper: load teacher assignments for a specific academic year
    const loadAssignmentsForYear = async (academicYear: string) => {
        try {
            const distributions = await api.serviceDistributions.getAll(projectId, academicYear);
            const coursesWithTeachers: Array<{ code: string; teacherId?: string | null }> = [];
            project.classes?.forEach(cls => {
                if (cls.curriculum?.courses) {
                    cls.curriculum.courses.forEach(course => {
                        const courseAcademicYear = formatAcademicYear(cls.startYear, course.year);
                        if (courseAcademicYear === academicYear && course.teacherId) {
                            coursesWithTeachers.push({ code: course.courseCode, teacherId: course.teacherId });
                        }
                    });
                }
            });

            const assignments = teachers.map(teacher => {
                const distribution = distributions.find(d => d.teacherId === teacher.id);
                const teacherCourses = [...new Set(
                    coursesWithTeachers.filter(c => c.teacherId === teacher.id).map(c => c.code)
                )];
                return {
                    id: distribution?.id || `temp-${teacher.id}`,
                    teacherId: teacher.id,
                    name: teacher.name,
                    capacity: distribution?.servicePoints || teacherCapacity,
                    courses: teacherCourses,
                };
            });
            setTeacherAssignments(assignments);
            setAssignmentViewAcademicYear(academicYear);
        } catch (err) {
            console.error('Failed to load distributions:', err);
        }
    };

    // Get all courses for the current assignment view year
    const getAllCoursesForYear = (academicYear: string): CourseForYear[] => {
        const subjectsMap = coursesByAcademicYear.get(academicYear);
        if (!subjectsMap) return [];
        const allCoursesMap = new Map<string, CourseForYear>();
        subjectsMap.forEach(courses => {
            courses.forEach(c => {
                if (!allCoursesMap.has(c.code)) allCoursesMap.set(c.code, c);
            });
        });
        return Array.from(allCoursesMap.values()).sort((a, b) => a.name.localeCompare(b.name, 'sv'));
    };

    return (
        <div>
            {/* Teacher Capacity Settings */}
            <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
                    Tjänstegrad och lärarebehov
                </h3>

                <div className="mb-4">
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                        Tjänstegrad (genomsnittspoäng per lärare / per år)
                    </label>
                    <select
                        value={teacherCapacity}
                        onChange={(e) => setTeacherCapacity(Number(e.target.value))}
                        className="w-full max-w-xs px-3 py-2 rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100"
                    >
                        {[400, 450, 500, 550, 600, 650, 700, 750, 800].map(v => (
                            <option key={v} value={v}>{v} p/år</option>
                        ))}
                    </select>
                </div>

                {/* Summary */}
                <div className="p-4 bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 mb-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <div className="text-sm text-zinc-600 dark:text-zinc-400">Totala poäng</div>
                            <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                                {totalPoints.toLocaleString('sv-SE')}
                            </div>
                        </div>
                        <div>
                            <div className="text-sm text-zinc-600 dark:text-zinc-400">Tjänstegrad</div>
                            <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                                {teacherCapacity} p/år
                            </div>
                        </div>
                    </div>
                </div>

                {/* Assignment view */}
                {assignmentViewAcademicYear && sortedAcademicYears.includes(assignmentViewAcademicYear) ? (
                    <AssignmentView
                        academicYear={assignmentViewAcademicYear}
                        allCoursesForYear={getAllCoursesForYear(assignmentViewAcademicYear)}
                        teacherAssignments={teacherAssignments}
                        setTeacherAssignments={setTeacherAssignments}
                        teacherCapacity={teacherCapacity}
                        projectId={projectId}
                        project={project}
                        teachers={teachers}
                        onBack={() => { setAssignmentViewAcademicYear(null); setTeacherAssignments([]); }}
                    />
                ) : sortedAcademicYears.length > 0 ? (
                    <div className="space-y-6">
                        <h4 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                            Ämnen som behöver anställas per läsår:
                        </h4>
                        {sortedAcademicYears.map(academicYear => {
                            const subjectsMap = coursesByAcademicYear.get(academicYear)!;
                            const subjects = Array.from(subjectsMap.entries())
                                .map(([subject, courses]) => ({
                                    subject,
                                    courses,
                                    totalPoints: courses.reduce((sum, c) => sum + c.points, 0),
                                    courseCount: courses.length,
                                }))
                                .sort((a, b) => b.totalPoints - a.totalPoints);

                            const yearPoints = pointsByAcademicYear.get(academicYear) || 0;
                            const teachersNeeded = teacherCapacity > 0 ? Math.ceil(yearPoints / teacherCapacity) : 0;

                            return (
                                <div key={academicYear} className="p-5 bg-white dark:bg-zinc-800 rounded-lg border-2 border-zinc-200 dark:border-zinc-700 shadow-sm">
                                    <div className="mb-4 pb-3 border-b-2 border-zinc-300 dark:border-zinc-600">
                                        <div className="flex items-center justify-between">
                                            <h5 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Läsår {academicYear}</h5>
                                            {existingDistributions[academicYear] && (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-medium rounded-full">
                                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                                    Tjänstefördelning
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                                            {subjects.reduce((sum, s) => sum + s.courseCount, 0)} kurser över {subjects.length} ämnen
                                        </div>
                                    </div>

                                    <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
                                        <div className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                                            Lärare som behöver för läsår {academicYear}
                                        </div>
                                        <div className="text-xl font-bold text-blue-600 dark:text-blue-400">{teachersNeeded} lärare</div>
                                        <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">{yearPoints.toLocaleString('sv-SE')} poäng</div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {subjects.map(({ subject, courses, totalPoints: subjectPoints, courseCount }) => (
                                            <div key={subject} className="p-3 bg-zinc-50 dark:bg-zinc-700/50 rounded border border-zinc-200 dark:border-zinc-600">
                                                <div className="font-semibold text-zinc-900 dark:text-zinc-100 mb-2">{subject}</div>
                                                <div className="text-xs text-zinc-600 dark:text-zinc-400 mb-2">
                                                    {subjectPoints} poäng &bull; {courseCount} kurs{courseCount !== 1 ? 'er' : ''}
                                                </div>
                                                <ul className="text-xs text-zinc-600 dark:text-zinc-400 space-y-1">
                                                    {courses.map(course => (
                                                        <li key={`${course.code}-${course.year}-${course.classStartYear}`} className="truncate">
                                                            &bull; {course.name}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Service distribution button */}
                                    <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-600">
                                        {existingDistributions[academicYear] ? (
                                            <div className="space-y-3">
                                                <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                                                    <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                                        <span className="font-medium">Tjänstefördelning skapad</span>
                                                    </div>
                                                    <div className="text-sm text-green-600 dark:text-green-500 mt-1">
                                                        {existingDistributions[academicYear]?.count} lärare tilldelade
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => loadAssignmentsForYear(academicYear)}
                                                    className="w-full p-3 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-zinc-700 dark:text-zinc-200 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                                                >
                                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                    </svg>
                                                    Visa tjänstefördelning {academicYear}
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={async () => {
                                                    try {
                                                        if (teachers.length === 0) {
                                                            alert('Du måste skapa lärare först innan du kan skapa tjänstefördelning.');
                                                            return;
                                                        }
                                                        await api.serviceDistributions.createForAllTeachers(projectId, academicYear, teacherCapacity);
                                                        await fetchServiceDistributions();
                                                        await loadAssignmentsForYear(academicYear);
                                                    } catch (err: any) {
                                                        const msg = err instanceof ApiError ? err.message : err?.message || 'Okänt fel';
                                                        alert(`Kunde inte skapa tjänstefördelning: ${msg}`);
                                                    }
                                                }}
                                                className="w-full p-3 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                                            >
                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                                </svg>
                                                Skapa tjänstefördelning {academicYear}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : totalPoints === 0 ? (
                    <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded text-sm text-yellow-800 dark:text-yellow-200">
                        Inga kurser planerade ännu. Planera kurser för klasserna för att se lärarebehovet.
                    </div>
                ) : null}
            </div>

            {/* Create Teacher Form */}
            <div className="mb-6">
                {!showTeacherForm ? (
                    <button
                        onClick={() => setShowTeacherForm(true)}
                        className="w-full p-4 bg-zinc-50 dark:bg-zinc-700/50 rounded-lg border-2 border-dashed border-zinc-300 dark:border-zinc-600 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all group"
                    >
                        <div className="flex items-center justify-center gap-2 text-zinc-600 dark:text-zinc-400 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            <span className="font-medium">Lägg till lärare</span>
                        </div>
                    </button>
                ) : (
                    <div className="p-4 bg-zinc-50 dark:bg-zinc-700/50 rounded-lg border border-zinc-200 dark:border-zinc-600">
                        <div className="flex justify-between items-center mb-4">
                            <h4 className="font-semibold text-zinc-900 dark:text-zinc-100">Lägg till lärare</h4>
                            <button
                                onClick={() => { setShowTeacherForm(false); setNewTeacher({ name: '', email: '', subject: '', notes: '' }); setTeacherError(''); }}
                                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        {teacherError && (
                            <div className="mb-3 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm text-red-800 dark:text-red-200">{teacherError}</div>
                        )}
                        <form onSubmit={handleCreateTeacher} className="space-y-3">
                            <div>
                                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Namn *</label>
                                <input type="text" value={newTeacher.name} onChange={(e) => setNewTeacher({ ...newTeacher, name: e.target.value })} required className="w-full px-3 py-2 rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100" placeholder="Lärarens namn" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">E-post</label>
                                    <input type="email" value={newTeacher.email} onChange={(e) => setNewTeacher({ ...newTeacher, email: e.target.value })} className="w-full px-3 py-2 rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100" placeholder="email@example.com" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Ämne</label>
                                    <input type="text" value={newTeacher.subject} onChange={(e) => setNewTeacher({ ...newTeacher, subject: e.target.value })} className="w-full px-3 py-2 rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100" placeholder="t.ex. Matematik" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Anteckningar</label>
                                <textarea value={newTeacher.notes} onChange={(e) => setNewTeacher({ ...newTeacher, notes: e.target.value })} rows={2} className="w-full px-3 py-2 rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 resize-none" placeholder="Ytterligare information..." />
                            </div>
                            <div className="flex gap-2 pt-2">
                                <button type="button" onClick={() => { setShowTeacherForm(false); setNewTeacher({ name: '', email: '', subject: '', notes: '' }); setTeacherError(''); }} className="px-4 py-2 border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 rounded hover:bg-zinc-50 dark:hover:bg-zinc-700">Avbryt</button>
                                <button type="submit" disabled={creatingTeacher} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded">{creatingTeacher ? 'Lägger till...' : 'Lägg till lärare'}</button>
                            </div>
                        </form>
                    </div>
                )}
            </div>

            {/* Teachers List */}
            {teachers.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {teachers.map(teacher => (
                        <div key={teacher.id} className="p-4 bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:border-blue-300 dark:hover:border-blue-600 transition-colors">
                            <div className="font-medium text-zinc-900 dark:text-zinc-100">{teacher.name}</div>
                            {teacher.email && <div className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">{teacher.email}</div>}
                            {teacher.subject && <div className="text-sm text-blue-600 dark:text-blue-400 mt-1">{teacher.subject}</div>}
                            {teacher.notes && <div className="text-xs text-zinc-500 dark:text-zinc-500 mt-2">{teacher.notes}</div>}
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-12 text-zinc-500 dark:text-zinc-500">
                    Inga lärare tillagda ännu. Klicka på &quot;Lägg till lärare&quot; ovan för att börja.
                </div>
            )}
        </div>
    );
}

// Sub-component for the assignment view (when viewing a specific academic year's service distribution)
function AssignmentView({
    academicYear, allCoursesForYear, teacherAssignments, setTeacherAssignments,
    teacherCapacity, projectId, project, teachers, onBack,
}: {
    academicYear: string;
    allCoursesForYear: CourseForYear[];
    teacherAssignments: TeacherAssignment[];
    setTeacherAssignments: React.Dispatch<React.SetStateAction<TeacherAssignment[]>>;
    teacherCapacity: number;
    projectId: string;
    project: any;
    teachers: any[];
    onBack: () => void;
}) {
    const vacantCourses = allCoursesForYear.filter(c => !c.teacherId);
    const vacantPoints = vacantCourses.reduce((sum, c) => sum + c.points, 0);
    const totalPoints = allCoursesForYear.reduce((sum, c) => sum + c.points, 0);
    const assignedPoints = totalPoints - vacantPoints;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                    Tjänstefördelning för läsår {academicYear}
                </h4>
                <button onClick={onBack} className="px-4 py-2 text-sm border border-zinc-300 dark:border-zinc-600 rounded hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300">
                    Tillbaka
                </button>
            </div>

            {vacantCourses.length > 0 && (
                <div className="p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                    <div className="flex items-center gap-2 text-orange-700 dark:text-orange-400 font-medium mb-2">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        {vacantCourses.length} vakanta kurser ({vacantPoints} p)
                    </div>
                    <div className="text-sm text-orange-600 dark:text-orange-500">Dessa kurser saknar lärare:</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                        {vacantCourses.map(c => (
                            <span key={c.code} className="px-2 py-1 bg-orange-100 dark:bg-orange-900/40 text-orange-800 dark:text-orange-300 text-xs rounded">
                                {c.name} ({c.points}p)
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Progress bar */}
            <div className="p-4 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
                <div className="flex justify-between text-sm mb-2">
                    <span className="text-zinc-600 dark:text-zinc-400">Tilldelat: {assignedPoints}p / {totalPoints}p</span>
                    <span className={vacantPoints === 0 ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'}>
                        {vacantPoints === 0 ? 'Alla kurser tilldelade!' : `${vacantPoints}p kvar att tilldela`}
                    </span>
                </div>
                <div className="w-full bg-zinc-200 dark:bg-zinc-700 rounded-full h-2">
                    <div
                        className={`h-2 rounded-full ${vacantPoints === 0 ? 'bg-green-500' : 'bg-blue-500'}`}
                        style={{ width: `${totalPoints > 0 ? (assignedPoints / totalPoints) * 100 : 0}%` }}
                    />
                </div>
            </div>

            {/* Teacher assignments */}
            <div className="space-y-4">
                {teacherAssignments.map((assignment, index) => {
                    const assignedCoursesPoints = assignment.courses.reduce((sum, code) => {
                        const course = allCoursesForYear.find(c => c.code === code);
                        return sum + (course?.points || 0);
                    }, 0);
                    const pointsDifference = assignedCoursesPoints - assignment.capacity;

                    return (
                        <div key={assignment.id} className="p-4 bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700">
                            <div className="mb-3">
                                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Lärares namn</label>
                                <input
                                    type="text"
                                    value={assignment.name}
                                    onChange={(e) => setTeacherAssignments(prev => prev.map(a => a.id === assignment.id ? { ...a, name: e.target.value } : a))}
                                    className="w-full px-3 py-2 rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100"
                                    placeholder="Lärarens namn"
                                />
                            </div>

                            <div className="flex items-center justify-between mb-3">
                                <h5 className="font-semibold text-zinc-900 dark:text-zinc-100">Lärare {index + 1}</h5>
                                <button onClick={() => setTeacherAssignments(prev => prev.filter(a => a.id !== assignment.id))} className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </button>
                            </div>

                            {/* Points feedback */}
                            <div className={`mb-3 p-3 rounded-lg border-2 ${
                                pointsDifference === 0 ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700'
                                    : pointsDifference > 0 ? 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700'
                                        : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700'
                            }`}>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Tjänstegrad: {assignment.capacity} poäng</div>
                                        <div className="text-sm text-zinc-600 dark:text-zinc-400">Tilldelade kurser: {assignedCoursesPoints} poäng</div>
                                    </div>
                                    <div className={`text-lg font-bold ${
                                        pointsDifference === 0 ? 'text-green-600 dark:text-green-400'
                                            : pointsDifference > 0 ? 'text-red-600 dark:text-red-400'
                                                : 'text-yellow-600 dark:text-yellow-400'
                                    }`}>
                                        {pointsDifference === 0 ? 'Uppfyllt' : pointsDifference > 0 ? `+${pointsDifference} p för mycket` : `${Math.abs(pointsDifference)} p saknas`}
                                    </div>
                                </div>
                            </div>

                            {/* Course selection */}
                            <div>
                                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                                    Välj kurser för {assignment.name || 'läraren'}:
                                </label>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-60 overflow-y-auto p-2 border border-zinc-200 dark:border-zinc-700 rounded">
                                    {allCoursesForYear.map(course => {
                                        const isVacant = !course.teacherId;
                                        const assignedTeacher = course.teacherId && course.teacherId !== assignment.teacherId ? course.teacherName : null;
                                        return (
                                            <label key={course.code} className={`flex items-center space-x-2 p-2 hover:bg-zinc-50 dark:hover:bg-zinc-700/50 rounded cursor-pointer ${assignedTeacher ? 'opacity-60' : ''} ${isVacant ? 'bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800' : ''}`}>
                                                <input
                                                    type="checkbox"
                                                    checked={assignment.courses.includes(course.code)}
                                                    onChange={async (e) => {
                                                        const isChecked = e.target.checked;
                                                        const teacherId = assignment.teacherId || null;
                                                        setTeacherAssignments(prev => prev.map(a =>
                                                            a.id === assignment.id
                                                                ? { ...a, courses: isChecked ? [...a.courses, course.code] : a.courses.filter(c => c !== course.code) }
                                                                : a
                                                        ));
                                                        try {
                                                            if (course.id) {
                                                                await api.serviceDistributions.assignTeacherToCourse(projectId, course.id, isChecked ? teacherId : null);
                                                            }
                                                        } catch (err) {
                                                            console.error('Failed to save assignment:', err);
                                                            setTeacherAssignments(prev => prev.map(a =>
                                                                a.id === assignment.id
                                                                    ? { ...a, courses: isChecked ? a.courses.filter(c => c !== course.code) : [...a.courses, course.code] }
                                                                    : a
                                                            ));
                                                            alert('Kunde inte spara ändringen');
                                                        }
                                                    }}
                                                    className="rounded border-zinc-300 dark:border-zinc-600"
                                                />
                                                <span className="text-sm text-zinc-900 dark:text-zinc-100">
                                                    {course.name} ({course.points} p)
                                                    {isVacant && <span className="text-xs text-orange-600 dark:text-orange-400 ml-1 font-medium">[VAKANT]</span>}
                                                    {assignedTeacher && <span className="text-xs text-blue-600 dark:text-blue-400 ml-1">[{assignedTeacher}]</span>}
                                                </span>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Add teacher button */}
            <button
                onClick={() => setTeacherAssignments(prev => [...prev, { id: `temp-${Date.now()}`, name: '', capacity: teacherCapacity, courses: [] }])}
                className="w-full p-4 border-2 border-dashed border-zinc-300 dark:border-zinc-600 rounded-lg hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all flex items-center justify-center gap-2 text-zinc-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400"
            >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Lägg till lärare
            </button>

            {/* Save button */}
            {teacherAssignments.length > 0 && (
                <div className="pt-4 border-t border-zinc-200 dark:border-zinc-600">
                    <button
                        onClick={async () => {
                            try {
                                for (const assignment of teacherAssignments) {
                                    if (!assignment.teacherId || assignment.id.startsWith('temp-')) {
                                        const teacher = teachers.find(t => t.name === assignment.name);
                                        if (!teacher) { console.warn(`Teacher not found: ${assignment.name}`); continue; }
                                        assignment.teacherId = teacher.id;

                                        const distributions = await api.serviceDistributions.getAll(projectId, academicYear);
                                        let distribution = distributions.find(d => d.teacherId === teacher.id);
                                        if (!distribution) {
                                            const result = await api.serviceDistributions.createForAllTeachers(projectId, academicYear, assignment.capacity);
                                            distribution = result.distributions.find(d => d.teacherId === teacher.id);
                                        }
                                        if (!distribution) { console.error(`Could not create distribution for ${teacher.name}`); continue; }
                                        assignment.id = distribution.id;
                                    }

                                    const courseInstanceIds: string[] = [];
                                    project.classes?.forEach((cls: any) => {
                                        if (cls.curriculum?.courses) {
                                            cls.curriculum.courses.forEach((course: any) => {
                                                const courseAcademicYear = formatAcademicYear(cls.startYear, course.year);
                                                if (courseAcademicYear === academicYear && assignment.courses.includes(course.courseCode) && course.id) {
                                                    courseInstanceIds.push(course.id);
                                                }
                                            });
                                        }
                                    });

                                    await api.serviceDistributions.update(projectId, assignment.id, courseInstanceIds);
                                }
                                alert('Tjänstefördelning sparad!');
                                onBack();
                            } catch (err) {
                                console.error('Failed to save service distributions:', err);
                                alert('Kunde inte spara tjänstefördelning.');
                            }
                        }}
                        className="w-full p-3 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
                    >
                        Spara tjänstefördelning
                    </button>
                </div>
            )}
        </div>
    );
}
