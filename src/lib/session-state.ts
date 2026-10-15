/** Pure lifecycle helpers for the live workout session (no React, no storage). */
import type { Program, Workout } from "./types";

export type SetType = "warmup" | "working" | "drop" | "failure";
export type LSet = {
  kg: number;
  reps: number;
  done: boolean;
  pr?: boolean;
  type?: SetType;
  note?: string;
  at?: number;
};
export type LEx = {
  name: string;
  sets: LSet[];
  skipped?: boolean;
  note?: string;
  rest_seconds?: number | null | undefined;
};
export type RestState = { end: number; total: number; start: number; ex: string; left?: number };
export type Lifecycle = {
  startedAt: number;
  pausedAt?: number | null | undefined;
  totalPausedMs?: number | undefined;
  lastActiveAt?: number | undefined;
  rest?: RestState | null | undefined;
  exercises: LEx[];
};

export const AUTO_PAUSE_MS = 10 * 60_000;
export const STALE_MS = 3 * 3600_000;

export const isPaused = (s: Lifecycle) => s.pausedAt != null;

/** Active training time: wall time minus every pause (an ongoing pause counts up to pausedAt). */
export function elapsedMs(s: Lifecycle, now: number) {
  const end = s.pausedAt ?? now;
  return Math.max(0, end - s.startedAt - (s.totalPausedMs ?? 0));
}

export function pause<T extends Lifecycle>(s: T, at: number): T {
  if (isPaused(s)) return s;
  const rest = s.rest ? { ...s.rest, left: Math.max(0, s.rest.end - at) } : s.rest;
  return { ...s, pausedAt: at, rest };
}

export function resume<T extends Lifecycle>(s: T, now: number): T {
  if (s.pausedAt == null) return s;
  const rest = s.rest
    ? {
        ...s.rest,
        end: now + (s.rest.left ?? Math.max(0, s.rest.end - s.pausedAt)),
        left: undefined,
      }
    : s.rest;
  return {
    ...s,
    pausedAt: null,
    totalPausedMs: (s.totalPausedMs ?? 0) + (now - s.pausedAt),
    lastActiveAt: now,
    rest,
  };
}

/** Rest remaining; frozen while paused. */
export function restLeft(s: Lifecycle, now: number) {
  if (!s.rest) return 0;
  if (isPaused(s)) return s.rest.left ?? Math.max(0, s.rest.end - (s.pausedAt ?? now));
  return Math.max(0, s.rest.end - now);
}

/** Idle with no interaction long enough to auto-pause. Returns the pause moment (last activity). */
export function autoPauseAt(s: Lifecycle, now: number) {
  if (isPaused(s)) return null;
  const last = s.lastActiveAt ?? s.startedAt;
  return now - last >= AUTO_PAUSE_MS ? last : null;
}

export const lastActivity = (s: Lifecycle) =>
  Math.max(s.lastActiveAt ?? 0, s.pausedAt ?? 0, lastSetAt(s) ?? 0, s.startedAt);
export const isStale = (s: Lifecycle, now: number) => now - lastActivity(s) > STALE_MS;

export function lastSetAt(s: Lifecycle) {
  const t = s.exercises.flatMap((e) => e.sets.filter((x) => x.done && x.at).map((x) => x.at!));
  return t.length ? Math.max(...t) : null;
}

/** Duration in whole minutes, ≥1. With capAtLastSet, time after the last completed set is dropped. */
export function durationMin(s: Lifecycle, now: number, capAtLastSet = false) {
  let at = now;
  if (capAtLastSet) at = Math.min(now, lastSetAt(s) ?? s.startedAt);
  const paused = s.pausedAt != null && s.pausedAt < at ? { ...s } : { ...s, pausedAt: null };
  return Math.max(1, Math.round(elapsedMs(paused as Lifecycle, at) / 60000));
}

const live = (s: Lifecycle) => s.exercises.filter((e) => !e.skipped);
export const doneCount = (s: Lifecycle) =>
  live(s).reduce((a, e) => a + e.sets.filter((x) => x.done).length, 0);
export const unfinishedCount = (s: Lifecycle) =>
  live(s).reduce((a, e) => a + e.sets.filter((x) => !x.done).length, 0);

export function markAllDone<T extends Lifecycle>(s: T, now: number): T {
  return {
    ...s,
    exercises: s.exercises.map((e) =>
      e.skipped
        ? e
        : { ...e, sets: e.sets.map((x) => (x.done ? x : { ...x, done: true, at: now })) },
    ),
  };
}
export function removeUnfinished<T extends Lifecycle>(s: T): T {
  return {
    ...s,
    exercises: s.exercises
      .map((e) => ({ ...e, sets: e.sets.filter((x) => x.done) }))
      .filter((e) => e.sets.length > 0),
  };
}

