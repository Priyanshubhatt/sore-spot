import type { Recovery } from './types';

export type RecoveryLevel = 'low' | 'medium' | 'high';

// Match WHOOP's own published recovery zones exactly: red 0-33%, yellow 34-66%, green 67-100%
// (developer.whoop.com/docs/whoop-101, checked 2026-09-22). This is the one place to change them.
export const RECOVERY_LOW_MAX = 33;
export const RECOVERY_MEDIUM_MAX = 66;

/** How many of the recent recoveries must be low before the week is made lighter. */
export const DELOAD_LOW_COUNT = 3;
export const RECOVERY_WINDOW = 7;

export function recoveryLevel(score: number): RecoveryLevel {
  if (score <= RECOVERY_LOW_MAX) return 'low';
  if (score <= RECOVERY_MEDIUM_MAX) return 'medium';
  return 'high';
}

/** Levels of the most recent scored recoveries created at or before asOf, oldest first. */
export function recentRecoveryLevels(
  recovery: Recovery[],
  asOf: Date,
  count: number = RECOVERY_WINDOW,
): RecoveryLevel[] {
  if (count <= 0) return [];
  return recovery
    .filter((r) => r.score_state === 'SCORED' && r.score && Date.parse(r.created_at) <= asOf.getTime())
    .sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at))
    .slice(-count)
    .map((r) => recoveryLevel(r.score!.recovery_score));
}

/** True when enough of the recent recoveries were low that the week should be lighter. */
export function shouldDeload(levels: RecoveryLevel[]): boolean {
  return levels.filter((l) => l === 'low').length >= DELOAD_LOW_COUNT;
}
