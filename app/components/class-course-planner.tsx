"use client";

import { useState } from 'react';
import CoursePlanner from './course-planner';

interface ClassCoursePlannerProps {
    classId: string;
    programCode: string;
    orientationCode: string;
    onSaveSuccess?: () => void;
    hasCurriculum?: boolean; // Whether this class already has saved courses
}

interface CourseAssignment {
    courseCode: string;
    courseName: string;
    points: number;
    category: string;
    year: number;
}

export default function ClassCoursePlanner({ classId, programCode, orientationCode, onSaveSuccess, hasCurriculum = false }: ClassCoursePlannerProps) {
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [courseAssignments, setCourseAssignments] = useState<CourseAssignment[]>([]);
    const [isEditing, setIsEditing] = useState(!hasCurriculum); // Auto-enable editing if no curriculum exists

    const handleApplyCourses = async () => {
        setSaving(true);
        setError('');
        setSuccess(false);

        try {
            const token = localStorage.getItem('auth_token');

            const response = await fetch(`http://localhost:3001/api/projects/classes/${classId}/curriculum`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ courses: courseAssignments }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to save courses');
            }

            setSuccess(true);
            setIsEditing(false); // Exit edit mode after successful save
            setTimeout(() => setSuccess(false), 3000);
            onSaveSuccess?.();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save courses');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-4">
            {/* Edit/View Mode Toggle */}
            {!isEditing && hasCurriculum && (
                <div className="flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="text-sm text-blue-900 dark:text-blue-100">
                        <strong>View Mode:</strong> Drag & drop is disabled. Click Edit to make changes.
                    </div>
                    <button
                        onClick={() => setIsEditing(true)}
                        className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors"
                    >
                        Edit
                    </button>
                </div>
            )}

            <CoursePlanner
                programCode={programCode}
                orientationCode={orientationCode}
                onAssignmentsChange={setCourseAssignments}
                readOnly={!isEditing}
            />

            {/* Messages */}
            {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm text-red-800 dark:text-red-200">
                    {error}
                </div>
            )}
            {success && (
                <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded text-sm text-green-800 dark:text-green-200">
                    Course assignments saved successfully!
                </div>
            )}

            {/* Apply Button - only show in edit mode */}
            {isEditing && (
                <div className="flex justify-end pt-4 border-t border-zinc-200 dark:border-zinc-600">
                    <button
                        onClick={handleApplyCourses}
                        disabled={saving}
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium transition-colors"
                    >
                        {saving ? 'Applying...' : 'Apply Courses'}
                    </button>
                </div>
            )}
        </div>
    );
}
