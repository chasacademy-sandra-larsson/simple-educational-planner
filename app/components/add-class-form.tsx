"use client";

import { useState, useEffect } from 'react';
import ProgramSelector from './program-selector';
import OrientationSelector from './orientation-selector';
import CourseSummary from './course-summary';
import { getPrograms, getOrientations, Program, Orientation } from '../lib/syllabus-api';
import { api, ApiError } from '../lib/api';

interface AddClassFormProps {
    projectId: string;
    onCancel: () => void;
    onSuccess: () => void;
}

type Step = 'class-code' | 'program' | 'orientation' | 'review';

export default function AddClassForm({ projectId, onCancel, onSuccess }: AddClassFormProps) {
    const [step, setStep] = useState<Step>('class-code');
    const [classCode, setClassCode] = useState('');
    const [startYear, setStartYear] = useState(new Date().getFullYear());
    const [selectedProgramCode, setSelectedProgramCode] = useState('');
    const [selectedOrientationCode, setSelectedOrientationCode] = useState('');
    const [programData, setProgramData] = useState<Program | null>(null);
    const [orientationData, setOrientationData] = useState<Orientation | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Fetch program details when selected
    useEffect(() => {
        if (selectedProgramCode) {
            getPrograms().then(programs => {
                const program = programs.find(p => p.code === selectedProgramCode);
                if (program) setProgramData(program);
            });
        }
    }, [selectedProgramCode]);

    // Fetch orientation details when selected
    useEffect(() => {
        if (selectedProgramCode && selectedOrientationCode) {
            getOrientations(selectedProgramCode).then(orientations => {
                const orientation = orientations.find(o => o.code === selectedOrientationCode);
                if (orientation) setOrientationData(orientation);
            });
        }
    }, [selectedProgramCode, selectedOrientationCode]);

    const handleProgramSelect = (programCode: string) => {
        setSelectedProgramCode(programCode);
        setSelectedOrientationCode('');
    };

    const handleOrientationSelect = (orientationCode: string) => {
        setSelectedOrientationCode(orientationCode);
    };

    const handleNext = () => {
        if (step === 'class-code' && classCode) {
            setStep('program');
        } else if (step === 'program' && selectedProgramCode) {
            // Check if program has orientations
            getOrientations(selectedProgramCode).then(orientations => {
                if (orientations.length > 0) {
                    setStep('orientation');
                } else {
                    setStep('review');
                }
            });
        } else if (step === 'orientation' && selectedOrientationCode) {
            setStep('review');
        }
    };

    const handleBack = () => {
        if (step === 'program') setStep('class-code');
        else if (step === 'orientation') setStep('program');
        else if (step === 'review') {
            // Go back to orientation if available, otherwise program
            if (selectedOrientationCode) setStep('orientation');
            else setStep('program');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!programData) return;

        setLoading(true);
        setError('');

        try {
            await api.projects.addClass(projectId, {
                classCode,
                programCode: selectedProgramCode,
                programName: programData.name,
                orientationCode: selectedOrientationCode || selectedProgramCode,
                orientationName: orientationData?.name || programData.name,
                startYear,
            });

            onSuccess();
        } catch (err) {
            if (err instanceof ApiError) {
                setError(err.message);
            } else {
                setError(err instanceof Error ? err.message : 'Failed to create class');
            }
        } finally {
            setLoading(false);
        }
    };

    const canProceed = {
        'class-code': classCode.trim() !== '',
        'program': selectedProgramCode !== '',
        'orientation': selectedOrientationCode !== '',
        'review': true,
    };

    return (
        <div className="p-4 bg-muted rounded-lg border border-border">
            {/* Header */}
            <div className="flex justify-between items-center mb-4">
                <div>
                    <h4 className="font-semibold text-foreground">Add New Class</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                        {step === 'class-code' && 'Step 1: Enter class details'}
                        {step === 'program' && 'Step 2: Select program'}
                        {step === 'orientation' && 'Step 3: Select orientation'}
                        {step === 'review' && 'Step 4: Review and create'}
                    </p>
                </div>
                <button
                    onClick={onCancel}
                    className="text-muted-foreground hover:text-foreground"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            {/* Error Message */}
            {error && (
                <div className="mb-4 p-3 bg-destructive/10 border border-destructive rounded text-sm text-destructive">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit}>
                {/* Step 1: Class Code */}
                {step === 'class-code' && (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                                Class Code *
                            </label>
                            <input
                                type="text"
                                value={classCode}
                                onChange={(e) => setClassCode(e.target.value)}
                                className="w-full px-3 py-2 rounded border border-border bg-card text-foreground"
                                placeholder="e.g., TE26, EK25"
                                autoFocus
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                                Start Year *
                            </label>
                            <input
                                type="number"
                                min="2020"
                                max="2050"
                                value={startYear}
                                onChange={(e) => setStartYear(parseInt(e.target.value))}
                                className="w-full px-3 py-2 rounded border border-border bg-card text-foreground"
                            />
                            <p className="mt-1 text-sm text-muted-foreground">
                                Graduation year: {startYear + 3}
                            </p>
                        </div>
                    </div>
                )}

                {/* Step 2: Program Selection */}
                {step === 'program' && (
                    <div>
                        <ProgramSelector onSelect={handleProgramSelect} />
                        {selectedProgramCode && programData && (
                            <div className="mt-4 p-3 bg-accent rounded">
                                <p className="text-sm text-primary">
                                    Selected: <strong>{programData.name}</strong> ({selectedProgramCode})
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {/* Step 3: Orientation Selection */}
                {step === 'orientation' && (
                    <div>
                        <OrientationSelector
                            programCode={selectedProgramCode}
                            onSelect={handleOrientationSelect}
                        />
                        {selectedOrientationCode && orientationData && (
                            <div className="mt-4 p-3 bg-accent rounded">
                                <p className="text-sm text-primary">
                                    Selected: <strong>{orientationData.name}</strong>
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {/* Step 4: Review */}
                {step === 'review' && (
                    <div className="space-y-4">
                        <div className="p-3 bg-muted rounded space-y-2">
                            <h5 className="font-semibold text-foreground text-sm">Class Details</h5>
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div>
                                    <span className="text-muted-foreground">Class Code:</span>
                                    <p className="font-medium text-foreground">{classCode}</p>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Start Year:</span>
                                    <p className="font-medium text-foreground">{startYear}</p>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Program:</span>
                                    <p className="font-medium text-foreground">{programData?.name}</p>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Orientation:</span>
                                    <p className="font-medium text-foreground">
                                        {orientationData?.name || 'N/A'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h5 className="font-semibold text-foreground mb-3 text-sm">Course Overview</h5>
                            <CourseSummary
                                programCode={selectedProgramCode}
                                orientationCode={selectedOrientationCode}
                            />
                        </div>
                    </div>
                )}

                {/* Navigation Buttons */}
                <div className="flex gap-2 mt-4 pt-4 border-t border-border">
                    <button
                        type="button"
                        onClick={step === 'class-code' ? onCancel : handleBack}
                        className="px-4 py-2 border border-border text-foreground rounded hover:bg-muted transition-colors"
                    >
                        {step === 'class-code' ? 'Cancel' : 'Back'}
                    </button>
                    {step !== 'review' ? (
                        <button
                            type="button"
                            onClick={handleNext}
                            disabled={!canProceed[step]}
                            className="px-4 py-2 bg-primary hover:bg-primary/90 disabled:bg-primary/50 disabled:cursor-not-allowed text-primary-foreground rounded transition-colors"
                        >
                            Next
                        </button>
                    ) : (
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-4 py-2 bg-primary hover:bg-primary/90 disabled:bg-primary/50 text-primary-foreground rounded transition-colors"
                        >
                            {loading ? 'Creating...' : 'Create Class'}
                        </button>
                    )}
                </div>
            </form>
        </div>
    );
}
