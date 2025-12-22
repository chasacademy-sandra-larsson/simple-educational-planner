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

const BASE_URL = "https://api.skolverket.se/syllabus/v1";

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
    const response = await fetch(
      `${BASE_URL}/programs`,
      {
        headers: {
          Accept: "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch programs: ${response.statusText}`);
    }

    const data = await response.json();
    // The API might return a wrapper object or an array. 
    // Based on standard Skolverket API, it usually returns an object with a 'programs' property or similar.
    // Let's assume for now it returns { programs: [...] } or just [...]
    // I will add some safety checks.

    const programs = data.programs || data;

    if (!Array.isArray(programs)) {
      console.error("Unexpected API response format for programs:", data);
      return [];
    }

    return programs.map((p: any) => ({
      code: p.code,
      name: p.name,
      typeOfStudyPath: p.typeOfStudyPath,
      schoolTypes: p.schoolTypes,
    }));
  } catch (error) {
    console.error("Error fetching programs:", error);
    return [];
  }
}

export async function getProgramStructure(code: string): Promise<Course[]> {
  try {
    const response = await fetch(`${BASE_URL}/programs/${code}`, {
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch program structure: ${response.statusText}`);
    }

    const data = await response.json();

    console.log("Full API response:", JSON.stringify(data, null, 2));

    // The API returns a structure like:
    // { program: { programStructure: { subjects: [ { name, code, courses: [ { name, code, points } ] } ] } } }
    const courses: Course[] = [];

    // Check multiple possible paths for subjects
    const subjects =
      data.program?.programStructure?.subjects ||
      data.programStructure?.subjects ||
      data.subjects;

    console.log("Subjects found:", subjects);

    if (subjects && Array.isArray(subjects)) {
      for (const subject of subjects) {
        if (subject.courses && Array.isArray(subject.courses)) {
          for (const course of subject.courses) {
            courses.push({
              courseCode: course.code,
              name: course.name,
              points: parseInt(course.points) || 0,
            });
          }
        }
      }
    }

    console.log("Parsed courses:", courses);

    return courses;

  } catch (error) {
    console.error("Error fetching program structure:", error);
    return [];
  }
}

export async function getOrientations(programCode: string): Promise<Orientation[]> {
  try {
    const response = await fetch(`${BASE_URL}/programs/${programCode}`, {
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch orientations: ${response.statusText}`);
    }

    const data = await response.json();
    const orientations: Orientation[] = [];

    // Extract orientations from the program data
    if (data.program?.orientations && Array.isArray(data.program.orientations)) {
      for (const orientation of data.program.orientations) {
        orientations.push({
          code: orientation.code,
          name: orientation.name,
          programCode: orientation.programCode || programCode,
        });
      }
    }

    return orientations;

  } catch (error) {
    console.error("Error fetching orientations:", error);
    return [];
  }
}

