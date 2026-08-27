"use client";

import { useState } from 'react';
import { Plus, RefreshCw, Loader2, AlertTriangle } from 'lucide-react';
import { api, ApiError } from '@/app/lib/api';
import AddClassForm from '@/app/components/add-class-form';
import CurriculumWorkbench from '@/app/components/curriculum-workbench';
import { useProject } from '../ProjectContext';
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

export default function ClassesPage() {
    const { projectId, project, fetchProject } = useProject();
    const [showClassDialog, setShowClassDialog] = useState(false);
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
        <div className="space-y-6">
            <div>
                {!showClassDialog ? (
                    <Button
                        variant="outline"
                        className="w-full h-auto p-4 border-2 border-dashed"
                        onClick={() => setShowClassDialog(true)}
                    >
                        <Plus className="w-5 h-5" />
                        Lägg till klass
                    </Button>
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

            {/* Klasser utan kursplan kan initieras från Skolverkets programstruktur */}
            {classesWithoutCurricula.length > 0 && (
                <Alert>
                    <AlertTriangle className="w-4 h-4" />
                    <AlertTitle>
                        {classesWithoutCurricula.length} {classesWithoutCurricula.length === 1 ? 'klass saknar' : 'klasser saknar'} kursplan
                    </AlertTitle>
                    <AlertDescription>
                        <p className="mb-3">
                            För att kunna generera schema behöver alla klasser ha sparade kursplaner.
                        </p>
                        <div className="flex items-center gap-3">
                            <Button
                                size="sm"
                                onClick={handleInitializeCurricula}
                                disabled={initializingCurricula}
                            >
                                {initializingCurricula ? (
                                    <><Loader2 className="w-4 h-4 animate-spin" /> Initierar...</>
                                ) : (
                                    <><RefreshCw className="w-4 h-4" /> Initiera alla kursplaner</>
                                )}
                            </Button>
                            <span className="text-xs text-muted-foreground">
                                {classesWithoutCurricula.map(c => c.classCode).join(', ')}
                            </span>
                        </div>
                        {initCurriculaMessage && (
                            <Alert variant={initCurriculaMessage.type === 'error' ? 'destructive' : 'default'} className="mt-3">
                                <AlertDescription>{initCurriculaMessage.text}</AlertDescription>
                            </Alert>
                        )}
                    </AlertDescription>
                </Alert>
            )}

            <CurriculumWorkbench />
        </div>
    );
}
