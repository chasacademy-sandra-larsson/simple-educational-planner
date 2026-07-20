import { useState, useEffect } from 'react';
import { Calendar, Download, RefreshCw, Eye, Grid, Settings, AlertCircle, Users, GraduationCap, ChevronRight } from 'lucide-react';
import { projectsApi, scheduleGeneratorApi } from '@/app/lib/api/client';

interface ProjectClass {
  id: string;
  classCode: string;
  programCode: string;
  programName: string;
  startYear: number;
  graduationYear: number;
}

interface Teacher {
  id: string;
  name: string;
}

interface Project {
  id: string;
  name: string;
  term?: string;
  year?: string;
  classes?: ProjectClass[];
}

interface ScheduleViewProps {
  project: Project;
  onEditConfiguration?: () => void;
}

interface ScheduledLesson {
  id: string;
  courseInstanceId: string;
  classId: string;
  teacherId: string | null;
  courseCode: string;
  courseName: string;
  classCode: string;
  teacherName: string | null;
  roomNumber: string | null;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

interface GeneratedSchedule {
  id: string;
  name: string;
  academicYear: string;
  termType: string;
  status: string;
  createdAt: string;
}

interface ScheduleWithLessons {
  schedule: GeneratedSchedule;
  lessons: ScheduledLesson[];
}

const WEEKDAYS = ['Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag'] as const;
const TIME_SLOTS = [
  '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00'
];

type ViewMode = 'class' | 'teacher';

export function ScheduleView({ project, onEditConfiguration }: ScheduleViewProps) {
  const [classes, setClasses] = useState<ProjectClass[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [savedSchedules, setSavedSchedules] = useState<GeneratedSchedule[]>([]);
  const [selectedScheduleId, setSelectedScheduleId] = useState<string>('');
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');
  const [viewMode, setViewMode] = useState<ViewMode>('class');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scheduleData, setScheduleData] = useState<ScheduleWithLessons | null>(null);
  const [generationMessage, setGenerationMessage] = useState<string | null>(null);

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, [project.id]);

  // Load schedule when selection changes
  useEffect(() => {
    if (selectedScheduleId) {
      loadScheduleData(selectedScheduleId);
    }
  }, [selectedScheduleId]);

