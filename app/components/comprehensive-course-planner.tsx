"use client";

import { useState, useEffect } from 'react';
import { DndContext, DragEndEvent, useDraggable, useDroppable } from '@dnd-kit/core';
import { getCoursesByOrientation, getProgramSpecializationSubjects, Course } from '../lib/syllabus-api';
import { api, ApiError, type CourseAssignment } from '../lib/api';

interface ComprehensiveCoursePlannerProps {
    classId: string;
    programCode: string;
    orientationCode: string;
    onSaveSuccess?: () => void;
    hasCurriculum?: boolean;
}

type PlanningStep = 
    | 'settings' 
    | 'common-subjects' 
    | 'program-subjects' 
    | 'specialization' 
    | 'individual-choice' 
    | 'gymnasiearbete' 
    | 'distribute-terms' 
    | 'validate';

type TermId = "term1" | "term2" | "term3" | "term4" | "term5" | "term6" | "year1" | "year2" | "year3" | "unassigned";

interface CourseWithTerm {
    courseCode: string;
    courseName: string;
    points: number;
    category: string;
    term?: TermId; // Kept for backward compatibility and UI state
    terms?: TermId[]; // Array of terms - preferred way to represent courses spanning multiple terms
    level?: string; // e.g., "1a", "1b", "1c" for Math
}

const TERM_LABELS = {
    term1: "Termin 1 (År 1, HT)",
    term2: "Termin 2 (År 1, VT)",
    term3: "Termin 3 (År 2, HT)",
    term4: "Termin 4 (År 2, VT)",
    term5: "Termin 5 (År 3, HT)",
    term6: "Termin 6 (År 3, VT)",
    year1: "År 1 (Termin 1-2)",
    year2: "År 2 (Termin 3-4)",
    year3: "År 3 (Termin 5-6)",
    unassigned: "Ej tilldelade kurser",
};

const CATEGORY_LABELS = {
    FOUNDATIONAL_SUBJECTS: "Gymnasiegemensamma ämnen",
    PROGRAMME_SPECIFIC_SUBJECTS: "Programgemensamma ämnen",
    ORIENTATION: "Inriktningsämnen",
    INDIVIDUAL_CHOICE: "Individuellt val",
    GYMNASIEARBETE: "Gymnasiearbete",
};

