import { describe, expect, it } from "vitest";
import {
  BREATH_PATTERNS,
  breathFrame,
  breathPattern,
  patternSeconds,
  sleepTimeline,
} from "../lib/recover";
import type { SleepLog } from "../lib/types";

describe("Recover read-only views", () => {
  it("preserves every sleep record while projecting calendar gaps and multiple logs", () => {
    const logs: SleepLog[] = [
      { id: "a", user_id: "u", log_date: "2026-10-14", hours: 7, quality: 3 },
      { id: "b", user_id: "u", log_date: "2026-10-14", hours: 9, quality: 5 },
      { id: "c", user_id: "u", log_date: "2026-10-12", hours: 6, quality: 2 },
    ];
    const before = structuredClone(logs);
    const result = sleepTimeline(logs, "2026-10-14", 3);
    expect(result.map((day) => day.hours)).toEqual([6, null, 8]);
    expect(result[2]?.entries.map((entry) => entry.id)).toEqual(["a", "b"]);
    expect(logs).toEqual(before);
  });
  it("keeps out-of-range records unchanged and outside the displayed period", () => {
    const logs: SleepLog[] = [
      { id: "old", user_id: "u", log_date: "2026-09-01", hours: 8, quality: 4 },
    ];
    expect(sleepTimeline(logs, "2026-10-14", 7).every((day) => day.hours === null)).toBe(true);
    expect(logs[0]?.hours).toBe(8);
  });
  it("advances four-second phases and completes eight full breathing rounds", () => {
    expect(breathFrame(0)).toMatchObject({ name: "Inhale", left: 4, remaining: 128 });
    expect(breathFrame(4)).toMatchObject({ name: "Hold", left: 4 });
    expect(breathFrame(8)).toMatchObject({ name: "Exhale", left: 4 });
    expect(breathFrame(16)).toMatchObject({ name: "Inhale", rounds: 1 });
    expect(breathFrame(128)).toMatchObject({ done: true, rounds: 8, remaining: 0 });
  });
  it("follows the 4-7-8 pattern and skips its empty fourth phase", () => {
    const calm = BREATH_PATTERNS.find((p) => p.id === "478")!;
    expect(patternSeconds(calm)).toBe(114);
    expect(breathPattern(0, calm)).toMatchObject({ name: "Inhale", left: 4, rounds: 0 });
    expect(breathPattern(4, calm)).toMatchObject({ name: "Hold", left: 7 });
    expect(breathPattern(11, calm)).toMatchObject({ name: "Exhale", left: 8 });
    expect(breathPattern(19, calm)).toMatchObject({ name: "Inhale", rounds: 1 });
    expect(breathPattern(114, calm)).toMatchObject({ done: true, rounds: 6, remaining: 0 });
  });
  it("matches the original box timing", () => {
    const box = BREATH_PATTERNS.find((p) => p.id === "box")!;
    for (const t of [0, 3.5, 4, 9, 16, 127])
      expect(breathPattern(t, box).name).toBe(breathFrame(t).name);
  });
});
