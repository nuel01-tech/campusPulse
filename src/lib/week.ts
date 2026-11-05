const DAY_MS = 86_400_000;

/**
 * Teaching week for a date, counting the week containing `semesterStart` as
 * week 1. Returns null when no start date is set. Clamped to 1..52.
 */
export function weekFor(date: Date, semesterStart: string | null): number | null {
  if (!semesterStart) return null;
  const start = new Date(`${semesterStart}T00:00:00`);
  if (Number.isNaN(start.getTime())) return null;
  const days = Math.floor((startOfDay(date).getTime() - start.getTime()) / DAY_MS);
  const week = Math.floor(days / 7) + 1;
  return Math.min(52, Math.max(1, week));
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