export default function ComprehensiveCoursePlanner({
    classId,
    programCode,
    orientationCode,
    onSaveSuccess,
    hasCurriculum = false,
}: ComprehensiveCoursePlannerProps) {
    const [currentStep, setCurrentStep] = useState<PlanningStep>('settings');
    const [courses, setCourses] = useState<Course[]>([]);
    const [specializationSubjects, setSpecializationSubjects] = useState<Course[]>([]);
    const [selectedCourses, setSelectedCourses] = useState<CourseWithTerm[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);
    const [numTerms, setNumTerms] = useState(6); // Default 6 terms over 3 years

    useEffect(() => {
        if (!programCode || !orientationCode) return;

        async function fetchCourses() {
            setLoading(true);
            setError('');
            try {
                const [allCourses, specialization] = await Promise.all([
                    getCoursesByOrientation(programCode, orientationCode),
                    getProgramSpecializationSubjects(programCode),
                ]);
                console.log("Fetched courses:", {
                    allCourses: allCourses.length,
                    specialization: specialization.length,
                    orientationCourses: allCourses.filter(c => c.category === 'ORIENTATION').length,
                });
                setCourses(allCourses);
                setSpecializationSubjects(specialization);
                
                // Auto-select foundational and programme-specific subjects
                const autoSelectedCourses: CourseWithTerm[] = allCourses
                    .filter(c => 
                        c.category === 'FOUNDATIONAL_SUBJECTS' || 
                        c.category === 'PROGRAMME_SPECIFIC_SUBJECTS'
                    )
                    .map(course => ({
                        courseCode: course.courseCode,
                        courseName: course.name,
                        points: course.points,
                        category: course.category || '',
                    }));
                
                // Auto-add Individual Choice (200 points)
                autoSelectedCourses.push({
                    courseCode: 'INDIVIDUAL_CHOICE',
                    courseName: 'Individuellt val',
                    points: 200,
                    category: 'INDIVIDUAL_CHOICE',
                });
                
                // Auto-select default specialization courses for testing (400p)
                // Exact course codes that should be pre-selected
                const defaultSpecializationTargets = [
                    { code: 'WEBB2000X', name: 'Webbutveckling 2', points: 100 },
                    { code: 'WEBS1000X', name: 'Webbserverprogrammering 1', points: 100 },
                    { code: 'PROG2000X', name: 'Programmering 2', points: 100 },
                    { code: 'TILL1000X', name: 'Tillämpad programmering 1', points: 100 },
                ];
                
                // Find default specialization courses by course code
                const defaultSpecializationFullCourses: Course[] = [];
                const defaultSpecializationCourses: CourseWithTerm[] = [];
                
                defaultSpecializationTargets.forEach(target => {
                    // Try to find course by exact course code
                    let foundCourse = allCourses.find(course => course.courseCode === target.code);
                    
                    if (foundCourse) {
                        // Course found - use it
                        defaultSpecializationFullCourses.push(foundCourse);
                        defaultSpecializationCourses.push({
                            courseCode: foundCourse.courseCode,
                            courseName: foundCourse.name,
                            points: foundCourse.points,
                            category: 'ORIENTATION',
                        });
                        console.log(`✅ Found course: ${foundCourse.courseCode} - ${foundCourse.name} (${foundCourse.points}p)`);
                    } else {
                        // Course not found by code - create a Course object anyway so it can be selected
                        // This ensures the course is available even if API doesn't return it
                        const courseToAdd: Course = {
                            courseCode: target.code,
                            name: target.name,
                            points: target.points,
                            category: 'ORIENTATION',
                            subjectName: 'Programmering', // Default subject name
                        };
                        defaultSpecializationFullCourses.push(courseToAdd);
                        defaultSpecializationCourses.push({
                            courseCode: target.code,
                            courseName: target.name,
                            points: target.points,
                            category: 'ORIENTATION',
                        });
                        console.log(`⚠️ Course ${target.code} not found in API, but adding it anyway: ${target.name} (${target.points}p)`);
                    }
                });
                
                console.log('=== DEFAULT SPECIALIZATION COURSES ===');
                console.log('Target courses:', defaultSpecializationTargets.map(t => `${t.code} - ${t.name}`));
                console.log('Found courses:', defaultSpecializationCourses.length);
                defaultSpecializationCourses.forEach(c => {
                    console.log(`  ✓ ${c.courseName} (${c.courseCode}) - ${c.points}p`);
                });
                if (defaultSpecializationCourses.length < defaultSpecializationTargets.length) {
                    console.warn(`⚠️ Only found ${defaultSpecializationCourses.length} out of ${defaultSpecializationTargets.length} target courses`);
                    const foundCodes = defaultSpecializationCourses.map(c => c.courseCode);
                    const missingTargets = defaultSpecializationTargets.filter(t => !foundCodes.includes(t.code));
                    console.warn('Missing courses:', missingTargets.map(t => `${t.code} - ${t.name}`));
                    console.warn('All available ORIENTATION courses:', allCourses.filter(c => c.category === 'ORIENTATION').map(c => `${c.courseCode} - ${c.name}`));
                }
                
                // Add default specialization courses to specializationSubjects if they're not already there
                // This ensures they show up in the SpecializationStep UI
                const updatedSpecialization = [...specialization];
                defaultSpecializationFullCourses.forEach(fullCourse => {
                    if (!updatedSpecialization.find(s => s.courseCode === fullCourse.courseCode)) {
                        updatedSpecialization.push(fullCourse);
                    }
                });
                setSpecializationSubjects(updatedSpecialization);
                
                // Add default specialization courses to auto-selected courses (avoid duplicates)
                defaultSpecializationCourses.forEach(course => {
                    const existingIndex = autoSelectedCourses.findIndex(c => c.courseCode === course.courseCode);
                    if (existingIndex === -1) {
                        // Course not found, add it
                        autoSelectedCourses.push(course);
                    } else {
                        // Course already exists, update it to ensure it has ORIENTATION category
                        autoSelectedCourses[existingIndex] = {
                            ...autoSelectedCourses[existingIndex],
                            category: 'ORIENTATION',
                        };
                    }
                });
                
                console.log('Total selected courses:', autoSelectedCourses.length);
                console.log('Selected ORIENTATION courses:', autoSelectedCourses.filter(c => c.category === 'ORIENTATION').map(c => `${c.courseName} (${c.courseCode})`));
                
                // Distribute courses evenly across terms (default distribution)
                // Exclude INDIVIDUAL_CHOICE and GYMNASIEARBETE from automatic distribution
                const coursesToDistribute = autoSelectedCourses.filter(c => 
                    c.courseCode !== 'INDIVIDUAL_CHOICE' && 
                    c.courseCode !== 'GYMNASIEARBETE'
                );
                
                // Sort courses by points (largest first) for better distribution
                const sortedCourses = [...coursesToDistribute].sort((a, b) => b.points - a.points);
                
                // Initialize term point counters
                const terms: TermId[] = ['term1', 'term2', 'term3', 'term4', 'term5', 'term6'];
                const termPoints: Record<TermId, number> = {
                    term1: 0,
                    term2: 0,
                    term3: 0,
                    term4: 0,
                    term5: 0,
                    term6: 0,
                    year1: 0,
                    year2: 0,
                    year3: 0,
                    unassigned: 0,
                };
                
                // Distribute courses to terms by finding the term with least points
                const distributedCourses = sortedCourses.map(course => {
                    // Find term with minimum points
                    const termWithMinPoints = terms.reduce((minTerm, term) => 
                        termPoints[term] < termPoints[minTerm] ? term : minTerm
                    );
                    
                    // Update term points counter
                    termPoints[termWithMinPoints] += course.points;
                    
                    return {
                        ...course,
                        term: termWithMinPoints, // Keep for backward compatibility
                        terms: [termWithMinPoints], // Also set terms array
                    };
                });
                
                // Add back INDIVIDUAL_CHOICE and GYMNASIEARBETE
                // INDIVIDUAL_CHOICE: distribute evenly (can be split across terms)
                // GYMNASIEARBETE: assign to term6 by default (user can change in gymnasiearbete step)
                const individualChoice = autoSelectedCourses.find(c => c.courseCode === 'INDIVIDUAL_CHOICE');
                const gymnasiearbete = autoSelectedCourses.find(c => c.courseCode === 'GYMNASIEARBETE');
                
                const finalCourses: CourseWithTerm[] = [...distributedCourses];
                
                // INDIVIDUAL_CHOICE: distribute to the term with least points (usually term6 for balance)
                if (individualChoice) {
                    const termWithMinPoints = terms.reduce((minTerm, term) => 
                        termPoints[term] < termPoints[minTerm] ? term : minTerm
                    );
                    finalCourses.push({ 
                        ...individualChoice, 
                        term: termWithMinPoints, // Keep for backward compatibility
                        terms: [termWithMinPoints], // Also set terms array
                    });
                    termPoints[termWithMinPoints] += individualChoice.points; // Update counter
                }
                
                // GYMNASIEARBETE: assign to term6 by default (standard placement)
                // Category should be PROGRAMME_SPECIFIC_SUBJECTS (programgemensamma ämnen)
                if (gymnasiearbete) {
                    finalCourses.push({ 
                        ...gymnasiearbete, 
                        term: 'term6' as TermId, // Keep for backward compatibility
                        terms: ['term6'], // Also set terms array
                        category: 'PROGRAMME_SPECIFIC_SUBJECTS',
                    });
                }
                
                console.log('Distributed courses across terms:', terms.map(term => ({
                    term,
                    points: termPoints[term],
                    courses: distributedCourses.filter(c => c.term === term).length
                })));
                
                setSelectedCourses(finalCourses); // Create new array to trigger re-render
            } catch (err) {
                setError('Kunde inte ladda kurser');
                console.error(err);
            } finally {
                setLoading(false);
            }
        }

        fetchCourses();
    }, [programCode, orientationCode]);
    
    // Debug: Log selected courses when they change
    useEffect(() => {
        const targetCourseCodes = ['WEBB2000X', 'WEBS1000X', 'PROG2000X', 'TILL1000X'];
        const foundTargetCourses = selectedCourses.filter(c => targetCourseCodes.includes(c.courseCode));
        if (foundTargetCourses.length > 0) {
            console.log('✅ Target specialization courses ARE in selectedCourses:', foundTargetCourses.map(c => `${c.courseName} (${c.courseCode})`));
        } else {
            console.log('❌ Target specialization courses NOT found in selectedCourses. Current ORIENTATION courses:', 
                selectedCourses.filter(c => c.category === 'ORIENTATION').map(c => `${c.courseName} (${c.courseCode})`));
        }
    }, [selectedCourses]);

    // Automatically add gymnasiearbete when entering the program-subjects step if it's not already there
    useEffect(() => {
        if (currentStep === 'program-subjects') {
            setSelectedCourses(prev => {
                const gymnasiearbeteExists = prev.some(c => c.courseCode === 'GYMNASIEARBETE');
                if (!gymnasiearbeteExists) {
                    // Automatically add gymnasiearbete (will be placed in gymnasiearbete step)
                    return [
                        ...prev,
                        {
                            courseCode: 'GYMNASIEARBETE',
                            courseName: 'Gymnasiearbete',
                            points: 100,
                            category: 'PROGRAMME_SPECIFIC_SUBJECTS',
                        },
                    ];
                }
                return prev;
            });
        }
    }, [currentStep]);

    // Automatically set term for gymnasiearbete when entering the gymnasiearbete step if it doesn't have a term
    useEffect(() => {
        if (currentStep === 'gymnasiearbete') {
            setSelectedCourses(prev => {
                const gymnasiearbete = prev.find(c => c.courseCode === 'GYMNASIEARBETE');
                if (gymnasiearbete && !gymnasiearbete.term) {
                    // Automatically set default term6 if not already set
                    return prev.map(c =>
                        c.courseCode === 'GYMNASIEARBETE'
                            ? { ...c, term: 'term6', terms: ['term6'] }
                            : c
                    );
                }
                return prev;
            });
        }
    }, [currentStep]);

    const handleTermChange = (courseCode: string, term: TermId | 'unassigned') => {
        // Legacy function for single term selection - converts to terms array
        if (term === 'unassigned') {
            handleTermsChange(courseCode, []);
        } else if (term.startsWith('term')) {
            handleTermsChange(courseCode, [term as TermId]);
        } else if (term.startsWith('year')) {
            // Convert year to terms
            const yearTerms: TermId[] = term === 'year1' ? ['term1', 'term2'] : 
                            term === 'year2' ? ['term3', 'term4'] : 
                            ['term5', 'term6'];
            handleTermsChange(courseCode, yearTerms);
        } else {
            handleTermsChange(courseCode, []);
        }
    };

    const handleTermsChange = (courseCode: string, terms: TermId[]) => {
        setSelectedCourses((prev) =>
            prev.map((course) => {
                if (course.courseCode === courseCode) {
                    // Filter out non-term values (year, unassigned) and keep only term1-term6
                    const termIds = terms.filter(t => t.startsWith('term')) as ("term1" | "term2" | "term3" | "term4" | "term5" | "term6")[];
                    
                    // For backward compatibility, set term to first term if exists, or undefined
                    const firstTerm = termIds.length > 0 ? termIds[0] : undefined;
                    
                    return { 
                        ...course, 
                        term: firstTerm, // Keep for backward compatibility
                        terms: termIds.length > 0 ? termIds : undefined,
                    };
                }
                return course;
            })
        );
    };

    const handleNext = () => {
        const steps: PlanningStep[] = [
            'settings',
            'common-subjects',
            'program-subjects',
            'specialization',
            'individual-choice',
            'gymnasiearbete',
            'distribute-terms',
            'validate',
        ];
        const currentIndex = steps.indexOf(currentStep);
        if (currentIndex < steps.length - 1) {
            setCurrentStep(steps[currentIndex + 1]);
        }
    };

    const handleBack = () => {
        const steps: PlanningStep[] = [
            'settings',
            'common-subjects',
            'program-subjects',
            'specialization',
            'individual-choice',
            'gymnasiearbete',
            'distribute-terms',
            'validate',
        ];
        const currentIndex = steps.indexOf(currentStep);
        if (currentIndex > 0) {
            setCurrentStep(steps[currentIndex - 1]);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        setError('');

        try {
            const courseAssignments: CourseAssignment[] = selectedCourses
                .filter(c => {
                    // Filter out unassigned courses
                    if (c.term === 'unassigned' || (!c.term && (!c.terms || c.terms.length === 0))) {
                        return false;
                    }
                    return true;
                })
                .map(course => {
                    // Get terms array - prefer course.terms, fallback to course.term converted to array
                    let terms: ("term1" | "term2" | "term3" | "term4" | "term5" | "term6")[] = [];
                    
                    if (course.terms && course.terms.length > 0) {
                        // Use terms array directly (filter out year/unassigned values)
                        terms = course.terms.filter((t): t is "term1" | "term2" | "term3" | "term4" | "term5" | "term6" => 
                            t.startsWith('term') && ['term1', 'term2', 'term3', 'term4', 'term5', 'term6'].includes(t)
                        ) as ("term1" | "term2" | "term3" | "term4" | "term5" | "term6")[];
                    } else if (course.term && course.term.startsWith('term')) {
                        // Convert single term to array
                        terms = [course.term as "term1" | "term2" | "term3" | "term4" | "term5" | "term6"];
                    } else if (course.term?.startsWith('year')) {
                        // Convert year to terms array
                        if (course.term === 'year1') {
                            terms = ['term1', 'term2'];
                        } else if (course.term === 'year2') {
                            terms = ['term3', 'term4'];
                        } else if (course.term === 'year3') {
                            terms = ['term5', 'term6'];
                        }
                    }

                    // Calculate year from terms (use first term's year as primary year)
                    let year: 1 | 2 | 3 = 1;
                    if (terms.length > 0) {
                        const firstTerm = terms[0];
                        if (firstTerm === 'term1' || firstTerm === 'term2') {
                            year = 1;
                        } else if (firstTerm === 'term3' || firstTerm === 'term4') {
                            year = 2;
                        } else if (firstTerm === 'term5' || firstTerm === 'term6') {
                            year = 3;
                        }
                    }

                    return {
                        courseCode: course.courseCode,
                        courseName: course.courseName,
                        points: course.points,
                        category: course.category as CourseAssignment['category'],
                        year: year,
                        terms: terms,
                    };
                });

            await api.projects.updateCurriculum(classId, {
                courses: courseAssignments,
            });

            onSaveSuccess?.();
        } catch (err) {
            if (err instanceof ApiError) {
                setError(err.message);
            } else {
                setError(err instanceof Error ? err.message : 'Kunde inte spara kursplan');
            }
        } finally {
            setSaving(false);
        }
    };

    const getTotalPoints = (): number => {
        return selectedCourses.reduce((sum, course) => sum + course.points, 0);
    };

    const getPointsByTerm = (termId: TermId): number => {
        return selectedCourses
            .filter(c => {
                // Check if course is in this term using terms array or fallback to term
                if (c.terms && c.terms.length > 0) {
                    return c.terms.includes(termId as any);
                }
                // Fallback to single term (backward compatibility)
                return c.term === termId;
            })
            .reduce((sum, course) => sum + course.points, 0);
    };

    const getPointsByCategory = (category: string): number => {
        return selectedCourses
            .filter(c => c.category === category)
            .reduce((sum, course) => sum + course.points, 0);
    };

    const totalPoints = getTotalPoints();
    // Allow saving even if total points is not exactly 2500
    const isValidTotal = true; // Always allow saving

    if (loading) {
        return <div className="p-8 text-center text-zinc-500">Laddar kurser...</div>;
    }

    if (error && !saving) {
        return (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-red-800 dark:text-red-200">
                {error}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Progress Indicator */}
            <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-4">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                        Steg {getStepNumber(currentStep)} av 8: {getStepTitle(currentStep)}
                    </h3>
                    <div className="text-sm text-zinc-600 dark:text-zinc-400">
                        Totalt: <span className={`font-bold ${isValidTotal ? 'text-green-600' : 'text-zinc-900 dark:text-zinc-100'}`}>{totalPoints}</span> / 2500 poäng
                    </div>
                </div>
                <div className="w-full bg-zinc-200 dark:bg-zinc-700 rounded-full h-2">
                    <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${((getStepNumber(currentStep) - 1) / 7) * 100}%` }}
                    />
                </div>
            </div>

            {/* Step Content */}
            <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6">
                {currentStep === 'settings' && (
                    <SettingsStep
                        programCode={programCode}
                        orientationCode={orientationCode}
                        numTerms={numTerms}
                        onNumTermsChange={setNumTerms}
                    />
                )}

                {currentStep === 'common-subjects' && (
                    <CommonSubjectsStep
                        courses={courses}
                        selectedCourses={selectedCourses}
                        onCoursesChange={setSelectedCourses}
                    />
                )}

                {currentStep === 'program-subjects' && (
                    <ProgramSubjectsStep
                        courses={courses}
                        selectedCourses={selectedCourses}
                        onCoursesChange={setSelectedCourses}
                    />
                )}

                {currentStep === 'specialization' && (
                    <SpecializationStep
                        specializationSubjects={
                            specializationSubjects.length > 0 
                                ? specializationSubjects 
                                : courses.filter(c => c.category === 'ORIENTATION' && c.subjectName)
                        }
                        selectedCourses={selectedCourses}
                        onCoursesChange={setSelectedCourses}
                        currentPoints={getPointsByCategory('ORIENTATION')}
                    />
                )}

                {currentStep === 'individual-choice' && (
                    <IndividualChoiceStep
                        selectedCourses={selectedCourses}
                        onCoursesChange={setSelectedCourses}
                        currentPoints={getPointsByCategory('INDIVIDUAL_CHOICE')}
                    />
                )}

                {currentStep === 'gymnasiearbete' && (
                    <GymnasiearbeteStep
                        selectedCourses={selectedCourses}
                        onCoursesChange={setSelectedCourses}
                        numTerms={numTerms}
                    />
                )}

                {currentStep === 'distribute-terms' && (
                    <DistributeTermsStep
                        selectedCourses={selectedCourses}
                        onTermChange={handleTermChange}
                        onTermsChange={handleTermsChange}
                        numTerms={numTerms}
                    />
                )}

                {currentStep === 'validate' && (
                    <ValidateStep
                        selectedCourses={selectedCourses}
                        totalPoints={totalPoints}
                        pointsByTerm={getPointsByTerm}
                        isValid={isValidTotal}
                    />
                )}
            </div>

            {/* Navigation Buttons */}
            <div className="flex justify-between items-center pt-4 border-t border-zinc-200 dark:border-zinc-600">
                <button
                    onClick={handleBack}
                    disabled={currentStep === 'settings'}
                    className="px-6 py-2 border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Tillbaka
                </button>

                {currentStep === 'validate' ? (
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
                    >
                        {saving ? 'Sparar...' : 'Spara kursplan'}
                    </button>
                ) : (
                    <button
                        onClick={handleNext}
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                    >
                        Nästa
                    </button>
                )}
            </div>
        </div>
    );
}

// Helper functions
function getStepNumber(step: PlanningStep): number {
    const stepMap: Record<PlanningStep, number> = {
        settings: 1,
        'common-subjects': 2,
        'program-subjects': 3,
        specialization: 4,
        'individual-choice': 5,
        gymnasiearbete: 6,
        'distribute-terms': 7,
        validate: 8,
    };
    return stepMap[step];
}

function getStepTitle(step: PlanningStep): string {
    const titles: Record<PlanningStep, string> = {
        settings: 'Välj grundinställningar',
        'common-subjects': 'Granska gymnasiegemensamma ämnen',
        'program-subjects': 'Konfigurera programgemensamma ämnen',
        specialization: 'Planera programfördjupning',
        'individual-choice': 'Lägg till individuellt val',
        gymnasiearbete: 'Placera gymnasiearbete',
        'distribute-terms': 'Fördela kurser över terminer',
        validate: 'Validera och granska',
    };
    return titles[step];
}

// Step Components
interface SettingsStepProps {
    programCode: string;
    orientationCode: string;
    numTerms: number;
    onNumTermsChange: (num: number) => void;
}

function SettingsStep({ programCode, orientationCode, numTerms, onNumTermsChange }: SettingsStepProps) {
    return (
        <div className="space-y-6">
            <h4 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
                Grundinställningar
            </h4>

            <div className="space-y-4">
                <div className="p-4 bg-zinc-50 dark:bg-zinc-700/50 rounded-lg">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <span className="text-zinc-600 dark:text-zinc-400">Program:</span>
                            <p className="font-medium text-zinc-900 dark:text-zinc-100">{programCode}</p>
                        </div>
                        <div>
                            <span className="text-zinc-600 dark:text-zinc-400">Inriktning:</span>
                            <p className="font-medium text-zinc-900 dark:text-zinc-100">{orientationCode}</p>
                        </div>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                        Antal terminer
                    </label>
                    <select
                        value={numTerms}
                        onChange={(e) => onNumTermsChange(parseInt(e.target.value))}
                        className="w-full px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100"
                    >
                        <option value={6}>6 terminer (3 år)</option>
                        <option value={4}>4 terminer (2 år)</option>
                    </select>
                    <p className="mt-1 text-sm text-zinc-500">
                        Standard är 6 terminer över 3 år
                    </p>
                </div>
            </div>
        </div>
    );
}

interface CommonSubjectsStepProps {
    courses: Course[];
    selectedCourses: CourseWithTerm[];
    onCoursesChange: (courses: CourseWithTerm[]) => void;
}

function CommonSubjectsStep({ courses, selectedCourses, onCoursesChange }: CommonSubjectsStepProps) {
    const commonCourses = courses.filter(c => c.category === 'FOUNDATIONAL_SUBJECTS');

    // Group Swedish courses by level (1, 2, 3)
    const groupedCourses: Array<Course | Course[]> = [];
    const processedIndices = new Set<number>();

    for (let i = 0; i < commonCourses.length; i++) {
        if (processedIndices.has(i)) continue;

        const course = commonCourses[i];
        const courseNameLower = course.name.toLowerCase();
        
        // Check if this is a Swedish course
        if (courseNameLower.includes('svenska')) {
            // Extract level number (1, 2, 3) from course name
            const levelMatch = course.name.match(/(\d+)/);
            const level = levelMatch ? levelMatch[1] : null;
            
            if (level) {
                // Find all Swedish courses with the same level
                const swedishCourses = [course];
                for (let j = i + 1; j < commonCourses.length; j++) {
                    if (processedIndices.has(j)) continue;
                    const otherCourse = commonCourses[j];
                    const otherNameLower = otherCourse.name.toLowerCase();
                    const otherLevelMatch = otherCourse.name.match(/(\d+)/);
                    const otherLevel = otherLevelMatch ? otherLevelMatch[1] : null;
                    
                    if (otherNameLower.includes('svenska') && otherLevel === level) {
                        swedishCourses.push(otherCourse);
                        processedIndices.add(j);
                    }
                }
                processedIndices.add(i);
                groupedCourses.push(swedishCourses);
            } else {
                // No level found, treat as single course
                processedIndices.add(i);
                groupedCourses.push(course);
            }
        } else {
            processedIndices.add(i);
            groupedCourses.push(course);
        }
    }

    const toggleCourse = (course: Course) => {
        const exists = selectedCourses.find(c => c.courseCode === course.courseCode);
        if (exists) {
            onCoursesChange(selectedCourses.filter(c => c.courseCode !== course.courseCode));
        } else {
            onCoursesChange([
                ...selectedCourses,
                {
                    courseCode: course.courseCode,
                    courseName: course.name,
                    points: course.points,
                    category: 'FOUNDATIONAL_SUBJECTS',
                },
            ]);
        }
    };

    const totalPoints = selectedCourses
        .filter(c => c.category === 'FOUNDATIONAL_SUBJECTS')
        .reduce((sum, c) => sum + c.points, 0);

    return (
        <div className="space-y-6">
            <div>
                <h4 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                    Gymnasiegemensamma ämnen
                </h4>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Välj obligatoriska kurser och nivåer där det finns valmöjlighet
                </p>
            </div>

            <div className="space-y-3">
                {groupedCourses.map((courseOrGroup, index) => {
                    // If it's an array, it's a grouped Swedish course (e.g. Svenska / Svenska som andraspråk)
                    if (Array.isArray(courseOrGroup)) {
                        const swedishCourses = courseOrGroup;
                        const isAnySelected = swedishCourses.some(c =>
                            selectedCourses.some(sc => sc.courseCode === c.courseCode)
                        );

                        // Build combined label, e.g. "Svenska 1 / Svenska som andraspråk 1"
                        const displayName = swedishCourses.map(c => c.name).join(' / ');
                        const displayCodes = swedishCourses.map(c => c.courseCode).join(', ');
                        const representative = swedishCourses[0];
                        const isSelected = selectedCourses.some(c => c.courseCode === representative.courseCode);

                        return (
                            <div
                                key={`swedish-group-${index}`}
                                className={`p-4 rounded-lg border cursor-pointer transition-all ${
                                    isAnySelected || isSelected
                                        ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700'
                                        : 'bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 hover:border-blue-300'
                                }`}
                                onClick={() => toggleCourse(representative)}
                            >
                                <div className="flex justify-between items-center">
                                    <div>
                                        <div className="font-medium text-zinc-900 dark:text-zinc-100">
                                            {displayName}
                                        </div>
                                        <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                                            {displayCodes}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                                            {representative.points} poäng
                                        </span>
                                        {(isAnySelected || isSelected) && (
                                            <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    }

                    // Single course (not grouped)
                    const course = courseOrGroup as Course;
                    const isSelected = selectedCourses.some(c => c.courseCode === course.courseCode);
                    return (
                        <div
                            key={course.courseCode}
                            className={`p-4 rounded-lg border cursor-pointer transition-all ${
                                isSelected
                                    ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700'
                                    : 'bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 hover:border-blue-300'
                            }`}
                            onClick={() => toggleCourse(course)}
                        >
                            <div className="flex justify-between items-center">
                                <div>
                                    <div className="font-medium text-zinc-900 dark:text-zinc-100">
                                        {course.name}
                                    </div>
                                    <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                                        {course.courseCode}
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                                        {course.points} poäng
                                    </span>
                                    {isSelected && (
                                        <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="p-4 bg-zinc-50 dark:bg-zinc-700/50 rounded-lg">
                <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        Totalt gymnasiegemensamma ämnen:
                    </span>
                    <span className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                        {totalPoints} poäng
                    </span>
                </div>
            </div>
        </div>
    );
}

interface ProgramSubjectsStepProps {
    courses: Course[];
    selectedCourses: CourseWithTerm[];
    onCoursesChange: (courses: CourseWithTerm[]) => void;
}

function ProgramSubjectsStep({ courses, selectedCourses, onCoursesChange }: ProgramSubjectsStepProps) {
    const programCourses = courses.filter(c => c.category === 'PROGRAMME_SPECIFIC_SUBJECTS');
    
    // Add Gymnasiearbete to the list of program courses (it's part of programgemensamma ämnen)
    // Gymnasiearbete should always be shown here, even if not in the API response
    const gymnasiearbeteCourse: Course = {
        courseCode: 'GYMNASIEARBETE',
        name: 'Gymnasiearbete',
        points: 100,
        category: 'PROGRAMME_SPECIFIC_SUBJECTS',
    };
    
    // Combine API courses with Gymnasiearbete, avoiding duplicates (if API already includes it)
    const allProgramCourses = [
        ...programCourses,
        ...(programCourses.some(c => c.courseCode === 'GYMNASIEARBETE') ? [] : [gymnasiearbeteCourse])
    ];

    const toggleCourse = (course: Course) => {
        // Gymnasiearbete cannot be deselected - it's mandatory
        if (course.courseCode === 'GYMNASIEARBETE') {
            return;
        }
        
        const exists = selectedCourses.find(c => c.courseCode === course.courseCode);
        if (exists) {
            onCoursesChange(selectedCourses.filter(c => c.courseCode !== course.courseCode));
        } else {
            onCoursesChange([
                ...selectedCourses,
                {
                    courseCode: course.courseCode,
                    courseName: course.name,
                    points: course.points,
                    category: 'PROGRAMME_SPECIFIC_SUBJECTS',
                },
            ]);
        }
    };

    const totalPoints = selectedCourses
        .filter(c => c.category === 'PROGRAMME_SPECIFIC_SUBJECTS')
        .reduce((sum, c) => sum + c.points, 0);

    return (
        <div className="space-y-6">
            <div>
                <h4 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                    Programgemensamma ämnen
                </h4>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Välj programmets kärnämnen
                </p>
            </div>

            <div className="space-y-3">
                {allProgramCourses.map((course) => {
                    const isSelected = selectedCourses.some(c => c.courseCode === course.courseCode);
                    const isGymnasiearbete = course.courseCode === 'GYMNASIEARBETE';
                    return (
                        <div
                            key={course.courseCode}
                            className={`p-4 rounded-lg border transition-all ${
                                isSelected
                                    ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700'
                                    : 'bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 hover:border-blue-300'
                            } ${isGymnasiearbete ? '' : 'cursor-pointer'}`}
                            onClick={() => !isGymnasiearbete && toggleCourse(course)}
                        >
                            <div className="flex justify-between items-center">
                                <div>
                                    <div className="font-medium text-zinc-900 dark:text-zinc-100">
                                        {course.name}
                                    </div>
                                    <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                                        {course.courseCode}
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                                        {course.points} poäng
                                    </span>
                                    {isSelected && (
                                        <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="p-4 bg-zinc-50 dark:bg-zinc-700/50 rounded-lg">
                <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        Totalt programgemensamma ämnen:
                    </span>
                    <span className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                        {totalPoints} poäng
                    </span>
                </div>
            </div>
        </div>
    );
}

interface SpecializationStepProps {
    specializationSubjects: Course[];
    selectedCourses: CourseWithTerm[];
    onCoursesChange: (courses: CourseWithTerm[]) => void;
    currentPoints: number;
}

function SpecializationStep({ specializationSubjects, selectedCourses, onCoursesChange, currentPoints }: SpecializationStepProps) {
    console.log("SpecializationStep - received subjects:", specializationSubjects.length, specializationSubjects);
    console.log("SpecializationStep - selectedCourses:", selectedCourses.length);
    const selectedOrientationCourses = selectedCourses.filter(c => c.category === 'ORIENTATION');
    console.log("SpecializationStep - selected ORIENTATION courses:", selectedOrientationCourses.map(c => `${c.courseName} (${c.courseCode})`));
    
    // Target course codes that should be selected
    const targetCourseCodes = ['WEBB2000X', 'WEBS1000X', 'PROG2000X', 'TILL1000X'];
    const targetSelected = selectedCourses.filter(c => targetCourseCodes.includes(c.courseCode));
    console.log("SpecializationStep - target courses selected:", targetSelected.length, targetSelected.map(c => `${c.courseName} (${c.courseCode})`));

    // Group courses by subject
    const coursesBySubject = specializationSubjects.reduce((acc, course) => {
        const subjectName = course.subjectName || 'Övriga kurser';
        if (!acc[subjectName]) {
            acc[subjectName] = [];
        }
        acc[subjectName].push(course);
        return acc;
    }, {} as Record<string, Course[]>);

    const toggleCourse = (course: Course) => {
        const exists = selectedCourses.find(c => c.courseCode === course.courseCode);
        if (exists) {
            onCoursesChange(selectedCourses.filter(c => c.courseCode !== course.courseCode));
        } else {
            onCoursesChange([
                ...selectedCourses,
                {
                    courseCode: course.courseCode,
                    courseName: course.name,
                    points: course.points,
                    category: 'ORIENTATION',
                },
            ]);
        }
    };

    const getSubjectPoints = (subjectName: string): number => {
        return coursesBySubject[subjectName]
            .filter(course => selectedCourses.some(sc => sc.courseCode === course.courseCode))
            .reduce((sum, course) => sum + course.points, 0);
    };

    const targetRange = { min: 400, max: 600 };
    const isInRange = currentPoints >= targetRange.min && currentPoints <= targetRange.max;

    return (
        <div className="space-y-6">
            <div>
                <h4 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                    Planera programfördjupning
                </h4>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-2">
                    Välj vilka ämnen som ska fördjupas och specifika kurser för fördjupning. Kontrollera att poängkraven uppfylls (ofta 400-600 poäng).
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-500 italic">
                    Enligt Skolverket: "Ämnen och nivåer i dessa ämnen som får erbjudas som programfördjupning inom programmet"
                </p>
            </div>

            <div className={`p-4 rounded-lg border ${
                isInRange
                    ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700'
                    : currentPoints < targetRange.min
                        ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700'
                        : 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700'
            }`}>
                <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">
                        Totalt fördjupning: {currentPoints} poäng
                    </span>
                    <span className="text-xs">
                        Mål: {targetRange.min}-{targetRange.max} poäng
                        {!isInRange && (
                            <span className="ml-2">
                                {currentPoints < targetRange.min 
                                    ? `(Saknas ${targetRange.min - currentPoints} poäng)`
                                    : `(${currentPoints - targetRange.max} poäng för mycket)`
                                }
                            </span>
                        )}
                    </span>
                </div>
            </div>

            {Object.keys(coursesBySubject).length === 0 ? (
                <div className="p-6 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-300 dark:border-yellow-700 text-center">
                    <p className="text-zinc-600 dark:text-zinc-400 mb-2">
                        Inga programfördjupningsämnen hittades för detta program.
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-500">
                        Kontrollera konsolen (F12) för debug-information om API-strukturen.
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-500 mt-1">
                        Antal specialiseringsämnen: {specializationSubjects.length}
                    </p>
                </div>
            ) : (
                <div className="space-y-6">
                    {Object.entries(coursesBySubject).map(([subjectName, subjectCourses]) => {
                        const subjectPoints = getSubjectPoints(subjectName);
                        const hasSelectedCourses = subjectPoints > 0;

                        return (
                            <div
                                key={subjectName}
                                className={`rounded-lg border ${
                                    hasSelectedCourses
                                        ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700'
                                        : 'bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700'
                                }`}
                            >
                                <div className="p-4 border-b border-zinc-200 dark:border-zinc-600">
                                    <div className="flex justify-between items-center">
                                        <h5 className="font-semibold text-zinc-900 dark:text-zinc-100">
                                            {subjectName}
                                        </h5>
                                        {hasSelectedCourses && (
                                            <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                                                {subjectPoints} poäng valda
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="p-4 space-y-2">
                                    {subjectCourses.map((course) => {
                                        const isSelected = selectedCourses.some(c => c.courseCode === course.courseCode);
                                        return (
                                            <div
                                                key={course.courseCode}
                                                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                                                    isSelected
                                                        ? 'bg-blue-100 dark:bg-blue-900/40 border-blue-400 dark:border-blue-600'
                                                        : 'bg-white dark:bg-zinc-700 border-zinc-200 dark:border-zinc-600 hover:border-blue-300 dark:hover:border-blue-500'
                                                }`}
                                                onClick={() => toggleCourse(course)}
                                            >
                                                <div className="flex justify-between items-center">
                                                    <div className="flex-1">
                                                        <div className="font-medium text-zinc-900 dark:text-zinc-100">
                                                            {course.name}
                                                        </div>
                                                        <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                                                            {course.courseCode}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                                                            {course.points} poäng
                                                        </span>
                                                        {isSelected && (
                                                            <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                            </svg>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

interface IndividualChoiceStepProps {
    selectedCourses: CourseWithTerm[];
    onCoursesChange: (courses: CourseWithTerm[]) => void;
    currentPoints: number;
}

function IndividualChoiceStep({ selectedCourses, onCoursesChange, currentPoints }: IndividualChoiceStepProps) {
    const targetPoints = 200;
    const isComplete = currentPoints === targetPoints;

    const handleRemoveIndividualChoice = () => {
        onCoursesChange(selectedCourses.filter(c => c.courseCode !== 'INDIVIDUAL_CHOICE'));
    };

    return (
        <div className="space-y-6">
            <div>
                <h4 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                    Individuellt val
                </h4>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Individuellt val (200 poäng) är automatiskt inkluderat
                </p>
            </div>

            <div className={`p-6 rounded-lg border ${
                isComplete
                    ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700'
                    : 'bg-zinc-50 dark:bg-zinc-700/50 border-zinc-200 dark:border-zinc-700'
            }`}>
                <div className="flex justify-between items-center">
                    <div>
                        <div className="font-medium text-zinc-900 dark:text-zinc-100">
                            Individuellt val
                        </div>
                        <div className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                            200 poäng
                        </div>
                    </div>
                    <button
                        onClick={handleRemoveIndividualChoice}
                        className="px-4 py-2 text-sm text-red-600 hover:text-red-700 border border-red-300 dark:border-red-700 rounded-lg transition-colors hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                        Ta bort
                    </button>
                </div>
            </div>
        </div>
    );
}

interface GymnasiearbeteStepProps {
    selectedCourses: CourseWithTerm[];
    onCoursesChange: (courses: CourseWithTerm[]) => void;
    numTerms: number;
}

function GymnasiearbeteStep({ selectedCourses, onCoursesChange, numTerms }: GymnasiearbeteStepProps) {
    const gymnasiearbete = selectedCourses.find(c => c.courseCode === 'GYMNASIEARBETE');
    
    // Only allow year 3, term 5, or term 6
    const availableOptions: TermId[] = ['year3', 'term5', 'term6'];

    const handleAddGymnasiearbete = (term: TermId = 'term6') => {
        const exists = selectedCourses.find(c => c.courseCode === 'GYMNASIEARBETE');
        const terms = term.startsWith('term') 
            ? [term as "term1" | "term2" | "term3" | "term4" | "term5" | "term6"]
            : undefined;
        if (!exists) {
            onCoursesChange([
                ...selectedCourses,
                {
                    courseCode: 'GYMNASIEARBETE',
                    courseName: 'Gymnasiearbete',
                    points: 100,
                    category: 'PROGRAMME_SPECIFIC_SUBJECTS',
                    term: term,
                    terms: terms, // Also set terms array
                },
            ]);
        } else {
            // Update existing
            onCoursesChange(
                selectedCourses.map(c =>
                    c.courseCode === 'GYMNASIEARBETE'
                        ? { ...c, term: term, terms: terms, category: 'PROGRAMME_SPECIFIC_SUBJECTS' }
                        : c
                )
            );
        }
    };

    const handleRemoveGymnasiearbete = () => {
        onCoursesChange(selectedCourses.filter(c => c.courseCode !== 'GYMNASIEARBETE'));
    };

    const handleTermChange = (term: TermId) => {
        handleAddGymnasiearbete(term);
    };

    return (
        <div className="space-y-6">
            <div>
                <h4 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                    Placera gymnasiearbete
                </h4>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Bestäm när gymnasiearbetet (100 poäng) ska genomföras. Du kan välja hela år 3, termin 5 eller termin 6.
                </p>
            </div>

            <div className={`p-6 rounded-lg border ${
                gymnasiearbete
                    ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700'
                    : 'bg-zinc-50 dark:bg-zinc-700/50 border-zinc-200 dark:border-zinc-700'
            }`}>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">
                            Välj när gymnasiearbetet ska genomföras:
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {availableOptions.map((termId) => {
                                const isSelected = gymnasiearbete?.term === termId;
                                const isTerm6 = termId === 'term6';
                                return (
                                    <button
                                        key={termId}
                                        type="button"
                                        onClick={() => handleTermChange(termId)}
                                        className={`p-4 rounded-lg border-2 transition-all text-left ${
                                            isSelected
                                                ? 'bg-blue-600 border-blue-600 text-white'
                                                : isTerm6
                                                    ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700 text-zinc-900 dark:text-zinc-100 hover:border-blue-400'
                                                    : 'bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 hover:border-blue-300 dark:hover:border-blue-500'
                                        }`}
                                    >
                                        <div className="font-medium text-sm">
                                            {TERM_LABELS[termId]}
                                        </div>
                                        {isTerm6 && !isSelected && (
                                            <div className="text-xs mt-1 text-blue-600 dark:text-blue-400">
                                                (Rekommenderat)
                                            </div>
                                        )}
                                        {isSelected && (
                                            <div className="flex items-center gap-1 mt-2">
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                </svg>
                                                <span className="text-xs">Vald</span>
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {gymnasiearbete && (
                        <div className="pt-4 border-t border-zinc-200 dark:border-zinc-600">
                            <div className="flex justify-between items-center">
                                <div>
                                    <div className="font-medium text-zinc-900 dark:text-zinc-100">
                                        Gymnasiearbete
                                    </div>
                                    <div className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                                        100 poäng - {TERM_LABELS[gymnasiearbete.term!]}
                                    </div>
                                </div>
                                <button
                                    onClick={handleRemoveGymnasiearbete}
                                    className="px-4 py-2 text-sm text-red-600 hover:text-red-700 border border-red-300 dark:border-red-700 rounded-lg transition-colors hover:bg-red-50 dark:hover:bg-red-900/20"
                                >
                                    Ta bort
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {gymnasiearbete && (
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex items-start gap-3">
                        <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div className="text-sm text-blue-900 dark:text-blue-100">
                            <strong>Gymnasiearbete placerat:</strong> Gymnasiearbetet är nu placerat i {TERM_LABELS[gymnasiearbete.term!]}. 
                            Du kan ändra placeringen senare i steget "Fördela kurser över terminer" om du vill.
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

interface DistributeTermsStepProps {
    selectedCourses: CourseWithTerm[];
    onTermChange: (courseCode: string, term: TermId | 'unassigned') => void; // Legacy support
    onTermsChange?: (courseCode: string, terms: TermId[]) => void; // New multi-term support
    numTerms: number;
}

// Helper function to group Swedish courses by level
function groupSwedishCourses(courses: CourseWithTerm[]): Array<CourseWithTerm | CourseWithTerm[]> {
    const grouped: Array<CourseWithTerm | CourseWithTerm[]> = [];
    const processed = new Set<string>();

    for (const course of courses) {
        if (processed.has(course.courseCode)) continue;

        const courseNameLower = course.courseName.toLowerCase();
        if (courseNameLower.includes('svenska')) {
            // Extract level number (1, 2, 3) from course name
            const levelMatch = course.courseName.match(/(\d+)/);
            const level = levelMatch ? levelMatch[1] : null;

            if (level) {
                // Find all Swedish courses with the same level
                const swedishGroup = [course];
                processed.add(course.courseCode);

                for (const otherCourse of courses) {
                    if (processed.has(otherCourse.courseCode)) continue;
                    const otherNameLower = otherCourse.courseName.toLowerCase();
                    const otherLevelMatch = otherCourse.courseName.match(/(\d+)/);
                    const otherLevel = otherLevelMatch ? otherLevelMatch[1] : null;

                    if (otherNameLower.includes('svenska') && otherLevel === level) {
                        swedishGroup.push(otherCourse);
                        processed.add(otherCourse.courseCode);
                    }
                }

                if (swedishGroup.length > 1) {
                    grouped.push(swedishGroup);
                } else {
                    grouped.push(course);
                }
            } else {
                processed.add(course.courseCode);
                grouped.push(course);
            }
        } else {
            processed.add(course.courseCode);
            grouped.push(course);
        }
    }

    return grouped;
}

// Draggable course component for term distribution
function DraggableCourse({ course, termId, isGrouped = false, groupedCourses }: { 
    course: CourseWithTerm; 
    termId: TermId;
    isGrouped?: boolean;
    groupedCourses?: CourseWithTerm[];
}) {
    const displayName = isGrouped && groupedCourses 
        ? groupedCourses.map(c => c.courseName).join(' / ')
        : course.courseName;
    const displayCodes = isGrouped && groupedCourses
        ? groupedCourses.map(c => c.courseCode).join(', ')
        : course.courseCode;

    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: `course-${course.courseCode}-${termId}`,
        data: {
            courseCode: course.courseCode,
            currentTerm: termId,
            isGrouped,
            groupedCourseCodes: isGrouped && groupedCourses ? groupedCourses.map(c => c.courseCode) : [course.courseCode],
        },
    });

    const style = transform
        ? {
              transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
          }
        : undefined;

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...listeners}
            {...attributes}
            className={`p-2 rounded bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-600 cursor-grab active:cursor-grabbing ${
                isDragging ? 'opacity-50' : ''
            }`}
        >
            <div className="flex justify-between items-center">
                <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                        {displayName}
                    </div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400">
                        {displayCodes}
                    </div>
                </div>
                <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 ml-2 whitespace-nowrap">
                    {course.points} poäng
                </span>
            </div>
        </div>
    );
}

// Droppable term container
function DroppableTerm({
    termId,
    points,
    coursesInTerm,
    isBalanced,
    getCoursesByTerm,
}: {
    termId: TermId;
    points: number;
    coursesInTerm: CourseWithTerm[];
    isBalanced: boolean;
    getCoursesByTerm: (termId: TermId) => CourseWithTerm[];
}) {
    const { setNodeRef, isOver } = useDroppable({
        id: `term-${termId}`,
    });

    return (
        <div
            ref={setNodeRef}
            className={`p-4 rounded-lg border transition-colors ${
                isOver
                    ? 'bg-blue-100 dark:bg-blue-900/40 border-blue-400 dark:border-blue-600'
                    : isBalanced
                    ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700'
                    : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700'
            }`}
        >
            <div className="flex justify-between items-center mb-3">
                <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                    {TERM_LABELS[termId]}
                </div>
                <div
                    className={`text-lg font-bold ${
                        isBalanced
                            ? 'text-green-700 dark:text-green-300'
                            : 'text-yellow-700 dark:text-yellow-300'
                    }`}
                >
                    {points} poäng
                </div>
            </div>
            {!isBalanced && points > 0 && (
                <div className="text-xs text-yellow-600 dark:text-yellow-400 mb-2">
                    {points < 350 ? 'För lite' : 'För mycket'}
                </div>
            )}
            {isOver && (
                <div className="text-xs text-blue-600 dark:text-blue-400 mb-2 font-medium">
                    Släpp här för att flytta kursen
                </div>
            )}
            {coursesInTerm.length > 0 ? (
                <div className="space-y-2 mt-3">
                    {(() => {
                        const grouped = groupSwedishCourses(coursesInTerm);
                        const rendered = new Set<string>();
                        
                        return grouped.map((courseOrGroup) => {
                            if (Array.isArray(courseOrGroup)) {
                                // Grouped Swedish course - only render once
                                const swedishCourses = courseOrGroup;
                                const representative = swedishCourses[0];
                                
                                // Check if we've already rendered this group
                                const groupKey = swedishCourses.map(c => c.courseCode).sort().join('-');
                                if (rendered.has(groupKey)) return null;
                                rendered.add(groupKey);
                                
                                return (
                                    <DraggableCourse
                                        key={`swedish-group-${representative.courseCode}-${termId}`}
                                        course={representative}
                                        termId={termId}
                                        isGrouped={true}
                                        groupedCourses={swedishCourses}
                                    />
                                );
                            } else {
                                // Single course
                                const course = courseOrGroup;
                                if (rendered.has(course.courseCode)) return null;
                                rendered.add(course.courseCode);
                                
                                return (
                                    <DraggableCourse
                                        key={course.courseCode}
                                        course={course}
                                        termId={termId}
                                    />
                                );
                            }
                        }).filter(Boolean);
                    })()}
                </div>
            ) : (
                <div className="text-sm text-zinc-400 dark:text-zinc-500 italic mt-2">
                    {isOver ? 'Släpp här' : 'Inga kurser tilldelade'}
                </div>
            )}
        </div>
    );
}

function DistributeTermsStep({
    selectedCourses,
    onTermChange,
    onTermsChange,
    numTerms,
}: DistributeTermsStepProps) {
    // Use onTermsChange if available, otherwise fallback to onTermChange
    const handleTermsChangeInternal = onTermsChange || ((courseCode: string, terms: TermId[]) => {
        // Fallback: convert terms array to single term for legacy onTermChange
        if (terms.length > 0) {
            onTermChange(courseCode, terms[0]);
        } else {
            onTermChange(courseCode, 'unassigned');
        }
    });
    const terms: TermId[] = ['term1', 'term2', 'term3', 'term4', 'term5', 'term6'].slice(0, numTerms) as TermId[];
    const years: TermId[] = ['year1', 'year2', 'year3'];
    
    const termOptions: Array<{ value: TermId | 'unassigned'; label: string; group?: string }> = [
        { value: 'unassigned', label: 'Ej tilldelad' },
        { value: 'year1', label: TERM_LABELS.year1, group: 'År' },
        { value: 'year2', label: TERM_LABELS.year2, group: 'År' },
        { value: 'year3', label: TERM_LABELS.year3, group: 'År' },
        ...terms.map(termId => ({ value: termId, label: TERM_LABELS[termId], group: 'Terminer' })),
    ];

    const getPointsByTerm = (termId: TermId) => {
        // Map term to its year
        const termToYear: Record<string, string> = {
            'term1': 'year1',
            'term2': 'year1',
            'term3': 'year2',
            'term4': 'year2',
            'term5': 'year3',
            'term6': 'year3',
        };
        
        // Handle different termId types
        if (termId === 'unassigned') {
            // Count courses that are unassigned (term is 'unassigned' or undefined)
            return selectedCourses
                .filter(c => c.term === 'unassigned' || c.term === undefined)
                .reduce((sum, c) => sum + c.points, 0);
        } else if (termId.startsWith('year')) {
            // If termId is a year, match courses assigned to that year OR courses with terms that span that year
            const yearTerms = termId === 'year1' ? ['term1', 'term2'] : 
                            termId === 'year2' ? ['term3', 'term4'] : 
                            ['term5', 'term6'];
            return selectedCourses
                .filter(c => {
                    // Check terms array first
                    if (c.terms && c.terms.length > 0) {
                        return c.terms.some(t => yearTerms.includes(t as any));
                    }
                    // Fallback to term (backward compatibility)
                    return c.term === termId;
                })
                .reduce((sum, c) => sum + c.points, 0);
        } else {
            // If termId is a term, match courses assigned to this term OR to the year that contains it
            const yearId = termToYear[termId];
            return selectedCourses
                .filter(c => {
                    // Check terms array first
                    if (c.terms && c.terms.length > 0) {
                        return c.terms.includes(termId as any);
                    }
                    // Fallback to single term (backward compatibility)
                    if (c.term === termId) return true;
                    if (yearId && c.term === yearId) return true;
                    return false;
                })
                .reduce((sum, c) => sum + c.points, 0);
        }
    };

    const getCoursesByTerm = (termId: TermId) => {
        // Map term to its year
        const termToYear: Record<string, string> = {
            'term1': 'year1',
            'term2': 'year1',
            'term3': 'year2',
            'term4': 'year2',
            'term5': 'year3',
            'term6': 'year3',
        };
        
        // Handle different termId types
        if (termId === 'unassigned') {
            // Get courses that are unassigned (no terms array or empty, and term is 'unassigned' or undefined)
            return selectedCourses.filter(c => {
                if (c.terms && c.terms.length > 0) return false;
                return c.term === 'unassigned' || c.term === undefined;
            });
        } else if (termId.startsWith('year')) {
            // If termId is a year, match courses assigned to that year OR courses with terms that span that year
            const yearTerms = termId === 'year1' ? ['term1', 'term2'] : 
                            termId === 'year2' ? ['term3', 'term4'] : 
                            ['term5', 'term6'];
            return selectedCourses.filter(c => {
                // Check terms array first
                if (c.terms && c.terms.length > 0) {
                    return c.terms.some(t => yearTerms.includes(t as any));
                }
                // Fallback to term (backward compatibility)
                return c.term === termId;
            });
        } else {
            // If termId is a term, match courses assigned to this term OR to the year that contains it
            const yearId = termToYear[termId];
            return selectedCourses.filter(c => {
                // Check terms array first
                if (c.terms && c.terms.length > 0) {
                    return c.terms.includes(termId as any);
                }
                // Fallback to single term (backward compatibility)
                if (c.term === termId) return true;
                if (yearId && c.term === yearId) return true;
                return false;
            });
        }
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (!over) return;

        const activeId = active.id as string;
        const overId = over.id as string;

        // Extract course code and current term from active id
        const courseMatch = activeId.match(/^course-(.+)-(.+)$/);
        if (!courseMatch) return;

        const courseCode = courseMatch[1];
        const sourceTerm = courseMatch[2] as TermId;

        // Extract target term from over id
        const termMatch = overId.match(/^term-(.+)$/);
        if (!termMatch) return;

        const targetTerm = termMatch[1] as TermId;

        // Get drag data to check if this is a grouped Swedish course
        const dragData = active.data.current;
        const isGrouped = dragData?.isGrouped || false;
        const groupedCourseCodes = dragData?.groupedCourseCodes || [courseCode];

        // Find the actual course to check its current assignment
        const course = selectedCourses.find(c => c.courseCode === courseCode);
        if (!course) return;

        // If course is assigned to a year, we need to check if sourceTerm is part of that year
        // Otherwise, check if it's assigned to the sourceTerm
        const termToYear: Record<string, string> = {
            'term1': 'year1',
            'term2': 'year1',
            'term3': 'year2',
            'term4': 'year2',
            'term5': 'year3',
            'term6': 'year3',
        };
        const sourceYear = termToYear[sourceTerm];

        // Check if course is actually in the source term (either directly assigned or via year)
        const isInSourceTerm = course.term === sourceTerm || 
                               (course.term === sourceYear && sourceYear);

        // Only update if moving to a different term and course is actually in source term
        if (isInSourceTerm && targetTerm !== sourceTerm) {
            // If this is a grouped Swedish course, update all courses in the group
            if (isGrouped) {
                groupedCourseCodes.forEach((code: string) => {
                    onTermChange(code, targetTerm);
                });
            } else {
                onTermChange(courseCode, targetTerm);
            }
        }
    };

    return (
        <DndContext onDragEnd={handleDragEnd}>
            <div className="space-y-6">
                <div>
                    <h4 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                        Fördela kurser över terminer
                    </h4>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        Välj terminer för varje kurs med checkboxes (en kurs kan gå över flera terminer) eller dra och släpp kurser mellan terminer i höger kolumn. Försök få jämn fördelning (cirka 400-450 poäng per termin).
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left: Courses to distribute */}
                    <div className="space-y-4">
                        <h5 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                            Kurser att fördela
                        </h5>
                        <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                            {(() => {
                                const grouped = groupSwedishCourses(selectedCourses);
                                return grouped.map((courseOrGroup) => {
                                    if (Array.isArray(courseOrGroup)) {
                                        // Grouped Swedish course
                                        const swedishCourses = courseOrGroup;
                                        const representative = swedishCourses[0];
                                        const selectedTerms = representative.terms && representative.terms.length > 0 
                                            ? representative.terms 
                                            : (representative.term && representative.term.startsWith('term') ? [representative.term] : []);
                                        const displayName = swedishCourses.map(c => c.courseName).join(' / ');
                                        const displayCodes = swedishCourses.map(c => c.courseCode).join(', ');

                                        const handleTermToggle = (termId: TermId) => {
                                            const termValue = termId as "term1" | "term2" | "term3" | "term4" | "term5" | "term6";
                                            const isSelected = selectedTerms.includes(termValue);
                                            let newTerms: TermId[];
                                            if (isSelected) {
                                                // Remove term
                                                newTerms = selectedTerms.filter(t => t !== termValue);
                                            } else {
                                                // Add term
                                                newTerms = [...selectedTerms, termValue];
                                            }
                                            // Update all courses in the group
                                            swedishCourses.forEach(c => {
                                                handleTermsChangeInternal(c.courseCode, newTerms);
                                            });
                                        };

                                        return (
                                            <div
                                                key={`swedish-group-${representative.courseCode}`}
                                                className="p-4 rounded-lg border bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700"
                                            >
                                                <div className="flex items-start justify-between gap-4">
                                                    <div className="flex-1 min-w-0">
                                                        <div className="font-medium text-zinc-900 dark:text-zinc-100">
                                                            {displayName}
                                                        </div>
                                                        <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                                                            {displayCodes}
                                                        </div>
                                                        <span className="text-sm font-semibold text-blue-600 dark:text-blue-400 mt-2 inline-block">
                                                            {representative.points} poäng
                                                        </span>
                                                    </div>
                                                    <div className="shrink-0">
                                                        <div className="text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                                                            Välj terminer:
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-2">
                                                            {terms.map(termId => {
                                                                const isSelected = selectedTerms.includes(termId as any);
                                                                return (
                                                                    <label
                                                                        key={termId}
                                                                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all ${
                                                                            isSelected
                                                                                ? 'bg-blue-100 dark:bg-blue-900/40 border-blue-400 dark:border-blue-600 text-blue-900 dark:text-blue-100'
                                                                                : 'bg-white dark:bg-zinc-700 border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 hover:border-blue-300 dark:hover:border-blue-500'
                                                                        }`}
                                                                    >
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={isSelected}
                                                                            onChange={() => handleTermToggle(termId)}
                                                                            className="w-4 h-4 text-blue-600 border-zinc-300 rounded focus:ring-blue-500"
                                                                        />
                                                                        <span className="text-xs font-medium">
                                                                            {TERM_LABELS[termId]}
                                                                        </span>
                                                                    </label>
                                                                );
                                                            })}
                                                        </div>
                                                        {selectedTerms.length === 0 && (
                                                            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2">
                                                                Ingen termin vald
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    } else {
                                        // Single course
                                        const course = courseOrGroup;
                                        const selectedTerms = course.terms && course.terms.length > 0 
                                            ? course.terms 
                                            : (course.term && course.term.startsWith('term') ? [course.term] : []);
                                        
                                        const handleTermToggle = (termId: TermId) => {
                                            const termValue = termId as "term1" | "term2" | "term3" | "term4" | "term5" | "term6";
                                            const isSelected = selectedTerms.includes(termValue);
                                            let newTerms: TermId[];
                                            if (isSelected) {
                                                // Remove term
                                                newTerms = selectedTerms.filter(t => t !== termValue);
                                            } else {
                                                // Add term
                                                newTerms = [...selectedTerms, termValue];
                                            }
                                            handleTermsChangeInternal(course.courseCode, newTerms);
                                        };

                                        return (
                                            <div
                                                key={course.courseCode}
                                                className="p-4 rounded-lg border bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700"
                                            >
                                                <div className="flex items-start justify-between gap-4">
                                                    <div className="flex-1 min-w-0">
                                                        <div className="font-medium text-zinc-900 dark:text-zinc-100">
                                                            {course.courseName}
                                                        </div>
                                                        <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                                                            {course.courseCode}
                                                        </div>
                                                        <span className="text-sm font-semibold text-blue-600 dark:text-blue-400 mt-2 inline-block">
                                                            {course.points} poäng
                                                        </span>
                                                    </div>
                                                    <div className="shrink-0">
                                                        <div className="text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                                                            Välj terminer:
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-2">
                                                            {terms.map(termId => {
                                                                const isSelected = selectedTerms.includes(termId as any);
                                                                return (
                                                                    <label
                                                                        key={termId}
                                                                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all ${
                                                                            isSelected
                                                                                ? 'bg-blue-100 dark:bg-blue-900/40 border-blue-400 dark:border-blue-600 text-blue-900 dark:text-blue-100'
                                                                                : 'bg-white dark:bg-zinc-700 border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 hover:border-blue-300 dark:hover:border-blue-500'
                                                                        }`}
                                                                    >
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={isSelected}
                                                                            onChange={() => handleTermToggle(termId)}
                                                                            className="w-4 h-4 text-blue-600 border-zinc-300 rounded focus:ring-blue-500"
                                                                        />
                                                                        <span className="text-xs font-medium">
                                                                            {TERM_LABELS[termId]}
                                                                        </span>
                                                                    </label>
                                                                );
                                                            })}
                                                        </div>
                                                        {selectedTerms.length === 0 && (
                                                            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2">
                                                                Ingen termin vald
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    }
                                });
                            })()}
                        </div>
                    </div>

                    {/* Right: Term distribution with drag and drop */}
                    <div className="space-y-4">
                        <h5 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                            Poängfördelning per termin
                        </h5>
                        <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                            {terms.map((termId) => {
                                const points = getPointsByTerm(termId);
                                const coursesInTerm = getCoursesByTerm(termId);
                                const isBalanced = points >= 350 && points <= 500;
                                return (
                                    <DroppableTerm
                                        key={termId}
                                        termId={termId}
                                        points={points}
                                        coursesInTerm={coursesInTerm}
                                        isBalanced={isBalanced}
                                        getCoursesByTerm={getCoursesByTerm}
                                    />
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </DndContext>
    );
}

interface ValidateStepProps {
    selectedCourses: CourseWithTerm[];
    totalPoints: number;
    pointsByTerm: (termId: TermId) => number;
    isValid: boolean;
}

function ValidateStep({ selectedCourses, totalPoints, pointsByTerm, isValid }: ValidateStepProps) {
    // Note: GYMNASIEARBETE is counted as PROGRAMME_SPECIFIC_SUBJECTS (programgemensamma ämnen)
    const pointsByCategory = {
        'FOUNDATIONAL_SUBJECTS': selectedCourses.filter(c => c.category === 'FOUNDATIONAL_SUBJECTS').reduce((sum, c) => sum + c.points, 0),
        'PROGRAMME_SPECIFIC_SUBJECTS': selectedCourses.filter(c => c.category === 'PROGRAMME_SPECIFIC_SUBJECTS').reduce((sum, c) => sum + c.points, 0),
        'ORIENTATION': selectedCourses.filter(c => c.category === 'ORIENTATION').reduce((sum, c) => sum + c.points, 0),
        'INDIVIDUAL_CHOICE': selectedCourses.filter(c => c.category === 'INDIVIDUAL_CHOICE').reduce((sum, c) => sum + c.points, 0),
    };

    const allCoursesAssigned = selectedCourses.every(c => c.term && c.term !== 'unassigned');

    return (
        <div className="space-y-6">
            <div>
                <h4 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                    Validera och granska
                </h4>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Kontrollera att alla krav är uppfyllda
                </p>
            </div>

            <div className="space-y-4">
                {/* Total Points Check */}
                <div className={`p-4 rounded-lg border ${
                    totalPoints === 2500
                        ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700'
                        : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700'
                }`}>
                    <div className="flex items-center gap-2">
                        {totalPoints === 2500 ? (
                            <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        ) : (
                            <svg className="w-5 h-5 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        )}
                        <div>
                            <div className="font-medium">Totalt antal poäng: {totalPoints} / 2500</div>
                            {totalPoints !== 2500 && (
                                <div className="text-sm text-yellow-600 dark:text-yellow-400">
                                    {totalPoints < 2500 ? `Saknas ${2500 - totalPoints} poäng` : `För många poäng (${totalPoints - 2500} för mycket)`}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Category Breakdown */}
                <div className="p-4 bg-zinc-50 dark:bg-zinc-700/50 rounded-lg">
                    <h5 className="font-medium text-zinc-900 dark:text-zinc-100 mb-3">Poängfördelning per kategori:</h5>
                    <div className="space-y-2 text-sm">
                        {Object.entries(pointsByCategory).map(([category, points]) => (
                            <div key={category} className="flex justify-between">
                                <span className="text-zinc-600 dark:text-zinc-400">
                                    {CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS]}:
                                </span>
                                <span className="font-medium text-zinc-900 dark:text-zinc-100">{points} poäng</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* All Courses Assigned Check */}
                <div className={`p-4 rounded-lg border ${
                    allCoursesAssigned
                        ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700'
                        : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700'
                }`}>
                    <div className="flex items-center gap-2">
                        {allCoursesAssigned ? (
                            <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        ) : (
                            <svg className="w-5 h-5 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        )}
                        <div>
                            <div className="font-medium">
                                {allCoursesAssigned ? 'Alla kurser är tilldelade' : 'Vissa kurser är inte tilldelade'}
                            </div>
                            {!allCoursesAssigned && (
                                <div className="text-sm text-yellow-600 dark:text-yellow-400">
                                    {selectedCourses.filter(c => !c.term || c.term === 'unassigned').length} kurser saknar termin
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}


