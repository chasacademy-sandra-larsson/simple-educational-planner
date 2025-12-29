"use client";

import { useState } from 'react';
import type { Project, CreateProjectRequest } from '@/app/lib/api/types';
import { api, ApiError } from '@/app/lib/api';

interface TimeSettingsFormProps {
    project: Project;
    onUpdate: (updatedProject: Project) => void;
}

export default function TimeSettingsForm({ project, onUpdate }: TimeSettingsFormProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    // Helper function to convert TIME string (HH:MM:SS) to HH:MM for input
    const timeToInput = (time?: string): string => {
        if (!time) return '';
        // Extract HH:MM from HH:MM:SS
        return time.substring(0, 5);
    };

    // Helper function to convert HH:MM input to TIME string (HH:MM:SS)
    const inputToTime = (input: string): string => {
        if (!input) return '';
        // Ensure format is HH:MM:SS
        return input.length === 5 ? `${input}:00` : input;
    };

    const [formData, setFormData] = useState<CreateProjectRequest>({
        name: project.name,
        description: project.description,
        earliestLessonStart: timeToInput(project.earliestLessonStart),
        latestLessonEnd: timeToInput(project.latestLessonEnd),
        defaultLessonDuration: project.defaultLessonDuration,
        mentorTimePerWeek: project.mentorTimePerWeek,
        lunchDuration: project.lunchDuration,
        earliestLunchTime: timeToInput(project.earliestLunchTime),
        latestLunchTime: timeToInput(project.latestLunchTime),
        shortestBreakBetweenLessons: project.shortestBreakBetweenLessons,
        longestBreakBetweenLessons: project.longestBreakBetweenLessons,
    });

    const handleChange = (field: keyof CreateProjectRequest, value: string | number | undefined) => {
        setFormData(prev => ({
            ...prev,
            [field]: value === '' ? undefined : value,
        }));
    };

    const handleSave = async () => {
        setSaving(true);
        setError('');
        setSuccess(false);

        try {
            // Convert time inputs to TIME format
            const updateData: CreateProjectRequest = {
                name: formData.name,
                description: formData.description,
                earliestLessonStart: formData.earliestLessonStart ? inputToTime(formData.earliestLessonStart as string) : undefined,
                latestLessonEnd: formData.latestLessonEnd ? inputToTime(formData.latestLessonEnd as string) : undefined,
                defaultLessonDuration: formData.defaultLessonDuration,
                mentorTimePerWeek: formData.mentorTimePerWeek,
                lunchDuration: formData.lunchDuration,
                earliestLunchTime: formData.earliestLunchTime ? inputToTime(formData.earliestLunchTime as string) : undefined,
                latestLunchTime: formData.latestLunchTime ? inputToTime(formData.latestLunchTime as string) : undefined,
                shortestBreakBetweenLessons: formData.shortestBreakBetweenLessons,
                longestBreakBetweenLessons: formData.longestBreakBetweenLessons,
            };

            const updatedProject = await api.projects.update(project.id, updateData);
            onUpdate(updatedProject);
            setIsEditing(false);
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch (err) {
            if (err instanceof ApiError) {
                setError(err.message);
            } else {
                setError('Kunde inte spara tidsinställningar');
            }
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        // Reset form to original values
        setFormData({
            name: project.name,
            description: project.description,
            earliestLessonStart: timeToInput(project.earliestLessonStart),
            latestLessonEnd: timeToInput(project.latestLessonEnd),
            defaultLessonDuration: project.defaultLessonDuration,
            mentorTimePerWeek: project.mentorTimePerWeek,
            lunchDuration: project.lunchDuration,
            earliestLunchTime: timeToInput(project.earliestLunchTime),
            latestLunchTime: timeToInput(project.latestLunchTime),
            shortestBreakBetweenLessons: project.shortestBreakBetweenLessons,
            longestBreakBetweenLessons: project.longestBreakBetweenLessons,
        });
        setIsEditing(false);
        setError('');
    };

    if (!isEditing) {
        return (
            <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-700 overflow-hidden">
                <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                            Tidsinställningar
                        </h2>
                        <button
                            onClick={() => setIsEditing(true)}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            Redigera
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Lesson Times */}
                        <div className="space-y-4">
                            <h3 className="font-medium text-zinc-900 dark:text-zinc-100">Lektioner</h3>
                            <div>
                                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                                    Tidigast start
                                </label>
                                <p className="text-zinc-900 dark:text-zinc-100">
                                    {project.earliestLessonStart ? timeToInput(project.earliestLessonStart) : 'Ej angivet'}
                                </p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                                    Senast slut
                                </label>
                                <p className="text-zinc-900 dark:text-zinc-100">
                                    {project.latestLessonEnd ? timeToInput(project.latestLessonEnd) : 'Ej angivet'}
                                </p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                                    Standard längd (minuter)
                                </label>
                                <p className="text-zinc-900 dark:text-zinc-100">
                                    {project.defaultLessonDuration ? `${project.defaultLessonDuration} min` : 'Ej angivet'}
                                </p>
                            </div>
                        </div>

                        {/* Lunch */}
                        <div className="space-y-4">
                            <h3 className="font-medium text-zinc-900 dark:text-zinc-100">Lunch</h3>
                            <div>
                                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                                    Längd (minuter)
                                </label>
                                <p className="text-zinc-900 dark:text-zinc-100">
                                    {project.lunchDuration ? `${project.lunchDuration} min` : 'Ej angivet'}
                                </p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                                    Tidigast lunch
                                </label>
                                <p className="text-zinc-900 dark:text-zinc-100">
                                    {project.earliestLunchTime ? timeToInput(project.earliestLunchTime) : 'Ej angivet'}
                                </p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                                    Senast lunch
                                </label>
                                <p className="text-zinc-900 dark:text-zinc-100">
                                    {project.latestLunchTime ? timeToInput(project.latestLunchTime) : 'Ej angivet'}
                                </p>
                            </div>
                        </div>

                        {/* Breaks */}
                        <div className="space-y-4">
                            <h3 className="font-medium text-zinc-900 dark:text-zinc-100">Raster</h3>
                            <div>
                                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                                    Kortast rast (minuter)
                                </label>
                                <p className="text-zinc-900 dark:text-zinc-100">
                                    {project.shortestBreakBetweenLessons ? `${project.shortestBreakBetweenLessons} min` : 'Ej angivet'}
                                </p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                                    Längst rast (minuter)
                                </label>
                                <p className="text-zinc-900 dark:text-zinc-100">
                                    {project.longestBreakBetweenLessons ? `${project.longestBreakBetweenLessons} min` : 'Ej angivet'}
                                </p>
                            </div>
                        </div>

                        {/* Other */}
                        <div className="space-y-4">
                            <h3 className="font-medium text-zinc-900 dark:text-zinc-100">Övrigt</h3>
                            <div>
                                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                                    Mentorstid per vecka (minuter)
                                </label>
                                <p className="text-zinc-900 dark:text-zinc-100">
                                    {project.mentorTimePerWeek ? `${project.mentorTimePerWeek} min` : 'Ej angivet'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-700 overflow-hidden">
            <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                        Redigera Tidsinställningar
                    </h2>
                </div>

                {error && (
                    <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-800 dark:text-red-200">
                        {error}
                    </div>
                )}

                {success && (
                    <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-800 dark:text-green-200">
                        Tidsinställningar sparade!
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Lesson Times */}
                    <div className="space-y-4">
                        <h3 className="font-medium text-zinc-900 dark:text-zinc-100">Lektioner</h3>
                        <div>
                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                                Tidigast start
                            </label>
                            <input
                                type="time"
                                value={formData.earliestLessonStart || ''}
                                onChange={(e) => handleChange('earliestLessonStart', e.target.value)}
                                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                                Senast slut
                            </label>
                            <input
                                type="time"
                                value={formData.latestLessonEnd || ''}
                                onChange={(e) => handleChange('latestLessonEnd', e.target.value)}
                                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                                Standard längd (minuter)
                            </label>
                            <input
                                type="number"
                                min="1"
                                value={formData.defaultLessonDuration || ''}
                                onChange={(e) => handleChange('defaultLessonDuration', e.target.value ? parseInt(e.target.value) : undefined)}
                                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100"
                            />
                        </div>
                    </div>

                    {/* Lunch */}
                    <div className="space-y-4">
                        <h3 className="font-medium text-zinc-900 dark:text-zinc-100">Lunch</h3>
                        <div>
                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                                Längd (minuter)
                            </label>
                            <input
                                type="number"
                                min="1"
                                value={formData.lunchDuration || ''}
                                onChange={(e) => handleChange('lunchDuration', e.target.value ? parseInt(e.target.value) : undefined)}
                                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                                Tidigast lunch
                            </label>
                            <input
                                type="time"
                                value={formData.earliestLunchTime || ''}
                                onChange={(e) => handleChange('earliestLunchTime', e.target.value)}
                                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                                Senast lunch
                            </label>
                            <input
                                type="time"
                                value={formData.latestLunchTime || ''}
                                onChange={(e) => handleChange('latestLunchTime', e.target.value)}
                                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100"
                            />
                        </div>
                    </div>

                    {/* Breaks */}
                    <div className="space-y-4">
                        <h3 className="font-medium text-zinc-900 dark:text-zinc-100">Raster</h3>
                        <div>
                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                                Kortast rast (minuter)
                            </label>
                            <input
                                type="number"
                                min="1"
                                value={formData.shortestBreakBetweenLessons || ''}
                                onChange={(e) => handleChange('shortestBreakBetweenLessons', e.target.value ? parseInt(e.target.value) : undefined)}
                                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                                Längst rast (minuter)
                            </label>
                            <input
                                type="number"
                                min="1"
                                value={formData.longestBreakBetweenLessons || ''}
                                onChange={(e) => handleChange('longestBreakBetweenLessons', e.target.value ? parseInt(e.target.value) : undefined)}
                                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100"
                            />
                        </div>
                    </div>

                    {/* Other */}
                    <div className="space-y-4">
                        <h3 className="font-medium text-zinc-900 dark:text-zinc-100">Övrigt</h3>
                        <div>
                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                                Mentorstid per vecka (minuter)
                            </label>
                            <input
                                type="number"
                                min="1"
                                value={formData.mentorTimePerWeek || ''}
                                onChange={(e) => handleChange('mentorTimePerWeek', e.target.value ? parseInt(e.target.value) : undefined)}
                                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100"
                            />
                        </div>
                    </div>
                </div>

                <div className="flex gap-4 mt-6">
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {saving ? 'Sparar...' : 'Spara'}
                    </button>
                    <button
                        onClick={handleCancel}
                        disabled={saving}
                        className="px-4 py-2 bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 rounded-lg hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Avbryt
                    </button>
                </div>
            </div>
        </div>
    );
}

