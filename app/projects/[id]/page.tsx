"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { api, ApiError } from '@/app/lib/api';
import type { Project, ProjectWithDetails, Teacher, Room, CreateTeacherRequest, CreateRoomRequest } from '@/app/lib/api/types';
import AddClassForm from '@/app/components/add-class-form';
import ComprehensiveCoursePlanner from '@/app/components/comprehensive-course-planner';
import TimeSettingsForm from '@/app/components/time-settings-form';
import ProjectSummary from '@/app/components/project-summary';
import TermDatesForm from '@/app/components/term-dates-form';
import WeeklySchedule from '@/app/components/weekly-schedule';
import ScheduleGenerator from '@/app/components/schedule-generator';
import GlobalHeader from '@/app/components/global-header';

type Tab = 'summary' | 'classes' | 'schedule' | 'scheduling' | 'teachers' | 'rooms' | 'settings';
type TabGroup = 'overview' | 'planning' | 'resources' | 'settings';

export default function ProjectDetailPage() {
    const router = useRouter();
    const params = useParams();
    const projectId = params.id as string;

    const [activeTab, setActiveTab] = useState<Tab>('summary');
    const [project, setProject] = useState<ProjectWithDetails | null>(null);
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [rooms, setRooms] = useState<Room[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Teacher form state
    const [showTeacherForm, setShowTeacherForm] = useState(false);
    const [newTeacher, setNewTeacher] = useState<CreateTeacherRequest>({ name: '', email: '', subject: '', notes: '' });
    const [creatingTeacher, setCreatingTeacher] = useState(false);
    const [teacherError, setTeacherError] = useState('');
    
    // Teacher capacity calculation state
    const [teacherCapacity, setTeacherCapacity] = useState<number>(600); // Default 600 points per year
    
    // Teacher assignment view state
    const [assignmentViewAcademicYear, setAssignmentViewAcademicYear] = useState<string | null>(null);
    const [teacherAssignments, setTeacherAssignments] = useState<Array<{
        id: string;
        teacherId?: string; // Real teacher ID if exists
        name: string;
        capacity: number;
        courses: string[]; // course codes
    }>>([]);
    const [courseInstancesMap, setCourseInstancesMap] = useState<Map<string, string>>(new Map()); // course code -> course instance id

    // Existing service distributions state (grouped by academic year)
    const [existingDistributions, setExistingDistributions] = useState<Record<string, { count: number; totalPoints: number }>>({});

    // Room form state
    const [showRoomForm, setShowRoomForm] = useState(false);
    const [newRoom, setNewRoom] = useState<CreateRoomRequest>({ roomNumber: '', roomType: '', capacity: undefined, notes: '' });
    const [creatingRoom, setCreatingRoom] = useState(false);
    const [roomError, setRoomError] = useState('');

    // Class dialog state
    const [showClassDialog, setShowClassDialog] = useState(false);

    // Expanded class for course planning
    const [expandedClassId, setExpandedClassId] = useState<string | null>(null);

    // Initialize curricula state
    const [initializingCurricula, setInitializingCurricula] = useState(false);
    const [initCurriculaMessage, setInitCurriculaMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    useEffect(() => {
        // For design/development: skip auth redirect so you can freely open project pages
        // and just load data if a projectId is present.
        if (projectId) {
            fetchProject();
            if (activeTab === 'teachers' || activeTab === 'summary') {
                fetchTeachers();
                fetchServiceDistributions();
            }
            if (activeTab === 'rooms' || activeTab === 'summary') {
                fetchRooms();
            }
        }
    }, [router, projectId, activeTab]);

    const fetchProject = async () => {
        try {
            setLoading(true);
            setError('');
            const data = await api.projects.getById(projectId);
            setProject(data);
        } catch (err) {
            if (err instanceof ApiError) {
                setError(err.message);
            } else {
                setError('Failed to load project');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleProjectUpdate = (updatedProject: Project) => {
        // Update the project state while preserving the classes relationship
        if (project) {
            setProject({
                ...updatedProject,
                classes: project.classes,
            } as ProjectWithDetails);
        }
    };

    const fetchTeachers = async () => {
        try {
            const data = await api.teachers.getAll(projectId);
            setTeachers(data);
        } catch (err) {
            console.error('Failed to fetch teachers:', err);
        }
    };

    const fetchRooms = async () => {
        try {
            const data = await api.rooms.getAll(projectId);
            setRooms(data);
        } catch (err) {
            console.error('Failed to fetch rooms:', err);
        }
    };

    const fetchServiceDistributions = async () => {
        try {
            console.log('[DEBUG] Fetching service distributions for project:', projectId);
            const distributions = await api.serviceDistributions.getAll(projectId);
            console.log('[DEBUG] Received distributions:', distributions);
            // Group by academic year
            const byYear: Record<string, { count: number; totalPoints: number }> = {};
            for (const dist of distributions) {
                const existing = byYear[dist.academicYear] || { count: 0, totalPoints: 0 };
                byYear[dist.academicYear] = {
                    count: existing.count + 1,
                    totalPoints: existing.totalPoints + (dist.servicePoints || 0),
                };
            }
            console.log('[DEBUG] Grouped by year:', byYear);
            setExistingDistributions(byYear);
        } catch (err) {
            console.error('[DEBUG] Failed to fetch service distributions:', err);
        }
    };

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
            if (err instanceof ApiError) {
                setTeacherError(err.message);
            } else {
                setTeacherError('Failed to create teacher');
            }
        } finally {
            setCreatingTeacher(false);
        }
    };

    const handleCreateRoom = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreatingRoom(true);
        setRoomError('');

        try {
            await api.rooms.create(projectId, newRoom);
            setShowRoomForm(false);
            setNewRoom({ roomNumber: '', roomType: '', capacity: undefined, notes: '' });
            await fetchRooms();
        } catch (err) {
            if (err instanceof ApiError) {
                setRoomError(err.message);
            } else {
                setRoomError('Failed to create room');
            }
        } finally {
            setCreatingRoom(false);
        }
    };

    const handleInitializeCurricula = async () => {
        setInitializingCurricula(true);
        setInitCurriculaMessage(null);
        
        try {
            const result = await api.projects.initializeCurricula(projectId);
            
            if (result.initialized > 0) {
                setInitCurriculaMessage({
                    type: 'success',
                    text: `Initierade ${result.initialized} kursplaner! Laddar om...`,
                });
                // Refresh project data to show updated curricula
                setTimeout(() => {
                    fetchProject();
                    setInitCurriculaMessage(null);
                }, 2000);
            } else {
                setInitCurriculaMessage({
                    type: 'success',
                    text: result.message || 'Alla klasser har redan kursplaner.',
                });
            }
        } catch (err) {
            if (err instanceof ApiError) {
                setInitCurriculaMessage({ type: 'error', text: err.message });
            } else {
                setInitCurriculaMessage({ type: 'error', text: 'Kunde inte initiera kursplaner' });
            }
        } finally {
            setInitializingCurricula(false);
        }
    };

    const handleLogout = () => {
        api.auth.logout();
        router.push('/auth/login');
    };

    const user = api.auth.getCurrentUser();

    if (loading) {
        return (
            <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (error || !project) {
        return (
            <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="text-6xl mb-4">⚠️</div>
                    <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
                        {error || 'Project not found'}
                    </h2>
                    <button
                        onClick={() => router.push('/dashboard')}
                        className="mt-4 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
                    >
                        Back to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
            {/* Global Header */}
            <GlobalHeader currentProjectId={projectId} currentProjectName={project.name} />

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Project Header */}
                <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-700 p-6 mb-6">
                    <p className="text-zinc-600 dark:text-zinc-400">
                        {project.description || 'No description provided'}
                    </p>
                </div>

                {/* Tabs */}
                <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-700 overflow-hidden">
                    <div className="border-b border-zinc-200 dark:border-zinc-700">
                        <nav className="flex -mb-px">
                            <button
                                onClick={() => setActiveTab('summary')}
                                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'summary'
                                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                    : 'border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:border-zinc-300'
                                    }`}
                            >
                                Översikt
                            </button>
                            <button
                                onClick={() => setActiveTab('classes')}
                                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'classes'
                                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                    : 'border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:border-zinc-300'
                                    }`}
                            >
                                Klasser ({project.classes?.length || 0})
                            </button>
                            <button
                                onClick={() => setActiveTab('schedule')}
                                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'schedule'
                                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                    : 'border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:border-zinc-300'
                                    }`}
                            >
                                Schema
                            </button>
                            <button
                                onClick={() => setActiveTab('scheduling')}
                                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'scheduling'
                                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                    : 'border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:border-zinc-300'
                                    }`}
                            >
                                Schemaläggning
                            </button>
                            <button
                                onClick={() => setActiveTab('teachers')}
                                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'teachers'
                                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                    : 'border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:border-zinc-300'
                                    }`}
                            >
                                Lärare ({teachers.length})
                            </button>
                            <button
                                onClick={() => setActiveTab('rooms')}
                                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'rooms'
                                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                    : 'border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:border-zinc-300'
                                    }`}
                            >
                                Salar ({rooms.length})
                            </button>
                            <button
                                onClick={() => setActiveTab('settings')}
                                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'settings'
                                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                    : 'border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:border-zinc-300'
                                    }`}
                            >
                                Inställningar
                            </button>
                        </nav>
                    </div>

                    {/* Tab Content */}
                    <div className="p-6">
                        {/* Summary Tab */}
                        {activeTab === 'summary' && project && (
                            <ProjectSummary
                                project={project}
                                teachers={teachers}
                                rooms={rooms}
                            />
                        )}

                        {/* Classes Tab */}
                        {activeTab === 'classes' && (
                            <div>
                                {/* Add Class Form */}
                                <div className="mb-6">
                                    {!showClassDialog ? (
                                        <button
                                            onClick={() => setShowClassDialog(true)}
                                            className="w-full p-4 bg-zinc-50 dark:bg-zinc-700/50 rounded-lg border-2 border-dashed border-zinc-300 dark:border-zinc-600 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all group"
                                        >
                                            <div className="flex items-center justify-center gap-2 text-zinc-600 dark:text-zinc-400 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                                </svg>
                                                <span className="font-medium">Add Class</span>
                                            </div>
                                        </button>
                                    ) : (
                                        <AddClassForm
                                            projectId={projectId}
                                            onCancel={() => setShowClassDialog(false)}
                                            onSuccess={() => {
                                                setShowClassDialog(false);
                                                fetchProject();
                                            }}
                                        />
                                    )}
                                </div>

                                {/* Initialize Curricula Section */}
                                {project.classes && project.classes.length > 0 && (() => {
                                    const classesWithoutCurricula = project.classes.filter(
                                        cls => !cls.curriculum || !cls.curriculum.courses || !Array.isArray(cls.curriculum.courses) || cls.curriculum.courses.length === 0
                                    );
                                    
                                    if (classesWithoutCurricula.length === 0) return null;
                                    
                                    return (
                                        <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                                            <div className="flex items-start gap-3">
                                                <svg className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                                </svg>
                                                <div className="flex-1">
                                                    <h4 className="font-medium text-amber-800 dark:text-amber-200">
                                                        {classesWithoutCurricula.length} {classesWithoutCurricula.length === 1 ? 'klass saknar' : 'klasser saknar'} kursplan
                                                    </h4>
                                                    <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                                                        För att kunna generera schema behöver alla klasser ha sparade kursplaner. 
                                                        Klicka på knappen nedan för att automatiskt initiera standardkurser för alla klasser som saknar kursplan.
                                                    </p>
                                                    <div className="mt-3 flex items-center gap-3">
                                                        <button
                                                            onClick={handleInitializeCurricula}
                                                            disabled={initializingCurricula}
                                                            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                                                        >
                                                            {initializingCurricula ? (
                                                                <>
                                                                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                                                    </svg>
                                                                    Initierar...
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                                    </svg>
                                                                    Initiera alla kursplaner
                                                                </>
                                                            )}
                                                        </button>
                                                        <span className="text-xs text-amber-600 dark:text-amber-400">
                                                            Klasser: {classesWithoutCurricula.map(c => c.classCode).join(', ')}
                                                        </span>
                                                    </div>
                                                    {initCurriculaMessage && (
                                                        <div className={`mt-3 p-2 rounded text-sm ${
                                                            initCurriculaMessage.type === 'success' 
                                                                ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                                                                : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
                                                        }`}>
                                                            {initCurriculaMessage.text}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })()}

                                {/* Classes List */}
                                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
                                    Classes
                                </h3>
                                {project.classes && project.classes.length > 0 ? (
                                    <div className="space-y-4">
                                        {project.classes.map((cls) => {
                                            const isExpanded = expandedClassId === cls.id;
                                            return (
                                                <div key={cls.id} className="border border-zinc-200 dark:border-zinc-600 rounded-lg overflow-hidden">
                                                    {/* Class Card Header - Clickable */}
                                                    <div
                                                        onClick={() => setExpandedClassId(isExpanded ? null : cls.id)}
                                                        className={`p-4 cursor-pointer transition-all ${isExpanded
                                                            ? 'bg-blue-50 dark:bg-blue-900/20 border-b border-zinc-200 dark:border-zinc-600'
                                                            : 'bg-zinc-50 dark:bg-zinc-700/50 hover:bg-zinc-100 dark:hover:bg-zinc-700'
                                                            }`}
                                                    >
                                                        <div className="flex justify-between items-start">
                                                            <div className="flex-1">
                                                                <div className="flex items-center gap-2">
                                                                    <div className="font-medium text-zinc-900 dark:text-zinc-100">
                                                                        {cls.classCode}
                                                                    </div>
                                                                    {cls.curriculum && cls.curriculum.courses && (
                                                                        <span className={`text-xs px-2 py-0.5 rounded-full ${cls.curriculum.isValid
                                                                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                                                                            : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                                                                            }`}>
                                                                            {Array.isArray(cls.curriculum.courses) ? cls.curriculum.courses.length : 0} courses
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <div className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                                                                    {cls.programName}
                                                                    {cls.orientationName && cls.orientationName !== cls.programName && (
                                                                        <span className="text-xs"> • {cls.orientationName}</span>
                                                                    )}
                                                                </div>
                                                                <div className="text-xs text-zinc-500 dark:text-zinc-500 mt-2">
                                                                    {cls.startYear} - {cls.graduationYear}
                                                                </div>
                                                            </div>
                                                            <button
                                                                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setExpandedClassId(isExpanded ? null : cls.id);
                                                                }}
                                                            >
                                                                <svg
                                                                    className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                                                    fill="none"
                                                                    viewBox="0 0 24 24"
                                                                    stroke="currentColor"
                                                                >
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                                </svg>
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* Course Planner - Expandable */}
                                                    {isExpanded && (
                                                        <div className="p-6 bg-white dark:bg-zinc-800">
                                                            <h4 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
                                                                Kursplanering för {cls.classCode}
                                                            </h4>
                                                            <ComprehensiveCoursePlanner
                                                                classId={cls.id}
                                                                programCode={cls.programCode}
                                                                orientationCode={cls.orientationCode}
                                                                onSaveSuccess={() => fetchProject()}
                                                                hasCurriculum={cls.curriculum && cls.curriculum.courses && Array.isArray(cls.curriculum.courses) && cls.curriculum.courses.length > 0}
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="text-center py-12 text-zinc-500 dark:text-zinc-500">
                                        No classes yet. Click "Add Class" above to create your first class.
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Schedule Tab */}
                        {activeTab === 'schedule' && project && (
                            <WeeklySchedule project={project} />
                        )}

                        {/* Scheduling Tab (Generator) */}
                        {activeTab === 'scheduling' && project && (
                            <ScheduleGenerator project={project} onUpdate={fetchProject} />
                        )}

                        {/* Teachers Tab */}
                        {activeTab === 'teachers' && (
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
                                            <option value={400}>400 p/år</option>
                                            <option value={450}>450 p/år</option>
                                            <option value={500}>500 p/år</option>
                                            <option value={550}>550 p/år</option>
                                            <option value={600}>600 p/år</option>
                                            <option value={650}>650 p/år</option>
                                            <option value={700}>700 p/år</option>
                                            <option value={750}>750 p/år</option>
                                            <option value={800}>800 p/år</option>
                                        </select>
                                    </div>

                                    {/* Calculate total points and required teachers per academic year */}
                                    {(() => {
                                        // Helper function to format academic year
                                        const formatAcademicYear = (startYear: number, year: number): string => {
                                            const academicStartYear = startYear + (year - 1);
                                            const academicEndYear = academicStartYear + 1;
                                            return `${academicStartYear}/${academicEndYear}`;
                                        };
                                        
                                        // Calculate points per academic year
                                        const pointsByAcademicYear = new Map<string, number>();
                                        
                                        project.classes?.forEach(cls => {
                                            if (cls.curriculum) {
                                                const curriculum = cls.curriculum;
                                                if (curriculum.courses && Array.isArray(curriculum.courses)) {
                                                    curriculum.courses.forEach(course => {
                                                        const academicYear = formatAcademicYear(cls.startYear, course.year);
                                                        const currentPoints = pointsByAcademicYear.get(academicYear) || 0;
                                                        pointsByAcademicYear.set(academicYear, currentPoints + (course.points || 0));
                                                    });
                                                }
                                            }
                                        });
                                        
                                        // Calculate teachers needed per academic year
                                        const teachersByAcademicYear = Array.from(pointsByAcademicYear.entries())
                                            .map(([academicYear, points]) => ({
                                                academicYear,
                                                points,
                                                teachersNeeded: teacherCapacity > 0 ? Math.ceil(points / teacherCapacity) : 0,
                                            }))
                                            .sort((a, b) => {
                                                const yearA = parseInt(a.academicYear.split('/')[0]);
                                                const yearB = parseInt(b.academicYear.split('/')[0]);
                                                return yearA - yearB;
                                            });
                                        
                                        // Calculate total points (for display)
                                        const totalPoints = Array.from(pointsByAcademicYear.values()).reduce((sum, points) => sum + points, 0);

                                        // Calculate points per class
                                        const pointsPerClass = project.classes?.map(cls => {
                                            if (cls.curriculum) {
                                                const curriculum = cls.curriculum;
                                                if (curriculum.courses && Array.isArray(curriculum.courses)) {
                                                    const classPoints = curriculum.courses.reduce((sum, course) => {
                                                        return sum + (course.points || 0);
                                                    }, 0);
                                                    return { classCode: cls.classCode, points: classPoints };
                                                }
                                            }
                                            return { classCode: cls.classCode, points: 0 };
                                        }) || [];

                                        return (
                                            <div className="space-y-3">
                                                <div className="p-4 bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700">
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
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

                                                {pointsPerClass.length > 0 && (
                                                    <div className="p-4 bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700">
                                                        <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-3">
                                                            Poäng per klass:
                                                        </h4>
                                                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                                                            {pointsPerClass.map(({ classCode, points }) => (
                                                                <div key={classCode} className="text-sm">
                                                                    <span className="font-medium text-zinc-900 dark:text-zinc-100">{classCode}:</span>{' '}
                                                                    <span className="text-zinc-600 dark:text-zinc-400">{points} p</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Extract and display subjects needed */}
                                                {(() => {
                                                    // Helper function to format academic year
                                                    const formatAcademicYear = (startYear: number, year: number): string => {
                                                        const academicStartYear = startYear + (year - 1);
                                                        const academicEndYear = academicStartYear + 1;
                                                        return `${academicStartYear}/${academicEndYear}`;
                                                    };
                                                    
                                                    // Calculate points per academic year for teachers calculation
                                                    const pointsByAcademicYear = new Map<string, number>();
                                                    
                                                    project.classes?.forEach(cls => {
                                                        if (cls.curriculum && cls.curriculum.courses && Array.isArray(cls.curriculum.courses)) {
                                                            cls.curriculum.courses.forEach(course => {
                                                                const academicYear = formatAcademicYear(cls.startYear, course.year);
                                                                const currentPoints = pointsByAcademicYear.get(academicYear) || 0;
                                                                pointsByAcademicYear.set(academicYear, currentPoints + (course.points || 0));
                                                            });
                                                        }
                                                    });
                                                    
                                                    // Calculate teachers needed per academic year
                                                    const teachersByAcademicYear = Array.from(pointsByAcademicYear.entries())
                                                        .map(([academicYear, points]) => ({
                                                            academicYear,
                                                            points,
                                                            teachersNeeded: teacherCapacity > 0 ? Math.ceil(points / teacherCapacity) : 0,
                                                        }))
                                                        .sort((a, b) => {
                                                            const yearA = parseInt(a.academicYear.split('/')[0]);
                                                            const yearB = parseInt(b.academicYear.split('/')[0]);
                                                            return yearA - yearB;
                                                        });
                                                    
                                                    // Extract subjects from all courses
                                                    // Store courses with year and class startYear for sorting
                                                    const subjectMap = new Map<string, { points: number; courses: Array<{ code: string; name: string; year: number; classStartYear: number }> }>();
                                                    
                                                    // Helper function to extract subject from course code or name
                                                    const extractSubject = (courseCode: string, courseName: string): string => {
                                                        // Map of common course code patterns to subject names
                                                        const codeToSubject: Record<string, string> = {
                                                            'MAT': 'Matematik',
                                                            'SVE': 'Svenska',
                                                            'ENG': 'Engelska',
                                                            'FYS': 'Fysik',
                                                            'KEM': 'Kemi',
                                                            'BIO': 'Biologi',
                                                            'HIS': 'Historia',
                                                            'SAM': 'Samhällskunskap',
                                                            'GEO': 'Geografi',
                                                            'REL': 'Religionskunskap',
                                                            'IDH': 'Idrott och hälsa',
                                                            'SO': 'SO-ämnen',
                                                            'NO': 'NO-ämnen',
                                                            'BIL': 'Bild',
                                                            'MUS': 'Musik',
                                                            'TEK': 'Teknik',
                                                            'SLO': 'Slöjd',
                                                            'SPR': 'Modern språk',
                                                            'GYM': 'Gymnasiearbete',
                                                        };
                                                        
                                                        // Try to extract from courseCode first
                                                        if (courseCode) {
                                                            // Match patterns like MATMAT01a, SVESVE01, etc.
                                                            const codeMatch = courseCode.match(/^([A-Z]{2,4})/);
                                                            if (codeMatch) {
                                                                const code = codeMatch[1];
                                                                if (codeToSubject[code]) {
                                                                    return codeToSubject[code];
                                                                }
                                                                // Check if it's a doubled code (like MATMAT -> MAT)
                                                                if (code.length === 6 && code.substring(0, 3) === code.substring(3, 6)) {
                                                                    const baseCode = code.substring(0, 3);
                                                                    if (codeToSubject[baseCode]) {
                                                                        return codeToSubject[baseCode];
                                                                    }
                                                                }
                                                            }
                                                        }
                                                        
                                                        // Extract from courseName
                                                        if (courseName) {
                                                            // Remove common suffixes and patterns
                                                            let cleanName = courseName
                                                                .replace(/\s*\d+[a-z]?\s*$/, '') // Remove "1a", "2b", etc. at end
                                                                .replace(/\s+\(.*?\)$/, '') // Remove text in parentheses
                                                                .trim();
                                                            
                                                            // Map common name patterns
                                                            const namePatterns: Array<[RegExp, string]> = [
                                                                [/^Matematik/i, 'Matematik'],
                                                                [/^Svenska/i, 'Svenska'],
                                                                [/^Engelska/i, 'Engelska'],
                                                                [/^Fysik/i, 'Fysik'],
                                                                [/^Kemi/i, 'Kemi'],
                                                                [/^Biologi/i, 'Biologi'],
                                                                [/^Historia/i, 'Historia'],
                                                                [/^Samhällskunskap/i, 'Samhällskunskap'],
                                                                [/^Geografi/i, 'Geografi'],
                                                                [/^Religionskunskap/i, 'Religionskunskap'],
                                                                [/^Idrott/i, 'Idrott och hälsa'],
                                                                [/^Gymnasiearbete/i, 'Gymnasiearbete'],
                                                                [/^Bild/i, 'Bild'],
                                                                [/^Musik/i, 'Musik'],
                                                                [/^Teknik/i, 'Teknik'],
                                                            ];
                                                            
                                                            for (const [pattern, subject] of namePatterns) {
                                                                if (pattern.test(cleanName)) {
                                                                    return subject;
                                                                }
                                                            }
                                                            
                                                            // If no pattern matches, use first word(s) before any numbers
                                                            const nameMatch = cleanName.match(/^([^0-9]+?)(?:\s+(som|för|och|i).*)?$/i);
                                                            if (nameMatch) {
                                                                return nameMatch[1].trim();
                                                            }
                                                            
                                                            return cleanName;
                                                        }
                                                        
                                                        return courseCode || 'Okänt ämne';
                                                    };
                                                    
                                                    project.classes?.forEach(cls => {
                                                        if (cls.curriculum && cls.curriculum.courses && Array.isArray(cls.curriculum.courses)) {
                                                            cls.curriculum.courses.forEach(course => {
                                                                const subject = extractSubject(course.courseCode, course.courseName);
                                                                
                                                                // Add to map
                                                                if (subjectMap.has(subject)) {
                                                                    const existing = subjectMap.get(subject)!;
                                                                    existing.points += course.points || 0;
                                                                    // Check if course already exists (by code and year, since same course can be in different years)
                                                                    const courseExists = existing.courses.some(c => c.code === course.courseCode && c.year === course.year && c.classStartYear === cls.startYear);
                                                                    if (!courseExists) {
                                                                        existing.courses.push({
                                                                            code: course.courseCode,
                                                                            name: course.courseName,
                                                                            year: course.year,
                                                                            classStartYear: cls.startYear,
                                                                        });
                                                                    }
                                                                } else {
                                                                    subjectMap.set(subject, {
                                                                        points: course.points || 0,
                                                                        courses: [{
                                                                            code: course.courseCode,
                                                                            name: course.courseName,
                                                                            year: course.year,
                                                                            classStartYear: cls.startYear,
                                                                        }],
                                                                    });
                                                                }
                                                            });
                                                        }
                                                    });
                                                    
                                                    // Helper function to get sort key for academic year (already defined above)
                                                    const getAcademicYearSortKey = (startYear: number, year: number): number => {
                                                        return (startYear + (year - 1)) * 1000 + year;
                                                    };
                                                    
                                                    // Group courses by academic year first, then by subject
                                                    const coursesByAcademicYear = new Map<string, Map<string, Array<{ id: string; code: string; name: string; year: number; classStartYear: number; points: number; teacherId?: string | null; teacherName?: string | null }>>>();

                                                    // Extract all courses with their subjects and academic years
                                                    const allCoursesWithSubjects: Array<{
                                                        id: string;
                                                        code: string;
                                                        name: string;
                                                        year: number;
                                                        classStartYear: number;
                                                        subject: string;
                                                        points: number;
                                                        academicYear: string;
                                                        academicYearSortKey: number;
                                                        teacherId?: string | null;
                                                        teacherName?: string | null;
                                                    }> = [];

                                                    project.classes?.forEach(cls => {
                                                        if (cls.curriculum && cls.curriculum.courses && Array.isArray(cls.curriculum.courses)) {
                                                            cls.curriculum.courses.forEach(course => {
                                                                const subject = extractSubject(course.courseCode, course.courseName);
                                                                const academicYear = formatAcademicYear(cls.startYear, course.year);
                                                                const academicYearSortKey = getAcademicYearSortKey(cls.startYear, course.year);

                                                                allCoursesWithSubjects.push({
                                                                    id: course.id || '',
                                                                    code: course.courseCode,
                                                                    name: course.courseName,
                                                                    year: course.year,
                                                                    classStartYear: cls.startYear,
                                                                    subject,
                                                                    points: course.points || 0,
                                                                    academicYear,
                                                                    academicYearSortKey,
                                                                    teacherId: course.teacherId,
                                                                    teacherName: course.teacherName,
                                                                });
                                                            });
                                                        }
                                                    });

                                                    // Group by academic year, then by subject
                                                    allCoursesWithSubjects.forEach(course => {
                                                        if (!coursesByAcademicYear.has(course.academicYear)) {
                                                            coursesByAcademicYear.set(course.academicYear, new Map());
                                                        }
                                                        const subjectsMap = coursesByAcademicYear.get(course.academicYear)!;
                                                        if (!subjectsMap.has(course.subject)) {
                                                            subjectsMap.set(course.subject, []);
                                                        }
                                                        const coursesList = subjectsMap.get(course.subject)!;
                                                        // Check if this course code already exists in this subject for this academic year
                                                        const alreadyExists = coursesList.some((c: { code: string }) => c.code === course.code);
                                                        if (!alreadyExists) {
                                                            coursesList.push({
                                                                id: course.id,
                                                                code: course.code,
                                                                name: course.name,
                                                                year: course.year,
                                                                classStartYear: course.classStartYear,
                                                                points: course.points,
                                                                teacherId: course.teacherId,
                                                                teacherName: course.teacherName,
                                                            });
                                                        }
                                                    });
                                                    
                                                    // Sort academic years
                                                    const sortedAcademicYears = Array.from(coursesByAcademicYear.keys()).sort((a, b) => {
                                                        const yearA = parseInt(a.split('/')[0]);
                                                        const yearB = parseInt(b.split('/')[0]);
                                                        return yearA - yearB;
                                                    });
                                                    
                                                    // If we're in assignment view for a specific academic year, show assignment interface
                                                    if (assignmentViewAcademicYear && sortedAcademicYears.includes(assignmentViewAcademicYear)) {
                                                        const selectedYearSubjectsMap = coursesByAcademicYear.get(assignmentViewAcademicYear)!;
                                                        const selectedYearSubjects = Array.from(selectedYearSubjectsMap.entries())
                                                            .map(([subject, courses]) => ({
                                                                subject,
                                                                courses,
                                                                totalPoints: courses.reduce((sum, c) => sum + c.points, 0),
                                                                courseCount: courses.length,
                                                            }))
                                                            .sort((a, b) => b.totalPoints - a.totalPoints);
                                                        
                                                        // Get all courses for this academic year, removing duplicates by course code
                                                        const allCoursesForYearMap = new Map<string, { id: string; code: string; name: string; year: number; classStartYear: number; points: number; teacherId?: string | null; teacherName?: string | null }>();
                                                        selectedYearSubjectsMap.forEach(subjectCourses => {
                                                            subjectCourses.forEach(course => {
                                                                // Use course code as key to avoid duplicates
                                                                if (!allCoursesForYearMap.has(course.code)) {
                                                                    allCoursesForYearMap.set(course.code, course);
                                                                }
                                                            });
                                                        });
                                                        const allCoursesForYear = Array.from(allCoursesForYearMap.values()).sort((a, b) => {
                                                            // Sort by name first
                                                            const nameCompare = a.name.localeCompare(b.name, 'sv');
                                                            if (nameCompare !== 0) return nameCompare;
                                                            // If names are equal, sort by points
                                                            return b.points - a.points;
                                                        });
                                                        
                                                        // Calculate vacant courses
                                                        const vacantCourses = allCoursesForYear.filter(c => !c.teacherId);
                                                        const vacantPoints = vacantCourses.reduce((sum, c) => sum + c.points, 0);
                                                        const totalPoints = allCoursesForYear.reduce((sum, c) => sum + c.points, 0);
                                                        const assignedPoints = totalPoints - vacantPoints;

                                                        return (
                                                            <div className="space-y-6">
                                                                <div className="flex items-center justify-between mb-4">
                                                                    <h4 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                                                                        Tjänstefördelning för läsår {assignmentViewAcademicYear}
                                                                    </h4>
                                        <button
                                                                        onClick={() => {
                                                                            setAssignmentViewAcademicYear(null);
                                                                            setTeacherAssignments([]);
                                                                        }}
                                                                        className="px-4 py-2 text-sm border border-zinc-300 dark:border-zinc-600 rounded hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300"
                                                                    >
                                                                        Tillbaka
                                                                    </button>
                                                                </div>

                                                                {/* Summary of vacant courses */}
                                                                {vacantCourses.length > 0 && (
                                                                    <div className="p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                                                                        <div className="flex items-center gap-2 text-orange-700 dark:text-orange-400 font-medium mb-2">
                                                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                                                            </svg>
                                                                            {vacantCourses.length} vakanta kurser ({vacantPoints} p)
                                                                        </div>
                                                                        <div className="text-sm text-orange-600 dark:text-orange-500">
                                                                            Dessa kurser saknar lärare och behöver tilldelas:
                                                                        </div>
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
                                                                            style={{ width: `${(assignedPoints / totalPoints) * 100}%` }}
                                                                        />
                                                                    </div>
                                                                </div>

                                                                {/* Teacher assignments list */}
                                                                <div className="space-y-4">
                                                                    {teacherAssignments.map((assignment, index) => {
                                                                        // Calculate total points for assigned courses
                                                                        const assignedCoursesPoints = assignment.courses.reduce((sum, code) => {
                                                                            const course = allCoursesForYear.find(c => c.code === code);
                                                                            return sum + (course?.points || 0);
                                                                        }, 0);
                                                                        
                                                                        // Calculate difference from capacity
                                                                        const pointsDifference = assignedCoursesPoints - assignment.capacity;
                                                                        const isExactMatch = pointsDifference === 0;
                                                                        const isOverCapacity = pointsDifference > 0;
                                                                        const isUnderCapacity = pointsDifference < 0;
                                                                        
                                                                        return (
                                                                        <div key={assignment.id} className="p-4 bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700">
                                                                            <div className="mb-3">
                                                                                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                                                                                    Lärares namn (riktigt eller potentiellt)
                                                                                </label>
                                                                                <input
                                                                                    type="text"
                                                                                    value={assignment.name}
                                                                                    onChange={(e) => {
                                                                                        setTeacherAssignments(prev => prev.map(a => 
                                                                                            a.id === assignment.id 
                                                                                                ? { ...a, name: e.target.value }
                                                                                                : a
                                                                                        ));
                                                                                    }}
                                                                                    className="w-full px-3 py-2 rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100"
                                                                                    placeholder="Lärarens namn"
                                                                                />
                                                                            </div>
                                                                            
                                                                            <div className="flex items-center justify-between mb-3">
                                                                                <h5 className="font-semibold text-zinc-900 dark:text-zinc-100">
                                                                                    Lärare {index + 1}
                                                                                </h5>
                                                                                <button
                                                                                    onClick={() => {
                                                                                        setTeacherAssignments(prev => prev.filter(a => a.id !== assignment.id));
                                                                                    }}
                                                                                    className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                                                                                >
                                                                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                                                    </svg>
                                                                                </button>
                                                                            </div>
                                                                            
                                                                            {/* Points feedback */}
                                                                            <div className={`mb-3 p-3 rounded-lg border-2 ${
                                                                                isExactMatch 
                                                                                    ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700' 
                                                                                    : isOverCapacity 
                                                                                        ? 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700'
                                                                                        : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700'
                                                                            }`}>
                                                                                <div className="flex items-center justify-between">
                                                                                    <div>
                                                                                        <div className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                                                                            Tjänstegrad: {assignment.capacity} poäng
                                                                                        </div>
                                                                                        <div className="text-sm text-zinc-600 dark:text-zinc-400">
                                                                                            Tilldelade kurser: {assignedCoursesPoints} poäng
                                                                                        </div>
                                                                                    </div>
                                                                                    <div className={`text-lg font-bold ${
                                                                                        isExactMatch 
                                                                                            ? 'text-green-600 dark:text-green-400' 
                                                                                            : isOverCapacity 
                                                                                                ? 'text-red-600 dark:text-red-400'
                                                                                                : 'text-yellow-600 dark:text-yellow-400'
                                                                                    }`}>
                                                                                        {isExactMatch ? (
                                                                                            <div className="flex items-center gap-2">
                                                                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                                                                </svg>
                                                                                                Uppfyllt
                                                                                            </div>
                                                                                        ) : isOverCapacity ? (
                                                                                            <div className="flex items-center gap-2">
                                                                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                                                                                </svg>
                                                                                                +{Math.abs(pointsDifference)} p för mycket
                                                                                            </div>
                                                                                        ) : (
                                                                                            <div className="flex items-center gap-2">
                                                                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                                                                                </svg>
                                                                                                {Math.abs(pointsDifference)} p saknas
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                            
                                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                                                                                <div>
                                                                                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                                                                                        Tjänstegrad (poäng/år)
                                                                                    </label>
                                                                                    <input
                                                                                        type="number"
                                                                                        value={assignment.capacity}
                                                                                        onChange={(e) => {
                                                                                            setTeacherAssignments(prev => prev.map(a => 
                                                                                                a.id === assignment.id 
                                                                                                    ? { ...a, capacity: parseInt(e.target.value) || 0 }
                                                                                                    : a
                                                                                            ));
                                                                                        }}
                                                                                        className="w-full px-3 py-2 rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100"
                                                                                        min="0"
                                                                                        placeholder="600"
                                                                                    />
                                                                                </div>
                                                                                <div>
                                                                                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                                                                                        Kurser ({assignment.courses.length})
                                                                                    </label>
                                                                                    <div className="text-sm text-zinc-600 dark:text-zinc-400">
                                                                                        {assignment.courses.length > 0 
                                                                                            ? assignment.courses.map(code => {
                                                                                                const course = allCoursesForYear.find(c => c.code === code);
                                                                                                return course?.name || code;
                                                                                            }).join(', ')
                                                                                            : 'Inga kurser valda'
                                                                                        }
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                            
                                                                            <div>
                                                                                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                                                                                    Välj kurser för {assignment.name || 'läraren'}:
                                                                                </label>
                                                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-60 overflow-y-auto p-2 border border-zinc-200 dark:border-zinc-700 rounded">
                                                                                    {allCoursesForYear.map((course) => {
                                                                                        const isAssignedToOther = course.teacherId && course.teacherId !== assignment.teacherId;
                                                                                        const isAssignedToThis = course.teacherId === assignment.teacherId;
                                                                                        const isVacant = !course.teacherId;
                                                                                        const assignedTeacher = isAssignedToOther ? course.teacherName : null;
                                                                                        return (
                                                                                        <label key={course.code} className={`flex items-center space-x-2 p-2 hover:bg-zinc-50 dark:hover:bg-zinc-700/50 rounded cursor-pointer ${isAssignedToOther ? 'opacity-60' : ''} ${isVacant ? 'bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800' : ''}`}>
                                                                                            <input
                                                                                                type="checkbox"
                                                                                                checked={assignment.courses.includes(course.code)}
                                                                                                onChange={async (e) => {
                                                                                                    const isChecked = e.target.checked;
                                                                                                    const teacherId = assignment.teacherId || null;

                                                                                                    // Update local state immediately for responsive UI
                                                                                                    setTeacherAssignments(prev => prev.map(a =>
                                                                                                        a.id === assignment.id
                                                                                                            ? {
                                                                                                                ...a,
                                                                                                                courses: isChecked
                                                                                                                    ? [...a.courses, course.code]
                                                                                                                    : a.courses.filter(c => c !== course.code)
                                                                                                            }
                                                                                                            : a
                                                                                                    ));

                                                                                                    // Save to database
                                                                                                    try {
                                                                                                        if (course.id) {
                                                                                                            await api.serviceDistributions.assignTeacherToCourse(
                                                                                                                projectId,
                                                                                                                course.id,
                                                                                                                isChecked ? teacherId : null
                                                                                                            );
                                                                                                        }
                                                                                                    } catch (err) {
                                                                                                        console.error('Failed to save assignment:', err);
                                                                                                        // Revert local state on error
                                                                                                        setTeacherAssignments(prev => prev.map(a =>
                                                                                                            a.id === assignment.id
                                                                                                                ? {
                                                                                                                    ...a,
                                                                                                                    courses: isChecked
                                                                                                                        ? a.courses.filter(c => c !== course.code)
                                                                                                                        : [...a.courses, course.code]
                                                                                                                }
                                                                                                                : a
                                                                                                        ));
                                                                                                        alert('Kunde inte spara ändringen');
                                                                                                    }
                                                                                                }}
                                                                                                className="rounded border-zinc-300 dark:border-zinc-600"
                                                                                            />
                                                                                            <span className="text-sm text-zinc-900 dark:text-zinc-100">
                                                                                                {course.name} ({course.points} p)
                                                                                                {isVacant && (
                                                                                                    <span className="text-xs text-orange-600 dark:text-orange-400 ml-1 font-medium">
                                                                                                        [VAKANT]
                                                                                                    </span>
                                                                                                )}
                                                                                                {assignedTeacher && (
                                                                                                    <span className="text-xs text-blue-600 dark:text-blue-400 ml-1">
                                                                                                        [{assignedTeacher}]
                                                                                                    </span>
                                                                                                )}
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
                                                                
                                                                {/* Add new teacher button */}
                                                                <button
                                                                    onClick={() => {
                                                                        const newId = `temp-${Date.now()}`;
                                                                        setTeacherAssignments(prev => [...prev, {
                                                                            id: newId,
                                                                            name: '',
                                                                            capacity: teacherCapacity,
                                                                            courses: [],
                                                                        }]);
                                                                    }}
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
                                                                                    // For each teacher assignment, update the service distribution
                                                                                    for (const assignment of teacherAssignments) {
                                                                                        if (!assignment.teacherId || assignment.id.startsWith('temp-')) {
                                                                                            // Need to find or create teacher
                                                                                            const teacher = teachers.find(t => t.name === assignment.name);
                                                                                            if (!teacher) {
                                                                                                console.warn(`Teacher not found: ${assignment.name}`);
                                                                                                continue;
                                                                                            }
                                                                                            assignment.teacherId = teacher.id;
                                                                                            
                                                                                            // Find or create distribution
                                                                                            const distributions = await api.serviceDistributions.getAll(projectId, assignmentViewAcademicYear!);
                                                                                            let distribution = distributions.find(d => d.teacherId === teacher.id);
                                                                                            
                                                                                            if (!distribution) {
                                                                                                // Create distribution
                                                                                                const result = await api.serviceDistributions.createForAllTeachers(
                                                                                                    projectId,
                                                                                                    assignmentViewAcademicYear!,
                                                                                                    assignment.capacity
                                                                                                );
                                                                                                distribution = result.distributions.find(d => d.teacherId === teacher.id);
                                                                                            }
                                                                                            
                                                                                            if (!distribution) {
                                                                                                console.error(`Could not create distribution for teacher ${teacher.name}`);
                                                                                                continue;
                                                                                            }
                                                                                            
                                                                                            assignment.id = distribution.id;
                                                                                        }
                                                                                        
                                                                                        // Find course instance IDs for the selected courses
                                                                                        // Map course codes to course instance IDs from project data
                                                                                        const courseInstanceIds: string[] = [];
                                                                                        
                                                                                        // Helper function to format academic year (defined earlier in the component)
                                                                                        const formatAcademicYear = (startYear: number, year: number): string => {
                                                                                            const academicStartYear = startYear + (year - 1);
                                                                                            const academicEndYear = academicStartYear + 1;
                                                                                            return `${academicStartYear}/${academicEndYear}`;
                                                                                        };
                                                                                        
                                                                                        if (project && project.classes) {
                                                                                            project.classes.forEach(cls => {
                                                                                                if (cls.curriculum && cls.curriculum.courses) {
                                                                                                    cls.curriculum.courses.forEach((course: any) => {
                                                                                                        // Check if this course matches the academic year and is selected
                                                                                                        const courseAcademicYear = formatAcademicYear(cls.startYear, course.year);
                                                                                                        if (courseAcademicYear === assignmentViewAcademicYear && 
                                                                                                            assignment.courses.includes(course.courseCode) &&
                                                                                                            course.id) {
                                                                                                            courseInstanceIds.push(course.id);
                                                                                                        }
                                                                                                    });
                                                                                                }
                                                                                            });
                                                                                        }
                                                                                        
                                                                                        // Update distribution
                                                                                        await api.serviceDistributions.update(
                                                                                            projectId,
                                                                                            assignment.id,
                                                                                            courseInstanceIds
                                                                                        );
                                                                                    }
                                                                                    
                                                                                    alert('Tjänstefördelning sparad!');
                                                                                    setAssignmentViewAcademicYear(null);
                                                                                    setTeacherAssignments([]);
                                                                                } catch (err) {
                                                                                    console.error('Failed to save service distributions:', err);
                                                                                    alert('Kunde inte spara tjänstefördelning. Se konsolen för detaljer.');
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
                                                    
                                                    // Normal view - show academic years with subjects
                                                    if (sortedAcademicYears.length > 0) {
                                                        return (
                                                            <div className="space-y-6">
                                                                <h4 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                                                                    Ämnen som behöver anställas per läsår:
                                                                </h4>
                                                                {sortedAcademicYears.map((academicYear, yearIndex) => {
                                                                    const subjectsMap = coursesByAcademicYear.get(academicYear)!;
                                                                    const subjects = Array.from(subjectsMap.entries())
                                                                        .map(([subject, courses]) => {
                                                                            const totalPoints = courses.reduce((sum, c) => sum + c.points, 0);
                                                                            return {
                                                                                subject,
                                                                                courses,
                                                                                totalPoints,
                                                                                courseCount: courses.length,
                                                                            };
                                                                        })
                                                                        .sort((a, b) => b.totalPoints - a.totalPoints); // Sort subjects by points
                                                                    
                                                                    // Find teachers needed for this academic year
                                                                    const teachersForYear = teachersByAcademicYear.find(t => t.academicYear === academicYear);
                                                                    
                                                                    return (
                                                                        <div key={academicYear} className="p-5 bg-white dark:bg-zinc-800 rounded-lg border-2 border-zinc-200 dark:border-zinc-700 shadow-sm">
                                                                            <div className="mb-4 pb-3 border-b-2 border-zinc-300 dark:border-zinc-600">
                                                                                <div className="flex items-center justify-between">
                                                                                    <h5 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                                                                                        Läsår {academicYear}
                                                                                    </h5>
                                                                                    {existingDistributions[academicYear] && (
                                                                                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-medium rounded-full">
                                                                                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                                                            </svg>
                                                                                            Tjänstefördelning
                                                                                        </span>
                                                                                    )}
                                                                                </div>
                                                                                <div className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                                                                                    {subjects.reduce((sum, s) => sum + s.courseCount, 0)} kurser över {subjects.length} ämnen
                                                                                </div>
                                                                            </div>
                                                                            
                                                                            {/* Teachers needed for this academic year */}
                                                                            {teachersForYear && (
                                                                                <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
                                                                                    <div className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                                                                                        Lärare som behöver för läsår {academicYear}
                                                                                    </div>
                                                                                    <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
                                                                                        {teachersForYear.teachersNeeded} lärare
                                                                                    </div>
                                                                                    <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                                                                                        {teachersForYear.points.toLocaleString('sv-SE')} poäng
                                                                                    </div>
                                                                                </div>
                                                                            )}
                                                                            
                                                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                                                {subjects.map(({ subject, courses, totalPoints, courseCount }) => (
                                                                                    <div key={subject} className="p-3 bg-zinc-50 dark:bg-zinc-700/50 rounded border border-zinc-200 dark:border-zinc-600">
                                                                                        <div className="font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                                                                                            {subject}
                                                                                        </div>
                                                                                        <div className="text-xs text-zinc-600 dark:text-zinc-400 mb-2">
                                                                                            {totalPoints} poäng • {courseCount} kurs{courseCount !== 1 ? 'er' : ''}
                                                                                        </div>
                                                                                        <ul className="text-xs text-zinc-600 dark:text-zinc-400 space-y-1">
                                                                                            {courses.map((course) => (
                                                                                                <li key={`${course.code}-${course.year}-${course.classStartYear}`} className="truncate">
                                                                                                    • {course.name}
                                                                                                </li>
                                                                                            ))}
                                                                                        </ul>
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                            
                                                                            {/* Service distribution status / create button */}
                                                                            <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-600">
                                                                                {existingDistributions[academicYear] ? (
                                                                                    <div className="space-y-3">
                                                                                        <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                                                                                            <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                                                                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                                                                </svg>
                                                                                                <span className="font-medium">Tjänstefördelning skapad</span>
                                                                                            </div>
                                                                                            <div className="text-sm text-green-600 dark:text-green-500 mt-1">
                                                                                                {existingDistributions[academicYear]?.count} lärare tilldelade
                                                                                            </div>
                                                                                        </div>
                                                                                        <button
                                                                                            onClick={async () => {
                                                                                                try {
                                                                                                    const distributions = await api.serviceDistributions.getAll(projectId, academicYear);

                                                                                                    // Get all courses for this academic year with their teacher assignments
                                                                                                    const coursesWithTeachers: Array<{ code: string; teacherId?: string | null }> = [];
                                                                                                    project.classes?.forEach(cls => {
                                                                                                        if (cls.curriculum?.courses) {
                                                                                                            cls.curriculum.courses.forEach(course => {
                                                                                                                const courseAcademicYear = `${cls.startYear + (course.year - 1)}/${cls.startYear + course.year}`;
                                                                                                                if (courseAcademicYear === academicYear && course.teacherId) {
                                                                                                                    coursesWithTeachers.push({
                                                                                                                        code: course.courseCode,
                                                                                                                        teacherId: course.teacherId,
                                                                                                                    });
                                                                                                                }
                                                                                                            });
                                                                                                        }
                                                                                                    });

                                                                                                    const assignments = teachers.map(teacher => {
                                                                                                        const distribution = distributions.find(d => d.teacherId === teacher.id);
                                                                                                        // Get courses assigned to this teacher
                                                                                                        const teacherCourses = coursesWithTeachers
                                                                                                            .filter(c => c.teacherId === teacher.id)
                                                                                                            .map(c => c.code);
                                                                                                        // Remove duplicates
                                                                                                        const uniqueCourses = [...new Set(teacherCourses)];
                                                                                                        return {
                                                                                                            id: distribution?.id || `temp-${teacher.id}`,
                                                                                                            teacherId: teacher.id,
                                                                                                            name: teacher.name,
                                                                                                            capacity: distribution?.servicePoints || teacherCapacity,
                                                                                                            courses: uniqueCourses,
                                                                                                        };
                                                                                                    });
                                                                                                    setTeacherAssignments(assignments);
                                                                                                    setAssignmentViewAcademicYear(academicYear);
                                                                                                } catch (err) {
                                                                                                    console.error('Failed to load distributions:', err);
                                                                                                }
                                                                                            }}
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

                                                                                                const result = await api.serviceDistributions.createForAllTeachers(
                                                                                                    projectId,
                                                                                                    academicYear,
                                                                                                    teacherCapacity
                                                                                                );

                                                                                                console.log('Service distributions created:', result);

                                                                                                // Refresh the existing distributions state
                                                                                                await fetchServiceDistributions();

                                                                                                const distributions = await api.serviceDistributions.getAll(projectId, academicYear);

                                                                                                // Get all courses for this academic year with their teacher assignments
                                                                                                const coursesWithTeachers: Array<{ code: string; teacherId?: string | null }> = [];
                                                                                                project.classes?.forEach(cls => {
                                                                                                    if (cls.curriculum?.courses) {
                                                                                                        cls.curriculum.courses.forEach(course => {
                                                                                                            const courseAcademicYear = `${cls.startYear + (course.year - 1)}/${cls.startYear + course.year}`;
                                                                                                            if (courseAcademicYear === academicYear && course.teacherId) {
                                                                                                                coursesWithTeachers.push({
                                                                                                                    code: course.courseCode,
                                                                                                                    teacherId: course.teacherId,
                                                                                                                });
                                                                                                            }
                                                                                                        });
                                                                                                    }
                                                                                                });

                                                                                                const assignments = teachers.map(teacher => {
                                                                                                    const distribution = distributions.find(d => d.teacherId === teacher.id);
                                                                                                    // Get courses assigned to this teacher
                                                                                                    const teacherCourses = coursesWithTeachers
                                                                                                        .filter(c => c.teacherId === teacher.id)
                                                                                                        .map(c => c.code);
                                                                                                    // Remove duplicates
                                                                                                    const uniqueCourses = [...new Set(teacherCourses)];
                                                                                                    return {
                                                                                                        id: distribution?.id || `temp-${teacher.id}`,
                                                                                                        teacherId: teacher.id,
                                                                                                        name: teacher.name,
                                                                                                        capacity: distribution?.servicePoints || teacherCapacity,
                                                                                                        courses: uniqueCourses,
                                                                                                    };
                                                                                                });

                                                                                                setTeacherAssignments(assignments);
                                                                                                setAssignmentViewAcademicYear(academicYear);
                                                                                            } catch (err: any) {
                                                                                                console.error('Failed to create service distributions:', err);
                                                                                                const errorMessage = err instanceof ApiError
                                                                                                    ? err.message
                                                                                                    : err?.message || 'Okänt fel';
                                                                                                alert(`Kunde inte skapa tjänstefördelning: ${errorMessage}`);
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
                                                        );
                                                    }
                                                    return null;
                                                })()}

                                                {totalPoints === 0 && (
                                                    <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded text-sm text-yellow-800 dark:text-yellow-200">
                                                        Inga kurser planerade ännu. Planera kurser för klasserna för att se lärarebehovet.
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })()}
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
                                                    onClick={() => {
                                                        setShowTeacherForm(false);
                                                        setNewTeacher({ name: '', email: '', subject: '', notes: '' });
                                                        setTeacherError('');
                                                    }}
                                                    className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                                                >
                                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>
                                            </div>

                                            {teacherError && (
                                                <div className="mb-3 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm text-red-800 dark:text-red-200">
                                                    {teacherError}
                                                </div>
                                            )}

                                            <form onSubmit={handleCreateTeacher} className="space-y-3">
                                                <div>
                                                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                                                        Name *
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={newTeacher.name}
                                                        onChange={(e) => setNewTeacher({ ...newTeacher, name: e.target.value })}
                                                        required
                                                        className="w-full px-3 py-2 rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100"
                                                        placeholder="Teacher name"
                                                    />
                                                </div>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div>
                                                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                                                            Email
                                                        </label>
                                                        <input
                                                            type="email"
                                                            value={newTeacher.email}
                                                            onChange={(e) => setNewTeacher({ ...newTeacher, email: e.target.value })}
                                                            className="w-full px-3 py-2 rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100"
                                                            placeholder="email@example.com"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                                                            Subject
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={newTeacher.subject}
                                                            onChange={(e) => setNewTeacher({ ...newTeacher, subject: e.target.value })}
                                                            className="w-full px-3 py-2 rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100"
                                                            placeholder="e.g., Mathematics"
                                                        />
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                                                        Notes
                                                    </label>
                                                    <textarea
                                                        value={newTeacher.notes}
                                                        onChange={(e) => setNewTeacher({ ...newTeacher, notes: e.target.value })}
                                                        rows={2}
                                                        className="w-full px-3 py-2 rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 resize-none"
                                                        placeholder="Additional information..."
                                                    />
                                                </div>
                                                <div className="flex gap-2 pt-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setShowTeacherForm(false);
                                                            setNewTeacher({ name: '', email: '', subject: '', notes: '' });
                                                            setTeacherError('');
                                                        }}
                                                        className="px-4 py-2 border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 rounded hover:bg-zinc-50 dark:hover:bg-zinc-700"
                                                    >
                                                        Avbryt
                                                    </button>
                                                    <button
                                                        type="submit"
                                                        disabled={creatingTeacher}
                                                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded"
                                                    >
                                                        {creatingTeacher ? 'Lägger till...' : 'Lägg till lärare'}
                                                    </button>
                                                </div>
                                            </form>
                                        </div>
                                    )}
                                </div>

                                {/* Teachers List */}
                                {teachers.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {teachers.map((teacher) => (
                                            <div
                                                key={teacher.id}
                                                className="p-4 bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:border-blue-300 dark:hover:border-blue-600 transition-colors"
                                            >
                                                <div className="font-medium text-zinc-900 dark:text-zinc-100">
                                                    {teacher.name}
                                                </div>
                                                {teacher.email && (
                                                    <div className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                                                        {teacher.email}
                                                    </div>
                                                )}
                                                {teacher.subject && (
                                                    <div className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                                                        {teacher.subject}
                                                    </div>
                                                )}
                                                {teacher.notes && (
                                                    <div className="text-xs text-zinc-500 dark:text-zinc-500 mt-2">
                                                        {teacher.notes}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-12 text-zinc-500 dark:text-zinc-500">
                                        Inga lärare tillagda ännu. Klicka på "Lägg till lärare" ovan för att börja.
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Rooms Tab */}
                        {activeTab === 'rooms' && (
                            <div>
                                {/* Create Room Form */}
                                <div className="mb-6">
                                    {!showRoomForm ? (
                                        <button
                                            onClick={() => setShowRoomForm(true)}
                                            className="w-full p-4 bg-zinc-50 dark:bg-zinc-700/50 rounded-lg border-2 border-dashed border-zinc-300 dark:border-zinc-600 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all group"
                                        >
                                            <div className="flex items-center justify-center gap-2 text-zinc-600 dark:text-zinc-400 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                                </svg>
                                                <span className="font-medium">Add Room</span>
                                            </div>
                                        </button>
                                    ) : (
                                        <div className="p-4 bg-zinc-50 dark:bg-zinc-700/50 rounded-lg border border-zinc-200 dark:border-zinc-600">
                                            <div className="flex justify-between items-center mb-4">
                                                <h4 className="font-semibold text-zinc-900 dark:text-zinc-100">Add New Room</h4>
                                                <button
                                                    onClick={() => {
                                                        setShowRoomForm(false);
                                                        setNewRoom({ roomNumber: '', roomType: '', capacity: undefined, notes: '' });
                                                        setRoomError('');
                                                    }}
                                                    className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                                                >
                                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>
                                            </div>

                                            {roomError && (
                                                <div className="mb-3 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm text-red-800 dark:text-red-200">
                                                    {roomError}
                                                </div>
                                            )}

                                            <form onSubmit={handleCreateRoom} className="space-y-3">
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div>
                                                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                                                            Room Number *
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={newRoom.roomNumber}
                                                            onChange={(e) => setNewRoom({ ...newRoom, roomNumber: e.target.value })}
                                                            required
                                                            className="w-full px-3 py-2 rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100"
                                                            placeholder="e.g., A101"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                                                            Type
                                                        </label>
                                                        <select
                                                            value={newRoom.roomType}
                                                            onChange={(e) => setNewRoom({ ...newRoom, roomType: e.target.value })}
                                                            className="w-full px-3 py-2 rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100"
                                                        >
                                                            <option value="">Select type</option>
                                                            <option value="Classroom">Classroom</option>
                                                            <option value="Lab">Lab</option>
                                                            <option value="Auditorium">Auditorium</option>
                                                            <option value="Office">Office</option>
                                                            <option value="Other">Other</option>
                                                        </select>
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                                                        Capacity
                                                    </label>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        value={newRoom.capacity || ''}
                                                        onChange={(e) => setNewRoom({ ...newRoom, capacity: e.target.value ? parseInt(e.target.value) : undefined })}
                                                        className="w-full px-3 py-2 rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100"
                                                        placeholder="Max number of students"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                                                        Notes
                                                    </label>
                                                    <textarea
                                                        value={newRoom.notes}
                                                        onChange={(e) => setNewRoom({ ...newRoom, notes: e.target.value })}
                                                        rows={2}
                                                        className="w-full px-3 py-2 rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 resize-none"
                                                        placeholder="Additional information..."
                                                    />
                                                </div>
                                                <div className="flex gap-2 pt-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setShowRoomForm(false);
                                                            setNewRoom({ roomNumber: '', roomType: '', capacity: undefined, notes: '' });
                                                            setRoomError('');
                                                        }}
                                                        className="px-4 py-2 border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 rounded hover:bg-zinc-50 dark:hover:bg-zinc-700"
                                                    >
                                                        Avbryt
                                                    </button>
                                                    <button
                                                        type="submit"
                                                        disabled={creatingRoom}
                                                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded"
                                                    >
                                                        {creatingRoom ? 'Adding...' : 'Add Room'}
                                                    </button>
                                                </div>
                                            </form>
                                        </div>
                                    )}
                                </div>

                                {/* Rooms List */}
                                {rooms.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {rooms.map((room) => (
                                            <div
                                                key={room.id}
                                                className="p-4 bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:border-blue-300 dark:hover:border-blue-600 transition-colors"
                                            >
                                                <div className="flex items-start justify-between">
                                                    <div className="font-medium text-zinc-900 dark:text-zinc-100">
                                                        {room.roomNumber}
                                                    </div>
                                                    {room.roomType && (
                                                        <span className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">
                                                            {room.roomType}
                                                        </span>
                                                    )}
                                                </div>
                                                {room.capacity && (
                                                    <div className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                                                        Capacity: {room.capacity}
                                                    </div>
                                                )}
                                                {room.notes && (
                                                    <div className="text-xs text-zinc-500 dark:text-zinc-500 mt-2">
                                                        {room.notes}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-12 text-zinc-500 dark:text-zinc-500">
                                        No rooms added yet
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Settings Tab */}
                        {activeTab === 'settings' && project && (
                            <div className="space-y-6">
                                <TimeSettingsForm
                                    project={project}
                                    onUpdate={handleProjectUpdate}
                                />
                                <TermDatesForm
                                    project={project}
                                    onUpdate={() => fetchProject()}
                                />
                            </div>
                        )}
                    </div>
                </div>
            </main >
        </div >
    );
}
