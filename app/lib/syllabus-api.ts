export interface Program {
  code: string;
  name: string;
  typeOfStudyPath: string;
  schoolTypes: string[];
}

export interface Course {
  courseCode: string;
  name: string;
  points: number;
  category?: string; // FOUNDATIONAL_SUBJECTS, PROGRAMME_SPECIFIC_SUBJECTS, or ORIENTATION
  subjectName?: string; // Name of the subject this course belongs to
}

export interface Orientation {
  code: string;
  name: string;
  programCode: string;
}


export interface ProgramStructure {
  code: string;
  name: string;
  structure: StructureItem[];
}

interface StructureItem {
  courseCode?: string;
  courseName?: string;
  points?: number;
  scope?: number; // Sometimes points are in 'scope'
  children?: StructureItem[]; // For nested structures/choices
}

// Backend proxy URL (to avoid CORS issues with Skolverket API)
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const BACKEND_URL = `${API_BASE}/api/skolverket`;

// Helper function to get auth token from localStorage
function getAuthToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('auth_token');
}

// Helper function to get headers with auth
function getAuthHeaders(): HeadersInit {
    const token = getAuthToken();
    const headers: Record<string, string> = {
        Accept: "application/json",
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
}

export const SCHOOL_TYPE_MAPPING: Record<string, string> = {
  GY: "Gymnasieskola",
  GR: "Grundskola",
  VUX: "Kommunal vuxenutbildning",
  SAR: "Anpassad grundskola",
  SFI: "Svenska för invandrare",
  GYSAR: "Anpassad gymnasieskola",
  KOMVUX: "Kommunal vuxenutbildning", // Sometimes used
  KOMVUXGY: "Kommunal vuxenutbildning på gymnasial nivå",
  KOMVUXGR: "Kommunal vuxenutbildning på grundläggande nivå",
  KOMVUXSÄR: "Kommunal vuxenutbildning som anpassad utbildning",
  // Add more as discovered
};

export function getSchoolTypeName(code: string): string {
  return SCHOOL_TYPE_MAPPING[code] || code;
}

export async function getPrograms(): Promise<Program[]> {
  try {
    // Use backend proxy to avoid CORS issues
    const response = await fetch(`${BACKEND_URL}/programs`, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch programs: ${response.statusText}`);
    }

    const programs = await response.json();

    if (!Array.isArray(programs)) {
      console.error("Unexpected API response format for programs:", programs);
      return [];
    }

    return programs.map((p: any) => ({
      code: p.code,
      name: p.name,
      typeOfStudyPath: p.typeOfStudyPath || p.category,
      schoolTypes: p.schoolTypes,
    }));
  } catch (error) {
    console.error("Error fetching programs:", error);
    return [];
  }
}

export async function getProgramStructure(code: string): Promise<Course[]> {
  try {
    // Use backend proxy to avoid CORS issues
    const response = await fetch(`${BACKEND_URL}/programs/${code}/courses`, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch program structure: ${response.statusText}`);
    }

    const data = await response.json();

    // Backend returns array of courses directly
    return data.map((course: any) => ({
      courseCode: course.code,
      name: course.name,
      points: course.points || 0,
      category: course.category,
      subjectName: course.subjectName,
    }));

  } catch (error) {
    console.error("Error fetching program structure:", error);
    return [];
  }
}

export async function getOrientations(programCode: string): Promise<Orientation[]> {
  try {
    const url = `${BACKEND_URL}/programs/${programCode}/orientations`;
    console.log('Fetching orientations from:', url);

    // Use backend proxy to avoid CORS issues
    const response = await fetch(url, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Failed to fetch orientations: ${response.status} ${response.statusText}`, errorText);
      return [];
    }

    const orientations = await response.json();
    console.log('Received orientations:', orientations);
    return orientations;

  } catch (error) {
    console.error("Error fetching orientations:", error);
    return [];
  }
}

export async function getProgramSpecializationSubjects(programCode: string): Promise<Course[]> {
  try {
    // Use backend proxy to get program details including specialization subjects
    const response = await fetch(`${BACKEND_URL}/programs/${programCode}`, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch program structure: ${response.statusText}`);
    }

    const data = await response.json();
    const courses: Course[] = [];

    // Backend returns specializationSubjects array with subjects containing courses
    if (data.specializationSubjects && Array.isArray(data.specializationSubjects)) {
      for (const subject of data.specializationSubjects) {
        if (subject.courses && Array.isArray(subject.courses)) {
          for (const course of subject.courses) {
            courses.push({
              courseCode: course.code,
              name: course.name,
              points: course.points || 0,
              category: "PROGRAMME_SPECIALIZATION",
              subjectName: subject.name,
            });
          }
        }
      }
    }

    return courses;

  } catch (error) {
    console.error("Error fetching program specialization subjects:", error);
    return [];
  }
}

export interface ProgramMeta {
  /** Gymnasiearbetets kurskod, namn och poäng enligt Skolverket. */
  diplomaProject: { code: string; name: string; points: number };
  /** Individuella valets omfattning i poäng. */
  individualOptionPoints: number;
}

const DEFAULT_PROGRAM_META: ProgramMeta = {
  diplomaProject: { code: 'GYMNASIEARBETE', name: 'Gymnasiearbete', points: 100 },
  individualOptionPoints: 200,
};

/**
 * Hämtar gymnasiearbetets och individuella valets omfattning för ett program.
 * Faller tillbaka på de nationella standardvärdena (100 p / 200 p) om
 * Skolverket inte svarar — de är lika för alla nationella program idag.
 */
export async function getProgramMeta(programCode: string): Promise<ProgramMeta> {
  try {
    const response = await fetch(`${BACKEND_URL}/programs/${programCode}`, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch program meta: ${response.statusText}`);
    }

    const data = await response.json();

    return {
      diplomaProject: {
        code: data.diplomaProject?.code || DEFAULT_PROGRAM_META.diplomaProject.code,
        name: data.diplomaProject?.name || DEFAULT_PROGRAM_META.diplomaProject.name,
        points: data.diplomaProject?.points || DEFAULT_PROGRAM_META.diplomaProject.points,
      },
      individualOptionPoints:
        data.individualOption?.points || DEFAULT_PROGRAM_META.individualOptionPoints,
    };
  } catch (error) {
    console.error('Error fetching program meta:', error);
    return DEFAULT_PROGRAM_META;
  }
}

export async function getCoursesByOrientation(programCode: string, orientationCode: string): Promise<Course[]> {
  try {
    // Use backend proxy with orientation query parameter
    const response = await fetch(`${BACKEND_URL}/programs/${programCode}/courses?orientation=${orientationCode}`, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch program structure: ${response.statusText}`);
    }

    const data = await response.json();

    // Backend returns array of courses directly with all categories
    return data.map((course: any) => ({
      courseCode: course.code,
      name: course.name,
      points: course.points || 0,
      category: course.category,
      subjectName: course.subjectName,
    }));

  } catch (error) {
    console.error("Error fetching courses by orientation:", error);
    return [];
  }
}
