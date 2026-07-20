import { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, UserCircle, Edit2, Copy, ChevronRight, ChevronLeft, Info, Upload, HelpCircle, X, CheckCircle2, AlertCircle, Users, BookOpen, Calculator, TrendingUp, ChevronDown, ChevronUp } from 'lucide-react';

interface Teacher {
  id: string;
  name: string;
  email: string;
  subjects: string[];
  employmentPercentage: number;
  isComplete: boolean;
}

interface Course {
  name: string;
  code: string;
  points: number;
  subjectCategory: string;
  year?: number;
}

interface Class {
  id: string;
  name: string;
  program: string;
  courses: Course[];
  startYear?: number;
  endYear?: number;
}

interface TeachersStepProps {
  data: Teacher[];
  onChange: (data: Teacher[]) => void;
  classes: Class[];
}

const AVAILABLE_SUBJECTS = [
  'Matematik',
  'Svenska',
  'Engelska',
  'Moderna språk',
  'Fysik',
  'Kemi',
  'Biologi',
  'Naturkunskap',
  'Historia',
  'Samhällskunskap',
  'Geografi',
  'Religion',
  'Idrott',
  'Programmering',
  'Teknik',
  'Psykologi',
  'Filosofi',
  'Gymnasiearbete',
  'Individuellt val',
  'Webbutveckling',
  'Databaser',
  'Företagsekonomi',
  'Sociologi',
  'CAD',
  'Estetisk kommunikation'
];

// Map course names to subjects (must match teacher subject names)
const mapCourseToSubject = (courseName: string): string => {
  const name = courseName.toLowerCase();
  if (name.includes('matematik')) return 'Matematik';
  if (name.includes('svenska')) return 'Svenska';
  if (name.includes('engelska')) return 'Engelska';
  if (name.includes('moderna')) return 'Moderna språk';
  if (name.includes('fysik')) return 'Fysik';
  if (name.includes('kemi')) return 'Kemi';
  if (name.includes('biologi')) return 'Biologi';
  if (name.includes('naturkunskap') || name.includes('naturvetenskaplig')) return 'Naturkunskap';
  if (name.includes('historia')) return 'Historia';
  if (name.includes('samhällskunskap')) return 'Samhällskunskap';
  if (name.includes('geografi')) return 'Geografi';
  if (name.includes('religion')) return 'Religion';
  if (name.includes('idrott')) return 'Idrott';
  if (name.includes('programmering')) return 'Programmering';
  if (name.includes('teknik')) return 'Teknik';
  if (name.includes('psykologi')) return 'Psykologi';
  if (name.includes('filosofi')) return 'Filosofi';
  if (name.includes('gymnasiearbete')) return 'Gymnasiearbete';
  if (name.includes('individuellt')) return 'Individuellt val';
  if (name.includes('webb')) return 'Webbutveckling';
  if (name.includes('databas')) return 'Databaser';
  if (name.includes('företagsekonomi') || name.includes('ekonomi')) return 'Företagsekonomi';
  if (name.includes('sociologi')) return 'Sociologi';
  if (name.includes('cad')) return 'CAD';
  if (name.includes('estetisk')) return 'Estetisk kommunikation';
  return 'Övrigt';
};

