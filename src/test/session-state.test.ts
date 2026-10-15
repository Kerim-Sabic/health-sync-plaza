import { describe, expect, it } from "vitest";
import {
  autoPauseAt,
  durationMin,
  elapsedMs,
  isStale,
  markAllDone,
  pause,
  removeUnfinished,
  restLeft,
  resume,
  searchLifts,
  setsForSave,
  unfinishedCount,
  LIFTS,
} from "@/lib/session-state";

const M = 60_000;
const base = (over = {}) => ({
  startedAt: 0,
  lastActiveAt: 0,
  totalPausedMs: 0,
  pausedAt: null,
  rest: null,
  exercises: [
    {
      name: "Deadlift",
      sets: [
        { kg: 100, reps: 5, done: true, at: 10 * M },
        { kg: 100, reps: 5, done: false },
      ],
    },
  ],
  ...over,
});

describe("pause", () => {
  it("excludes a 1-minute pause from the duration", () => {
    const s = resume(pause(base(), 10 * M), 11 * M);
    expect(elapsedMs(s, 20 * M)).toBe(19 * M);
    expect(durationMin(s, 20 * M)).toBe(19);
  });
  it("freezes the elapsed time while paused", () => {
    const s = pause(base(), 5 * M);
    expect(elapsedMs(s, 30 * M)).toBe(5 * M);
  });
  it("freezes rest while paused and continues it after resume", () => {
    const s = pause(
      base({ rest: { end: 2 * M, total: 90, start: 0.5 * M, ex: "Deadlift" } }),
      1.5 * M,
    );
    expect(restLeft(s, 9 * M)).toBe(0.5 * M);
    expect(restLeft(resume(s, 10 * M), 10 * M)).toBe(0.5 * M);
  });
  it("auto-pauses after 10 minutes without interaction, from the last interaction", () => {
    expect(autoPauseAt(base({ lastActiveAt: 5 * M }), 14 * M)).toBeNull();
    expect(autoPauseAt(base({ lastActiveAt: 5 * M }), 15 * M)).toBe(5 * M);
  });
});

describe("ending", () => {
  it("counts and removes unfinished sets", () => {
    expect(unfinishedCount(base())).toBe(1);
    expect(setsForSave(removeUnfinished(base()))).toHaveLength(1);
  });
  it("mark all done keeps every set", () => {
    expect(unfinishedCount(markAllDone(base(), 20 * M))).toBe(0);
  });
  it("save as is caps duration at the last completed set", () => {
    expect(durationMin(base(), 5 * 3600_000, true)).toBe(10);
  });
  it("warm-up sets are left out of the saved workout (no volume, no records)", () => {
    const s = base({
      exercises: [
        {
          name: "Squat",
          sets: [
            { kg: 60, reps: 5, done: true, type: "warmup" },
            { kg: 100, reps: 5, done: true },
          ],
        },
      ],
    });
    expect(setsForSave(s)).toEqual([{ exercise: "Squat", reps: 5, weight: 100 }]);
  });
  it("a session idle for more than 3 hours is stale", () => {
    expect(isStale(base(), 3 * 3600_000)).toBe(false);
    expect(isStale(base(), 4 * 3600_000)).toBe(true);
  });
});

describe("exercise picker", () => {
  it("ships about 60 built-in lifts", () => {
    const n = Object.values(LIFTS).flat().length;
    expect(n).toBeGreaterThanOrEqual(55);
    expect(n).toBeLessThanOrEqual(70);
  });
  it("puts recent picks and history first", () => {
    expect(searchLifts("press", ["Bench Press"], ["Overhead Press"]).mine).toEqual([
      "Overhead Press",
      "Bench Press",
    ]);
  });
});
