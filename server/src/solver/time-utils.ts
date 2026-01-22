/**
 * Time utility functions for schedule generation
 */

import { TimeSlot, SolverProjectSettings } from './types';

/**
 * Convert "HH:MM:SS" or "HH:MM" time string to minutes from midnight
 */
export function timeToMinutes(timeStr: string): number {
    const parts = timeStr.split(':');
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    return hours * 60 + minutes;
}

/**
 * Convert minutes from midnight to "HH:MM:SS" format
 */
export function minutesToTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:00`;
}

/**
 * Check if two time slots overlap
 */
export function slotsOverlap(slot1: TimeSlot, slot2: TimeSlot): boolean {
    if (slot1.dayOfWeek !== slot2.dayOfWeek) return false;

    // Overlap if one starts before the other ends
    return slot1.startMinutes < slot2.endMinutes && slot2.startMinutes < slot1.endMinutes;
}

/**
 * Check if a slot is within lunch time
 */
export function isInLunchPeriod(
    slot: TimeSlot,
    earliestLunch: number,
    latestLunch: number,
    lunchDuration: number
): boolean {
    // The slot overlaps with the potential lunch window
    const lunchWindowEnd = latestLunch + lunchDuration;
    return slot.startMinutes < lunchWindowEnd && slot.endMinutes > earliestLunch;
}

/**
 * Check if a slot completely blocks lunch (no time for lunch)
 */
export function blocksLunch(
    daySlots: TimeSlot[],
    earliestLunch: number,
    latestLunch: number,
    lunchDuration: number
): boolean {
    // Sort slots by start time
    const sorted = [...daySlots].sort((a, b) => a.startMinutes - b.startMinutes);

    // Check if there's a gap of at least lunchDuration between earliestLunch and latestLunch + lunchDuration
    let currentTime = earliestLunch;

    for (const slot of sorted) {
        if (slot.startMinutes > latestLunch) {
            // We've passed the latest lunch start time, check if we have enough gap
            if (currentTime <= latestLunch) {
                return false; // There's time for lunch
            }
        }

        if (slot.endMinutes <= earliestLunch) {
            continue; // Slot is before lunch period
        }

        if (slot.startMinutes > currentTime) {
            const gap = slot.startMinutes - currentTime;
            if (gap >= lunchDuration && currentTime <= latestLunch) {
                return false; // Found a lunch slot
            }
        }

        currentTime = Math.max(currentTime, slot.endMinutes);
    }

    // Check if there's time after the last slot
    if (currentTime <= latestLunch) {
        return false; // Can have lunch after last morning lesson
    }

    return true; // No valid lunch slot found
}

/**
 * Generate all possible time slots for a given lesson duration
 */
export function generateTimeSlots(
    settings: SolverProjectSettings,
    lessonDuration: number
): TimeSlot[] {
    const slots: TimeSlot[] = [];
    const { earliestLessonStart, latestLessonEnd, shortestBreakBetweenLessons } = settings;

    // Time slot increment (typically 5 or 15 minutes)
    const slotIncrement = 15; // 15-minute increments for flexibility

    for (let day = 1; day <= 5; day++) {
        let startTime = earliestLessonStart;

        while (startTime + lessonDuration <= latestLessonEnd) {
            slots.push({
                dayOfWeek: day,
                startMinutes: startTime,
                endMinutes: startTime + lessonDuration,
            });

            // Move to next potential start time
            startTime += slotIncrement;
        }
    }

    return slots;
}

/**
 * Get preferred time slots (morning slots, avoiding lunch time)
 */
export function getPreferredTimeSlots(
    allSlots: TimeSlot[],
    settings: SolverProjectSettings
): TimeSlot[] {
    const { earliestLunchTime, latestLunchTime, lunchDuration } = settings;

    return allSlots.filter(slot => {
        // Prefer morning (before lunch) or afternoon (after lunch)
        const isBeforeLunch = slot.endMinutes <= earliestLunchTime;
        const isAfterLunch = slot.startMinutes >= latestLunchTime + lunchDuration;
        return isBeforeLunch || isAfterLunch;
    });
}

/**
 * Sort slots by preference (morning first, then by day)
 */
export function sortSlotsByPreference(slots: TimeSlot[]): TimeSlot[] {
    return [...slots].sort((a, b) => {
        // First sort by day
        if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek;
        // Then by start time (morning first)
        return a.startMinutes - b.startMinutes;
    });
}

/**
 * Get the day name for a day number
 */
export function getDayName(dayOfWeek: number): string {
    const days = ['', 'Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag'];
    return days[dayOfWeek] || '';
}

/**
 * Format a time slot for display
 */
export function formatTimeSlot(slot: TimeSlot): string {
    return `${getDayName(slot.dayOfWeek)} ${minutesToTime(slot.startMinutes).substring(0, 5)}-${minutesToTime(slot.endMinutes).substring(0, 5)}`;
}
