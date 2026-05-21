import { useState, useEffect } from 'react';
import { Plus, Trash2, BookOpen, CheckCircle2, AlertCircle, ChevronRight, ChevronLeft, Check, Search, Calendar, Target, GraduationCap, Edit2, Info, Copy, Loader2 } from 'lucide-react';
import { getPrograms, getCoursesByOrientation, getOrientations, getProgramSpecializationSubjects, Program as SkolverketProgram, Course as SkolverketCourse, Orientation } from '@/app/lib/syllabus-api';

interface Class {
  id: string;
  name: string;
  program: string;
  programName: string;
  specialization: string;
  students: number;
  startYear: number;
  endYear: number;
  termCount: number;
  courses: Course[];
  isComplete: boolean;
}

interface Course {
  id: string;
  name: string;
  code: string;
  points: number;
  hoursPerWeek: number;
  category: 'gymnasiegemensam' | 'programgemensam' | 'programfördjupning';
  terms?: number[];
}

interface Program {
  code: string;
  name: string;
  specializations: Orientation[];
}

interface ClassesAndCoursePlanStepProps {
  data: Class[];
  onChange: (data: Class[]) => void;
}

// Fallback elective courses if API doesn't return specialization courses
const FALLBACK_ELECTIVE_COURSES = [
  { code: 'PRRPRR01', name: 'Programmering 1', points: 100 },
  { code: 'PRRPRR02', name: 'Programmering 2', points: 100 },
  { code: 'WEBWEB01', name: 'Webbutveckling 1', points: 100 },
  { code: 'WEBWEB02', name: 'Webbutveckling 2', points: 100 },
  { code: 'DATDAG01', name: 'Datorstyrd produktion 1', points: 100 },
  { code: 'CAOCAO01', name: 'CAD 1', points: 100 },
  { code: 'PSYPSY01', name: 'Psykologi 1', points: 100 },
  { code: 'PSYPSY02a', name: 'Psykologi 2a', points: 100 },
  { code: 'FILPIL01', name: 'Filosofi 1', points: 100 },
  { code: 'FILPIL02', name: 'Filosofi 2', points: 100 },
  { code: 'SOISOI01', name: 'Sociologi', points: 100 },
  { code: 'LÅLALA02', name: 'Lärande och utveckling 2', points: 100 }
];

