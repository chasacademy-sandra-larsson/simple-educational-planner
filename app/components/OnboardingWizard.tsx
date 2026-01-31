import { useState, useEffect, useCallback } from 'react';
import { Check, ChevronRight, Users, BookOpen, Clock, Sparkles, DoorOpen, ClipboardList, AlertCircle, Loader2 } from 'lucide-react';
import { ClassesAndCoursePlanStep } from './onboarding/ClassesAndCoursePlanStep';
import { TeachersStep } from './onboarding/TeachersStep';
import { ServiceAllocationStep } from './onboarding/ServiceAllocationStep';
import { TimeSettingsStep } from './onboarding/TimeSettingsStep';
import { RoomsStep } from './onboarding/RoomsStep';
import { api, ApiError } from '@/app/lib/api';

interface Project {
  id: string;
  name: string;
  term: string;
  year: string;
}

interface OnboardingWizardProps {
  project: Project;
  onComplete: () => void;
}

const STEPS = [
  {
    id: 1,
    title: 'Klasser och kursplanering',
    description: 'Skapa klasser och planera kurserna',
    icon: Users,
    nextLabel: 'Planera lärare'
  },
  {
    id: 2,
    title: 'Lärare',
    description: 'Lägg till lärare och ämnesbehörighet',
    icon: BookOpen,
    nextLabel: 'Fördela tjänster'
  },
  {
    id: 3,
    title: 'Tjänstefördelning',
    description: 'Koppla lärare till kurser',
    icon: ClipboardList,
    nextLabel: 'Ställ in tider'
  },
  {
    id: 4,
    title: 'Tid- och datuminställningar',
    description: 'Konfigurera tider och terminer',
    icon: Clock,
    nextLabel: 'Konfigurera salar'
  },
  {
    id: 5,
    title: 'Salar',
    description: 'Konfigurera tillgängliga salar',
    icon: DoorOpen,
    nextLabel: 'Slutför'
  }
];