  const loadInitialData = async () => {
    try {
      setIsLoading(true);

      // Load project data (classes)
      const projectData = await projectsApi.getById(project.id);
      if (projectData.classes && projectData.classes.length > 0) {
        setClasses(projectData.classes);
        setSelectedClassId(projectData.classes[0].id);
      }

      // Load teachers
      try {
        const teachersData = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/projects/${project.id}/teachers`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }).then(r => r.json());
        if (Array.isArray(teachersData)) {
          setTeachers(teachersData);
          if (teachersData.length > 0) {
            setSelectedTeacherId(teachersData[0].id);
          }
        }
      } catch (e) {
        console.log('Could not load teachers');
      }

      // Load saved schedules
      const schedules = await scheduleGeneratorApi.getAll(project.id);
      setSavedSchedules(schedules);

      // Auto-select the first schedule if available
      if (schedules.length > 0) {
        setSelectedScheduleId(schedules[0].id);
      }

      setError(null);
    } catch (err: any) {
      setError('Kunde inte ladda data: ' + (err.message || 'Okänt fel'));
    } finally {
      setIsLoading(false);
    }
  };

  const loadScheduleData = async (scheduleId: string) => {
    try {
      const data = await scheduleGeneratorApi.getById(project.id, scheduleId);
      setScheduleData(data as ScheduleWithLessons);
    } catch (err) {
      setScheduleData(null);
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setGenerationMessage('Genererar schema för alla klasser...');
    setError(null);

    try {
      const result = await scheduleGeneratorApi.generate(project.id, {
        name: project.name,
        academicYear: '2026/2027',
        termType: 'fall',
      });

      if (result.result.success) {
        setGenerationMessage(`Klart! ${result.result.lessonCount} lektioner schemalagda.`);

        // Reload schedules and select the new one
        const schedules = await scheduleGeneratorApi.getAll(project.id);
        setSavedSchedules(schedules);
        if (schedules.length > 0) {
          setSelectedScheduleId(schedules[0].id);
        }
      } else {
        setError(result.result.message || 'Kunde inte generera schema');
      }

      setTimeout(() => setGenerationMessage(null), 5000);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Kunde inte generera schema');
      setGenerationMessage(null);
    } finally {
      setIsGenerating(false);
    }
  };

  // Get lessons for current view
  const getFilteredLessons = (): ScheduledLesson[] => {
    if (!scheduleData?.lessons) return [];

    if (viewMode === 'class') {
      return scheduleData.lessons.filter(l => l.classId === selectedClassId);
    } else {
      return scheduleData.lessons.filter(l => l.teacherId === selectedTeacherId);
    }
  };

  // Convert lessons to grid format
  const getScheduleGrid = () => {
    const lessons = getFilteredLessons();
    if (lessons.length === 0) return null;

    const grid: Record<string, ScheduledLesson[]> = {};
    for (const day of WEEKDAYS) {
      grid[day] = [];
    }

    for (const lesson of lessons) {
      const dayIndex = lesson.dayOfWeek - 1;
      if (dayIndex >= 0 && dayIndex < 5) {
        const day = WEEKDAYS[dayIndex];
        grid[day].push(lesson);
      }
    }

    // Sort lessons by start time
    for (const day of WEEKDAYS) {
      grid[day].sort((a, b) => a.startTime.localeCompare(b.startTime));
    }

    return grid;
  };

  const selectedClass = classes.find(c => c.id === selectedClassId);
  const selectedTeacher = teachers.find(t => t.id === selectedTeacherId);
  const scheduleGrid = getScheduleGrid();
  const filteredLessons = getFilteredLessons();

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-3 text-muted-foreground">Laddar...</span>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Sidebar - Saved Schedules */}
      <div className="w-64 bg-muted border-r border-border p-4">
        <h3 className="font-semibold text-foreground mb-4">Sparade scheman</h3>

        {savedSchedules.length === 0 ? (
          <p className="text-sm text-muted-foreground">Inga scheman genererade ännu</p>
        ) : (
          <div className="space-y-2">
            {savedSchedules.map((schedule) => (
              <button
                key={schedule.id}
                onClick={() => setSelectedScheduleId(schedule.id)}
                className={`w-full text-left p-3 rounded-lg transition ${
                  selectedScheduleId === schedule.id
                    ? 'bg-accent border-2 border-primary'
                    : 'bg-card border border-border hover:border-primary'
                }`}
              >
                <div className="font-medium text-sm">{schedule.name}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {schedule.academicYear} {schedule.termType === 'fall' ? 'HT' : 'VT'}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {new Date(schedule.createdAt).toLocaleDateString('sv-SE')}
                </div>
              </button>
            ))}
          </div>
        )}

        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="w-full mt-4 flex items-center justify-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition disabled:opacity-50 text-sm"
        >
          {isGenerating ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          Generera nytt schema
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6 overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">{project.name}</h1>
            <p className="text-muted-foreground">
              {viewMode === 'class'
                ? `Klassschema: ${selectedClass?.classCode || 'Välj klass'}`
                : `Lärarschema: ${selectedTeacher?.name || 'Välj lärare'}`
              }
            </p>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-2 bg-muted p-1 rounded-lg">
            <button
              onClick={() => setViewMode('class')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md transition ${
                viewMode === 'class' ? 'bg-card shadow text-primary' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <GraduationCap className="w-4 h-4" />
              Klasser
            </button>
            <button
              onClick={() => setViewMode('teacher')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md transition ${
                viewMode === 'teacher' ? 'bg-card shadow text-primary' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Users className="w-4 h-4" />
              Lärare
            </button>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="bg-destructive/10 border border-destructive rounded-lg p-4 mb-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-destructive" />
            <span className="text-destructive">{error}</span>
          </div>
        )}

        {generationMessage && (
          <div className="bg-accent border border-primary rounded-lg p-4 mb-4 flex items-center gap-3">
            <RefreshCw className={`w-5 h-5 text-primary ${isGenerating ? 'animate-spin' : ''}`} />
            <span className="text-primary">{generationMessage}</span>
          </div>
        )}

        {/* Selector */}
        <div className="bg-card rounded-lg border border-border p-4 mb-6">
          {viewMode === 'class' ? (
            <div className="flex items-center gap-4 flex-wrap">
              <label className="text-sm font-medium text-muted-foreground">Välj klass:</label>
              <div className="flex gap-2 flex-wrap">
                {classes.map((cls) => (
                  <button
                    key={cls.id}
                    onClick={() => setSelectedClassId(cls.id)}
                    className={`px-3 py-1.5 rounded-md text-sm transition ${
                      selectedClassId === cls.id
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-foreground hover:bg-muted'
                    }`}
                  >
                    {cls.classCode}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-muted-foreground">Välj lärare:</label>
              <select
                value={selectedTeacherId}
                onChange={(e) => setSelectedTeacherId(e.target.value)}
                className="border border-border rounded-md px-3 py-2 text-sm"
              >
                {teachers.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Schedule Grid */}
        {!selectedScheduleId ? (
          <div className="bg-card rounded-lg border border-border p-12 text-center">
            <Calendar className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl text-muted-foreground mb-2">Inget schema valt</h3>
            <p className="text-muted-foreground mb-6">
              Välj ett schema från listan till vänster eller generera ett nytt
            </p>
          </div>
        ) : scheduleGrid && filteredLessons.length > 0 ? (
          <div className="bg-card rounded-lg border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-muted border-b border-border">
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground w-24">Tid</th>
                    {WEEKDAYS.map((day) => (
                      <th key={day} className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                        {day}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {TIME_SLOTS.map((time, timeIndex) => (
                    <tr key={time} className="border-b border-border">
                      <td className="px-4 py-2 text-sm text-muted-foreground bg-muted font-medium">
                        {time}
                      </td>
                      {WEEKDAYS.map((day) => {
                        const dayLessons = scheduleGrid[day].filter(l => {
                          const startHour = parseInt(l.startTime.split(':')[0]);
                          return startHour === parseInt(time.split(':')[0]);
                        });

                        return (
                          <td key={day} className="px-2 py-1 align-top">
                            {dayLessons.map((lesson, idx) => (
                              <div
                                key={`${lesson.id}-${idx}`}
                                className="p-2 mb-1 rounded text-xs bg-accent border border-primary"
                              >
                                <div className="font-medium text-foreground">{lesson.courseName}</div>
                                <div className="text-muted-foreground mt-0.5">
                                  {lesson.startTime.slice(0, 5)} - {lesson.endTime.slice(0, 5)}
                                </div>
                                {viewMode === 'class' && lesson.teacherName && (
                                  <div className="text-muted-foreground mt-0.5">{lesson.teacherName}</div>
                                )}
                                {viewMode === 'teacher' && lesson.classCode && (
                                  <div className="text-muted-foreground mt-0.5">{lesson.classCode}</div>
                                )}
                              </div>
                            ))}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-card rounded-lg border border-border p-12 text-center">
            <Calendar className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl text-muted-foreground mb-2">Inga lektioner</h3>
            <p className="text-muted-foreground">
              {viewMode === 'class'
                ? `Inga lektioner för ${selectedClass?.classCode || 'vald klass'}`
                : `Inga lektioner för ${selectedTeacher?.name || 'vald lärare'}`
              }
            </p>
          </div>
        )}

        {/* Statistics */}
        {filteredLessons.length > 0 && (
          <div className="grid grid-cols-3 gap-4 mt-6">
            <div className="bg-card rounded-lg border border-border p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-accent rounded-lg flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{filteredLessons.length}</p>
                  <p className="text-sm text-muted-foreground">Lektioner/vecka</p>
                </div>
              </div>
            </div>
            <div className="bg-card rounded-lg border border-border p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Grid className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {new Set(filteredLessons.map(l => l.courseCode)).size}
                  </p>
                  <p className="text-sm text-muted-foreground">Olika kurser</p>
                </div>
              </div>
            </div>
            <div className="bg-card rounded-lg border border-border p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                  <Eye className="w-5 h-5 text-accent-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {viewMode === 'class'
                      ? new Set(filteredLessons.filter(l => l.teacherId).map(l => l.teacherId)).size
                      : new Set(filteredLessons.map(l => l.classId)).size
                    }
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {viewMode === 'class' ? 'Lärare' : 'Klasser'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
