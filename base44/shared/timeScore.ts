/**
 * Time-management score (0-100) measured from the recorded elapsed time against
 * the assessment's own limit — never a model's impression of pacing.
 *
 * - finishing in half the window or less: 100
 * - finishing exactly on the limit: 85
 * - overrunning: drops sharply (1.5x the limit: 55)
 *
 * Returns null when the attempt has no usable timing data.
 */
export function timeManagementScore(usedMinutes: number, allowedMinutes: number): number | null {
  const used = Number(usedMinutes) || 0;
  const allowed = Number(allowedMinutes) || 0;
  if (allowed <= 0 || used <= 0) return null;
  const ratio = used / allowed;
  if (ratio <= 0.5) return 100;
  if (ratio <= 1) return Math.round(100 - (ratio - 0.5) * 30);
  return Math.max(0, Math.round(85 - (ratio - 1) * 60));
}