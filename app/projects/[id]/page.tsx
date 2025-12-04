"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { api, ApiError } from '@/app/lib/api';
import type { ProjectWithDetails, Teacher, Room, CreateTeacherRequest, CreateRoomRequest } from '@/app/lib/api/types';

type Tab = 'classes' | 'teachers' | 'rooms';

export default function ProjectDetailPage() {
    const router = useRouter();
    const params = useParams();
    const projectId = params.id as string;

    const [activeTab, setActiveTab] = useState<Tab>('classes');
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

    // Room form state
    const [showRoomForm, setShowRoomForm] = useState(false);
    const [newRoom, setNewRoom] = useState<CreateRoomRequest>({ roomNumber: '', roomType: '', capacity: undefined, notes: '' });
    const [creatingRoom, setCreatingRoom] = useState(false);
    const [roomError, setRoomError] = useState('');

    useEffect(() => {
        if (!api.auth.isAuthenticated()) {
            router.push('/auth/login');
            return;
        }
        if (projectId) {
            fetchProject();
            if (activeTab === 'teachers') {
                fetchTeachers();
            } else if (activeTab === 'rooms') {
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
            {/* Navigation */}
            <nav className="bg-white dark:bg-zinc-800 shadow-sm border-b border-zinc-200 dark:border-zinc-700">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => router.push('/dashboard')}
                                className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                            >
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>
                            <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                                {project.name}
                            </h1>
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="text-sm text-zinc-600 dark:text-zinc-400">
                                {user?.name}
                            </span>
                            <button
                                onClick={handleLogout}
                                className="px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                            >
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

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
                                onClick={() => setActiveTab('classes')}
                                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'classes'
                                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                    : 'border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:border-zinc-300'
                                    }`}
                            >
                                Classes ({project.classes?.length || 0})
                            </button>
                            <button
                                onClick={() => setActiveTab('teachers')}
                                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'teachers'
                                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                    : 'border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:border-zinc-300'
                                    }`}
                            >
                                Teachers ({teachers.length})
                            </button>
                            <button
                                onClick={() => setActiveTab('rooms')}
                                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'rooms'
                                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                    : 'border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:border-zinc-300'
                                    }`}
                            >
                                Rooms ({rooms.length})
                            </button>
                        </nav>
                    </div>

                    {/* Tab Content */}
                    <div className="p-6">
                        {/* Classes Tab */}
                        {activeTab === 'classes' && (
                            <div>
                                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
                                    Classes
                                </h3>
                                {project.classes && project.classes.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {project.classes.map((cls) => (
                                            <div
                                                key={cls.id}
                                                className="p-4 bg-zinc-50 dark:bg-zinc-700/50 rounded-lg border border-zinc-200 dark:border-zinc-600"
                                            >
                                                <div className="font-medium text-zinc-900 dark:text-zinc-100">
                                                    {cls.classCode}
                                                </div>
                                                <div className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                                                    {cls.program.programName}
                                                </div>
                                                <div className="text-xs text-zinc-500 dark:text-zinc-500 mt-2">
                                                    {cls.startYear} - {cls.graduationYear}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-12 text-zinc-500 dark:text-zinc-500">
                                        No classes yet. Classes will be linked to programs.
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Teachers Tab */}
                        {activeTab === 'teachers' && (
                            <div>
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
                                                <span className="font-medium">Add Teacher</span>
                                            </div>
                                        </button>
                                    ) : (
                                        <div className="p-4 bg-zinc-50 dark:bg-zinc-700/50 rounded-lg border border-zinc-200 dark:border-zinc-600">
                                            <div className="flex justify-between items-center mb-4">
                                                <h4 className="font-semibold text-zinc-900 dark:text-zinc-100">Add New Teacher</h4>
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
                                                        Cancel
                                                    </button>
                                                    <button
                                                        type="submit"
                                                        disabled={creatingTeacher}
                                                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded"
                                                    >
                                                        {creatingTeacher ? 'Adding...' : 'Add Teacher'}
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
                                        No teachers added yet
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
                                                        Cancel
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
                    </div>
                </div>
            </main >
        </div >
    );
}
