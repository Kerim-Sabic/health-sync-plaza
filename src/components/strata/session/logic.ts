import { useEffect, useRef, useState } from "react";
import type { ProgramDay, Workout } from "@/lib/types";
import type { LiveSessionState, SEx, SSet } from "../shell";
import { durationMin, setsForSave } from "@/lib/session-state";
import { isLighterToday, roundPlate } from "../session-extras";
import { feedback } from "@/lib/feedback";

export function useNow(active = true) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [active]);
  return now;
}

export const clock = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000 - 0.001));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
};
export const elapsedClock = (ms: number) => clock(Math.floor(ms / 1000) * 1000);

export function history(workouts: Workout[]) {
  const last = new Map<string, { reps: number; weight: number }[]>();
  const best = new Map<string, number>();
  for (const w of workouts) {
    const by = new Map<string, { reps: number; weight: number }[]>();
    for (const s of w.sets) {
      if (!by.has(s.exercise)) by.set(s.exercise, []);
      by.get(s.exercise)!.push(s);
      if (s.weight > (best.get(s.exercise) ?? 0)) best.set(s.exercise, s.weight);
    }
    for (const [k, v] of by) if (!last.has(k)) last.set(k, v);
  }
  return { last, best };
}

/** Next suggested load from last time: all target reps hit → +2.5 kg, else hold. Lighter day → 90%, rounded to 2.5 kg. */
export function progression(
  prev: { reps: number; weight: number }[] | undefined,
  targetReps: number,
  lighter: boolean,
) {
  if (!prev?.length) return null;
  const top = Math.max(...prev.map((p) => p.weight));
  const hit = prev.every((p) => p.reps >= targetReps);
  const base = hit ? top + 2.5 : top;
  const kg = lighter ? roundPlate(top * 0.9) : base;
  return {
    kg,
    reps: targetReps,
    kind: lighter ? ("lighter" as const) : hit ? ("up" as const) : ("hold" as const),
  };
}

export function sessionFromTemplate(
  t: ProgramDay | undefined,
  workouts: Workout[],
  lighter = isLighterToday(),
): LiveSessionState {
  const { last } = history(workouts);
  return {
    title: t?.title ?? "Quick session",
    startedAt: Date.now(),
    lastActiveAt: Date.now(),
    totalPausedMs: 0,
    pausedAt: null,
    rest: null,
    lighter,
    exercises: (t?.exercises ?? []).map((e) => {
      const prev = last.get(e.name);
      const n = Math.max(1, Math.min(e.sets, 8));
      const reps = parseInt(e.reps) || prev?.[0]?.reps || 8;
      return {
        name: e.name,
        targetWeight: e.weight,
        rest_seconds: e.rest_seconds,
        rpe: e.rpe,
        tempo: e.tempo,
        notes: e.notes,
        sets: Array.from({ length: n }, (_, i) => {
          const kg = e.weight ?? prev?.[i]?.weight ?? prev?.[0]?.weight ?? 0;
          return { kg: lighter ? roundPlate(kg * 0.9) : kg, reps, done: false };
        }),
      };
    }),
  };
}

/** Insert payload for a session. capAtLastSet: duration ends at the last completed set. */
export function toWorkoutRow(
  s: LiveSessionState,
  now: number,
  rpe = s.rpe ?? 7,
  capAtLastSet = false,
): Partial<Workout> {
  return {
    title: s.title,
    duration_min: durationMin(s, now, capAtLastSet),
    rpe,
    sets: setsForSave(s),
    ...(s.coachNote?.trim() ? { notes: s.coachNote.trim() } : {}),
    ...(s.performedAt ? { performed_at: s.performedAt } : {}),
  };
}

export const rpeAnchors: Record<number, string> = {
  1: "Barely moving",
  2: "Very easy",
  3: "Easy",
  4: "Comfortable",
  5: "Moderate",
  6: "Could do 4 more reps",
  7: "Could do 3 more reps",
  8: "Could do 2 more reps",
  9: "Could do 1 more rep",
  10: "Max effort",
};

export const patchEx = (s: LiveSessionState, e: number, fn: (x: SEx) => SEx): LiveSessionState => ({
  ...s,
  exercises: s.exercises.map((x, i) => (i === e ? fn(x) : x)),
});
export const patchSet = (s: LiveSessionState, e: number, j: number, p: Partial<SSet>) =>
  patchEx(s, e, (x) => ({ ...x, sets: x.sets.map((y, k) => (k === j ? { ...y, ...p } : y)) }));

/** Hold-to-repeat that accelerates the longer you hold. Keyboard click fires once. */
export function useRepeat(fn: () => void) {
  const f = useRef(fn);
  f.current = fn;
  const t = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stop = () => {
    if (t.current) clearTimeout(t.current);
    t.current = null;
  };
  useEffect(() => stop, []);
  const run = (delay: number, n: number) => {
    t.current = setTimeout(() => {
      f.current();
      run(Math.max(40, delay * 0.82), n + 1);
    }, delay);
  };
  return {
    onPointerDown: () => {
      stop();
      f.current();
      t.current = setTimeout(() => run(110, 0), 420);
    },
    onPointerUp: stop,
    onPointerLeave: stop,
    onPointerCancel: stop,
    onClick: (e: React.MouseEvent) => e.detail === 0 && f.current(),
  };
}

/** Long press; returns handlers and a ref telling the click handler to ignore the release. */
export function useLongPress(fn: () => void, ms = 480) {
  const t = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fired = useRef(false);
  const clear = () => t.current && clearTimeout(t.current);
  return {
    fired,
    handlers: {
      onPointerDown: () => {
        fired.current = false;
        clear();
        t.current = setTimeout(() => ((fired.current = true), feedback.impactMedium(), fn()), ms);
      },
      onPointerUp: clear,
      onPointerLeave: clear,
      onPointerCancel: clear,
      onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
    },
  };
}

export function usePrefList(key: string): [string[], (v: string) => void] {
  const [v, setV] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(key) ?? "[]");
    } catch {
      return [];
    }
  });
  return [
    v,
    (x) => {
      const n = [x, ...v.filter((y) => y !== x)].slice(0, 8);
      setV(n);
      try {
        localStorage.setItem(key, JSON.stringify(n));
      } catch {
        /* recent lifts are a convenience only */
      }
    },
  ];
}
