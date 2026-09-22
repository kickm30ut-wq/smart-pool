import { Trip, User, Pool, MatchResult } from '../types';

/**
 * Converts "HH:mm" 24-hr time string to total minutes from midnight
 */
export function timeStringToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const parts = timeStr.split(':');
  const hours = parseInt(parts[0], 10) || 0;
  const minutes = parseInt(parts[1], 10) || 0;
  return hours * 60 + minutes;
}

/**
 * Converts total minutes from midnight back to "HH:mm" (24-hr format)
 */
export function minutesToTimeString(minutes: number): string {
  const norm = ((minutes % 1440) + 1440) % 1440;
  const h = Math.floor(norm / 60);
  const m = norm % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Formats "HH:mm" to human friendly 12-hour format e.g. "6:00 PM"
 */
export function formatTime12Hour(timeStr: string): string {
  if (!timeStr) return '';
  const [hStr, mStr] = timeStr.split(':');
  let h = parseInt(hStr, 10);
  const m = mStr || '00';
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${m} ${ampm}`;
}

/**
 * Calculates absolute difference in minutes between two "HH:mm" times
 */
export function calculateTimeDifference(time1: string, time2: string): number {
  const m1 = timeStringToMinutes(time1);
  const m2 = timeStringToMinutes(time2);
  return Math.abs(m1 - m2);
}

/**
 * Deterministic match score based on time difference
 */
export function calculateMatchScore(timeDiffMinutes: number): number {
  if (timeDiffMinutes <= 5) return 100;
  if (timeDiffMinutes <= 10) return 90;
  if (timeDiffMinutes <= 15) return 80;
  if (timeDiffMinutes <= 20) return 70;
  if (timeDiffMinutes <= 30) return 60;
  return Math.max(20, 50 - timeDiffMinutes);
}

export function getMatchQuality(score: number): 'Excellent Match' | 'Good Match' | 'Fair Match' {
  if (score >= 90) return 'Excellent Match';
  if (score >= 80) return 'Good Match';
  return 'Fair Match';
}

/**
 * Calculates recommended departure time from a collection of compatible times
 * Rounds to nearest 5 minutes
 */
export function calculateSuggestedDeparture(times: string[]): string {
  if (times.length === 0) return '18:00';
  const minutesList = times.map(timeStringToMinutes);
  const sum = minutesList.reduce((acc, curr) => acc + curr, 0);
  const avg = sum / minutesList.length;
  // Round to nearest 5-minute interval
  const rounded = Math.round(avg / 5) * 5;
  return minutesToTimeString(rounded);
}

export interface CompatibilityCheckParams {
  candidateTrip: Trip;
  targetTrip: Trip;
  candidateUser?: User;
  candidatePool?: Pool | null;
}

/**
 * Checks if candidate trip is compatible with target trip
 */
export function isTripCompatible(params: CompatibilityCheckParams): {
  compatible: boolean;
  timeDiffMinutes: number;
  matchScore: number;
} {
  const { candidateTrip, targetTrip, candidatePool } = params;

  // 1. Cannot be the same trip or same user
  if (candidateTrip._id === targetTrip._id) return { compatible: false, timeDiffMinutes: 999, matchScore: 0 };
  if (candidateTrip.userId === targetTrip.userId) return { compatible: false, timeDiffMinutes: 999, matchScore: 0 };

  // 2. Same travel date
  if (candidateTrip.travelDate !== targetTrip.travelDate) {
    return { compatible: false, timeDiffMinutes: 999, matchScore: 0 };
  }

  // 3. Same From and To location IDs
  if (
    candidateTrip.fromLocationId !== targetTrip.fromLocationId ||
    candidateTrip.toLocationId !== targetTrip.toLocationId
  ) {
    return { compatible: false, timeDiffMinutes: 999, matchScore: 0 };
  }

  // 4. Candidate status must be available for pooling
  if (candidateTrip.status === 'COMPLETED' || candidateTrip.status === 'CANCELLED') {
    return { compatible: false, timeDiffMinutes: 999, matchScore: 0 };
  }

  // 5. If already in a pool, check if pool has open capacity
  if (candidatePool) {
    if (candidatePool.status === 'FULL' || candidatePool.status === 'COMPLETED' || candidatePool.status === 'CANCELLED') {
      return { compatible: false, timeDiffMinutes: 999, matchScore: 0 };
    }
    if (candidatePool.memberIds.length >= candidatePool.maxPassengers) {
      return { compatible: false, timeDiffMinutes: 999, matchScore: 0 };
    }
  }

  // 6. Time difference overlap check
  // Target user has flexibility (e.g. 15 mins), candidate has flexibility (e.g. 15 mins)
  // Max permissible gap is max(target.flexibleMinutes, candidate.flexibleMinutes)
  const timeDiffMinutes = calculateTimeDifference(candidateTrip.departureTime, targetTrip.departureTime);
  const maxFlexible = Math.max(targetTrip.flexibleMinutes || 15, candidateTrip.flexibleMinutes || 15);

  if (timeDiffMinutes > maxFlexible) {
    return { compatible: false, timeDiffMinutes, matchScore: 0 };
  }

  const matchScore = calculateMatchScore(timeDiffMinutes);
  return { compatible: true, timeDiffMinutes, matchScore };
}
