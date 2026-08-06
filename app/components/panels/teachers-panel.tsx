"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, X, Upload } from 'lucide-react';
import { api, ApiError } from '@/app/lib/api';
import type { CreateTeacherRequest, ProjectWithDetails, Teacher } from '@/app/lib/api/types';
import { useProject } from '@/app/projects/[id]/ProjectContext';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

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

export default function TeachersPanel() {
    const { projectId, project, teachers, fetchTeachers } = useProject();

    const [teacherCapacity, setTeacherCapacity] = useState(600);
    const [showTeacherForm, setShowTeacherForm] = useState(false);
    const [newTeacher, setNewTeacher] = useState<CreateTeacherRequest>({ name: '', email: '', subject: '', notes: '' });
    const [creatingTeacher, setCreatingTeacher] = useState(false);
    const [teacherError, setTeacherError] = useState('');
    const [existingDistributions, setExistingDistributions] = useState<Record<string, { count: number; totalPoints: number }>>({});
    const [assignmentViewAcademicYear, setAssignmentViewAcademicYear] = useState<string | null>(null);
    const [teacherAssignments, setTeacherAssignments] = useState<TeacherAssignment[]>([]);
    const [importing, setImporting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // CSV-import (skördad ur wizardens TeachersStep): namn, e-post, ämnen (|-separerade), [tjänst-%]
    // Varje rad sparas direkt via API:t (inkrementell sparning).
    const handleCsvImport = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            setImporting(true);
            try {
                const text = e.target?.result as string;
                const lines = text.split('\n').filter(line => line.trim());
                if (lines.length < 2) {
                    toast.error('Filen måste innehålla minst en rad med data (utöver header)');
                    return;
                }

                let created = 0;
                const failures: string[] = [];
                for (let i = 1; i < lines.length; i++) {
                    const parts = lines[i].split(/[,;\t]/).map(p => p.trim());
                    const [name, email, subjectsStr] = parts;
                    if (!name) {
                        failures.push(`Rad ${i + 1}: namn saknas`);
                        continue;
                    }
                    const subject = (subjectsStr || '').split('|').map(s => s.trim()).filter(Boolean).join(', ');
                    try {
                        await api.teachers.create(projectId, { name, email: email || undefined, subject: subject || undefined });
                        created++;
                    } catch {
                        failures.push(`Rad ${i + 1}: kunde inte spara ${name}`);
                    }
                }

                await fetchTeachers();
                if (created > 0) toast.success(`${created} lärare importerade`);
                if (failures.length > 0) toast.warning(`${failures.length} rader hoppades över: ${failures.slice(0, 3).join('; ')}${failures.length > 3 ? ' …' : ''}`);
            } catch {
                toast.error('Kunde inte läsa filen. Kontrollera att formatet är korrekt.');
            } finally {
                setImporting(false);
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
        };
        reader.readAsText(file);
    };

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
            <div className="mb-6 p-4 bg-accent rounded-lg border border-primary">
                <h3 className="text-lg font-semibold text-foreground mb-4">
                    Tjänstegrad och lärarebehov
                </h3>

                <div className="mb-4">
                    <label className="block text-sm font-medium text-muted-foreground mb-2">
                        Tjänstegrad (genomsnittspoäng per lärare / per år)
                    </label>
                    <select
                        value={teacherCapacity}
                        onChange={(e) => setTeacherCapacity(Number(e.target.value))}
                        className="w-full max-w-xs px-3 py-2 rounded border border-border bg-background text-foreground"
                    >
                        {[400, 450, 500, 550, 600, 650, 700, 750, 800].map(v => (
                            <option key={v} value={v}>{v} p/år</option>
                        ))}
                    </select>
                </div>

                {/* Summary */}
                <div className="p-4 bg-card rounded-lg border border-border mb-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <div className="text-sm text-muted-foreground">Totala poäng</div>
                            <div className="text-2xl font-bold text-foreground">
                                {totalPoints.toLocaleString('sv-SE')}
                            </div>
                        </div>
                        <div>
                            <div className="text-sm text-muted-foreground">Tjänstegrad</div>
                            <div className="text-2xl font-bold text-foreground">
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
                        <h4 className="text-lg font-semibold text-foreground">
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
                                <div key={academicYear} className="p-5 bg-card rounded-lg border-2 border-border shadow-sm">
                                    <div className="mb-4 pb-3 border-b-2 border-border">
                                        <div className="flex items-center justify-between">
                                            <h5 className="text-xl font-bold text-foreground">Läsår {academicYear}</h5>
                                            {existingDistributions[academicYear] && (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full">
                                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                                    Tjänstefördelning
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-sm text-muted-foreground mt-1">
                                            {subjects.reduce((sum, s) => sum + s.courseCount, 0)} kurser över {subjects.length} ämnen
                                        </div>
                                    </div>

                                    <div className="mb-4 p-3 bg-accent rounded border border-primary">
                                        <div className="text-sm font-semibold text-muted-foreground mb-2">
                                            Lärare som behöver för läsår {academicYear}
                                        </div>
                                        <div className="text-xl font-bold text-primary">{teachersNeeded} lärare</div>
                                        <div className="text-xs text-muted-foreground mt-1">{yearPoints.toLocaleString('sv-SE')} poäng</div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {subjects.map(({ subject, courses, totalPoints: subjectPoints, courseCount }) => (
                                            <div key={subject} className="p-3 bg-muted rounded border border-border">
                                                <div className="font-semibold text-foreground mb-2">{subject}</div>
                                                <div className="text-xs text-muted-foreground mb-2">
                                                    {subjectPoints} poäng &bull; {courseCount} kurs{courseCount !== 1 ? 'er' : ''}
                                                </div>
                                                <ul className="text-xs text-muted-foreground space-y-1">
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
                                    <div className="mt-4 pt-4 border-t border-border">
                                        {existingDistributions[academicYear] ? (
                                            <div className="space-y-3">
                                                <div className="p-3 bg-primary/10 rounded-lg border border-primary">
                                                    <div className="flex items-center gap-2 text-primary">
                                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                                        <span className="font-medium">Tjänstefördelning skapad</span>
                                                    </div>
                                                    <div className="text-sm text-primary mt-1">
                                                        {existingDistributions[academicYear]?.count} lärare tilldelade
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => loadAssignmentsForYear(academicYear)}
                                                    className="w-full p-3 bg-muted hover:bg-muted/80 text-muted-foreground rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
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
                                                            toast.warning('Du måste skapa lärare först innan du kan skapa tjänstefördelning.');
                                                            return;
                                                        }
                                                        await api.serviceDistributions.createForAllTeachers(projectId, academicYear, teacherCapacity);
                                                        await fetchServiceDistributions();
                                                        await loadAssignmentsForYear(academicYear);
                                                    } catch (err) {
                                                        const msg = err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Okänt fel';
                                                        toast.error(`Kunde inte skapa tjänstefördelning: ${msg}`);
                                                    }
                                                }}
                                                className="w-full p-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
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
                    <div className="p-3 bg-accent border border-border rounded text-sm text-accent-foreground">
                        Inga kurser planerade ännu. Planera kurser för klasserna för att se lärarebehovet.
                    </div>
                ) : null}
            </div>

            {/* Create Teacher Form */}
            <div className="mb-6">
                {!showTeacherForm ? (
                    <div className="flex gap-2">
                        <Button variant="outline" className="flex-1 h-auto p-4 border-2 border-dashed" onClick={() => setShowTeacherForm(true)}>
                            <Plus className="w-5 h-5" />
                            Lägg till lärare
                        </Button>
                        <Button
                            variant="outline"
                            className="h-auto p-4 border-2 border-dashed"
                            disabled={importing}
                            onClick={() => fileInputRef.current?.click()}
                            title="CSV: namn, e-post, ämnen (|-separerade)"
                        >
                            <Upload className="w-5 h-5" />
                            {importing ? 'Importerar…' : 'Importera CSV'}
                        </Button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".csv,.txt"
                            onChange={handleCsvImport}
                            className="hidden"
                        />
                    </div>
                ) : (
                    <Card>
                        <CardHeader>
                            <div className="flex justify-between items-center">
                                <CardTitle>Lägg till lärare</CardTitle>
                                <Button variant="ghost" size="icon-sm" onClick={() => { setShowTeacherForm(false); setNewTeacher({ name: '', email: '', subject: '', notes: '' }); setTeacherError(''); }}>
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {teacherError && (
                                <Alert variant="destructive" className="mb-4">
                                    <AlertDescription>{teacherError}</AlertDescription>
                                </Alert>
                            )}
                            <form onSubmit={handleCreateTeacher} className="space-y-3">
                                <div className="space-y-1.5">
                                    <Label htmlFor="teacherName">Namn *</Label>
                                    <Input id="teacherName" value={newTeacher.name} onChange={(e) => setNewTeacher({ ...newTeacher, name: e.target.value })} required placeholder="Lärarens namn" />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="teacherEmail">E-post</Label>
                                        <Input id="teacherEmail" type="email" value={newTeacher.email} onChange={(e) => setNewTeacher({ ...newTeacher, email: e.target.value })} placeholder="email@example.com" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="teacherSubject">Ämne</Label>
                                        <Input id="teacherSubject" value={newTeacher.subject} onChange={(e) => setNewTeacher({ ...newTeacher, subject: e.target.value })} placeholder="t.ex. Matematik" />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="teacherNotes">Anteckningar</Label>
                                    <Textarea id="teacherNotes" value={newTeacher.notes} onChange={(e) => setNewTeacher({ ...newTeacher, notes: e.target.value })} rows={2} placeholder="Ytterligare information..." />
                                </div>
                                <div className="flex gap-2 pt-2">
                                    <Button type="button" variant="outline" onClick={() => { setShowTeacherForm(false); setNewTeacher({ name: '', email: '', subject: '', notes: '' }); setTeacherError(''); }}>Avbryt</Button>
                                    <Button type="submit" disabled={creatingTeacher}>{creatingTeacher ? 'Lägger till...' : 'Lägg till lärare'}</Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Teachers List */}
            {teachers.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {teachers.map(teacher => (
                        <Card key={teacher.id} size="sm">
                            <CardHeader>
                                <CardTitle>{teacher.name}</CardTitle>
                                {teacher.email && <CardDescription>{teacher.email}</CardDescription>}
                            </CardHeader>
                            <CardContent>
                                {teacher.subject && <Badge variant="secondary">{teacher.subject}</Badge>}
                                {teacher.notes && <p className="text-xs text-muted-foreground mt-2">{teacher.notes}</p>}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : (
                <div className="text-center py-12 text-muted-foreground">
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
    project: ProjectWithDetails;
    teachers: Teacher[];
    onBack: () => void;
}) {
    const vacantCourses = allCoursesForYear.filter(c => !c.teacherId);
    const vacantPoints = vacantCourses.reduce((sum, c) => sum + c.points, 0);
    const totalPoints = allCoursesForYear.reduce((sum, c) => sum + c.points, 0);
    const assignedPoints = totalPoints - vacantPoints;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-semibold">
                    Tjänstefördelning för läsår {academicYear}
                </h4>
                <Button variant="outline" onClick={onBack}>Tillbaka</Button>
            </div>

            {vacantCourses.length > 0 && (
                <Alert>
                    <AlertTitle>{vacantCourses.length} vakanta kurser ({vacantPoints} p)</AlertTitle>
                    <AlertDescription>
                        <p className="mb-2">Dessa kurser saknar lärare:</p>
                        <div className="flex flex-wrap gap-2">
                            {vacantCourses.map(c => (
                                <Badge key={c.code} variant="outline">{c.name} ({c.points}p)</Badge>
                            ))}
                        </div>
                    </AlertDescription>
                </Alert>
            )}

            {/* Progress bar */}
            <div className="p-4 bg-muted rounded-lg">
                <div className="flex justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Tilldelat: {assignedPoints}p / {totalPoints}p</span>
                    <span className={vacantPoints === 0 ? 'text-primary' : 'text-accent-foreground'}>
                        {vacantPoints === 0 ? 'Alla kurser tilldelade!' : `${vacantPoints}p kvar att tilldela`}
                    </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                    <div
                        className={`h-2 rounded-full ${vacantPoints === 0 ? 'bg-primary' : 'bg-primary'}`}
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
                        <div key={assignment.id} className="p-4 bg-card rounded-lg border border-border">
                            <div className="mb-3">
                                <label className="block text-sm font-medium text-muted-foreground mb-1">Lärares namn</label>
                                <input
                                    type="text"
                                    value={assignment.name}
                                    onChange={(e) => setTeacherAssignments(prev => prev.map(a => a.id === assignment.id ? { ...a, name: e.target.value } : a))}
                                    className="w-full px-3 py-2 rounded border border-border bg-background text-foreground"
                                    placeholder="Lärarens namn"
                                />
                            </div>

                            <div className="flex items-center justify-between mb-3">
                                <h5 className="font-semibold text-foreground">Lärare {index + 1}</h5>
                                <button onClick={() => setTeacherAssignments(prev => prev.filter(a => a.id !== assignment.id))} className="text-destructive hover:text-destructive/80">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </button>
                            </div>

                            {/* Points feedback */}
                            <div className={`mb-3 p-3 rounded-lg border-2 ${
                                pointsDifference === 0 ? 'bg-primary/10 border-primary'
                                    : pointsDifference > 0 ? 'bg-destructive/10 border-destructive'
                                        : 'bg-accent border-border'
                            }`}>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="text-sm font-medium text-muted-foreground">Tjänstegrad: {assignment.capacity} poäng</div>
                                        <div className="text-sm text-muted-foreground">Tilldelade kurser: {assignedCoursesPoints} poäng</div>
                                    </div>
                                    <div className={`text-lg font-bold ${
                                        pointsDifference === 0 ? 'text-primary'
                                            : pointsDifference > 0 ? 'text-destructive'
                                                : 'text-accent-foreground'
                                    }`}>
                                        {pointsDifference === 0 ? 'Uppfyllt' : pointsDifference > 0 ? `+${pointsDifference} p för mycket` : `${Math.abs(pointsDifference)} p saknas`}
                                    </div>
                                </div>
                            </div>

                            {/* Course selection */}
                            <div>
                                <label className="block text-sm font-medium text-muted-foreground mb-2">
                                    Välj kurser för {assignment.name || 'läraren'}:
                                </label>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-60 overflow-y-auto p-2 border border-border rounded">
                                    {allCoursesForYear.map(course => {
                                        const isVacant = !course.teacherId;
                                        const assignedTeacher = course.teacherId && course.teacherId !== assignment.teacherId ? course.teacherName : null;
                                        return (
                                            <label key={course.code} className={`flex items-center space-x-2 p-2 hover:bg-muted rounded cursor-pointer ${assignedTeacher ? 'opacity-60' : ''} ${isVacant ? 'bg-accent border border-border' : ''}`}>
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
                                                            toast.error('Kunde inte spara ändringen');
                                                        }
                                                    }}
                                                    className="rounded border-border"
                                                />
                                                <span className="text-sm text-foreground">
                                                    {course.name} ({course.points} p)
                                                    {isVacant && <span className="text-xs text-accent-foreground ml-1 font-medium">[VAKANT]</span>}
                                                    {assignedTeacher && <span className="text-xs text-primary ml-1">[{assignedTeacher}]</span>}
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
            <Button
                variant="outline"
                className="w-full h-auto p-4 border-2 border-dashed"
                onClick={() => setTeacherAssignments(prev => [...prev, { id: `temp-${Date.now()}`, name: '', capacity: teacherCapacity, courses: [] }])}
            >
                <Plus className="w-5 h-5" />
                Lägg till lärare
            </Button>

            {/* Save button */}
            {teacherAssignments.length > 0 && (
                <div className="pt-4 border-t border-border">
                    <Button
                        className="w-full"
                        onClick={async () => {
                            try {
                                for (const assignment of teacherAssignments) {
                                    let distributionId = assignment.id;

                                    if (!assignment.teacherId || assignment.id.startsWith('temp-')) {
                                        const teacher = teachers.find(t => t.name === assignment.name);
                                        if (!teacher) { console.warn(`Teacher not found: ${assignment.name}`); continue; }

                                        const distributions = await api.serviceDistributions.getAll(projectId, academicYear);
                                        let distribution = distributions.find(d => d.teacherId === teacher.id);
                                        if (!distribution) {
                                            const result = await api.serviceDistributions.createForAllTeachers(projectId, academicYear, assignment.capacity);
                                            distribution = result.distributions.find(d => d.teacherId === teacher.id);
                                        }
                                        if (!distribution) { console.error(`Could not create distribution for ${teacher.name}`); continue; }
                                        distributionId = distribution.id;
                                    }

                                    const courseInstanceIds: string[] = [];
                                    project.classes?.forEach(cls => {
                                        cls.curriculum?.courses?.forEach(course => {
                                            const courseAcademicYear = formatAcademicYear(cls.startYear, course.year);
                                            if (courseAcademicYear === academicYear && assignment.courses.includes(course.courseCode) && course.id) {
                                                courseInstanceIds.push(course.id);
                                            }
                                        });
                                    });

                                    await api.serviceDistributions.update(projectId, distributionId, courseInstanceIds);
                                }
                                toast.success('Tjänstefördelning sparad!');
                                onBack();
                            } catch (err) {
                                console.error('Failed to save service distributions:', err);
                                toast.error('Kunde inte spara tjänstefördelning.');
                            }
                        }}
                    >
                        Spara tjänstefördelning
                    </Button>
                </div>
            )}
        </div>
    );
}
