import { useState, useEffect, useMemo, useCallback } from 'react';
import { AlertCircle, CheckCircle2, UserCircle, Calendar, Sliders, Users, Target, HandIcon, Zap, X, Info, Search, Filter, Table, LayoutGrid, ChevronDown, ChevronUp, Package, Heart, Loader2 } from 'lucide-react';
import { mentorsApi } from '@/app/lib/api/client';

interface ServiceAllocationStepProps {
  data: any[];
  onChange: (data: any[]) => void;
  classes: any[];
  teachers: any[];
}

// Category mapping for courses
const getCourseCategory = (courseName: string): string => {
  const name = courseName.toLowerCase();
  
  if (name.includes('engelska') || name.includes('spanska') || name.includes('franska') || 
      name.includes('tyska') || name.includes('svenska') || name.includes('modersmål')) {
    return 'Språkämnen';
  }
  if (name.includes('matematik') || name.includes('fysik') || name.includes('kemi') || 
      name.includes('biologi') || name.includes('naturkunskap')) {
    return 'Naturämnen';
  }
  if (name.includes('teknik') || name.includes('programmering') || name.includes('datorer') ||
      name.includes('automation') || name.includes('elektronik')) {
    return 'Teknikämnen';
  }
  if (name.includes('historia') || name.includes('religion') || name.includes('samhälle') ||
      name.includes('geografi') || name.includes('psykologi') || name.includes('filosofi')) {
    return 'Samhällsämnen';
  }
  if (name.includes('idrott') || name.includes('hälsa')) {
    return 'Idrott & Hälsa';
  }
  if (name.includes('bild') || name.includes('musik') || name.includes('estetik')) {
    return 'Estetiska ämnen';
  }
  
  return 'Övriga ämnen';
};

// Extract points from course - assume 100p if not specified
const getCoursePoints = (course: any): number => {
  if (course.points) return parseInt(course.points);
  // Try to extract from course name/code
  const match = course.name?.match(/\d+p/) || course.code?.match(/\d+p/);
  if (match) return parseInt(match[0]);
  return 100; // Default to 100 points
};

// Helper to calculate which year a class is in for a given academic year
const getClassYearLevel = (classStartYear: number, academicYear: number): number => {
  return academicYear - classStartYear + 1;
};

// Available academic years for planning
const ACADEMIC_YEARS = [
  { value: 2026, label: 'Läsår 2026/2027' },
  { value: 2027, label: 'Läsår 2027/2028' },
  { value: 2028, label: 'Läsår 2028/2029' },
];