export async function getProgramSpecializationSubjects(programCode: string): Promise<Course[]> {
  try {
    const response = await fetch(`${BASE_URL}/programs/${programCode}`, {
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch program structure: ${response.statusText}`);
    }

    const data = await response.json();
    const courses: Course[] = [];

    // Debug: Log the structure to see what we're working with
    console.log("Program data structure for specialization:", {
      hasProgram: !!data.program,
      keys: data.program ? Object.keys(data.program) : [],
      fullData: data.program,
    });

    // Try multiple possible paths for program specialization subjects
    const possiblePaths = [
      data.program?.programSpecialization?.subjects,
      data.program?.specializationSubjects,
      data.program?.programStructure?.specialization?.subjects,
      data.program?.specialization?.subjects,
      data.program?.programmeSpecialization?.subjects,
      // Also check if there's a direct "specialization" or "programfördjupning" field
      data.program?.programfördjupning?.subjects,
      data.program?.programfordjupning?.subjects,
    ];

    for (const subjects of possiblePaths) {
      if (subjects && Array.isArray(subjects)) {
        console.log("Found specialization subjects at path:", subjects);
        for (const subject of subjects) {
          if (subject.courses && Array.isArray(subject.courses)) {
            for (const course of subject.courses) {
              const courseName = course.name?.startsWith('Nivå ')
                ? `${subject.name} ${course.name.replace('Nivå ', '')}`
                : course.name || course.courseName || 'Okänd kurs';

              courses.push({
                courseCode: course.code || course.courseCode,
                name: courseName,
                points: parseInt(course.points || course.scope || 0) || 0,
                category: "ORIENTATION",
                subjectName: subject.name || subject.subjectName || 'Okänt ämne',
              });
            }
          }
        }
        if (courses.length > 0) {
          console.log(`Found ${courses.length} specialization courses`);
          break; // Stop after finding the first valid path
        }
      }
    }

    // If still no courses found, log the entire structure for debugging
    if (courses.length === 0) {
      console.warn("No specialization courses found. Full program structure:", JSON.stringify(data.program, null, 2));
    }

    return courses;

  } catch (error) {
    console.error("Error fetching program specialization subjects:", error);
    return [];
  }
}

export async function getCoursesByOrientation(programCode: string, orientationCode: string): Promise<Course[]> {
  try {
    const response = await fetch(`${BASE_URL}/programs/${programCode}`, {
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch program structure: ${response.statusText}`);
    }

    const data = await response.json();
    const courses: Course[] = [];

    // 1. Add foundational subjects
    if (data.program?.foundationSubjects?.subjects && Array.isArray(data.program.foundationSubjects.subjects)) {
      for (const subject of data.program.foundationSubjects.subjects) {
        if (subject.courses && Array.isArray(subject.courses)) {
          for (const course of subject.courses) {
            // Combine subject name with course name if course name is generic "Nivå X"
            const courseName = course.name.startsWith('Nivå ')
              ? `${subject.name} ${course.name.replace('Nivå ', '')}`
              : course.name;

            courses.push({
              courseCode: course.code,
              name: courseName,
              points: parseInt(course.points) || 0,
              category: "FOUNDATIONAL_SUBJECTS",
              subjectName: subject.name,
            });
          }
        }
      }
    }

    // 2. Add programme-specific subjects
    if (data.program?.programmeSpecificSubjects?.subjects && Array.isArray(data.program.programmeSpecificSubjects.subjects)) {
      for (const subject of data.program.programmeSpecificSubjects.subjects) {
        if (subject.courses && Array.isArray(subject.courses)) {
          for (const course of subject.courses) {
            // Combine subject name with course name if course name is generic "Nivå X"
            const courseName = course.name.startsWith('Nivå ')
              ? `${subject.name} ${course.name.replace('Nivå ', '')}`
              : course.name;

            courses.push({
              courseCode: course.code,
              name: courseName,
              points: parseInt(course.points) || 0,
              category: "PROGRAMME_SPECIFIC_SUBJECTS",
              subjectName: subject.name,
            });
          }
        }
      }
    }

    // 3. Add orientation-specific subjects
    if (data.program?.orientations && Array.isArray(data.program.orientations)) {
      const orientation = data.program.orientations.find((o: any) => o.code === orientationCode);

      if (orientation && orientation.subjects && Array.isArray(orientation.subjects)) {
        for (const subject of orientation.subjects) {
          if (subject.courses && Array.isArray(subject.courses)) {
            for (const course of subject.courses) {
              // Combine subject name with course name if course name is generic "Nivå X"
              const courseName = course.name.startsWith('Nivå ')
                ? `${subject.name} ${course.name.replace('Nivå ', '')}`
                : course.name;

              courses.push({
                courseCode: course.code,
                name: courseName,
                points: parseInt(course.points) || 0,
                category: "ORIENTATION",
                subjectName: subject.name, // Store subject name for grouping
              });
            }
          }
        }
      }
    }

    return courses;

  } catch (error) {
    console.error("Error fetching courses by orientation:", error);
    return [];
  }
}
