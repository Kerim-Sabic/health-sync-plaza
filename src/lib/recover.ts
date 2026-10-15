import { addDays, format } from "date-fns";
import type { SleepLog } from "./types";

/** Calendar-bound, read-only projection. Multiple logs remain distinct in storage. */
export function sleepTimeline(logs: readonly SleepLog[], end: string, days: number) {
  return Array.from({ length: days }, (_, i) => {
    const date = format(addDays(new Date(`${end}T12:00:00`), i - days + 1), "yyyy-MM-dd");
    const entries = logs.filter((log) => log.log_date === date);
    return {
      date,
      entries,
      hours: entries.length
        ? entries.reduce((sum, log) => sum + Number(log.hours), 0) / entries.length
        : null,
      quality: entries.length
        ? entries.reduce((sum, log) => sum + log.quality, 0) / entries.length
        : null,
    };
  });
}

export const BREATH_SECONDS = 128;
export const BREATH_PHASES = ["Inhale", "Hold", "Exhale", "Hold"] as const;
export function breathFrame(elapsed: number) {
  const seconds = Math.max(0, Math.min(BREATH_SECONDS, Math.floor(elapsed)));
  const phase = Math.floor(seconds / 4) % 4;
  return {
    phase,
    name: BREATH_PHASES[phase] ?? "Inhale",
    left: 4 - (seconds % 4),
    rounds: Math.floor(seconds / 16),
    remaining: BREATH_SECONDS - seconds,
    done: seconds === BREATH_SECONDS,
  };
}
export type BreathPattern = {
  id: "box" | "478";
  label: string;
  phases: readonly number[];
  rounds: number;
};
export const BREATH_PATTERNS: readonly BreathPattern[] = [
  { id: "box", label: "Box 4-4-4-4", phases: [4, 4, 4, 4], rounds: 8 },
  { id: "478", label: "Calm 4-7-8", phases: [4, 7, 8, 0], rounds: 6 },
];
export const patternSeconds = (p: BreathPattern) => p.phases.reduce((a, b) => a + b, 0) * p.rounds;

/** Where a breathing session stands after `elapsed` seconds of a pattern. Zero-length phases are skipped. */
export function breathPattern(elapsed: number, p: BreathPattern) {
  const total = patternSeconds(p);
  const t = Math.max(0, Math.min(total, elapsed));
  const cycle = p.phases.reduce((a, b) => a + b, 0);
  const rounds = Math.min(p.rounds, Math.floor(t / cycle));
  if (t >= total)
    return {
      phase: 3,
      name: "Done",
      left: 0,
      rounds: p.rounds,
      remaining: 0,
      done: true,
      phaseLen: 0,
      phaseProgress: 1,
    };
  let inCycle = t - rounds * cycle;
  let phase = 0;
  while (phase < p.phases.length && inCycle >= p.phases[phase]!) inCycle -= p.phases[phase++]!;
  const len = p.phases[phase] ?? 0;
  return {
    phase,
    name: BREATH_PHASES[phase] ?? "Inhale",
    left: Math.max(1, Math.ceil(len - inCycle)),
    rounds,
    remaining: Math.ceil(total - t),
    done: false,
    phaseLen: len,
    phaseProgress: len ? inCycle / len : 1,
  };
}
