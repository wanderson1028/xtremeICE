export function formatDuration(minutes) {
  const total = Math.round(Number(minutes) || 0);
  if (total <= 0) return "—";
  const hours = Math.floor(total / 60);
  const mins = total % 60;
  if (hours && mins) return `${hours}h ${mins}m`;
  if (hours) return `${hours}h`;
  return `${mins}m`;
}

/* Time the candidate actually took: the recorded elapsed minutes, falling back
   to the start → submit timestamps for sessions saved without a tally. */
export function completionMinutes(session) {
  if (!session) return 0;
  const recorded = Number(session.time_elapsed_minutes) || 0;
  if (recorded > 0) return recorded;
  if (session.started_at && session.submitted_at) {
    const diff = (new Date(session.submitted_at).getTime() - new Date(session.started_at).getTime()) / 60000;
    if (Number.isFinite(diff) && diff > 0) return Math.round(diff);
  }
  return 0;
}

export function isFinished(invitation, session) {
  return ["submitted", "evaluated"].includes(session?.status) || ["completed", "evaluated"].includes(invitation?.status);
}