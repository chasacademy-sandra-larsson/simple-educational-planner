/**
 * Main schedule solver entrypoint
 * Calls Python OR-Tools solver via subprocess
 */

import { spawn, execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import {
    SolverInput,
    SolverResult,
    ScheduledLessonResult,
} from './types';
import { loadSolverData, getAvailableAcademicYears } from './data-loader';
import { runPreflight } from './preflight';

// Re-export for convenience
export { loadSolverData, getAvailableAcademicYears, runPreflight };
export type { PreflightWarning, PreflightSeverity } from './preflight';
export * from './types';

// Path to Python solver script
// Works both in development (tsx) and production (compiled to dist/)
const PYTHON_SOLVER_PATH = path.resolve(
    __dirname.includes('/dist/')
        ? path.join(__dirname, '..', '..', 'src', 'solver', 'python', 'scheduler.py')
        : path.join(__dirname, 'python', 'scheduler.py')
);

/**
 * Find a Python executable that has ortools installed.
 * Prefers the project venv (server/.venv) over system pythons.
 */
function findPython(): string | null {
    const venvPython = path.resolve(__dirname, '..', '..', '.venv', 'bin', 'python');
    const candidates = [venvPython, 'python3', 'python'];
    for (const cmd of candidates) {
        try {
            if (cmd === venvPython && !fs.existsSync(venvPython)) continue;
            execSync(`"${cmd}" -c "import ortools"`, { stdio: 'pipe' });
            return cmd;
        } catch {
            // Try next candidate
        }
    }
    return null;
}

/**
 * Generate a weekly schedule using Google OR-Tools (Python)
 */
export async function generateSchedule(input: SolverInput): Promise<SolverResult> {
    return new Promise((resolve) => {
        const startTime = Date.now();

        // Check if Python script exists
        if (!fs.existsSync(PYTHON_SOLVER_PATH)) {
            console.error(`[Solver] Python script not found at: ${PYTHON_SOLVER_PATH}`);
            resolve({
                success: false,
                status: 'ERROR',
                lessons: [],
                solverTimeMs: Date.now() - startTime,
                totalConflicts: 0,
                message: `Python solver script not found at: ${PYTHON_SOLVER_PATH}`,
            });
            return;
        }

        // Find Python executable
        const pythonCmd = findPython();
        if (!pythonCmd) {
            console.error('[Solver] Python not found in PATH');
            resolve({
                success: false,
                status: 'ERROR',
                lessons: [],
                solverTimeMs: Date.now() - startTime,
                totalConflicts: 0,
                message: 'Ingen Python med ortools hittades. Installera med: pip install -r src/solver/python/requirements.txt (gärna i server/.venv).',
            });
            return;
        }

        // Prepare input for Python solver
        const pythonInput = {
            projectId: input.projectId,
            academicYear: input.academicYear,
            termType: input.termType,
            specificTerm: input.specificTerm,
            courses: input.courses,
            classes: input.classes,
            teachers: input.teachers,
            rooms: input.rooms,
            settings: input.settings,
            timeLimitSeconds: input.timeLimitSeconds,
        };

        console.log(`[Solver] Starting with ${input.courses.length} courses, ${input.classes.length} classes`);
        console.log(`[Solver] Python command: ${pythonCmd}`);
        console.log(`[Solver] Python script path: ${PYTHON_SOLVER_PATH}`);
        console.log(`[Solver] Working directory: ${process.cwd()}`);

        // Spawn Python process
        const pythonProcess = spawn(pythonCmd, [PYTHON_SOLVER_PATH], {
            stdio: ['pipe', 'pipe', 'pipe'],
            env: { ...process.env },
        });

        let stdout = '';
        let stderr = '';

        pythonProcess.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
            stderr += data.toString();
            console.error('[Solver] Python stderr:', data.toString());
        });

        pythonProcess.on('close', (code) => {
            const solverTimeMs = Date.now() - startTime;
            console.log(`[Solver] Process exited with code ${code} after ${solverTimeMs}ms`);

            if (code !== 0) {
                console.error('[Solver] Error output:', stderr);
                console.error('[Solver] Stdout output:', stdout);
                resolve({
                    success: false,
                    status: 'ERROR',
                    lessons: [],
                    solverTimeMs,
                    totalConflicts: 0,
                    message: `Python solver failed (exit code ${code}): ${stderr || stdout || 'No output'}`,
                });
                return;
            }

            try {
                const result = JSON.parse(stdout) as SolverResult;
                // Update solver time to include Node.js overhead
                result.solverTimeMs = solverTimeMs;
                console.log(`[Solver] Success: ${result.lessons.length} lessons scheduled`);
                resolve(result);
            } catch (parseError) {
                console.error('[Solver] Failed to parse output:', stdout);
                resolve({
                    success: false,
                    status: 'ERROR',
                    lessons: [],
                    solverTimeMs,
                    totalConflicts: 0,
                    message: `Failed to parse solver output: ${parseError}. Output was: ${stdout.substring(0, 200)}`,
                });
            }
        });

        pythonProcess.on('error', (error) => {
            console.error('[Solver] Failed to start process:', error);
            resolve({
                success: false,
                status: 'ERROR',
                lessons: [],
                solverTimeMs: Date.now() - startTime,
                totalConflicts: 0,
                message: `Failed to start Python solver: ${error.message}. Make sure Python 3 and ortools are installed.`,
            });
        });

        // Send input to Python process.
        // Guard stdin against EPIPE — if the child dies before reading its input
        // (e.g. import error), an unhandled stream error would crash the server.
        pythonProcess.stdin.on('error', (err) => {
            console.error('[Solver] Failed to write to Python stdin:', err.message);
        });
        const inputJson = JSON.stringify(pythonInput);
        console.log(`[Solver] Sending ${inputJson.length} bytes to Python`);
        pythonProcess.stdin.write(inputJson);
        pythonProcess.stdin.end();

        // Set timeout (10 minutes for large schedules)
        setTimeout(() => {
            console.warn('[Solver] Timeout - killing process');
            pythonProcess.kill('SIGTERM');
        }, 600000);
    });
}