export function TeachersStep({ data, onChange, classes }: TeachersStepProps) {
  const [teachers, setTeachers] = useState<Teacher[]>(data.length > 0 ? data : []);
  const [currentView, setCurrentView] = useState<'overview' | 'add' | 'import' | 'resource-needs' | 'subject-needs'>('overview');
  const [editingTeacherId, setEditingTeacherId] = useState<string | null>(null);
  const [addStep, setAddStep] = useState(1);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fullTimePoints, setFullTimePoints] = useState(600);
  
  const [tempTeacherData, setTempTeacherData] = useState({
    name: '',
    email: '',
    subjects: [] as string[],
    employmentPercentage: 100
  });

  const [showImportGuide, setShowImportGuide] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [expandedCard, setExpandedCard] = useState<'no-teacher' | 'one-teacher' | 'covered' | null>(null);

  // Calculate which academic year we're planning for (default 2026/2027)
  const selectedAcademicYear = 2026;

  // Helper to calculate which year a class is in for a given academic year
  const getClassYearLevel = (classStartYear: number, academicYear: number): number => {
    return academicYear - classStartYear + 1;
  };

  // Filter classes that are active in the selected academic year
  const activeClasses = classes.filter((classItem) => {
    const startYear = classItem.startYear || 2026;
    const graduationYear = classItem.endYear || (startYear + 3);
    return selectedAcademicYear >= startYear && selectedAcademicYear < graduationYear;
  });

  // Calculate resource needs from classes - filtered by academic year
  const resourceNeeds = activeClasses.reduce((acc, cls) => {
    const classYearLevel = getClassYearLevel(cls.startYear || 2026, selectedAcademicYear);
    const relevantCourses = cls.courses?.filter((course: any) => course.year === classYearLevel) || [];

    relevantCourses.forEach((course: any) => {
      const category = course.subjectCategory || 'Övrigt';
      if (!acc[category]) {
        acc[category] = { totalPoints: 0, courses: [] };
      }
      acc[category].totalPoints += course.points;
      acc[category].courses.push({ className: cls.name, courseName: course.name, points: course.points });
    });
    return acc;
  }, {} as Record<string, { totalPoints: number; courses: { className: string; courseName: string; points: number }[] }>);

  const totalPointsNeeded = Object.values(resourceNeeds).reduce((sum, cat) => sum + cat.totalPoints, 0);
  const fullTimeTeachersNeeded = totalPointsNeeded / fullTimePoints;

  // Calculate current teacher capacity
  const currentTeacherCapacity = teachers.reduce((sum, t) => sum + (fullTimePoints * (t.employmentPercentage / 100)), 0);
  const currentFullTimeEquivalent = currentTeacherCapacity / fullTimePoints;
  const capacityDifference = currentTeacherCapacity - totalPointsNeeded;
  const hasEnoughCapacity = capacityDifference >= 0;

  // Calculate subject needs from courses - filtered by academic year
  const subjectNeeds = activeClasses.reduce((acc, cls) => {
    const classYearLevel = getClassYearLevel(cls.startYear || 2026, selectedAcademicYear);
    const relevantCourses = cls.courses?.filter((course: any) => course.year === classYearLevel) || [];

    relevantCourses.forEach((course: any) => {
      const subject = mapCourseToSubject(course.name);
      if (!acc[subject]) {
        acc[subject] = { totalPoints: 0, courseCount: 0, teacherCount: 0, courses: [] };
      }
      acc[subject].totalPoints += course.points;
      acc[subject].courseCount += 1;
      acc[subject].courses.push({
        className: cls.name,
        courseName: course.name,
        courseCode: course.code,
        points: course.points
      });
    });
    return acc;
  }, {} as Record<string, { totalPoints: number; courseCount: number; teacherCount: number; courses: { className: string; courseName: string; courseCode: string; points: number }[] }>);

  // Count teachers per subject
  teachers.forEach(teacher => {
    teacher.subjects.forEach(subject => {
      if (subjectNeeds[subject]) {
        subjectNeeds[subject].teacherCount += 1;
      }
    });
  });

  // Sort subjects by priority (high needs, low teacher count)
  const sortedSubjects = Object.entries(subjectNeeds)
    .filter(([subject]) => subject !== 'Övrigt')
    .sort((a, b) => {
      // Prioritize subjects with no teachers
      if (a[1].teacherCount === 0 && b[1].teacherCount > 0) return -1;
      if (b[1].teacherCount === 0 && a[1].teacherCount > 0) return 1;
      // Then by points needed
      return b[1].totalPoints - a[1].totalPoints;
    });

  // Update parent whenever teachers change
  useEffect(() => {
    onChange(teachers);
  }, [teachers]);

  const startNewTeacher = () => {
    setCurrentView('add');
    setAddStep(1);
    setEditingTeacherId(null);
    setTempTeacherData({
      name: '',
      email: '',
      subjects: [],
      employmentPercentage: 100
    });
  };

  const editTeacher = (teacher: Teacher) => {
    setCurrentView('add');
    setEditingTeacherId(teacher.id);
    setTempTeacherData({
      name: teacher.name,
      email: teacher.email,
      subjects: teacher.subjects,
      employmentPercentage: teacher.employmentPercentage
    });
    setAddStep(1);
  };

  const deleteTeacher = (teacherId: string) => {
    setTeachers(prev => prev.filter(t => t.id !== teacherId));
  };

  const duplicateTeacher = (teacher: Teacher) => {
    const duplicatedTeacher: Teacher = {
      ...teacher,
      id: Date.now().toString(),
      name: `${teacher.name} (kopia)`,
      isComplete: true
    };
    setTeachers(prev => [...prev, duplicatedTeacher]);
  };

  const completeAddTeacher = () => {
    const newTeacher: Teacher = {
      id: editingTeacherId || Date.now().toString(),
      name: tempTeacherData.name,
      email: tempTeacherData.email,
      subjects: tempTeacherData.subjects,
      employmentPercentage: tempTeacherData.employmentPercentage,
      isComplete: true
    };

    if (editingTeacherId) {
      setTeachers(prev => prev.map(t => t.id === editingTeacherId ? newTeacher : t));
    } else {
      setTeachers(prev => [...prev, newTeacher]);
    }

    setCurrentView('overview');
    setAddStep(1);
    setEditingTeacherId(null);
  };

  const cancelAdd = () => {
    setCurrentView('overview');
    setAddStep(1);
    setEditingTeacherId(null);
  };

  const handleAddNext = () => {
    if (addStep < 3) {
      setAddStep(addStep + 1);
    } else {
      completeAddTeacher();
    }
  };

  const handleAddBack = () => {
    if (addStep > 1) {
      setAddStep(addStep - 1);
    } else {
      cancelAdd();
    }
  };

  const toggleSubject = (subject: string) => {
    setTempTeacherData(prev => ({
      ...prev,
      subjects: prev.subjects.includes(subject)
        ? prev.subjects.filter(s => s !== subject)
        : [...prev.subjects, subject]
    }));
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImportError(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split('\n').filter(line => line.trim());
        
        if (lines.length < 2) {
          setImportError('Filen måste innehålla minst en rad med data (utöver header)');
          return;
        }

        // Parse CSV (skip header)
        const importedTeachers: Teacher[] = [];
        for (let i = 1; i < lines.length; i++) {
          const parts = lines[i].split(/[,;\t]/).map(p => p.trim());
          
          if (parts.length < 3) {
            setImportError(`Rad ${i + 1}: Måste innehålla minst namn, e-post och ämnen`);
            return;
          }

          const [name, email, subjectsStr, employmentPercentage] = parts;
          const subjects = subjectsStr.split('|').map(s => s.trim()).filter(s => s);

          if (!name || !email || subjects.length === 0) {
            setImportError(`Rad ${i + 1}: Namn, e-post och ämnen är obligatoriska`);
            return;
          }

          importedTeachers.push({
            id: `${Date.now()}_${i}`,
            name,
            email,
            subjects,
            employmentPercentage: employmentPercentage ? parseInt(employmentPercentage) : 100,
            isComplete: true
          });
        }

        setTeachers(prev => [...prev, ...importedTeachers]);
        setCurrentView('overview');
        
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } catch (error) {
        setImportError('Kunde inte läsa filen. Kontrollera att formatet är korrekt.');
      }
    };

    reader.readAsText(file);
  };

  const startImport = () => {
    setCurrentView('import');
    setImportError(null);
  };

  const ADD_STEPS = ['Grundinfo', 'Ämnesbehörighet', 'Bekräfta'];

  // Resource Needs View
  if (currentView === 'resource-needs') {
    return (
      <div>
        <div className="mb-6">
          <h2 className="text-2xl mb-2">Lärare - Resursbehov</h2>
          <p className="text-muted-foreground">
            Översikt över resursbehov baserat på kurser för läsår 2026/2027
          </p>
        </div>

        {/* Läsår Info */}
        <div className="mb-6 bg-accent border border-primary rounded-lg px-4 py-3">
          <div className="flex items-center gap-2">
            <Info className="w-5 h-5 text-primary" />
            <p className="text-sm text-foreground">
              <span className="font-semibold">Läsår 2026/2027</span> – Resursbehov beräknat för hela läsåret
            </p>
          </div>
        </div>

        {/* Full-Time Settings */}
        <div className="bg-card rounded-xl border border-border p-6 shadow-sm mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg mb-1">Heltidstjänst</h3>
              <p className="text-sm text-muted-foreground">Ange hur många poäng som motsvarar en heltidstjänst</p>
            </div>
            <div className="flex items-center gap-3">
              <label className="text-sm text-foreground">Poäng:</label>
              <input
                type="number"
                value={fullTimePoints}
                onChange={(e) => setFullTimePoints(parseInt(e.target.value) || 600)}
                className="w-24 px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                min="1"
              />
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-accent rounded-xl p-6 border border-primary">
            <div className="flex items-center gap-3 mb-2">
              <Calculator className="w-6 h-6 text-primary" />
              <p className="text-sm text-foreground">Totala poäng</p>
            </div>
            <p className="text-3xl text-foreground">{totalPointsNeeded}</p>
            <p className="text-xs text-muted-foreground mt-1">poäng behövs</p>
          </div>
          <div className="bg-primary/10 rounded-xl p-6 border border-primary">
            <div className="flex items-center gap-3 mb-2">
              <Users className="w-6 h-6 text-primary" />
              <p className="text-sm text-foreground">Heltidslärare</p>
            </div>
            <p className="text-3xl text-foreground">{fullTimeTeachersNeeded.toFixed(1)}</p>
            <p className="text-xs text-muted-foreground mt-1">lärare behövs</p>
          </div>
          <div className="bg-accent rounded-xl p-6 border border-border">
            <div className="flex items-center gap-3 mb-2">
              <BookOpen className="w-6 h-6 text-accent-foreground" />
              <p className="text-sm text-foreground">Ämneskategorier</p>
            </div>
            <p className="text-3xl text-foreground">{Object.keys(resourceNeeds).length}</p>
            <p className="text-xs text-muted-foreground mt-1">kategorier</p>
          </div>
        </div>

        {/* Subject Categories Breakdown */}
        <div className="bg-card rounded-xl border border-border p-6 shadow-sm mb-6">
          <h3 className="text-lg mb-4 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            Resursbehov per ämneskategori
          </h3>
          <div className="space-y-3">
            {Object.entries(resourceNeeds).sort((a, b) => b[1].totalPoints - a[1].totalPoints).map(([category, { totalPoints, courses }]) => {
              const fullTimeEquivalent = (totalPoints / fullTimePoints).toFixed(2);
              return (
                <div key={category} className="bg-muted rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex-1">
                      <h4 className="font-medium text-foreground">{category}</h4>
                      <p className="text-xs text-muted-foreground mt-1">{courses.length} kurser</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-foreground">{totalPoints} poäng</p>
                      <p className="text-xs text-muted-foreground">≈ {fullTimeEquivalent} heltidstjänster</p>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div className="w-full bg-muted rounded-full h-2 mt-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all"
                      style={{ width: `${Math.min((totalPoints / totalPointsNeeded) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-end pt-6 border-t border-border">
          <button
            onClick={() => setCurrentView('subject-needs')}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg hover:bg-primary/90 transition"
          >
            Fortsätt till ämnesbehov
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // Subject Needs View
  if (currentView === 'subject-needs') {
    return (
      <div>
        <div className="mb-6">
          <h2 className="text-2xl mb-2">Ämnesbehov</h2>
          <p className="text-muted-foreground">
            Översikt över vilka ämnen som behöver lärare för läsår 2026/2027
          </p>
        </div>

        {/* Info Banner */}
        <div className="mb-6 bg-accent border border-border rounded-lg px-4 py-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-accent-foreground" />
            <p className="text-sm text-accent-foreground">
              <span className="font-semibold">Tips:</span> Använd denna information för att rekrytera lärare med rätt kompetenser
            </p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-destructive/10 rounded-xl p-6 border border-destructive">
            <div className="flex items-center gap-3 mb-2">
              <AlertCircle className="w-6 h-6 text-destructive" />
              <p className="text-sm text-foreground">Ämnen utan lärare</p>
            </div>
            <p className="text-3xl text-foreground">
              {sortedSubjects.filter(([_, data]) => data.teacherCount === 0).length}
            </p>
            <p className="text-xs text-muted-foreground mt-1">behöver rekryteras</p>
          </div>
          <div className="bg-accent rounded-xl p-6 border border-border">
            <div className="flex items-center gap-3 mb-2">
              <Users className="w-6 h-6 text-accent-foreground" />
              <p className="text-sm text-foreground">Ämnen med 1 lärare</p>
            </div>
            <p className="text-3xl text-foreground">
              {sortedSubjects.filter(([_, data]) => data.teacherCount === 1).length}
            </p>
            <p className="text-xs text-muted-foreground mt-1">kan behöva förstärkning</p>
          </div>
          <div className="bg-primary/10 rounded-xl p-6 border border-primary">
            <div className="flex items-center gap-3 mb-2">
              <CheckCircle2 className="w-6 h-6 text-primary" />
              <p className="text-sm text-foreground">Ämnen väl täckta</p>
            </div>
            <p className="text-3xl text-foreground">
              {sortedSubjects.filter(([_, data]) => data.teacherCount >= 2).length}
            </p>
            <p className="text-xs text-muted-foreground mt-1">2+ lärare per ämne</p>
          </div>
        </div>

        {/* Subject Needs List */}
        <div className="bg-card rounded-xl border border-border p-6 shadow-sm mb-6">
          <h3 className="text-lg mb-4 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            Detaljerad ämneslista
          </h3>
          <div className="space-y-3">
            {sortedSubjects.map(([subject, data]) => (
              <div
                key={subject}
                className={`rounded-lg p-4 border-2 ${
                  data.teacherCount === 0
                    ? 'bg-destructive/10 border-destructive'
                    : data.teacherCount === 1
                    ? 'bg-accent border-border'
                    : 'bg-primary/10 border-primary'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex-1">
                    <h4 className="font-medium text-foreground text-lg">{subject}</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      {data.courseCount} {data.courseCount === 1 ? 'kurs' : 'kurser'} · {data.totalPoints} poäng totalt
                    </p>
                  </div>
                  <div className="text-right">
                    <div
                      className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${
                        data.teacherCount === 0
                          ? 'bg-destructive text-destructive-foreground'
                          : data.teacherCount === 1
                          ? 'bg-accent text-accent-foreground'
                          : 'bg-primary text-primary-foreground'
                      }`}
                    >
                      <Users className="w-4 h-4" />
                      <span className="font-medium">
                        {data.teacherCount} {data.teacherCount === 1 ? 'lärare' : 'lärare'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="w-full bg-muted rounded-full h-2 mt-3">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      data.teacherCount === 0
                        ? 'bg-destructive'
                        : data.teacherCount === 1
                        ? 'bg-accent'
                        : 'bg-primary'
                    }`}
                    style={{
                      width: `${Math.min(
                        (data.teacherCount / Math.max(Math.ceil(data.totalPoints / 600), 1)) * 100,
                        100
                      )}%`,
                    }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {data.teacherCount === 0 && '⚠️ Kritiskt: Inget lärare tillgänglig'}
                  {data.teacherCount === 1 && '⚡ Begränsad kapacitet: Endast 1 lärare'}
                  {data.teacherCount >= 2 && '✓ God täckning: Flera lärare tillgängliga'}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-6 border-t border-border">
          <button
            onClick={() => setCurrentView('resource-needs')}
            className="flex items-center gap-2 px-4 py-2 text-foreground hover:bg-muted rounded-lg transition"
          >
            <ChevronLeft className="w-4 h-4" />
            Tillbaka
          </button>
          <button
            onClick={() => setCurrentView('overview')}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg hover:bg-primary/90 transition"
          >
            Fortsätt till lärarhantering
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // Import View
  if (currentView === 'import') {
    return (
      <div>
        {/* Import Guide Header */}
        <div className="bg-accent rounded-xl p-6 border-2 border-border mb-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex-1">
              <h2 className="text-lg font-medium text-foreground mb-1">Importera lärare</h2>
              <p className="text-sm text-muted-foreground">
                Ladda upp en CSV- eller Excel-fil med lärardata
              </p>
            </div>
            <button
              onClick={() => setCurrentView('overview')}
              className="text-muted-foreground hover:text-foreground text-sm px-4 py-2 rounded-lg hover:bg-card/50 transition"
            >
              Avbryt
            </button>
          </div>
        </div>

        {/* Info Banner */}
        <div className="bg-accent border border-primary rounded-lg p-4 mb-6">
          <div className="flex items-center gap-3 text-sm">
            <Info className="w-5 h-5 text-primary flex-shrink-0" />
            <p className="text-foreground">
              <span className="font-medium">Filformat:</span> CSV eller Excel med kolumnerna: Namn, E-post, Ämnen, Anställningsandel
            </p>
          </div>
        </div>

        {/* Import Content */}
        <div className="bg-card rounded-xl border border-border p-8 shadow-sm">
          <div className="mb-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-xl mb-2">Ladda upp fil</h3>
                <p className="text-muted-foreground text-sm">
                  Välj en CSV- eller Excel-fil med lärardata enligt nedanstående format
                </p>
              </div>
              <button
                onClick={() => setShowImportGuide(!showImportGuide)}
                className="flex items-center gap-2 text-primary hover:text-primary text-sm px-3 py-2 rounded-lg hover:bg-accent transition"
              >
                <HelpCircle className="w-4 h-4" />
                {showImportGuide ? 'Dölj guide' : 'Visa guide'}
              </button>
            </div>

            {/* Import Guide */}
            {showImportGuide && (
              <div className="bg-muted border border-border rounded-lg p-6 mb-6">
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <HelpCircle className="w-5 h-5 text-primary" />
                  Filstruktur
                </h4>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-foreground mb-1">Kolumner (separerade med komma, semikolon eller tab):</p>
                    <ol className="text-sm text-muted-foreground space-y-1 ml-4 list-decimal">
                      <li><strong>Namn</strong> - Lärarens fullständiga namn</li>
                      <li><strong>E-post</strong> - Lärarens e-postadress</li>
                      <li><strong>Ämnen</strong> - Ämnen separerade med pipe (|), t.ex. "Matematik|Fysik"</li>
                      <li><strong>Anställningsandel</strong> - Anställningsandel i procent (valfritt, standard: 100)</li>
                    </ol>
                  </div>

                  <div className="bg-card rounded-lg p-4 border border-border">
                    <p className="text-xs font-medium text-foreground mb-2">Exempel på filinnehåll:</p>
                    <pre className="text-xs text-muted-foreground font-mono overflow-x-auto">
{`Namn,E-post,Ämnen,Anställningsandel
Anna Andersson,anna@skola.se,Matematik|Fysik,100
Bengt Bengtsson,bengt@skola.se,Svenska|Engelska,80
Cecilia Carlsson,cecilia@skola.se,Kemi|Biologi,75`}
                    </pre>
                  </div>

                  <div className="bg-accent border border-border rounded-lg p-3">
                    <p className="text-xs text-accent-foreground">
                      <strong>Tips:</strong> Du kan exportera data från Excel genom att spara som "CSV (kommaavgränsad)" (.csv)
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Error Message */}
            {importError && (
              <div className="bg-destructive/10 border border-destructive rounded-lg p-4 mb-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-destructive mb-1">Import misslyckades</p>
                    <p className="text-xs text-destructive">{importError}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Upload Area */}
            <div className="border-2 border-dashed border-border rounded-xl p-12 text-center hover:border-primary transition">
              <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-foreground mb-2">Dra och släpp fil här</p>
              <p className="text-sm text-muted-foreground mb-4">eller</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileUpload}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg hover:bg-primary/90 transition cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                Välj fil
              </label>
              <p className="text-xs text-muted-foreground mt-3">Stöder CSV och Excel (.csv, .xlsx, .xls)</p>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between pt-6 border-t border-border">
            <button
              onClick={() => setCurrentView('overview')}
              className="flex items-center gap-2 px-4 py-2 text-foreground hover:bg-muted rounded-lg transition"
            >
              <ChevronLeft className="w-4 h-4" />
              Tillbaka
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Add Teacher View
  if (currentView === 'add') {
    return (
      <div>
        {/* Add Teacher Sub-guide */}
        <div className="bg-accent rounded-xl p-6 border-2 border-primary mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex-1">
              <h2 className="text-lg font-medium text-foreground mb-1">
                {editingTeacherId ? 'Redigera lärare' : 'Lägg till lärare'}
              </h2>
              <p className="text-sm text-muted-foreground">
                {tempTeacherData.name || 'Ny lärare'}
              </p>
            </div>
            <button
              onClick={cancelAdd}
              className="text-muted-foreground hover:text-foreground text-sm px-4 py-2 rounded-lg hover:bg-card/50 transition"
            >
              Avbryt
            </button>
          </div>
          
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-foreground">Steg {addStep} av {ADD_STEPS.length}</p>
            <p className="text-sm font-medium text-foreground">{ADD_STEPS[addStep - 1]}</p>
          </div>
          
          <div className="flex items-center gap-1">
            {ADD_STEPS.map((step, index) => (
              <div
                key={index}
                className={`h-2.5 flex-1 rounded-full transition-all ${
                  index + 1 < addStep
                    ? 'bg-primary/100'
                    : index + 1 === addStep
                    ? 'bg-primary'
                    : 'bg-card/50'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Info Banner */}
        <div className="bg-accent border border-primary rounded-lg p-4 mb-6">
          <div className="flex items-center gap-3 text-sm">
            <Info className="w-5 h-5 text-primary flex-shrink-0" />
            <p className="text-foreground">
              <span className="font-medium">Ditt arbete sparas automatiskt.</span> Du kan avbryta och fortsätta senare.
            </p>
          </div>
        </div>

        {/* Add Content */}
        <div className="bg-card rounded-xl border border-border p-8 shadow-sm">
          <div className="mb-6">
            <h3 className="text-xl mb-2">{ADD_STEPS[addStep - 1]}</h3>
            <p className="text-muted-foreground text-sm">
              {addStep === 1 && 'Ange grundläggande information om läraren'}
              {addStep === 2 && 'Välj vilka ämnen läraren är behörig att undervisa i'}
              {addStep === 3 && 'Granska och bekräfta informationen'}
            </p>
          </div>

          <div className="mb-6">
            {/* Step 1: Basic Info */}
            {addStep === 1 && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm mb-2 text-foreground">Namn</label>
                    <input
                      type="text"
                      value={tempTeacherData.name}
                      onChange={(e) => setTempTeacherData({ ...tempTeacherData, name: e.target.value })}
                      className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                      placeholder="Anna Andersson"
                    />
                  </div>
                  <div>
                    <label className="block text-sm mb-2 text-foreground">E-post</label>
                    <input
                      type="email"
                      value={tempTeacherData.email}
                      onChange={(e) => setTempTeacherData({ ...tempTeacherData, email: e.target.value })}
                      className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                      placeholder="anna@skola.se"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm mb-2 text-foreground">
                    Anställningsandel i procent
                  </label>
                  <input
                    type="number"
                    value={tempTeacherData.employmentPercentage}
                    onChange={(e) => setTempTeacherData({ ...tempTeacherData, employmentPercentage: parseInt(e.target.value) || 100 })}
                    className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                    min="1"
                    max="100"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Rekommenderat: 80-100 procent</p>
                </div>
              </div>
            )}

            {/* Step 2: Subjects */}
            {addStep === 2 && (
              <div className="grid grid-cols-3 gap-6">
                {/* Left: Subject Selection (2 columns) */}
                <div className="col-span-2 space-y-4">
                  <div className="mb-4">
                    <p className="text-sm text-muted-foreground">
                      Välj ämnen ({tempTeacherData.subjects.length} valda)
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 max-h-96 overflow-y-auto p-4 border border-border rounded-lg">
                    {AVAILABLE_SUBJECTS.map((subject) => {
                      const isSelected = tempTeacherData.subjects.includes(subject);
                      const needsInfo = subjectNeeds[subject];
                      const hasNoTeachers = needsInfo && needsInfo.teacherCount === 0;
                      
                      return (
                        <button
                          key={subject}
                          onClick={() => toggleSubject(subject)}
                          className={`px-4 py-3 rounded-lg text-sm transition-all border-2 relative ${
                            isSelected
                              ? 'bg-primary text-primary-foreground border-primary'
                              : hasNoTeachers
                              ? 'bg-destructive/10 text-foreground border-destructive hover:border-destructive'
                              : 'bg-muted text-foreground border-border hover:border-primary'
                          }`}
                        >
                          {subject}
                          {hasNoTeachers && !isSelected && (
                            <span className="absolute top-1 right-1 w-2 h-2 bg-destructive/100 rounded-full" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
                
                {/* Right: Needs Sidebar (1 column) */}
                <div className="col-span-1">
                  <div className="bg-accent border border-border rounded-lg p-4 sticky top-0">
                    <h4 className="font-medium text-foreground mb-3 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-accent-foreground" />
                      Ämnesbehov
                    </h4>
                    <div className="space-y-2 max-h-80 overflow-y-auto">
                      {sortedSubjects.slice(0, 10).map(([subject, data]) => (
                        <div
                          key={subject}
                          className={`p-2 rounded-lg text-xs ${
                            data.teacherCount === 0
                              ? 'bg-destructive/10 border border-destructive'
                              : data.teacherCount === 1
                              ? 'bg-accent border border-border'
                              : 'bg-primary/10 border border-primary'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-foreground">{subject}</span>
                            <span className={`text-xs ${
                              data.teacherCount === 0 ? 'text-destructive' : 'text-muted-foreground'
                            }`}>
                              {data.teacherCount} lärare
                            </span>
                          </div>
                          <p className="text-muted-foreground">{data.totalPoints}p · {data.courseCount} kurser</p>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-3">
                      Röd = Ingen lärare, Gul = 1 lärare, Grön = 2+ lärare
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Confirm */}
            {addStep === 3 && (
              <div className="space-y-6">
                <div className="bg-accent rounded-xl p-6">
                  <h3 className="text-lg mb-4 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-primary" />
                    Bekräfta lärarinformation
                  </h3>
                  <div className="space-y-3">
                    <div className="bg-card rounded-lg p-4">
                      <p className="text-xs text-muted-foreground mb-1">Namn</p>
                      <p className="font-medium">{tempTeacherData.name}</p>
                    </div>
                    <div className="bg-card rounded-lg p-4">
                      <p className="text-xs text-muted-foreground mb-1">E-post</p>
                      <p className="font-medium">{tempTeacherData.email}</p>
                    </div>
                    <div className="bg-card rounded-lg p-4">
                      <p className="text-xs text-muted-foreground mb-1">Anställningsandel i procent</p>
                      <p className="font-medium">{tempTeacherData.employmentPercentage} %</p>
                    </div>
                    <div className="bg-card rounded-lg p-4">
                      <p className="text-xs text-muted-foreground mb-2">Ämnesbehörighet ({tempTeacherData.subjects.length} ämnen)</p>
                      <div className="flex flex-wrap gap-2">
                        {tempTeacherData.subjects.map((subject) => (
                          <span
                            key={subject}
                            className="px-3 py-1 bg-accent text-primary rounded-full text-sm"
                          >
                            {subject}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between pt-6 border-t border-border">
            <button
              onClick={handleAddBack}
              className="flex items-center gap-2 px-4 py-2 text-foreground hover:bg-muted rounded-lg transition"
            >
              <ChevronLeft className="w-4 h-4" />
              {addStep === 1 ? 'Avbryt' : 'Tillbaka'}
            </button>
            <button
              onClick={handleAddNext}
              disabled={
                (addStep === 1 && (!tempTeacherData.name || !tempTeacherData.email)) ||
                (addStep === 2 && tempTeacherData.subjects.length === 0)
              }
              className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2 rounded-lg hover:bg-primary/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {addStep === 3 ? 'Lägg till lärare' : 'Nästa'}
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
        <h2 className="text-2xl mb-2">Lärare</h2>
        <p className="text-muted-foreground">
          Lägg till lärare och definiera deras ämnesbehörighet
        </p>
      </div>

      {/* Resource Requirement Summary - Top Banner */}
      <div className={`mb-6 rounded-xl border-2 p-6 ${
        hasEnoughCapacity
          ? 'bg-primary/10 border-primary'
          : 'bg-accent border-border'
      }`}>
        <div className="flex items-center gap-2 mb-4">
          <Calculator className="w-5 h-5 text-foreground" />
          <h3 className="font-semibold text-foreground">Lärarbehov för läsår {selectedAcademicYear}/{selectedAcademicYear + 1}</h3>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-4">
          {/* Total hours needed */}
          <div className="bg-card/80 rounded-lg p-4 border border-border">
            <p className="text-xs text-muted-foreground mb-1">Undervisningstid</p>
            <p className="text-2xl font-bold text-foreground">{totalPointsNeeded.toLocaleString()} <span className="text-base font-medium">tim</span></p>
            <p className="text-xs text-muted-foreground">{totalPointsNeeded.toLocaleString()} poäng</p>
          </div>

          {/* Teachers needed */}
          <div className="bg-card/80 rounded-lg p-4 border border-border">
            <p className="text-xs text-muted-foreground mb-1">Minimalt behov</p>
            <p className="text-2xl font-bold text-primary">{Math.ceil(fullTimeTeachersNeeded)}</p>
            <p className="text-xs text-muted-foreground">heltidslärare ({fullTimeTeachersNeeded.toFixed(1)} exakt)</p>
          </div>

          {/* Current teachers */}
          <div className="bg-card/80 rounded-lg p-4 border border-border">
            <p className="text-xs text-muted-foreground mb-1">Nuvarande lärare</p>
            <p className="text-2xl font-bold text-foreground">{teachers.length}</p>
            <p className="text-xs text-muted-foreground">{currentFullTimeEquivalent.toFixed(1)} heltidsekvivalenter</p>
          </div>

          {/* Status */}
          <div className={`rounded-lg p-4 border ${
            hasEnoughCapacity
              ? 'bg-primary/10 border-primary'
              : 'bg-accent border-border'
          }`}>
            <p className="text-xs text-muted-foreground mb-1">Status</p>
            {hasEnoughCapacity ? (
              <>
                <p className="text-2xl font-bold text-foreground">+{Math.round(capacityDifference)}</p>
                <p className="text-xs text-primary">poäng överskott</p>
              </>
            ) : (
              <>
                <p className="text-2xl font-bold text-accent-foreground">{Math.round(capacityDifference)}</p>
                <p className="text-xs text-accent-foreground">poäng underskott</p>
              </>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-2">
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>Lärarkapacitet: {Math.round(currentTeacherCapacity).toLocaleString()}p</span>
            <span>Behov: {totalPointsNeeded.toLocaleString()}p</span>
          </div>
          <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
            <div
              className={`h-full transition-all ${
                hasEnoughCapacity ? 'bg-primary/100' : 'bg-accent'
              }`}
              style={{ width: `${Math.min((currentTeacherCapacity / totalPointsNeeded) * 100, 100)}%` }}
            />
          </div>
        </div>

        {/* Recommendation */}
        <div className={`flex items-center gap-2 text-sm ${
          hasEnoughCapacity ? 'text-primary' : 'text-accent-foreground'
        }`}>
          {hasEnoughCapacity ? (
            <>
              <CheckCircle2 className="w-4 h-4" />
              <span>Tillräcklig lärarkapacitet för att täcka behovet</span>
            </>
          ) : (
            <>
              <AlertCircle className="w-4 h-4" />
              <span>
                Behöver rekrytera motsvarande <strong>{Math.ceil(Math.abs(capacityDifference) / fullTimePoints)}</strong> heltidslärare till
                ({Math.abs(Math.round(capacityDifference)).toLocaleString()} poäng)
              </span>
            </>
          )}
        </div>
      </div>

      {/* Subject Needs Summary Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {/* No teachers card */}
        <div className="bg-destructive/10 rounded-xl border border-destructive overflow-hidden">
          <button
            onClick={() => setExpandedCard(expandedCard === 'no-teacher' ? null : 'no-teacher')}
            className="w-full p-6 text-left hover:bg-destructive/10/50 transition"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-6 h-6 text-destructive" />
                <p className="text-sm text-foreground">Ämnen utan lärare</p>
              </div>
              {expandedCard === 'no-teacher' ? (
                <ChevronUp className="w-5 h-5 text-destructive" />
              ) : (
                <ChevronDown className="w-5 h-5 text-destructive" />
              )}
            </div>
            <p className="text-3xl text-foreground">
              {sortedSubjects.filter(([_, data]) => data.teacherCount === 0).length}
            </p>
            <p className="text-xs text-muted-foreground mt-1">behöver rekryteras</p>
          </button>
          {expandedCard === 'no-teacher' && (
            <div className="px-6 pb-4 border-t border-destructive pt-3 max-h-64 overflow-y-auto">
              {sortedSubjects.filter(([_, data]) => data.teacherCount === 0).length === 0 ? (
                <p className="text-xs text-muted-foreground italic">Alla ämnen har minst en lärare</p>
              ) : (
                <div className="space-y-3">
                  {sortedSubjects
                    .filter(([_, data]) => data.teacherCount === 0)
                    .map(([subject, data]) => (
                      <div key={subject} className="bg-destructive/10 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-destructive text-sm">{subject}</span>
                          <span className="text-xs text-destructive">{data.totalPoints}p · {data.courseCount} kurser</span>
                        </div>
                        <div className="space-y-1">
                          {data.courses.map((course, idx) => (
                            <div key={idx} className="flex items-center justify-between text-xs bg-card/60 rounded px-2 py-1">
                              <span className="text-foreground">
                                <span className="font-medium">{course.className}</span>
                                <span className="text-muted-foreground mx-1">·</span>
                                {course.courseName}
                              </span>
                              <span className="text-muted-foreground">{course.points}p</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* One teacher card */}
        <div className="bg-accent rounded-xl border border-border overflow-hidden">
          <button
            onClick={() => setExpandedCard(expandedCard === 'one-teacher' ? null : 'one-teacher')}
            className="w-full p-6 text-left hover:bg-accent/50 transition"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <Users className="w-6 h-6 text-accent-foreground" />
                <p className="text-sm text-foreground">Ämnen med 1 lärare</p>
              </div>
              {expandedCard === 'one-teacher' ? (
                <ChevronUp className="w-5 h-5 text-accent-foreground" />
              ) : (
                <ChevronDown className="w-5 h-5 text-accent-foreground" />
              )}
            </div>
            <p className="text-3xl text-foreground">
              {sortedSubjects.filter(([_, data]) => data.teacherCount === 1).length}
            </p>
            <p className="text-xs text-muted-foreground mt-1">kan behöva förstärkning</p>
          </button>
          {expandedCard === 'one-teacher' && (
            <div className="px-6 pb-4 border-t border-border pt-3">
              <p className="text-xs font-medium text-accent-foreground mb-2">Ämnen med endast en lärare:</p>
              <div className="flex flex-wrap gap-1.5">
                {sortedSubjects
                  .filter(([_, data]) => data.teacherCount === 1)
                  .map(([subject, data]) => (
                    <span
                      key={subject}
                      className="px-2.5 py-1 bg-accent text-accent-foreground rounded-full text-xs"
                      title={`${data.courseCount} kurser · ${data.totalPoints} poäng`}
                    >
                      {subject}
                    </span>
                  ))}
                {sortedSubjects.filter(([_, data]) => data.teacherCount === 1).length === 0 && (
                  <p className="text-xs text-muted-foreground italic">Inga ämnen med endast en lärare</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Covered card */}
        <div className="bg-primary/10 rounded-xl border border-primary overflow-hidden">
          <button
            onClick={() => setExpandedCard(expandedCard === 'covered' ? null : 'covered')}
            className="w-full p-6 text-left hover:bg-primary/10/50 transition"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-primary" />
                <p className="text-sm text-foreground">Ämnen väl täckta</p>
              </div>
              {expandedCard === 'covered' ? (
                <ChevronUp className="w-5 h-5 text-primary" />
              ) : (
                <ChevronDown className="w-5 h-5 text-primary" />
              )}
            </div>
            <p className="text-3xl text-foreground">
              {sortedSubjects.filter(([_, data]) => data.teacherCount >= 2).length}
            </p>
            <p className="text-xs text-muted-foreground mt-1">2+ lärare per ämne</p>
          </button>
          {expandedCard === 'covered' && (
            <div className="px-6 pb-4 border-t border-primary pt-3">
              <p className="text-xs font-medium text-foreground mb-2">Ämnen med god täckning:</p>
              <div className="flex flex-wrap gap-1.5">
                {sortedSubjects
                  .filter(([_, data]) => data.teacherCount >= 2)
                  .map(([subject, data]) => (
                    <span
                      key={subject}
                      className="px-2.5 py-1 bg-primary/10 text-foreground rounded-full text-xs"
                      title={`${data.teacherCount} lärare · ${data.courseCount} kurser · ${data.totalPoints} poäng`}
                    >
                      {subject} ({data.teacherCount})
                    </span>
                  ))}
                {sortedSubjects.filter(([_, data]) => data.teacherCount >= 2).length === 0 && (
                  <p className="text-xs text-muted-foreground italic">Inga ämnen har 2+ lärare ännu</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Action buttons - always visible after info cards */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <button
          onClick={startNewTeacher}
          className="flex items-center justify-center gap-3 bg-primary text-primary-foreground px-6 py-4 rounded-xl hover:bg-primary/90 transition shadow-sm"
        >
          <Plus className="w-5 h-5" />
          <span className="font-medium">Lägg till lärare</span>
        </button>
        <button
          onClick={startImport}
          className="flex items-center justify-center gap-3 bg-accent text-accent-foreground px-6 py-4 rounded-xl hover:bg-accent/90 transition shadow-sm"
        >
          <Upload className="w-5 h-5" />
          <span className="font-medium">Importera från fil</span>
        </button>
      </div>

      {/* Teacher list */}
      {teachers.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-border rounded-xl">
          <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Inga lärare tillagda än</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-medium text-foreground">Tillagda lärare ({teachers.length})</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {teachers.map((teacher) => (
              <div key={teacher.id} className="border border-border rounded-xl p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="w-12 h-12 bg-accent rounded-full flex items-center justify-center flex-shrink-0">
                      <UserCircle className="w-7 h-7 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg mb-1 truncate">{teacher.name}</h3>
                      <p className="text-sm text-muted-foreground truncate">{teacher.email}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Anställningsandel: {teacher.employmentPercentage} %
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => editTeacher(teacher)}
                      className="text-primary hover:bg-accent p-2 rounded-lg transition"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => duplicateTeacher(teacher)}
                      className="text-muted-foreground hover:text-primary p-2 rounded-lg transition"
                    >
                      <Copy className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => deleteTeacher(teacher.id)}
                      className="text-muted-foreground hover:text-destructive p-2 rounded-lg transition"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="pt-3 border-t border-border">
                  <p className="text-sm text-foreground mb-2">Ämnesbehörighet:</p>
                  <div className="flex flex-wrap gap-2">
                    {teacher.subjects.slice(0, 3).map((subject) => (
                      <span
                        key={subject}
                        className="px-3 py-1 bg-accent text-primary rounded-full text-xs"
                      >
                        {subject}
                      </span>
                    ))}
                    {teacher.subjects.length > 3 && (
                      <span className="px-3 py-1 bg-muted text-muted-foreground rounded-full text-xs">
                        +{teacher.subjects.length - 3} till
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}