/** Sets that count toward volume and PRs: done, not warm-up, exercise not skipped. */
export const countsForStats = (x: LSet) => x.done && x.type !== "warmup";

export function setsForSave(s: Lifecycle) {
  // Saved workouts have no set-type column, so warm-ups stay out of history to keep volume and records clean.
  return live(s).flatMap((e) =>
    e.sets.filter(countsForStats).map((x) => ({ exercise: e.name, reps: x.reps, weight: x.kg })),
  );
}

/** Rebuild a reviewable session from a saved workout. */
export function sessionFromWorkout(w: Workout) {
  const by = new Map<string, LSet[]>();
  for (const s of w.sets) {
    if (!by.has(s.exercise)) by.set(s.exercise, []);
    by.get(s.exercise)!.push({ kg: s.weight, reps: s.reps, done: true });
  }
  const start = new Date(w.performed_at).getTime();
  return {
    title: w.title,
    startedAt: start,
    pausedAt: start + (w.duration_min ?? 1) * 60000,
    totalPausedMs: 0,
    exercises: [...by].map(([name, sets]) => ({ name, sets })),
    editingId: w.id,
    performedAt: w.performed_at,
    rpe: w.rpe ?? 7,
  };
}

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
/** Next program day after what's been done this week, and a suggested weekday (2 days after the last session). */
export function nextProgramDay(p: Program, done: boolean[], lastAt: string | null) {
  const idx = done.findIndex((x) => !x);
  if (idx < 0) return null;
  const base = lastAt ? new Date(lastAt) : new Date();
  const d = new Date(base.getTime() + (lastAt ? 2 : 0) * 86400000);
  return { index: idx, title: p.days[idx]!.title, weekday: DOW[d.getDay()]! };
}

export const SET_TYPES: { type: SetType; label: string; short: string }[] = [
  { type: "warmup", label: "Warm-up", short: "W" },
  { type: "working", label: "Working", short: "" },
  { type: "drop", label: "Drop set", short: "D" },
  { type: "failure", label: "Failure", short: "F" },
];

export const LIFTS: Record<string, string[]> = {
  Chest: [
    "Bench Press",
    "Incline Bench Press",
    "Dumbbell Bench Press",
    "Incline Dumbbell Press",
    "Chest Fly",
    "Cable Crossover",
    "Push-up",
    "Dips",
    "Machine Chest Press",
  ],
  Back: [
    "Deadlift",
    "Barbell Row",
    "Pull-up",
    "Chin-up",
    "Lat Pulldown",
    "Seated Cable Row",
    "Dumbbell Row",
    "T-Bar Row",
    "Face Pull",
    "Rack Pull",
  ],
  Legs: [
    "Back Squat",
    "Front Squat",
    "Romanian Deadlift",
    "Leg Press",
    "Bulgarian Split Squat",
    "Walking Lunge",
    "Leg Extension",
    "Leg Curl",
    "Hip Thrust",
    "Goblet Squat",
    "Calf Raise",
    "Hack Squat",
  ],
  Shoulders: [
    "Overhead Press",
    "Dumbbell Shoulder Press",
    "Lateral Raise",
    "Rear Delt Fly",
    "Arnold Press",
    "Upright Row",
    "Shrug",
  ],
  Arms: [
    "Barbell Curl",
    "Dumbbell Curl",
    "Hammer Curl",
    "Preacher Curl",
    "Tricep Pushdown",
    "Skull Crusher",
    "Overhead Tricep Extension",
    "Close-Grip Bench Press",
    "Cable Curl",
  ],
  Core: [
    "Plank",
    "Hanging Leg Raise",
    "Cable Crunch",
    "Ab Wheel",
    "Russian Twist",
    "Pallof Press",
    "Side Plank",
  ],
  "Full body": [
    "Power Clean",
    "Kettlebell Swing",
    "Farmer's Carry",
    "Thruster",
    "Burpee",
    "Clean and Jerk",
    "Snatch",
  ],
};

/** Search built-in lifts plus user history; history and recent picks first. */
export function searchLifts(q: string, history: string[], recent: string[]) {
  const n = q.trim().toLowerCase();
  const m = (x: string) => !n || x.toLowerCase().includes(n);
  const mine = [...new Set([...recent, ...history])].filter(m);
  const groups = Object.entries(LIFTS)
    .map(([g, xs]) => [g, xs.filter((x) => m(x) && !mine.includes(x))] as const)
    .filter(([, xs]) => xs.length);
  return { mine, groups };
}
