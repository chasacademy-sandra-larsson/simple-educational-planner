"use client";

import { useState } from 'react';
import { Plus, RefreshCw, Loader2, AlertTriangle } from 'lucide-react';
import { api, ApiError } from '@/app/lib/api';
import AddClassForm from '@/app/components/add-class-form';
import ComprehensiveCoursePlanner from '@/app/components/comprehensive-course-planner';
import { useProject } from '../ProjectContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';

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
        <div>
            {/* Add Class Form */}
            <div className="mb-6">
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

            {/* Initialize Curricula Section */}
            {classesWithoutCurricula.length > 0 && (
                <Alert className="mb-6">
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

            {/* Classes List */}
            <h3 className="text-lg font-semibold mb-4">Klasser</h3>
            {project.classes && project.classes.length > 0 ? (
                <Accordion>
                    {project.classes.map((cls) => (
                        <AccordionItem key={cls.id} value={cls.id}>
                            <AccordionTrigger className="px-4 py-3">
                                <div className="flex-1 text-left">
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium">{cls.classCode}</span>
                                        {cls.curriculum && cls.curriculum.courses && (
                                            <Badge variant={cls.curriculum.isValid ? 'default' : 'secondary'}>
                                                {Array.isArray(cls.curriculum.courses) ? cls.curriculum.courses.length : 0} kurser
                                            </Badge>
                                        )}
                                    </div>
                                    <div className="text-sm text-muted-foreground mt-1">
                                        {cls.programName}
                                        {cls.orientationName && cls.orientationName !== cls.programName && (
                                            <span className="text-xs"> &bull; {cls.orientationName}</span>
                                        )}
                                    </div>
                                    <div className="text-xs text-muted-foreground mt-1">
                                        {cls.startYear} - {cls.graduationYear}
                                    </div>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="px-4 pb-4">
                                <h4 className="text-base font-semibold mb-4">
                                    Kursplanering för {cls.classCode}
                                </h4>
                                <ComprehensiveCoursePlanner
                                    classId={cls.id}
                                    programCode={cls.programCode}
                                    orientationCode={cls.orientationCode}
                                    onSaveSuccess={() => fetchProject()}
                                    hasCurriculum={cls.curriculum && cls.curriculum.courses && Array.isArray(cls.curriculum.courses) && cls.curriculum.courses.length > 0}
                                />
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
            ) : (
                <div className="text-center py-12 text-muted-foreground">
                    Inga klasser ännu. Klicka på &quot;Lägg till klass&quot; ovan.
                </div>
            )}
        </div>
    );
}