export function OnboardingWizard({ project, onComplete }: OnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [wizardData, setWizardData] = useState({
    classes: [] as any[],
    teachers: [] as any[],
    serviceAllocations: [] as any[],
    rooms: [] as any[],
    timeSettings: {
      termPeriods: [
        { id: '1', name: 'Hösttermin 2026', startDate: '2026-08-17', endDate: '2026-12-18' },
        { id: '2', name: 'Vårtermin 2027', startDate: '2027-01-08', endDate: '2027-06-11' }
      ],
      earliestStart: '08:00',
      latestEnd: '16:00',
      standardLessonDuration: 60,
      lunchDuration: 45,
      earliestLunch: '11:00',
      latestLunch: '13:00',
      shortestBreak: 5,
      longestBreak: 60,
      mentorTimePerWeek: 30,
      customLessonDurations: []
    } as any
  });

  // Load existing data from backend
  useEffect(() => {
    const loadExistingData = async () => {
      setIsLoading(true);
      try {
        // Load project details with classes
        const projectDetails = await api.projects.getById(project.id);

        // Load teachers
        const teachers = await api.teachers.getAll(project.id);

        // Load rooms
        const rooms = await api.rooms.getAll(project.id);

        // Load term dates
        const termDates = await api.termDates.getAll(project.id);

        // Transform data to wizard format
        const transformedClasses = projectDetails.classes?.map(cls => ({
          id: cls.id,
          name: cls.classCode,
          program: cls.programCode,
          programName: cls.programName,
          specialization: cls.orientationName,
          students: 30, // Default
          startYear: cls.startYear,
          endYear: cls.graduationYear,
          termCount: 6,
          courses: cls.curriculum?.courses?.map(course => ({
            id: course.id || course.courseCode,
            name: course.courseName,
            code: course.courseCode,
            points: course.points,
            hoursPerWeek: Math.ceil(course.points / 100),
            category: course.category?.toLowerCase().replace(/_/g, '') || 'gymnasiegemensam',
            terms: course.terms || [],
            year: course.year || 1
          })) || [],
          isComplete: true
        })) || [];

        const transformedTeachers = teachers.map(t => ({
          id: t.id,
          name: t.name,
          email: t.email || '',
          subjects: t.subject ? [t.subject] : [],
          employmentPercentage: 100,
          isComplete: true
        }));

        const transformedRooms = rooms.map(r => ({
          id: r.id,
          name: r.roomNumber,
          capacity: r.capacity || 30,
          subject: r.roomType || undefined
        }));

        // Transform term dates if they exist
        let timeSettings = wizardData.timeSettings;
        if (termDates.length > 0) {
          const termPeriods = termDates.flatMap(td => [
            { id: `${td.id}-fall`, name: `Hösttermin ${td.academicYear.split('/')[0]}`, startDate: td.fallTermStart, endDate: td.fallTermEnd },
            { id: `${td.id}-spring`, name: `Vårtermin ${td.academicYear.split('/')[1]}`, startDate: td.springTermStart, endDate: td.springTermEnd }
          ]);
          timeSettings = { ...timeSettings, termPeriods };
        }

        // Update project settings if they exist
        if (projectDetails.defaultLessonDuration) {
          timeSettings.standardLessonDuration = projectDetails.defaultLessonDuration;
        }
        if (projectDetails.mentorTimePerWeek) {
          timeSettings.mentorTimePerWeek = projectDetails.mentorTimePerWeek;
        }
        if (projectDetails.lunchDuration) {
          timeSettings.lunchDuration = projectDetails.lunchDuration;
        }
        if (projectDetails.earliestLessonStart) {
          timeSettings.earliestStart = projectDetails.earliestLessonStart.slice(0, 5);
        }
        if (projectDetails.latestLessonEnd) {
          timeSettings.latestEnd = projectDetails.latestLessonEnd.slice(0, 5);
        }

        setWizardData({
          classes: transformedClasses,
          teachers: transformedTeachers,
          serviceAllocations: [],
          rooms: transformedRooms,
          timeSettings
        });
      } catch (error) {
        console.error('Error loading existing data:', error);
        // Continue with empty data if loading fails
      } finally {
        setIsLoading(false);
      }
    };

    loadExistingData();
  }, [project.id]);

  // Save all data to backend
  const saveToBackend = useCallback(async () => {
    setIsSaving(true);
    setSaveError(null);

    try {
      // 1. Save/update classes and their curricula
      for (const classItem of wizardData.classes) {
        // Check if class already exists (has a valid UUID)
        const isExistingClass = classItem.id && classItem.id.length > 10;

        let classId = classItem.id;

        if (!isExistingClass) {
          // Create new class
          const newClass = await api.projects.addClass(project.id, {
            classCode: classItem.name,
            programCode: classItem.program,
            programName: classItem.programName,
            orientationCode: classItem.specialization?.substring(0, 10) || 'DEFAULT',
            orientationName: classItem.specialization || '',
            startYear: classItem.startYear || parseInt(project.year)
          });
          classId = newClass.id;
        }

        // Update curriculum for the class
        if (classItem.courses && classItem.courses.length > 0) {
          const coursesForApi = classItem.courses.map((course: any) => ({
            courseCode: course.code,
            courseName: course.name,
            points: course.points,
            category: mapCategoryToApi(course.category),
            year: 1 as const,
            terms: course.terms?.map((t: number) => `term${t}`) || ['term1']
          }));

          await api.projects.updateCurriculum(classId, { courses: coursesForApi });
        }
      }

      // 2. Save teachers
      const existingTeachers = await api.teachers.getAll(project.id);
      const existingTeacherIds = new Set(existingTeachers.map(t => t.id));

      for (const teacher of wizardData.teachers) {
        const isExisting = existingTeacherIds.has(teacher.id);

        if (isExisting) {
          await api.teachers.update(teacher.id, {
            name: teacher.name,
            email: teacher.email,
            subject: teacher.subjects?.join(', ') || undefined
          });
        } else {
          await api.teachers.create(project.id, {
            name: teacher.name,
            email: teacher.email,
            subject: teacher.subjects?.join(', ') || undefined
          });
        }
      }

      // 3. Save rooms
      const existingRooms = await api.rooms.getAll(project.id);
      const existingRoomIds = new Set(existingRooms.map(r => r.id));

      for (const room of wizardData.rooms) {
        const isExisting = existingRoomIds.has(room.id);

        if (isExisting) {
          await api.rooms.update(room.id, {
            roomNumber: room.name,
            capacity: room.capacity,
            roomType: room.subject || undefined
          });
        } else {
          await api.rooms.create(project.id, {
            roomNumber: room.name,
            capacity: room.capacity,
            roomType: room.subject || undefined
          });
        }
      }

      // 4. Update project time settings
      await api.projects.update(project.id, {
        name: project.name,
        defaultLessonDuration: wizardData.timeSettings.standardLessonDuration,
        mentorTimePerWeek: wizardData.timeSettings.mentorTimePerWeek,
        lunchDuration: wizardData.timeSettings.lunchDuration,
        earliestLessonStart: wizardData.timeSettings.earliestStart + ':00',
        latestLessonEnd: wizardData.timeSettings.latestEnd + ':00',
        earliestLunchTime: wizardData.timeSettings.earliestLunch + ':00',
        latestLunchTime: wizardData.timeSettings.latestLunch + ':00',
        shortestBreakBetweenLessons: wizardData.timeSettings.shortestBreak,
        longestBreakBetweenLessons: wizardData.timeSettings.longestBreak
      });

      // 5. Save term dates
      const termPeriods = wizardData.timeSettings.termPeriods || [];
      if (termPeriods.length >= 2) {
        const fallTerm = termPeriods.find((t: any) => t.name.toLowerCase().includes('höst'));
        const springTerm = termPeriods.find((t: any) => t.name.toLowerCase().includes('vår'));

        if (fallTerm && springTerm) {
          const academicYear = `${new Date(fallTerm.startDate).getFullYear()}/${new Date(springTerm.startDate).getFullYear()}`;

          try {
            await api.termDates.create(project.id, {
              academicYear,
              year: 1,
              fallTermStart: fallTerm.startDate,
              fallTermEnd: fallTerm.endDate,
              springTermStart: springTerm.startDate,
              springTermEnd: springTerm.endDate
            });
          } catch (error) {
            // Term dates might already exist, that's ok
            console.log('Term dates may already exist:', error);
          }
        }
      }

      return true;
    } catch (error) {
      console.error('Error saving to backend:', error);
      if (error instanceof ApiError) {
        setSaveError(error.message);
      } else {
        setSaveError('Ett oväntat fel uppstod vid sparning');
      }
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [project.id, project.name, project.year, wizardData]);

  // Helper function to map category to API format
  const mapCategoryToApi = (category: string): 'FOUNDATIONAL_SUBJECTS' | 'PROGRAMME_SPECIFIC_SUBJECTS' | 'ORIENTATION' | 'INDIVIDUAL_CHOICE' | 'GYMNASIEARBETE' => {
    const mapping: Record<string, any> = {
      'gymnasiegemensam': 'FOUNDATIONAL_SUBJECTS',
      'programgemensam': 'PROGRAMME_SPECIFIC_SUBJECTS',
      'programfördjupning': 'ORIENTATION',
      'individuellt val': 'INDIVIDUAL_CHOICE',
      'gymnasiearbete': 'GYMNASIEARBETE'
    };
    return mapping[category?.toLowerCase()] || 'FOUNDATIONAL_SUBJECTS';
  };

  const validateCurrentStep = (): { isValid: boolean; error: string | null } => {
    switch (currentStep) {
      case 1: // Classes
        if (wizardData.classes.length === 0) {
          return { isValid: false, error: 'Du måste skapa minst en klass innan du går vidare.' };
        }
        const hasCoursesInAllClasses = wizardData.classes.every((cls: any) => cls.courses && cls.courses.length > 0);
        if (!hasCoursesInAllClasses) {
          return { isValid: false, error: 'Alla klasser måste ha minst en kurs tillagd.' };
        }
        return { isValid: true, error: null };
      
      case 2: // Teachers
        if (wizardData.teachers.length === 0) {
          return { isValid: false, error: 'Du måste lägga till minst en lärare innan du går vidare.' };
        }
        return { isValid: true, error: null };
      
      case 3: // Service Allocations
        // Tjänstefördelning är frivillig i början, kan konfigureras senare
        return { isValid: true, error: null };
      
      case 4: // Time Settings
        if (!wizardData.timeSettings.termPeriods || wizardData.timeSettings.termPeriods.length === 0) {
          return { isValid: false, error: 'Du måste fylla i terminstider innan du går vidare.' };
        }
        return { isValid: true, error: null };
      
      case 5: // Rooms
        if (wizardData.rooms.length === 0) {
          return { isValid: false, error: 'Du måste lägga till minst en sal innan du kan generera schema.' };
        }
        return { isValid: true, error: null };
      
      default:
        return { isValid: true, error: null };
    }
  };

  const handleNext = async () => {
    const validation = validateCurrentStep();

    if (!validation.isValid) {
      setValidationError(validation.error);
      return;
    }

    setValidationError(null);

    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    } else {
      // Save all data to backend before completing
      const success = await saveToBackend();
      if (success) {
        onComplete();
      }
    }
  };

  const handleBack = () => {
    setValidationError(null);
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const updateWizardData = (key: string, data: any) => {
    setWizardData(prev => ({ ...prev, [key]: data }));
  };

  // Generate button text for final step
  const getNextButtonText = () => {
    if (currentStep === STEPS.length) {
      // Determine the academic year based on term and year
      const year = parseInt(project.year);
      let academicYear = '';
      
      if (project.term === 'Hösttermin') {
        academicYear = `${year}/${year + 1}`;
      } else {
        academicYear = `${year - 1}/${year}`;
      }
      
      return `Generera schema för läsår ${academicYear}`;
    }
    return STEPS[currentStep - 1]?.nextLabel || 'Nästa';
  };

  // Show loading state while fetching data
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Laddar projektdata...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl mb-1">{project.name}</h1>
              <p className="text-sm text-gray-600">Konfigurera ditt schema steg för steg</p>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Sparkles className="w-4 h-4" />
              Guidad tur
            </div>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center justify-between">
            {STEPS.map((step, index) => {
              const isCompleted = currentStep > step.id;
              const isCurrent = currentStep === step.id;
              const Icon = step.icon;

              return (
                <div key={step.id} className="flex items-center flex-1">
                  <button
                    onClick={() => {
                      setValidationError(null);
                      setCurrentStep(step.id);
                    }}
                    className="flex flex-col items-center flex-1 group cursor-pointer"
                  >
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all mb-3 ${
                        isCompleted
                          ? 'bg-green-500 text-white group-hover:bg-green-600'
                          : isCurrent
                          ? 'bg-blue-600 text-white ring-4 ring-blue-100'
                          : 'bg-gray-200 text-gray-400 group-hover:bg-gray-300'
                      }`}
                    >
                      {isCompleted ? (
                        <Check className="w-6 h-6" />
                      ) : (
                        <Icon className="w-6 h-6" />
                      )}
                    </div>
                    <p
                      className={`text-sm font-medium transition-colors ${
                        isCurrent || isCompleted ? 'text-gray-900' : 'text-gray-400 group-hover:text-gray-600'
                      }`}
                    >
                      {step.title}
                    </p>
                  </button>
                  {index < STEPS.length - 1 && (
                    <div className="flex-1 h-0.5 mx-4 -mt-9">
                      <div
                        className={`h-full transition-all ${
                          isCompleted ? 'bg-green-500' : 'bg-gray-200'
                        }`}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Step Content */}
      <div className="p-8">
        <div className="max-w-5xl mx-auto">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
            {currentStep === 1 && (
              <ClassesAndCoursePlanStep
                data={wizardData.classes}
                onChange={(data) => updateWizardData('classes', data)}
              />
            )}
            {currentStep === 2 && (
              <TeachersStep
                data={wizardData.teachers}
                onChange={(data) => updateWizardData('teachers', data)}
                classes={wizardData.classes}
              />
            )}
            {currentStep === 3 && (
              <ServiceAllocationStep
                data={wizardData.serviceAllocations}
                onChange={(data) => updateWizardData('serviceAllocations', data)}
                classes={wizardData.classes}
                teachers={wizardData.teachers}
              />
            )}
            {currentStep === 4 && (
              <TimeSettingsStep
                data={wizardData.timeSettings}
                onChange={(data) => updateWizardData('timeSettings', data)}
              />
            )}
            {currentStep === 5 && (
              <RoomsStep
                data={wizardData.rooms}
                onChange={(data) => updateWizardData('rooms', data)}
              />
            )}

            {/* Validation Error */}
            {validationError && (
              <div className="mt-6 bg-red-50 border-2 border-red-200 rounded-xl p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-red-900">Ofullständig konfiguration</p>
                  <p className="text-sm text-red-700 mt-1">{validationError}</p>
                </div>
              </div>
            )}

            {/* Save Error */}
            {saveError && (
              <div className="mt-6 bg-red-50 border-2 border-red-200 rounded-xl p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-red-900">Kunde inte spara</p>
                  <p className="text-sm text-red-700 mt-1">{saveError}</p>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200">
              <button
                onClick={handleBack}
                disabled={currentStep === 1}
                className="px-6 py-2.5 text-gray-700 hover:bg-gray-100 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Tillbaka
              </button>
              <div className="text-sm text-gray-600">
                Steg {currentStep} av {STEPS.length}
              </div>
              <button
                onClick={handleNext}
                disabled={isSaving}
                className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sparar...
                  </>
                ) : (
                  <>
                    {getNextButtonText()}
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}