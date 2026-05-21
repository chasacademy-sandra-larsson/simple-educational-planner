/**
 * Programstrukturer enligt Skolverket
 *
 * Definierar poängfördelning för varje gymnasieprogram.
 * Används för att validera kursplaner och guida användare vid skapande av klasser.
 *
 * Källa: https://www.skolverket.se
 */

export interface ProgramCategory {
  name: string;
  nameEn: string;
  points: number;
  description: string;
}

export interface ProgramStructure {
  code: string;
  name: string;
  totalPoints: number;
  categories: {
    FOUNDATIONAL_SUBJECTS: number;      // Gymnasiegemensamma ämnen
    PROGRAMME_SPECIFIC_SUBJECTS: number; // Programgemensamma ämnen
    ORIENTATION: number;                 // Inriktning
    PROGRAMME_SPECIALIZATION: number;    // Programfördjupning
    INDIVIDUAL_CHOICE: number;           // Individuellt val
    GYMNASIEARBETE: number;              // Gymnasiearbete
  };
  orientations: {
    code: string;
    name: string;
    points: number;
  }[];
}

/**
 * Kategoribeskrivningar
 */
export const CATEGORY_INFO: Record<string, ProgramCategory> = {
  FOUNDATIONAL_SUBJECTS: {
    name: 'Gymnasiegemensamma ämnen',
    nameEn: 'Foundational Subjects',
    points: 0, // Varierar per program
    description: 'Ämnen som alla gymnasieelever läser oavsett program: Svenska, Engelska, Matematik, Historia, Idrott, Religion, Samhällskunskap m.fl.'
  },
  PROGRAMME_SPECIFIC_SUBJECTS: {
    name: 'Programgemensamma ämnen',
    nameEn: 'Programme Specific Subjects',
    points: 0,
    description: 'Ämnen som är gemensamma för alla elever inom programmet, oavsett inriktning.'
  },
  ORIENTATION: {
    name: 'Inriktning',
    nameEn: 'Orientation',
    points: 0,
    description: 'Ämnen som är specifika för den valda inriktningen inom programmet.'
  },
  PROGRAMME_SPECIALIZATION: {
    name: 'Programfördjupning',
    nameEn: 'Programme Specialization',
    points: 0,
    description: 'Fördjupningskurser inom programmets karaktär. Skolan bestämmer utbudet.'
  },
  INDIVIDUAL_CHOICE: {
    name: 'Individuellt val',
    nameEn: 'Individual Choice',
    points: 200, // Alltid 200p
    description: 'Kurser som eleven själv väljer från skolans utbud. Alltid 200 poäng.'
  },
  GYMNASIEARBETE: {
    name: 'Gymnasiearbete',
    nameEn: 'Diploma Project',
    points: 100, // Alltid 100p
    description: 'Ett större självständigt arbete som visar att eleven är förberedd för högskolestudier eller yrkesliv.'
  }
};

/**
 * Programstrukturer för högskoleförberedande program
 */