export function ClassesAndCoursePlanStep({ data, onChange }: ClassesAndCoursePlanStepProps) {
  const [classes, setClasses] = useState<Class[]>(data.length > 0 ? data : []);
  const [currentView, setCurrentView] = useState<'overview' | 'planning'>('overview');
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [planningStep, setPlanningStep] = useState(1);

  // Skolverket API data
  const [skolverketPrograms, setSkolverketPrograms] = useState<Program[]>([]);
  const [isLoadingPrograms, setIsLoadingPrograms] = useState(false);
  const [isLoadingOrientations, setIsLoadingOrientations] = useState(false);
  const [isLoadingCourses, setIsLoadingCourses] = useState(false);
  const [availableElectives, setAvailableElectives] = useState<any[]>(FALLBACK_ELECTIVE_COURSES);

  // Temporary state for course planning
  const [tempClassData, setTempClassData] = useState<Partial<Class>>({
    name: '',
    startYear: 2026,
    program: '',
    programName: '',
    specialization: '',
    students: 30,
    termCount: 6
  });

  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [gymnasiegemensamma, setGymnasiegemensamma] = useState<Course[]>([]);
  const [programgemensamma, setProgramgemensamma] = useState<Course[]>([]);
  const [programfördjupning, setProgramfördjupning] = useState<Course[]>([]);
  const [termPlanning, setTermPlanning] = useState<{ [key: string]: number[] }>({});

  // Load programs from Skolverket API on mount
  useEffect(() => {
    const loadPrograms = async () => {
      setIsLoadingPrograms(true);
      try {
        const programs = await getPrograms();
        // Filter to only gymnasium programs (GY)
        const gymPrograms = programs.filter(p => p.schoolTypes?.includes('GY'));

        // For each program, we'll load orientations when selected
        const programsWithOrientations: Program[] = gymPrograms.map(p => ({
          code: p.code,
          name: p.name,
          specializations: [] // Will be loaded when program is selected
        }));

        setSkolverketPrograms(programsWithOrientations);
      } catch (error) {
        console.error('Error loading programs from Skolverket:', error);
        // Fallback to some common programs
        setSkolverketPrograms([
          { code: 'TE', name: 'Teknikprogrammet', specializations: [] },
          { code: 'NA', name: 'Naturvetenskapsprogrammet', specializations: [] },
          { code: 'EK', name: 'Ekonomiprogrammet', specializations: [] },
          { code: 'SA', name: 'Samhällsvetenskapsprogrammet', specializations: [] },
          { code: 'ES', name: 'Estetiska programmet', specializations: [] }
        ]);
      } finally {
        setIsLoadingPrograms(false);
      }
    };

    loadPrograms();
  }, []);

  // Update parent whenever classes change
  useEffect(() => {
    onChange(classes);
  }, [classes]);

  // Initialize courses when program and orientation are selected (step 6+)
  useEffect(() => {
    const loadCourses = async () => {
      if (tempClassData.program && tempClassData.specialization && planningStep >= 6) {
        setIsLoadingCourses(true);
        try {
          // Get the orientation code from selectedProgram
          const orientationCode = selectedProgram?.specializations.find(
            s => s.name === tempClassData.specialization
          )?.code || tempClassData.specialization;

          // Fetch courses from Skolverket API
          const courses = await getCoursesByOrientation(tempClassData.program, orientationCode);

          // Separate courses by category
          const gymCourses: Course[] = courses
            .filter(c => c.category === 'FOUNDATIONAL_SUBJECTS')
            .map(c => ({
              id: c.courseCode,
              code: c.courseCode,
              name: c.name,
              points: c.points,
              category: 'gymnasiegemensam' as const,
              hoursPerWeek: Math.ceil(c.points / 100)
            }));

          const progCourses: Course[] = courses
            .filter(c => c.category === 'PROGRAMME_SPECIFIC_SUBJECTS')
            .map(c => ({
              id: c.courseCode,
              code: c.courseCode,
              name: c.name,
              points: c.points,
              category: 'programgemensam' as const,
              hoursPerWeek: Math.ceil(c.points / 100)
            }));

          // Also load specialization courses for electives
          const specializationCourses = await getProgramSpecializationSubjects(tempClassData.program);
          if (specializationCourses.length > 0) {
            setAvailableElectives(specializationCourses.map(c => ({
              code: c.courseCode,
              name: c.name,
              points: c.points
            })));
          } else {
            setAvailableElectives(FALLBACK_ELECTIVE_COURSES);
          }

          // Set the courses if we got data
          if (gymCourses.length > 0) {
            setGymnasiegemensamma(gymCourses);
          }
          if (progCourses.length > 0) {
            setProgramgemensamma(progCourses);
          }
        } catch (error) {
          console.error('Error loading courses from Skolverket:', error);
          // Keep any existing courses or use empty arrays
        } finally {
          setIsLoadingCourses(false);
        }
      }
    };

    loadCourses();
  }, [tempClassData.program, tempClassData.specialization, planningStep, selectedProgram]);

  const startNewClass = () => {
    setCurrentView('planning');
    setPlanningStep(1);
    setEditingClassId(null);
    setTempClassData({
      name: '',
      startYear: 2026,
      program: '',
      programName: '',
      specialization: '',
      students: 30,
      termCount: 6
    });
    setGymnasiegemensamma([]);
    setProgramgemensamma([]);
    setProgramfördjupning([]);
    setTermPlanning({});
  };

  const editClass = (classItem: Class) => {
    setCurrentView('planning');
    setEditingClassId(classItem.id);
    setTempClassData(classItem);
    setPlanningStep(1);
    
    // Reconstruct courses by category
    const gymCourses = classItem.courses.filter(c => c.category === 'gymnasiegemensam');
    const progCourses = classItem.courses.filter(c => c.category === 'programgemensam');
    const elCourses = classItem.courses.filter(c => c.category === 'programfördjupning');
    
    setGymnasiegemensamma(gymCourses);
    setProgramgemensamma(progCourses);
    setProgramfördjupning(elCourses);
    
    // Reconstruct term planning
    const planning: { [key: string]: number[] } = {};
    classItem.courses.forEach(course => {
      if (course.terms) {
        planning[course.code] = course.terms;
      }
    });
    setTermPlanning(planning);
    
    // Find program
    const prog = skolverketPrograms.find((p: Program) => p.code === classItem.program);
    setSelectedProgram(prog || null);
  };

  const deleteClass = (classId: string) => {
    setClasses(prev => prev.filter(c => c.id !== classId));
  };

  const duplicateClass = (classItem: Class) => {
    const duplicatedClass: Class = {
      ...classItem,
      id: Date.now().toString(),
      name: `${classItem.name} (kopia)`,
      isComplete: true
    };
    setClasses(prev => [...prev, duplicatedClass]);
  };

  const completePlanning = () => {
    // Compile all courses with term planning
    const allCourses = [
      ...gymnasiegemensamma.map(c => ({
        ...c,
        terms: termPlanning[c.code] || []
      })),
      ...programgemensamma.map(c => ({
        ...c,
        terms: termPlanning[c.code] || []
      })),
      ...programfördjupning.map(c => ({
        ...c,
        terms: termPlanning[c.code] || []
      }))
    ];

    const newClass: Class = {
      id: editingClassId || Date.now().toString(),
      name: tempClassData.name || '',
      program: tempClassData.program || '',
      programName: tempClassData.programName || '',
      specialization: tempClassData.specialization || '',
      students: tempClassData.students || 30,
      startYear: tempClassData.startYear || 2026,
      endYear: (tempClassData.startYear || 2026) + 3,
      termCount: tempClassData.termCount || 6,
      courses: allCourses,
      isComplete: true
    };

    if (editingClassId) {
      setClasses(prev => prev.map(c => c.id === editingClassId ? newClass : c));
    } else {
      setClasses(prev => [...prev, newClass]);
    }

    // Return to overview
    setCurrentView('overview');
    setPlanningStep(1);
    setEditingClassId(null);
  };

  const cancelPlanning = () => {
    setCurrentView('overview');
    setPlanningStep(1);
    setEditingClassId(null);
  };

  const handlePlanningNext = () => {
    if (planningStep < 9) {
      setPlanningStep(planningStep + 1);
    } else {
      completePlanning();
    }
  };

  const handlePlanningBack = () => {
    if (planningStep > 1) {
      setPlanningStep(planningStep - 1);
    } else {
      cancelPlanning();
    }
  };

  const handleProgramSelect = async (program: Program) => {
    setTempClassData(prev => ({
      ...prev,
      program: program.code,
      programName: program.name,
      specialization: ''
    }));

    // Load orientations from Skolverket API if not already loaded
    if (program.specializations.length === 0) {
      setIsLoadingOrientations(true);
      try {
        const orientations = await getOrientations(program.code);
        const updatedProgram: Program = {
          ...program,
          specializations: orientations
        };
        setSelectedProgram(updatedProgram);

        // Update the program in the list
        setSkolverketPrograms(prev =>
          prev.map(p => p.code === program.code ? updatedProgram : p)
        );
      } catch (error) {
        console.error('Error loading orientations:', error);
        // Fallback to empty orientations
        setSelectedProgram(program);
      } finally {
        setIsLoadingOrientations(false);
      }
    } else {
      setSelectedProgram(program);
    }
  };

  const toggleElectiveCourse = (course: any) => {
    const exists = programfördjupning.find(c => c.code === course.code);
    if (exists) {
      setProgramfördjupning(prev => prev.filter(c => c.code !== course.code));
    } else if (programfördjupning.length < 4) {
      setProgramfördjupning(prev => [...prev, {
        ...course,
        id: course.code,
        category: 'programfördjupning' as const,
        hoursPerWeek: Math.ceil(course.points / 100)
      }]);
    }
  };

  const toggleTermForCourse = (courseCode: string, term: number) => {
    setTermPlanning(prev => {
      const currentTerms = prev[courseCode] || [];
      const newTerms = currentTerms.includes(term)
        ? currentTerms.filter(t => t !== term)
        : [...currentTerms, term].sort();
      
      return {
        ...prev,
        [courseCode]: newTerms
      };
    });
  };

  const getTotalPoints = () => {
    const allCourses = [...gymnasiegemensamma, ...programgemensamma, ...programfördjupning];
    return allCourses.reduce((sum, course) => sum + course.points, 0);
  };

  const filteredElectives = availableElectives.filter(course =>
    course.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    course.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const PLANNING_STEPS = [
    'Grundinfo',
    'Program',
    'Inriktning',
    'Bekräfta',
    'Terminer',
    'Gymnasiegemensamma',
    'Programgemensamma',
    'Programfördjupning',
    'Planera terminer'
  ];

  if (currentView === 'planning') {
    return (
      <div>
        {/* Course Planning Sub-guide */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border-2 border-blue-200 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex-1">
              <h2 className="text-lg font-medium text-gray-900 mb-1">Kursplaneringsguide</h2>
              <p className="text-sm text-gray-600">
                {editingClassId ? 'Redigerar' : 'Skapar'} kursplan för {tempClassData.name || 'ny klass'}
              </p>
            </div>
            <button
              onClick={cancelPlanning}
              className="text-gray-600 hover:text-gray-900 text-sm px-4 py-2 rounded-lg hover:bg-white/50 transition"
            >
              Avbryt
            </button>
          </div>
          
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-gray-700">Substeg {planningStep} av {PLANNING_STEPS.length}</p>
            <p className="text-sm font-medium text-gray-900">{PLANNING_STEPS[planningStep - 1]}</p>
          </div>
          
          <div className="flex items-center gap-1">
            {PLANNING_STEPS.map((step, index) => (
              <div
                key={index}
                className={`h-2.5 flex-1 rounded-full transition-all ${
                  index + 1 < planningStep
                    ? 'bg-green-500'
                    : index + 1 === planningStep
                    ? 'bg-blue-600'
                    : 'bg-white/50'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Info Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-3 text-sm">
            <Info className="w-5 h-5 text-blue-600 flex-shrink-0" />
            <p className="text-blue-900">
              <span className="font-medium">Ditt arbete sparas automatiskt.</span> Du kan avbryta och fortsätta senare.
            </p>
          </div>
        </div>

        {/* Planning Content */}
        <div className="bg-white rounded-xl border border-gray-200 p-8 shadow-sm">
          <div className="mb-6">
            <h3 className="text-xl mb-2">{PLANNING_STEPS[planningStep - 1]}</h3>
            <p className="text-gray-600 text-sm">
              {planningStep === 1 && 'Ange grundläggande information om klassen'}
              {planningStep === 2 && 'Välj vilket nationellt program klassen ska följa'}
              {planningStep === 3 && 'Välj inriktning för programmet'}
              {planningStep === 4 && 'Granska och bekräfta informationen'}
              {planningStep === 5 && 'Välj hur lång programmet ska vara'}
              {planningStep === 6 && 'Granska obligatoriska gymnasiegemensamma kurser'}
              {planningStep === 7 && 'Granska obligatoriska programgemensamma kurser'}
              {planningStep === 8 && 'Välj kurser för programfördjupning'}
              {planningStep === 9 && 'Fördela kurser över terminerna'}
            </p>
          </div>

          <div className="mb-6">
            <div className="space-y-6">
              {/* Step 1: Basic Info */}
              {planningStep === 1 && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm mb-2 text-gray-700">Klassnamn</label>
                    <input
                      type="text"
                      value={tempClassData.name}
                      onChange={(e) => setTempClassData({ ...tempClassData, name: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="t.ex. TE26A"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm mb-2 text-gray-700">Startår</label>
                      <input
                        type="number"
                        value={tempClassData.startYear}
                        onChange={(e) => setTempClassData({ ...tempClassData, startYear: parseInt(e.target.value) })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="2020"
                        max="2030"
                      />
                    </div>
                    <div>
                      <label className="block text-sm mb-2 text-gray-700">Antal elever</label>
                      <input
                        type="number"
                        value={tempClassData.students}
                        onChange={(e) => setTempClassData({ ...tempClassData, students: parseInt(e.target.value) })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="1"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Select Program */}
              {planningStep === 2 && (
                <div className="space-y-4">
                  <div className="mb-4">
                    <h3 className="text-lg mb-2">Välj program från Skolverket</h3>
                    <p className="text-sm text-gray-600">
                      Välj vilket nationellt program klassen ska följa
                    </p>
                  </div>
                  {isLoadingPrograms ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                      <span className="ml-3 text-gray-600">Laddar program från Skolverket...</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3 max-h-96 overflow-y-auto">
                      {skolverketPrograms.map((program) => (
                        <button
                          key={program.code}
                          onClick={() => handleProgramSelect(program)}
                          className={`p-4 border-2 rounded-xl text-left transition-all ${
                            tempClassData.program === program.code
                              ? 'border-blue-600 bg-blue-50'
                              : 'border-gray-200 hover:border-blue-300'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                              tempClassData.program === program.code ? 'bg-blue-600' : 'bg-gray-100'
                            }`}>
                              <span className={`text-lg ${
                                tempClassData.program === program.code ? 'text-white' : 'text-gray-600'
                              }`}>
                                {program.code}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium">{program.name}</p>
                              <p className="text-sm text-gray-600">
                                Gymnasieprogram
                              </p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Step 3: Select Specialization */}
              {planningStep === 3 && selectedProgram && (
                <div className="space-y-4">
                  <div className="mb-4">
                    <h3 className="text-lg mb-2">Välj inriktning</h3>
                    <p className="text-sm text-gray-600">
                      Välj inriktning för {selectedProgram.name}
                    </p>
                  </div>
                  {isLoadingOrientations ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                      <span className="ml-3 text-gray-600">Laddar inriktningar...</span>
                    </div>
                  ) : selectedProgram.specializations.length === 0 ? (
                    <div className="text-center py-8">
                      <AlertCircle className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
                      <p className="text-gray-600">Inga inriktningar hittades för detta program.</p>
                      <p className="text-sm text-gray-500 mt-1">Du kan fortsätta utan inriktning.</p>
                      <button
                        onClick={() => setTempClassData({ ...tempClassData, specialization: 'Ingen specifik inriktning' })}
                        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                      >
                        Fortsätt utan inriktning
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3">
                      {selectedProgram.specializations.map((spec) => (
                        <button
                          key={spec.code}
                          onClick={() => setTempClassData({ ...tempClassData, specialization: spec.name })}
                          className={`p-4 border-2 rounded-xl text-left transition-all ${
                            tempClassData.specialization === spec.name
                              ? 'border-blue-600 bg-blue-50'
                              : 'border-gray-200 hover:border-blue-300'
                          }`}
                        >
                          <p className="font-medium">{spec.name}</p>
                          <p className="text-sm text-gray-500">{spec.code}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Step 4: Confirm */}
              {planningStep === 4 && (
                <div className="space-y-6">
                  <div className="bg-blue-50 rounded-xl p-6">
                    <h3 className="text-lg mb-4 flex items-center gap-2">
                      <Check className="w-5 h-5 text-blue-600" />
                      Bekräfta kursplan
                    </h3>
                    <div className="space-y-2 text-sm">
                      <p><span className="text-gray-600">Klass:</span> <span className="font-medium">{tempClassData.name}</span></p>
                      <p><span className="text-gray-600">Startår:</span> <span className="font-medium">{tempClassData.startYear}</span></p>
                      <p><span className="text-gray-600">Elever:</span> <span className="font-medium">{tempClassData.students}</span></p>
                      <p><span className="text-gray-600">Program:</span> <span className="font-medium">{tempClassData.programName}</span></p>
                      <p><span className="text-gray-600">Inriktning:</span> <span className="font-medium">{tempClassData.specialization}</span></p>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 5: Term Count */}
              {planningStep === 5 && (
                <div className="space-y-4">
                  <div className="mb-4">
                    <h3 className="text-lg mb-2">Välj programlängd</h3>
                    <p className="text-sm text-gray-600">
                      Hur många terminer ska programmet vara?
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => setTempClassData({ ...tempClassData, termCount: 6 })}
                      className={`p-6 border-2 rounded-xl transition-all ${
                        tempClassData.termCount === 6
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-200 hover:border-blue-300'
                      }`}
                    >
                      <Calendar className={`w-8 h-8 mx-auto mb-2 ${
                        tempClassData.termCount === 6 ? 'text-blue-600' : 'text-gray-400'
                      }`} />
                      <p className="font-medium text-center">6 terminer</p>
                      <p className="text-sm text-gray-600 text-center mt-1">3 år (standard)</p>
                    </button>
                    <button
                      onClick={() => setTempClassData({ ...tempClassData, termCount: 4 })}
                      className={`p-6 border-2 rounded-xl transition-all ${
                        tempClassData.termCount === 4
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-200 hover:border-blue-300'
                      }`}
                    >
                      <Calendar className={`w-8 h-8 mx-auto mb-2 ${
                        tempClassData.termCount === 4 ? 'text-blue-600' : 'text-gray-400'
                      }`} />
                      <p className="font-medium text-center">4 terminer</p>
                      <p className="text-sm text-gray-600 text-center mt-1">2 år</p>
                    </button>
                  </div>
                </div>
              )}

              {/* Step 6: Gymnasiegemensamma */}
              {planningStep === 6 && (
                <div className="space-y-4">
                  <div className="mb-4">
                    <h3 className="text-lg mb-2 flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-blue-600" />
                      Gymnasiegemensamma ämnen
                    </h3>
                    <p className="text-sm text-gray-600">
                      Dessa kurser är obligatoriska för alla gymnasieprogram och är redan förvalda
                    </p>
                  </div>

                  {isLoadingCourses ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                      <span className="ml-3 text-gray-600">Laddar kurser från Skolverket...</span>
                    </div>
                  ) : (
                    <>
                      <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4">
                        <div className="flex items-start gap-3">
                          <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-green-900 mb-1">
                              Automatiskt tillagt enligt Skolverkets riktlinjer
                            </p>
                            <p className="text-xs text-green-700">
                              Dessa kurser ingår i alla gymnasieprogram och kan inte tas bort
                            </p>
                          </div>
                        </div>
                      </div>

                      {gymnasiegemensamma.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          <AlertCircle className="w-8 h-8 mx-auto mb-2 text-yellow-500" />
                          <p>Inga gymnasiegemensamma kurser hittades för detta program.</p>
                          <p className="text-sm mt-1">Skolverkets API kanske inte returnerade data.</p>
                        </div>
                      ) : (
                        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-3 max-h-96 overflow-y-auto">
                          {gymnasiegemensamma.map((course) => (
                            <div
                              key={course.code}
                              className="flex items-center justify-between bg-gray-50 p-4 rounded-lg border border-gray-200"
                            >
                              <div className="flex items-center gap-3 flex-1">
                                <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                                  <Check className="w-4 h-4 text-green-600" />
                                </div>
                                <div>
                                  <p className="font-medium">{course.name}</p>
                                  <p className="text-sm text-gray-600">{course.code}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="font-medium text-blue-600">{course.points}p</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="bg-blue-50 rounded-lg p-4">
                        <p className="text-sm text-gray-700">
                          <span className="font-medium">Totalt:</span> {gymnasiegemensamma.reduce((sum, c) => sum + c.points, 0)} poäng
                        </p>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Step 7: Programgemensamma */}
              {planningStep === 7 && (
                <div className="space-y-4">
                  <div className="mb-4">
                    <h3 className="text-lg mb-2 flex items-center gap-2">
                      <GraduationCap className="w-5 h-5 text-blue-600" />
                      Programgemensamma ämnen
                    </h3>
                    <p className="text-sm text-gray-600">
                      Dessa kurser är obligatoriska för {tempClassData.programName} och är redan förvalda
                    </p>
                  </div>

                  {isLoadingCourses ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                      <span className="ml-3 text-gray-600">Laddar kurser...</span>
                    </div>
                  ) : (
                    <>
                      <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4">
                        <div className="flex items-start gap-3">
                          <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-green-900 mb-1">
                              Automatiskt tillagt för {tempClassData.programName}
                            </p>
                            <p className="text-xs text-green-700">
                              Dessa kurser är programspecifika och kan inte tas bort
                            </p>
                          </div>
                        </div>
                      </div>

                      {programgemensamma.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          <AlertCircle className="w-8 h-8 mx-auto mb-2 text-yellow-500" />
                          <p>Inga programgemensamma kurser hittades.</p>
                        </div>
                      ) : (
                        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-3 max-h-96 overflow-y-auto">
                          {programgemensamma.map((course) => (
                            <div
                              key={course.code}
                              className="flex items-center justify-between bg-gray-50 p-4 rounded-lg border border-gray-200"
                            >
                              <div className="flex items-center gap-3 flex-1">
                                <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                                  <Check className="w-4 h-4 text-green-600" />
                                </div>
                                <div>
                                  <p className="font-medium">{course.name}</p>
                                  <p className="text-sm text-gray-600">{course.code}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="font-medium text-blue-600">{course.points}p</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="bg-blue-50 rounded-lg p-4">
                        <p className="text-sm text-gray-700">
                          <span className="font-medium">Totalt:</span> {programgemensamma.reduce((sum, c) => sum + c.points, 0)} poäng
                        </p>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Step 8: Programfördjupning */}
              {planningStep === 8 && (
                <div className="space-y-4">
                  <div className="mb-4">
                    <h3 className="text-lg mb-2 flex items-center gap-2">
                      <Target className="w-5 h-5 text-blue-600" />
                      Planera programfördjupning
                    </h3>
                    <p className="text-sm text-gray-600">
                      Välj 4 kurser som programfördjupning ({programfördjupning.length}/4 valda)
                    </p>
                  </div>

                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Sök efter kurser..."
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-2 max-h-96 overflow-y-auto">
                    {filteredElectives.map((course) => {
                      const isSelected = programfördjupning.some(c => c.code === course.code);
                      return (
                        <button
                          key={course.code}
                          onClick={() => toggleElectiveCourse(course)}
                          disabled={!isSelected && programfördjupning.length >= 4}
                          className={`p-4 border-2 rounded-lg text-left transition-all ${
                            isSelected
                              ? 'border-blue-600 bg-blue-50'
                              : 'border-gray-200 hover:border-blue-300'
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">{course.name}</p>
                              <p className="text-sm text-gray-600">{course.code}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-medium text-blue-600">{course.points}p</p>
                              {isSelected && (
                                <Check className="w-5 h-5 text-blue-600 ml-auto mt-1" />
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Step 9: Term Planning */}
              {planningStep === 9 && (
                <div className="space-y-4">
                  <div className="mb-4">
                    <h3 className="text-lg mb-2">Planera kurser över terminer</h3>
                    <p className="text-sm text-gray-600">
                      Välj vilka terminer varje kurs ska läsas. Kurser kan vara 1-3 terminer långa.
                    </p>
                  </div>

                  <div className="bg-blue-50 rounded-lg p-4 mb-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-gray-700">
                        <span className="font-medium">Totalt poäng:</span> {getTotalPoints()} / 2500
                      </p>
                      <div className={`px-3 py-1 rounded-full text-sm ${
                        getTotalPoints() === 2500
                          ? 'bg-green-100 text-green-700'
                          : getTotalPoints() > 2500
                          ? 'bg-red-100 text-red-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {getTotalPoints() === 2500
                          ? 'Perfekt!'
                          : getTotalPoints() > 2500
                          ? `+${getTotalPoints() - 2500}p över`
                          : `${2500 - getTotalPoints()}p kvar`
                          }
                      </div>
                    </div>
                  </div>

                  <div className="border border-gray-200 rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                              Kurs
                            </th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                              Poäng
                            </th>
                            {Array.from({ length: tempClassData.termCount || 6 }, (_, i) => (
                              <th key={i} className="px-4 py-3 text-center text-sm font-medium text-gray-700">
                                T{i + 1}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {[...gymnasiegemensamma, ...programgemensamma, ...programfördjupning].map((course) => {
                            const selectedTerms = termPlanning[course.code] || [];
                            return (
                              <tr key={course.code} className="hover:bg-gray-50">
                                <td className="px-4 py-3 text-sm">
                                  <p className="font-medium">{course.name}</p>
                                  <p className="text-gray-600 text-xs">{course.code}</p>
                                </td>
                                <td className="px-4 py-3 text-sm text-blue-600 font-medium">
                                  {course.points}p
                                </td>
                                {Array.from({ length: tempClassData.termCount || 6 }, (_, i) => {
                                  const term = i + 1;
                                  const isSelected = selectedTerms.includes(term);
                                  return (
                                    <td key={i} className="px-4 py-3 text-center">
                                      <button
                                        onClick={() => toggleTermForCourse(course.code, term)}
                                        disabled={!isSelected && selectedTerms.length >= 3}
                                        className={`w-8 h-8 rounded-lg transition-all ${
                                          isSelected
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-gray-100 hover:bg-gray-200'
                                        } disabled:opacity-30 disabled:cursor-not-allowed`}
                                      >
                                        {isSelected && <Check className="w-4 h-4 mx-auto" />}
                                      </button>
                                    </td>
                                  );
                                })}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Planning Navigation */}
          <div className="flex items-center justify-between pt-6 border-t border-gray-200">
            <button
              onClick={handlePlanningBack}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
            >
              <ChevronLeft className="w-4 h-4" />
              {planningStep === 1 ? 'Avbryt' : 'Tillbaka'}
            </button>
            <button
              onClick={handlePlanningNext}
              disabled={
                (planningStep === 1 && !tempClassData.name) ||
                (planningStep === 2 && !tempClassData.program) ||
                (planningStep === 3 && !tempClassData.specialization) ||
                (planningStep === 8 && programfördjupning.length !== 4)
              }
              className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {planningStep === 9 ? 'Slutför kursplan' : 'Nästa'}
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Overview
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl mb-2">Klasser och kursplanering</h2>
        <p className="text-gray-600">
          Skapa klasser och planera deras kursplaner enligt Skolverkets riktlinjer
        </p>
      </div>

      {classes.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-xl">
          <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 mb-4">Inga klasser tillagda än</p>
          <button
            onClick={startNewClass}
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition shadow-sm"
          >
            <Plus className="w-5 h-5" />
            Skapa första klassen
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {classes.map((classItem) => {
              const totalPoints = classItem.courses.reduce((sum, c) => sum + c.points, 0);
              // A class is complete if it has courses and total points is at least 2500 (gymnasieprogram requirement)
              const hasEnoughCourses = classItem.courses.length >= 20;
              const hasEnoughPoints = totalPoints >= 2500;
              const isComplete = hasEnoughCourses && hasEnoughPoints;

              return (
                <div key={classItem.id} className="border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-xl">{classItem.name}</h3>
                        <div className={`p-1 rounded-full ${
                          isComplete ? 'bg-green-100' : 'bg-yellow-100'
                        }`}>
                          {isComplete ? (
                            <CheckCircle2 className="w-5 h-5 text-green-600" />
                          ) : (
                            <AlertCircle className="w-5 h-5 text-yellow-600" />
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mb-1">
                        {classItem.programName}
                        {classItem.specialization && ` • ${classItem.specialization}`}
                      </p>
                      <p className="text-xs text-gray-500">
                        {classItem.startYear} - {classItem.endYear} • {classItem.students} elever • {classItem.termCount} terminer
                      </p>
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <p className="text-xs text-gray-600">
                          {classItem.courses.length} kurser • {totalPoints} poäng
                          <span className={`ml-2 ${
                            isComplete ? 'text-green-600' : 'text-yellow-600'
                          }`}>
                            {isComplete ? '• Komplett' : '• Inkomplett'}
                          </span>
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => editClass(classItem)}
                        className="text-blue-600 hover:bg-blue-50 p-2 rounded-lg transition"
                      >
                        <Edit2 className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => deleteClass(classItem.id)}
                        className="text-gray-400 hover:text-red-600 p-2 rounded-lg transition"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => duplicateClass(classItem)}
                        className="text-gray-400 hover:text-blue-600 p-2 rounded-lg transition"
                      >
                        <Copy className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            onClick={startNewClass}
            className="w-full border-2 border-dashed border-gray-300 rounded-xl p-4 text-gray-600 hover:border-blue-500 hover:text-blue-600 transition flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Lägg till klass
          </button>
        </div>
      )}
    </div>
  );
}