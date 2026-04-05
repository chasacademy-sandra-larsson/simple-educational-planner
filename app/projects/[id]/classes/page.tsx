"use client";

import { useState } from 'react';
import { api, ApiError } from '@/app/lib/api';
import AddClassForm from '@/app/components/add-class-form';
import ComprehensiveCoursePlanner from '@/app/components/comprehensive-course-planner';
import { useProject } from '../ProjectContext';

export default function ClassesPage() {
    const { projectId, project, fetchProject } = useProject();
    const [showClassDialog, setShowClassDialog] = useState(false);
    const [expandedClassId, setExpandedClassId] = useState<string | null>(null);
    const [initializingCurricula, setInitializingCurricula] = useState(false);
    const [initCurriculaMessage, setInitCurriculaMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    if (!project) return null;

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

    const classesWithoutCurricula = project.classes?.filter(
        cls => !cls.curriculum || !cls.curriculum.courses || !Array.isArray(cls.curriculum.courses) || cls.curriculum.courses.length === 0
    ) || [];

    return (
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
                            <span className="font-medium">Lägg till klass</span>
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
            {classesWithoutCurricula.length > 0 && (
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
            )}

            {/* Classes List */}
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
                Klasser
            </h3>
            {project.classes && project.classes.length > 0 ? (
                <div className="space-y-4">
                    {project.classes.map((cls) => {
                        const isExpanded = expandedClassId === cls.id;
                        return (
                            <div key={cls.id} className="border border-zinc-200 dark:border-zinc-600 rounded-lg overflow-hidden">
                                {/* Class Card Header */}
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
                                                        {Array.isArray(cls.curriculum.courses) ? cls.curriculum.courses.length : 0} kurser
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                                                {cls.programName}
                                                {cls.orientationName && cls.orientationName !== cls.programName && (
                                                    <span className="text-xs"> &bull; {cls.orientationName}</span>
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
                    Inga klasser ännu. Klicka på &quot;Lägg till klass&quot; ovan.
                </div>
            )}
        </div>
    );
}