export const PROGRAM_STRUCTURES: Record<string, ProgramStructure> = {
  // TEKNIKPROGRAMMET
  TE: {
    code: 'TE',
    name: 'Teknikprogrammet',
    totalPoints: 2500,
    categories: {
      FOUNDATIONAL_SUBJECTS: 1050,
      PROGRAMME_SPECIFIC_SUBJECTS: 550,
      ORIENTATION: 300,
      PROGRAMME_SPECIALIZATION: 300,
      INDIVIDUAL_CHOICE: 200,
      GYMNASIEARBETE: 100
    },
    orientations: [
      { code: 'TEDES', name: 'Design och produktutveckling', points: 300 },
      { code: 'TEINF', name: 'Informations- och medieteknik', points: 300 },
      { code: 'TEPRO', name: 'Produktionsteknik', points: 300 },
      { code: 'TESAM', name: 'Samhällsbyggande och miljö', points: 300 },
      { code: 'TETEK', name: 'Teknikvetenskap', points: 300 }
    ]
  },

  // NATURVETENSKAPSPROGRAMMET
  NA: {
    code: 'NA',
    name: 'Naturvetenskapsprogrammet',
    totalPoints: 2500,
    categories: {
      FOUNDATIONAL_SUBJECTS: 1150,
      PROGRAMME_SPECIFIC_SUBJECTS: 450,
      ORIENTATION: 300,
      PROGRAMME_SPECIALIZATION: 300,
      INDIVIDUAL_CHOICE: 200,
      GYMNASIEARBETE: 100
    },
    orientations: [
      { code: 'NANAT', name: 'Naturvetenskap', points: 300 },
      { code: 'NANATAM', name: 'Naturvetenskap och samhälle', points: 300 }
    ]
  },

  // SAMHÄLLSVETENSKAPSPROGRAMMET
  SA: {
    code: 'SA',
    name: 'Samhällsvetenskapsprogrammet',
    totalPoints: 2500,
    categories: {
      FOUNDATIONAL_SUBJECTS: 1150,
      PROGRAMME_SPECIFIC_SUBJECTS: 350,
      ORIENTATION: 400,
      PROGRAMME_SPECIALIZATION: 300,
      INDIVIDUAL_CHOICE: 200,
      GYMNASIEARBETE: 100
    },
    orientations: [
      { code: 'SASAM', name: 'Samhällsvetenskap', points: 400 },
      { code: 'SABET', name: 'Beteendevetenskap', points: 400 },
      { code: 'SAMED', name: 'Medier, information och kommunikation', points: 400 }
    ]
  },

  // EKONOMIPROGRAMMET
  EK: {
    code: 'EK',
    name: 'Ekonomiprogrammet',
    totalPoints: 2500,
    categories: {
      FOUNDATIONAL_SUBJECTS: 1050,
      PROGRAMME_SPECIFIC_SUBJECTS: 500,
      ORIENTATION: 350,
      PROGRAMME_SPECIALIZATION: 300,
      INDIVIDUAL_CHOICE: 200,
      GYMNASIEARBETE: 100
    },
    orientations: [
      { code: 'EKEKO', name: 'Ekonomi', points: 350 },
      { code: 'EKJUR', name: 'Juridik', points: 350 }
    ]
  },

  // ESTETISKA PROGRAMMET
  ES: {
    code: 'ES',
    name: 'Estetiska programmet',
    totalPoints: 2500,
    categories: {
      FOUNDATIONAL_SUBJECTS: 1100,
      PROGRAMME_SPECIFIC_SUBJECTS: 200,
      ORIENTATION: 500,
      PROGRAMME_SPECIALIZATION: 400,
      INDIVIDUAL_CHOICE: 200,
      GYMNASIEARBETE: 100
    },
    orientations: [
      { code: 'ESBIL', name: 'Bild och formgivning', points: 500 },
      { code: 'ESDAN', name: 'Dans', points: 500 },
      { code: 'ESEST', name: 'Estetik och media', points: 500 },
      { code: 'ESMUS', name: 'Musik', points: 500 },
      { code: 'ESTEA', name: 'Teater', points: 500 }
    ]
  },

  // HUMANISTISKA PROGRAMMET
  HU: {
    code: 'HU',
    name: 'Humanistiska programmet',
    totalPoints: 2500,
    categories: {
      FOUNDATIONAL_SUBJECTS: 1150,
      PROGRAMME_SPECIFIC_SUBJECTS: 300,
      ORIENTATION: 450,
      PROGRAMME_SPECIALIZATION: 300,
      INDIVIDUAL_CHOICE: 200,
      GYMNASIEARBETE: 100
    },
    orientations: [
      { code: 'HUKUL', name: 'Kultur', points: 450 },
      { code: 'HUSPR', name: 'Språk', points: 450 }
    ]
  }
};

/**
 * Hämta programstruktur för ett program
 */
export function getProgramStructure(programCode: string): ProgramStructure | undefined {
  return PROGRAM_STRUCTURES[programCode.toUpperCase()];
}

/**
 * Validera att en kursplan uppfyller programkraven
 */
export function validateCurriculumAgainstProgram(
  programCode: string,
  coursesByCategory: Record<string, number>
): { valid: boolean; errors: string[]; warnings: string[] } {
  const structure = getProgramStructure(programCode);
  if (!structure) {
    return { valid: false, errors: [`Okänt program: ${programCode}`], warnings: [] };
  }

  const errors: string[] = [];
  const warnings: string[] = [];
  let totalPoints = 0;

  // Kontrollera varje kategori
  for (const [category, requiredPoints] of Object.entries(structure.categories)) {
    const actualPoints = coursesByCategory[category] || 0;
    totalPoints += actualPoints;

    if (actualPoints < requiredPoints) {
      errors.push(
        `${CATEGORY_INFO[category]?.name || category}: ${actualPoints}p av ${requiredPoints}p (saknas ${requiredPoints - actualPoints}p)`
      );
    } else if (actualPoints > requiredPoints) {
      warnings.push(
        `${CATEGORY_INFO[category]?.name || category}: ${actualPoints}p överstiger kravet på ${requiredPoints}p med ${actualPoints - requiredPoints}p`
      );
    }
  }

  // Kontrollera totalpoäng
  if (totalPoints !== structure.totalPoints) {
    if (totalPoints < structure.totalPoints) {
      errors.push(`Totalpoäng: ${totalPoints}p av ${structure.totalPoints}p krävs`);
    } else {
      warnings.push(`Totalpoäng: ${totalPoints}p överstiger ${structure.totalPoints}p`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Hämta alla tillgängliga program
 */
export function getAllPrograms(): ProgramStructure[] {
  return Object.values(PROGRAM_STRUCTURES);
}

/**
 * Hämta kategorinamn på svenska
 */
export function getCategoryName(categoryCode: string): string {
  return CATEGORY_INFO[categoryCode]?.name || categoryCode;
}