/**
 * Quick validation to check if scheduling is likely possible
 */
export function preflightCheck(input: SolverInput): { valid: boolean; issues: string[] } {
    const issues: string[] = [];

    // Check if we have courses to schedule
    if (input.courses.length === 0) {
        issues.push('Inga kurser att schemalägga för vald termin');
    }

    // Calculate total lesson slots needed
    const totalLessonsNeeded = input.courses.reduce((sum, c) => sum + c.lessonsPerWeek, 0);

    // Calculate available slots per week
    const { earliestLessonStart, latestLessonEnd, lunchDuration } = input.settings;
    const availableMinutesPerDay = (latestLessonEnd - earliestLessonStart) - lunchDuration;
    const avgLessonDuration = input.courses.length > 0
        ? input.courses.reduce((sum, c) => sum + c.lessonDuration, 0) / input.courses.length
        : 60;
    const slotsPerDay = Math.floor(availableMinutesPerDay / avgLessonDuration);
    const totalSlotsPerWeek = slotsPerDay * 5;

    // Check if there are enough slots for all classes
    const classCount = input.classes.length;
    if (classCount > 0 && totalLessonsNeeded > totalSlotsPerWeek * classCount && input.rooms.length > 0) {
        issues.push(`Inte tillräckligt med tid: behöver ${totalLessonsNeeded} lektioner, har ~${totalSlotsPerWeek * classCount} tidsluckor`);
    }

    // Warning (not blocking) for few rooms
    if (input.rooms.length > 0 && input.rooms.length < classCount) {
        // This is a warning, not an error
        console.warn(`Färre rum (${input.rooms.length}) än klasser (${classCount}) - kan orsaka konflikter`);
    }

    return {
        valid: issues.length === 0,
        issues,
    };
}