export function ServiceAllocationStep({ data, onChange, classes, teachers }: ServiceAllocationStepProps) {
  const [matchingMode, setMatchingMode] = useState<'automatic' | 'manual'>('automatic');
  const [showAllocationView, setShowAllocationView] = useState(false);
  const [filterBy, setFilterBy] = useState<'all' | 'unassigned' | 'problems'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['Språkämnen', 'Naturämnen', 'Teknikämnen']));
  const [showTeacherStats, setShowTeacherStats] = useState(false);
  const [teacherSearchQuery, setTeacherSearchQuery] = useState('');
  const [selectedAcademicYear, setSelectedAcademicYear] = useState(2026); // Default to 2026/2027
  const [optimizationSettings, setOptimizationSettings] = useState({
    prioritizeQualification: 80,
    balanceWorkload: 70,
    preferContinuity: 60,
  });
  const [allocations, setAllocations] = useState<any[]>(data || []);
  const [mentorships, setMentorships] = useState<{ [classId: string]: string[] }>({});
  const [savingMentorFor, setSavingMentorFor] = useState<string | null>(null); // Track which class is being saved

  // Load mentors from classes on mount (classes may have mentors from backend)
  useEffect(() => {
    const initialMentorships: { [classId: string]: string[] } = {};
    classes.forEach((classItem: any) => {
      if (classItem.mentors && classItem.mentors.length > 0) {
        // Sort by isPrimary so primary mentor is first
        const sortedMentors = [...classItem.mentors].sort((a: any, b: any) =>
          (b.isPrimary ? 1 : 0) - (a.isPrimary ? 1 : 0)
        );
        initialMentorships[classItem.id] = sortedMentors.map((m: any) => m.teacherId);
      }
    });
    if (Object.keys(initialMentorships).length > 0) {
      setMentorships(initialMentorships);
    }
  }, [classes]);

  // Handle mentor assignment with optimistic updates
  const handleMentorChange = useCallback(async (classId: string, mentorIndex: 0 | 1, newTeacherId: string | null, currentMentors: string[]) => {
    setSavingMentorFor(classId);

    // Optimistic update
    const newMentorships = { ...mentorships };
    if (newTeacherId) {
      if (mentorIndex === 0) {
        newMentorships[classId] = [newTeacherId, currentMentors[1]].filter(Boolean);
      } else {
        if (currentMentors[0]) {
          newMentorships[classId] = [currentMentors[0], newTeacherId];
        } else {
          newMentorships[classId] = [newTeacherId];
        }
      }
    } else {
      // Removing mentor
      if (mentorIndex === 0) {
        if (currentMentors[1]) {
          newMentorships[classId] = [currentMentors[1]];
        } else {
          delete newMentorships[classId];
        }
      } else {
        if (currentMentors[0]) {
          newMentorships[classId] = [currentMentors[0]];
        } else {
          delete newMentorships[classId];
        }
      }
    }
    setMentorships(newMentorships);

    // API calls in background - don't block UI
    try {
      const oldTeacherId = currentMentors[mentorIndex];

      // Remove old mentor if exists
      if (oldTeacherId && oldTeacherId !== newTeacherId) {
        await mentorsApi.remove(classId, oldTeacherId).catch(() => {
          // Ignore errors for removal - mentor might not exist in DB yet
        });
      }

      // Add new mentor if selected
      if (newTeacherId) {
        const isPrimary = mentorIndex === 0;
        await mentorsApi.assign(classId, { teacherId: newTeacherId, isPrimary: isPrimary ? 1 : 0 }).catch(async (err) => {
          // If already exists, try to update instead
          if (err.status === 409) {
            await mentorsApi.update(classId, newTeacherId, { isPrimary: isPrimary ? 1 : 0 });
          }
        });
      }
    } catch (error) {
      console.error('Failed to save mentor:', error);
      // Don't revert - keep optimistic update for better UX
    } finally {
      setSavingMentorFor(null);
    }
  }, [mentorships]);

  // Filter classes that are active in the selected academic year
  const activeClasses = useMemo(() => {
    return classes.filter((classItem) => {
      const startYear = classItem.startYear;
      const graduationYear = classItem.graduationYear || (startYear + 3);
      // Class is active if academic year is between start and graduation
      return selectedAcademicYear >= startYear && selectedAcademicYear < graduationYear;
    });
  }, [classes, selectedAcademicYear]);

  // Memoize expensive calculations - now based on filtered courses for selected academic year
  const requiredPositions = useMemo(() => {
    if (!activeClasses || activeClasses.length === 0) return { totalPoints: 0, fullTimePositions: 0, classCount: 0 };

    let totalPoints = 0;
    activeClasses.forEach((classItem) => {
      if (classItem.courses && Array.isArray(classItem.courses)) {
        const classYearLevel = getClassYearLevel(classItem.startYear, selectedAcademicYear);
        classItem.courses
          .filter((course: any) => course.year === classYearLevel)
          .forEach((course: any) => {
            const points = getCoursePoints(course);
            totalPoints += points;
          });
      }
    });

    const FULL_TIME_POINTS = 600;
    const fullTimePositions = totalPoints / FULL_TIME_POINTS;

    return {
      totalPoints,
      fullTimePositions: Math.round(fullTimePositions * 10) / 10,
      classCount: activeClasses.length,
    };
  }, [activeClasses, selectedAcademicYear]);

  const handleAddAllocation = (classId: string, courseCode: string, teacherId: string) => {
    const newAllocation = {
      id: `${classId}-${courseCode}-${teacherId}-${Date.now()}`,
      classId,
      courseCode,
      teacherId,
    };
    const updated = [...allocations, newAllocation];
    setAllocations(updated);
    onChange(updated);
  };

  const handleRemoveAllocation = (allocationId: string) => {
    const updated = allocations.filter(a => a.id !== allocationId);
    setAllocations(updated);
    onChange(updated);
  };

  const generateAutomaticAllocations = () => {
    const newAllocations: any[] = [];

    activeClasses.forEach((classItem) => {
      if (classItem.courses && Array.isArray(classItem.courses)) {
        const classYearLevel = getClassYearLevel(classItem.startYear, selectedAcademicYear);
        const relevantCourses = classItem.courses.filter((course: any) => course.year === classYearLevel);

        relevantCourses.forEach((course: any) => {
          const courseName = course.name || course.courseName;
          const courseCode = course.code || course.courseCode;

          const qualifiedTeachers = teachers.filter(teacher =>
            teacher.subjects?.some((subject: string) =>
              courseName.toLowerCase().includes(subject.toLowerCase())
            )
          );

          const teacherToAssign = qualifiedTeachers.length > 0 ? qualifiedTeachers[0] : teachers[0];

          if (teacherToAssign) {
            newAllocations.push({
              id: `${classItem.id}-${courseCode}-${teacherToAssign.id}-${Date.now()}-${Math.random()}`,
              classId: classItem.id,
              courseCode: courseCode,
              teacherId: teacherToAssign.id,
            });
          }
        });
      }
    });

    setAllocations(newAllocations);
    onChange(newAllocations);
  };

  const handleMatchingModeClick = (mode: 'automatic' | 'manual') => {
    setMatchingMode(mode);
    setShowAllocationView(true);
    
    if (mode === 'automatic') {
      generateAutomaticAllocations();
    } else {
      setAllocations([]);
      onChange([]);
    }
  };

  const buildCourseInstances = useMemo(() => {
    const instances: any[] = [];

    activeClasses.forEach((classItem) => {
      if (classItem.courses && Array.isArray(classItem.courses)) {
        // Calculate which year level this class is in for the selected academic year
        const classYearLevel = getClassYearLevel(classItem.startYear, selectedAcademicYear);

        // Filter courses to only those for this year level
        const relevantCourses = classItem.courses.filter((course: any) => {
          return course.year === classYearLevel;
        });

        relevantCourses.forEach((course: any) => {
          const courseAllocations = allocations.filter(
            a => a.classId === classItem.id && a.courseCode === course.code
          );

          instances.push({
            id: `${classItem.id}-${course.code}`,
            className: classItem.name || classItem.classCode,
            classProgram: classItem.program || classItem.programName,
            courseName: course.name || course.courseName,
            courseCode: course.code || course.courseCode,
            points: getCoursePoints(course),
            category: getCourseCategory(course.name || course.courseName),
            allocations: courseAllocations,
            classId: classItem.id,
            yearLevel: classYearLevel,
          });
        });
      }
    });

    return instances;
  }, [activeClasses, allocations, selectedAcademicYear]);

  const stats = useMemo(() => {
    const instances = buildCourseInstances;
    const totalInstances = instances.length;
    const assignedInstances = instances.filter(i => i.allocations.length > 0).length;
    const totalPoints = instances.reduce((sum, i) => sum + i.points, 0);
    const assignedPoints = instances.filter(i => i.allocations.length > 0).reduce((sum, i) => sum + i.points, 0);

    const unqualifiedAssignments = instances.filter(i => {
      return i.allocations.some((allocation: any) => {
        const teacher = teachers.find(t => t.id === allocation.teacherId);
        const course = classes
          .find(c => c.id === i.classId)
          ?.courses?.find((co: any) => co.code === i.courseCode);

        if (!teacher || !course) return false;

        return !teacher.subjects?.some((subject: string) =>
          course.name.toLowerCase().includes(subject.toLowerCase())
        );
      });
    }).length;

    return {
      totalInstances,
      assignedInstances,
      unassignedInstances: totalInstances - assignedInstances,
      unqualifiedAssignments,
      totalPoints,
      assignedPoints,
      unassignedPoints: totalPoints - assignedPoints,
      progress: totalInstances > 0 ? Math.round((assignedInstances / totalInstances) * 100) : 0,
    };
  }, [buildCourseInstances, teachers, classes]);

  const teacherStats = useMemo(() => {
    const stats = teachers.map(teacher => {
      const teacherAllocations = allocations.filter(a => a.teacherId === teacher.id);
      let totalPoints = 0;

      teacherAllocations.forEach(allocation => {
        const instance = buildCourseInstances.find(i =>
          i.classId === allocation.classId && i.courseCode === allocation.courseCode
        );
        if (instance) {
          totalPoints += instance.points;
        }
      });

      return {
        ...teacher,
        allocatedPoints: totalPoints,
        percentage: Math.round((totalPoints / 600) * 100),
        courseCount: teacherAllocations.length,
      };
    });

    return stats.sort((a, b) => b.allocatedPoints - a.allocatedPoints);
  }, [teachers, allocations, buildCourseInstances]);

  const filteredInstances = useMemo(() => {
    let instances = [...buildCourseInstances];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      instances = instances.filter(i =>
        i.className.toLowerCase().includes(query) ||
        i.courseName.toLowerCase().includes(query) ||
        i.courseCode.toLowerCase().includes(query) ||
        i.category.toLowerCase().includes(query) ||
        i.allocations.some((a: any) => {
          const teacher = teachers.find(t => t.id === a.teacherId);
          return teacher?.name.toLowerCase().includes(query);
        })
      );
    }

    if (filterBy === 'unassigned') {
      instances = instances.filter(i => i.allocations.length === 0);
    } else if (filterBy === 'problems') {
      instances = instances.filter(i => {
        if (i.allocations.length === 0) return true;

        return i.allocations.some((allocation: any) => {
          const teacher = teachers.find(t => t.id === allocation.teacherId);
          const course = classes
            .find(c => c.id === i.classId)
            ?.courses?.find((co: any) => co.code === i.courseCode);

          if (!teacher || !course) return false;

          return !teacher.subjects?.some((subject: string) =>
            course.name.toLowerCase().includes(subject.toLowerCase())
          );
        });
      });
    }

    return instances;
  }, [buildCourseInstances, searchQuery, filterBy, teachers, classes]);

  const instancesByCategory = useMemo(() => {
    const byCategory: { [key: string]: any[] } = {};

    filteredInstances.forEach(instance => {
      if (!byCategory[instance.category]) {
        byCategory[instance.category] = [];
      }
      byCategory[instance.category].push(instance);
    });

    return byCategory;
  }, [filteredInstances]);

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  // Get teacher workload summary
  const workloadSummary = useMemo(() => {
    const overloaded = teacherStats.filter(t => t.percentage > 100).length;
    const optimal = teacherStats.filter(t => t.percentage >= 80 && t.percentage <= 100).length;
    const underutilized = teacherStats.filter(t => t.percentage > 0 && t.percentage < 50).length;
    const active = teacherStats.filter(t => t.allocatedPoints > 0).length;
    const avgWorkload = teacherStats.length > 0
      ? Math.round(teacherStats.reduce((sum, t) => sum + t.percentage, 0) / teacherStats.length)
      : 0;

    return {
      overloaded,
      optimal,
      underutilized,
      active,
      total: teachers.length,
      avgWorkload,
    };
  }, [teacherStats, teachers.length]);

  const filteredTeacherStats = useMemo(() => {
    if (!teacherSearchQuery.trim()) return teacherStats;

    const query = teacherSearchQuery.toLowerCase();
    return teacherStats.filter(t => t.name.toLowerCase().includes(query));
  }, [teacherStats, teacherSearchQuery]);

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl mb-2">Tjänstefördelning</h2>
        <p className="text-gray-600">
          Koppla lärare till kurser och klasser för optimal schemaläggning
        </p>
      </div>

      {/* Academic Year Selector */}
      <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            <p className="text-sm text-blue-900">
              Planera tjänstefördelning för:
            </p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={selectedAcademicYear}
              onChange={(e) => {
                setSelectedAcademicYear(parseInt(e.target.value));
                // Clear allocations when changing year
                setAllocations([]);
                onChange([]);
              }}
              className="px-3 py-1.5 border border-blue-300 rounded-lg text-sm font-medium text-blue-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {ACADEMIC_YEARS.map((year) => (
                <option key={year.value} value={year.value}>
                  {year.label}
                </option>
              ))}
            </select>
            <div className="text-sm text-blue-700">
              <span className="font-medium">{requiredPositions.classCount}</span> aktiva klasser · <span className="font-medium">{requiredPositions.totalPoints}</span> poäng
            </div>
          </div>
        </div>
        {selectedAcademicYear > 2026 && (
          <div className="mt-2 flex items-center gap-2 text-xs text-amber-700 bg-amber-50 px-3 py-2 rounded-lg border border-amber-200">
            <AlertCircle className="w-4 h-4" />
            <span>Planering för framtida läsår kan påverkas av förändringar i läraranställningar.</span>
          </div>
        )}
      </div>

      {!showAllocationView && (
        <>
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Sliders className="w-5 h-5 text-gray-700" />
              <h3 className="font-semibold text-gray-900">Optimeringsparametrar</h3>
            </div>
            
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <p className="text-sm text-gray-600 mb-6">
                Justera viktningen av olika faktorer vid automatisk tjänstefördelning
              </p>

              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium text-gray-700">
                        Prioritera behörighet
                      </label>
                      <div className="group relative">
                        <Info className="w-4 h-4 text-gray-400 cursor-help" />
                        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block w-64 bg-gray-900 text-white text-xs rounded-lg py-2 px-3 z-10">
                          Hur viktigt är det att lärare har formell behörighet för kursen?
                          <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                        </div>
                      </div>
                    </div>
                    <span className="text-sm text-gray-900 font-medium">{optimizationSettings.prioritizeQualification}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={optimizationSettings.prioritizeQualification}
                    onChange={(e) => setOptimizationSettings(prev => ({
                      ...prev,
                      prioritizeQualification: parseInt(e.target.value)
                    }))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium text-gray-700">
                        Balansera arbetsbelastning
                      </label>
                      <div className="group relative">
                        <Info className="w-4 h-4 text-gray-400 cursor-help" />
                        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block w-64 bg-gray-900 text-white text-xs rounded-lg py-2 px-3 z-10">
                          Fördela poäng jämnt mellan lärare baserat på anställningsandel
                          <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                        </div>
                      </div>
                    </div>
                    <span className="text-sm text-gray-900 font-medium">{optimizationSettings.balanceWorkload}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={optimizationSettings.balanceWorkload}
                    onChange={(e) => setOptimizationSettings(prev => ({
                      ...prev,
                      balanceWorkload: parseInt(e.target.value)
                    }))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium text-gray-700">
                        Föredra kontinuitet
                      </label>
                      <div className="group relative">
                        <Info className="w-4 h-4 text-gray-400 cursor-help" />
                        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block w-64 bg-gray-900 text-white text-xs rounded-lg py-2 px-3 z-10">
                          Behåll samma lärare för en klass över tid när möjligt
                          <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                        </div>
                      </div>
                    </div>
                    <span className="text-sm text-gray-900 font-medium">{optimizationSettings.preferContinuity}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={optimizationSettings.preferContinuity}
                    onChange={(e) => setOptimizationSettings(prev => ({
                      ...prev,
                      preferContinuity: parseInt(e.target.value)
                    }))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Välj hur du vill fortsätta
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => handleMatchingModeClick('automatic')}
                className="p-6 rounded-xl border-2 border-gray-300 hover:border-blue-400 hover:bg-blue-50 transition text-center"
              >
                <Zap className="w-8 h-8 mx-auto mb-3 text-blue-600" />
                <p className="font-semibold text-lg mb-1 text-gray-900">
                  Automatisk matchning
                </p>
                <p className="text-sm text-gray-600">
                  Gå vidare och låt systemet optimera
                </p>
              </button>
              <button
                onClick={() => handleMatchingModeClick('manual')}
                className="p-6 rounded-xl border-2 border-gray-300 hover:border-blue-400 hover:bg-blue-50 transition text-center"
              >
                <HandIcon className="w-8 h-8 mx-auto mb-3 text-blue-600" />
                <p className="font-semibold text-lg mb-1 text-gray-900">
                  Manuell matchning
                </p>
                <p className="text-sm text-gray-600">
                  Tilldela lärare till kurser själv
                </p>
              </button>
            </div>
          </div>
        </>
      )}

      {showAllocationView && (
        <>
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {matchingMode === 'automatic' ? (
                <div className="flex items-center gap-2 px-4 py-2 bg-blue-100 rounded-lg">
                  <Zap className="w-5 h-5 text-blue-600" />
                  <span className="font-medium text-blue-900">Automatisk matchning</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-4 py-2 bg-purple-100 rounded-lg">
                  <HandIcon className="w-5 h-5 text-purple-600" />
                  <span className="font-medium text-purple-900">Manuell matchning</span>
                </div>
              )}
            </div>
            <button
              onClick={() => setShowAllocationView(false)}
              className="text-sm text-gray-600 hover:text-gray-900 transition"
            >
              ← Tillbaka till inställningar
            </button>
          </div>

          {activeClasses.length === 0 || teachers.length === 0 ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-yellow-900">
                  <p className="font-medium mb-1">Data saknas</p>
                  <p>
                    {activeClasses.length === 0 && classes.length > 0 && `Inga klasser är aktiva läsår ${selectedAcademicYear}/${selectedAcademicYear + 1}. Välj ett annat läsår. `}
                    {classes.length === 0 && 'Du behöver först lägga till klasser och kurser. '}
                    {teachers.length === 0 && 'Du behöver först lägga till lärare. '}
                    {(classes.length === 0 || teachers.length === 0) && 'Gå tillbaka till tidigare steg för att lägga till denna information.'}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div>
              {/* Teacher Workload Summary Widget */}
              <div className="mb-6 bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-purple-600 flex items-center justify-center">
                      <Users className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Lärarbelastning</h3>
                      <p className="text-sm text-gray-600">
                        {workloadSummary.active} av {workloadSummary.total} lärare har tilldelningar · Snitt: {workloadSummary.avgWorkload}%
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    {workloadSummary.overloaded > 0 && (
                      <div className="flex items-center gap-2 px-3 py-2 bg-red-100 rounded-lg">
                        <AlertCircle className="w-4 h-4 text-red-600" />
                        <div>
                          <p className="text-xs text-red-600 font-medium">{workloadSummary.overloaded} överbelastade</p>
                        </div>
                      </div>
                    )}
                    {workloadSummary.optimal > 0 && (
                      <div className="flex items-center gap-2 px-3 py-2 bg-green-100 rounded-lg">
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                        <div>
                          <p className="text-xs text-green-600 font-medium">{workloadSummary.optimal} optimal nivå</p>
                        </div>
                      </div>
                    )}
                    {workloadSummary.underutilized > 0 && (
                      <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg">
                        <Info className="w-4 h-4 text-gray-600" />
                        <div>
                          <p className="text-xs text-gray-600 font-medium">{workloadSummary.underutilized} underutnyttjade</p>
                        </div>
                      </div>
                    )}
                    
                    <button
                      onClick={() => setShowTeacherStats(!showTeacherStats)}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition text-sm font-medium"
                    >
                      {showTeacherStats ? 'Dölj detaljer' : 'Visa alla lärare'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Teacher Stats Expandable Panel */}
              {showTeacherStats && (
                <div className="mb-6 bg-white border-2 border-purple-200 rounded-xl overflow-hidden">
                  <div className="bg-purple-50 px-6 py-4 border-b border-purple-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Users className="w-5 h-5 text-purple-700" />
                        <h3 className="font-semibold text-gray-900">Alla lärare ({teachers.length})</h3>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input
                            type="text"
                            placeholder="Sök lärare..."
                            value={teacherSearchQuery}
                            onChange={(e) => setTeacherSearchQuery(e.target.value)}
                            className="pl-10 pr-4 py-2 border border-purple-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                          />
                        </div>
                        <button
                          onClick={() => setShowTeacherStats(false)}
                          className="text-gray-500 hover:text-gray-700 transition"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
                      {filteredTeacherStats.map(teacher => (
                        <div key={teacher.id} className="border-2 border-gray-200 rounded-lg p-4 hover:border-purple-300 transition">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-gray-900 truncate">{teacher.name}</p>
                              <p className="text-sm text-gray-500">{teacher.courseCount} kurser tilldelade</p>
                            </div>
                            <span className={`text-lg font-bold ml-2 ${
                              teacher.percentage >= 100 ? 'text-red-600' :
                              teacher.percentage >= 80 ? 'text-orange-600' :
                              teacher.percentage >= 50 ? 'text-blue-600' :
                              teacher.percentage > 0 ? 'text-gray-600' :
                              'text-gray-400'
                            }`}>
                              {teacher.percentage}%
                            </span>
                          </div>
                          
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">{teacher.allocatedPoints} / 600 poäng</span>
                              {teacher.percentage >= 100 && (
                                <span className="text-xs text-red-600 font-medium">Överbelastad!</span>
                              )}
                              {teacher.percentage >= 80 && teacher.percentage < 100 && (
                                <span className="text-xs text-green-600 font-medium">Optimal</span>
                              )}
                              {teacher.percentage < 50 && teacher.percentage > 0 && (
                                <span className="text-xs text-gray-500">Underutnyttjad</span>
                              )}
                              {teacher.percentage === 0 && (
                                <span className="text-xs text-gray-400">Inga tilldelningar</span>
                              )}
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                              <div 
                                className={`h-full transition-all ${
                                  teacher.percentage >= 100 ? 'bg-red-500' :
                                  teacher.percentage >= 80 ? 'bg-green-500' :
                                  teacher.percentage >= 50 ? 'bg-blue-500' :
                                  teacher.percentage > 0 ? 'bg-gray-400' :
                                  'bg-gray-300'
                                }`}
                                style={{ width: `${Math.min(teacher.percentage, 100)}%` }}
                              ></div>
                            </div>
                            
                            {teacher.subjects && teacher.subjects.length > 0 && (
                              <div className="pt-2 border-t border-gray-200">
                                <p className="text-xs text-gray-500 mb-1">Behörigheter:</p>
                                <div className="flex flex-wrap gap-1">
                                  {teacher.subjects.slice(0, 3).map((subject: string, idx: number) => (
                                    <span key={idx} className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded">
                                      {subject}
                                    </span>
                                  ))}
                                  {teacher.subjects.length > 3 && (
                                    <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                                      +{teacher.subjects.length - 3}
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                      
                      {filteredTeacherStats.length === 0 && (
                        <div className="col-span-full text-center py-8">
                          <p className="text-gray-500">Inga lärare hittades</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Statistics Overview */}
              <div className="mb-6 grid grid-cols-4 gap-4">
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <p className="text-xs text-gray-600 mb-1">Totalt</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalInstances}</p>
                    <p className="text-xs text-gray-500">kurser ({stats.totalPoints}p)</p>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-xs text-green-700 mb-1">Tilldelade</p>
                    <p className="text-2xl font-bold text-green-700">{stats.assignedInstances}</p>
                    <p className="text-xs text-green-600">{stats.assignedPoints}p ({stats.progress}%)</p>
                  </div>
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <p className="text-xs text-orange-700 mb-1">Otilldelade</p>
                    <p className="text-2xl font-bold text-orange-700">{stats.unassignedInstances}</p>
                    <p className="text-xs text-orange-600">{stats.unassignedPoints}p återstår</p>
                  </div>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-xs text-red-700 mb-1">Obehöriga</p>
                    <p className="text-2xl font-bold text-red-700">{stats.unqualifiedAssignments}</p>
                    <p className="text-xs text-red-600">behöver åtgärdas</p>
                  </div>
                </div>

                {/* Search and Filter */}
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Sök klass, kurs, kategori eller lärare..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <select
                    value={filterBy}
                    onChange={(e) => setFilterBy(e.target.value as any)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="all">Visa alla</option>
                    <option value="unassigned">Bara otilldelade</option>
                    <option value="problems">Bara problem</option>
                  </select>
                </div>

                {/* Categories */}
                <div className="space-y-4">
                  {Object.entries(instancesByCategory).map(([category, instances]) => {
                        const unassigned = instances.filter(i => i.allocations.length === 0);
                        const assigned = instances.filter(i => i.allocations.length > 0);
                        const unassignedPoints = unassigned.reduce((sum, i) => sum + i.points, 0);
                        const assignedPoints = assigned.reduce((sum, i) => sum + i.points, 0);
                        const isExpanded = expandedCategories.has(category);

                        return (
                          <div key={category} className="bg-white border-2 border-gray-200 rounded-xl overflow-hidden">
                            {/* Category Header */}
                            <button
                              onClick={() => toggleCategory(category)}
                              className="w-full px-6 py-4 flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 transition"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center">
                                  <Package className="w-5 h-5 text-white" />
                                </div>
                                <div className="text-left">
                                  <h3 className="font-semibold text-gray-900">{category}</h3>
                                  <p className="text-sm text-gray-600">
                                    {instances.length} kurser · {unassigned.length} otilldelade ({unassignedPoints}p) · {assigned.length} tilldelade ({assignedPoints}p)
                                  </p>
                                </div>
                              </div>
                              {isExpanded ? (
                                <ChevronUp className="w-5 h-5 text-gray-400" />
                              ) : (
                                <ChevronDown className="w-5 h-5 text-gray-400" />
                              )}
                            </button>

                            {/* Category Content */}
                            {isExpanded && (
                              <div className="p-6 space-y-6">
                                {/* UNASSIGNED (POTT) */}
                                {unassigned.length > 0 && (
                                  <div>
                                    <div className="flex items-center gap-2 mb-3">
                                      <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                                      <h4 className="font-semibold text-gray-900">Otilldelade kurser (Potten)</h4>
                                      <span className="text-sm text-orange-600 font-medium">
                                        {unassignedPoints} poäng
                                      </span>
                                    </div>
                                    <div className="bg-orange-50 border border-orange-200 rounded-lg overflow-hidden">
                                      <table className="w-full">
                                        <thead className="bg-orange-100 border-b border-orange-200">
                                          <tr>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-orange-900">Klass</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-orange-900">Kurs</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-orange-900">Poäng</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-orange-900">Tilldela lärare</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-orange-200">
                                          {unassigned.map((instance) => (
                                            <tr key={instance.id} className="hover:bg-orange-100 transition">
                                              <td className="px-4 py-2 text-sm font-medium text-gray-900">
                                                <div className="flex items-center gap-2">
                                                  {instance.className}
                                                  <span className="text-xs text-orange-600 bg-orange-100 px-1.5 py-0.5 rounded">åk {instance.yearLevel}</span>
                                                </div>
                                              </td>
                                              <td className="px-4 py-2 text-sm text-gray-900">{instance.courseName}</td>
                                              <td className="px-4 py-2 text-sm font-semibold text-orange-700">{instance.points}p</td>
                                              <td className="px-4 py-2">
                                                <select
                                                  onChange={(e) => {
                                                    if (e.target.value) {
                                                      handleAddAllocation(instance.classId, instance.courseCode, e.target.value);
                                                    }
                                                  }}
                                                  className="w-full px-3 py-1.5 border border-orange-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                                  defaultValue=""
                                                >
                                                  <option value="" disabled>Välj lärare...</option>
                                                  {teachers.map((teacher) => {
                                                    const course = classes
                                                      .find(c => c.id === instance.classId)
                                                      ?.courses?.find((co: any) => co.code === instance.courseCode);
                                                    const qualified = teacher.subjects?.some((subject: string) =>
                                                      course?.name.toLowerCase().includes(subject.toLowerCase())
                                                    );
                                                    return (
                                                      <option key={teacher.id} value={teacher.id}>
                                                        {teacher.name} {qualified ? '✓ Behörig' : ''}
                                                      </option>
                                                    );
                                                  })}
                                                </select>
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                )}

                                {/* ASSIGNED */}
                                {assigned.length > 0 && (
                                  <div>
                                    <div className="flex items-center gap-2 mb-3">
                                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                                      <h4 className="font-semibold text-gray-900">Tilldelade kurser</h4>
                                      <span className="text-sm text-green-600 font-medium">
                                        {assignedPoints} poäng
                                      </span>
                                    </div>
                                    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                                      <table className="w-full">
                                        <thead className="bg-gray-50 border-b border-gray-200">
                                          <tr>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">Klass</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">Kurs</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">Poäng</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">Lärare</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">Status</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-700"></th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200">
                                          {assigned.map((instance) => {
                                            const firstAllocation = instance.allocations[0];
                                            const assignedTeacher = teachers.find(t => t.id === firstAllocation.teacherId);
                                            const course = classes
                                              .find(c => c.id === instance.classId)
                                              ?.courses?.find((co: any) => co.code === instance.courseCode);
                                            const hasQualification = assignedTeacher?.subjects?.some((subject: string) =>
                                              course?.name.toLowerCase().includes(subject.toLowerCase())
                                            );

                                            return (
                                              <tr key={instance.id} className="hover:bg-gray-50 transition">
                                                <td className="px-4 py-2 text-sm font-medium text-gray-900">
                                                  <div className="flex items-center gap-2">
                                                    {instance.className}
                                                    <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">åk {instance.yearLevel}</span>
                                                  </div>
                                                </td>
                                                <td className="px-4 py-2 text-sm text-gray-900">{instance.courseName}</td>
                                                <td className="px-4 py-2 text-sm font-semibold text-gray-900">{instance.points}p</td>
                                                <td className="px-4 py-2">
                                                  <select
                                                    value={assignedTeacher?.id || ''}
                                                    onChange={(e) => {
                                                      handleRemoveAllocation(firstAllocation.id);
                                                      if (e.target.value) {
                                                        handleAddAllocation(instance.classId, instance.courseCode, e.target.value);
                                                      }
                                                    }}
                                                    className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                  >
                                                    {teachers.map((teacher) => (
                                                      <option key={teacher.id} value={teacher.id}>
                                                        {teacher.name}
                                                      </option>
                                                    ))}
                                                  </select>
                                                </td>
                                                <td className="px-4 py-2">
                                                  {hasQualification ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium">
                                                      <CheckCircle2 className="w-3 h-3" /> Behörig
                                                    </span>
                                                  ) : (
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-yellow-100 text-yellow-700 text-xs font-medium">
                                                      <AlertCircle className="w-3 h-3" /> Obehörig
                                                    </span>
                                                  )}
                                                </td>
                                                <td className="px-4 py-2">
                                                  <button
                                                    onClick={() => handleRemoveAllocation(firstAllocation.id)}
                                                    className="text-red-600 hover:text-red-700 transition"
                                                    title="Ta bort från lärare (lägg tillbaka i potten)"
                                                  >
                                                    <X className="w-4 h-4" />
                                                  </button>
                                                </td>
                                              </tr>
                                            );
                                          })}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                        </div>
                      );
                    })}
                </div>

                {/* Mentorskap Section */}
                <div className="mt-6 bg-white border-2 border-pink-200 rounded-xl overflow-hidden">
                  <div className="bg-gradient-to-r from-pink-50 to-rose-50 px-6 py-4 border-b border-pink-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-pink-600 flex items-center justify-center">
                          <Heart className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">Mentorskap</h3>
                          <p className="text-sm text-gray-600">
                            {Object.keys(mentorships).filter(id => activeClasses.some(c => c.id === id)).length} av {activeClasses.length} klasser har mentor
                          </p>
                        </div>
                      </div>
                      <div className="bg-pink-100 px-3 py-1 rounded-full">
                        <p className="text-xs text-pink-700 font-medium">Räknas ej som tjänstepoäng</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-6">
                    <div className="bg-pink-50 border border-pink-200 rounded-lg overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-pink-100 border-b border-pink-200">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-pink-900">Klass</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-pink-900">Program</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-pink-900">Mentor 1</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-pink-900">Mentor 2 (valfritt)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-pink-200">
                          {activeClasses.map((classItem) => {
                            const assignedMentors = mentorships[classItem.id] || [];
                            const isSaving = savingMentorFor === classItem.id;
                            const classYearLevel = getClassYearLevel(classItem.startYear, selectedAcademicYear);

                            return (
                              <tr key={classItem.id} className={`hover:bg-pink-100 transition ${isSaving ? 'opacity-70' : ''}`}>
                                <td className="px-4 py-2 text-sm font-medium text-gray-900">
                                  <div className="flex items-center gap-2">
                                    {classItem.name || classItem.classCode}
                                    <span className="text-xs text-pink-600 bg-pink-100 px-1.5 py-0.5 rounded">åk {classYearLevel}</span>
                                    {isSaving && <Loader2 className="w-4 h-4 animate-spin text-pink-600" />}
                                  </div>
                                </td>
                                <td className="px-4 py-2 text-sm text-gray-600">{classItem.program || classItem.programName || 'Ej specificerat'}</td>
                                <td className="px-4 py-2">
                                  <select
                                    value={assignedMentors[0] || ''}
                                    onChange={(e) => handleMentorChange(classItem.id, 0, e.target.value || null, assignedMentors)}
                                    className="w-full px-3 py-1.5 border border-pink-300 rounded-lg text-sm focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                                    disabled={isSaving}
                                  >
                                    <option value="">Välj mentor 1...</option>
                                    {teachers.map((teacher) => (
                                      <option
                                        key={teacher.id}
                                        value={teacher.id}
                                        disabled={assignedMentors[1] === teacher.id}
                                      >
                                        {teacher.name}
                                      </option>
                                    ))}
                                  </select>
                                </td>
                                <td className="px-4 py-2">
                                  <select
                                    value={assignedMentors[1] || ''}
                                    onChange={(e) => handleMentorChange(classItem.id, 1, e.target.value || null, assignedMentors)}
                                    className="w-full px-3 py-1.5 border border-pink-300 rounded-lg text-sm focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                                    disabled={!assignedMentors[0] || isSaving}
                                  >
                                    <option value="">Ingen andra mentor</option>
                                    {teachers.map((teacher) => (
                                      <option
                                        key={teacher.id}
                                        value={teacher.id}
                                        disabled={assignedMentors[0] === teacher.id}
                                      >
                                        {teacher.name}
                                      </option>
                                    ))}
                                  </select>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    
                    <div className="mt-4 bg-pink-50 border border-pink-200 rounded-lg p-3">
                      <div className="flex items-start gap-2">
                        <Info className="w-4 h-4 text-pink-600 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-pink-900">
                          Mentorskap är ett pedagogiskt ansvar som inte räknas som undervisningspoäng. 
                          Mentorer ansvarar för elevhälsa, studievägledning och kontakt med vårdnadshavare.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}