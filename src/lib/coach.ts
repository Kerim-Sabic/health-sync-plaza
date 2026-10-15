import { avg, within } from "./stats";
import type { JournalEntry, Person, SleepLog, Workout } from "./types";

export type CoachClient = Person & {
  workouts: Workout[];
  journal: JournalEntry[];
  sleep: SleepLog[];
};
export const COMPLIANCE_TARGET = 16;

/** Presentation-only: retain the existing 30-day target and alert thresholds. */
export function clientAttention(r: CoachClient): string[] {
  const reasons: string[] = [];
  const last = r.workouts[0];
  if (!last || !within(last.performed_at, 5))
    reasons.push(
      last
        ? `No session in ${Math.floor((Date.now() - new Date(last.performed_at).getTime()) / 86400000)} days`
        : "No sessions logged",
    );
  const mood = avg(r.journal.slice(0, 3).map((j) => j.mood));
  if (mood && mood < 3) reasons.push(`Mood ${mood.toFixed(1)}/5 · last 3 check-ins`);
  const sleep = avg(r.sleep.slice(0, 3).map((s) => +s.hours));
  if (sleep && sleep < 6.5) reasons.push(`Sleep ${sleep.toFixed(1)} h · last 3 nights`);
  return reasons;
}

export function kudosDraft(name: string | null, workout?: { title: string }): string {
  const first = (name ?? "").split(" ")[0];
  return workout
    ? `Strong work${first ? `, ${first}` : ""}. ${workout.title} is in the books — keep building.`
    : `Keep going${first ? `, ${first}` : ""}. Every step counts.`;
}
/** Heaviest new records in the last `days` days, compared with everything logged before them. Read-only. */
export function recentRecords(workouts: readonly Workout[], days = 7, now = Date.now()) {
  const cutoff = now - days * 86400000;
  const before = new Map<string, number>();
  const out = new Map<string, { exercise: string; weight: number; reps: number; at: string }>();
  for (const w of [...workouts].sort((a, b) => a.performed_at.localeCompare(b.performed_at))) {
    const recent = new Date(w.performed_at).getTime() >= cutoff;
    for (const s of w.sets) {
      const prev = before.get(s.exercise) ?? 0;
      if (recent && prev > 0 && s.weight > prev && s.weight > (out.get(s.exercise)?.weight ?? 0))
        out.set(s.exercise, {
          exercise: s.exercise,
          weight: s.weight,
          reps: s.reps,
          at: w.performed_at,
        });
      if (s.weight > prev) before.set(s.exercise, s.weight);
    }
  }
  return [...out.values()].sort((a, b) => b.at.localeCompare(a.at));
}
