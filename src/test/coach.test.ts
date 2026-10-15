import { describe, expect, it } from "vitest";
import { clientAttention, COMPLIANCE_TARGET, recentRecords, type CoachClient } from "../lib/coach";
import type { Workout } from "../lib/types";

const base: CoachClient = {
  id: "c",
  display_name: "Client",
  goal: null,
  workouts: [],
  sleep: [],
  journal: [],
};
describe("Coach read-only projections", () => {
  it("preserves the existing 16-session compliance target", () => {
    expect(COMPLIANCE_TARGET).toBe(16);
  });
  it("preserves inactivity flags without changing source records", () => {
    const before = structuredClone(base);
    expect(clientAttention(base)).toHaveLength(1);
    expect(base).toEqual(before);
  });
  it("retains the existing low mood and sleep thresholds", () => {
    const row: CoachClient = {
      ...base,
      journal: [
        {
          id: "j",
          user_id: "c",
          created_at: new Date().toISOString(),
          mood: 2,
          energy: 3,
          body: null,
        },
      ],
      sleep: [{ id: "s", user_id: "c", log_date: "2026-10-14", hours: 6, quality: 3 }],
    };
    expect(clientAttention(row)).toHaveLength(3);
    expect(
      clientAttention({
        ...row,
        journal: [
          {
            ...row.journal[0],
            id: "j",
            user_id: "c",
            created_at: new Date().toISOString(),
            mood: 3,
            energy: 3,
            body: null,
          },
        ],
        sleep: [{ id: "s", user_id: "c", log_date: "2026-10-14", hours: 6.5, quality: 3 }],
      }),
    ).toHaveLength(1);
  });
  it("finds new records from the last week without touching the logs", () => {
    const now = new Date("2026-10-15T12:00").getTime();
    const w = (id: string, day: string, weight: number): Workout => ({
      id,
      user_id: "c",
      title: "A",
      performed_at: `${day}T10:00:00Z`,
      duration_min: 40,
      rpe: 7,
      notes: null,
      sets: [{ exercise: "Squat", reps: 5, weight }],
    });
    const logs = [w("1", "2026-09-20", 80), w("2", "2026-10-13", 85), w("3", "2026-10-14", 82.5)];
    const before = structuredClone(logs);
    expect(recentRecords(logs, 7, now)).toEqual([
      { exercise: "Squat", weight: 85, reps: 5, at: "2026-10-13T10:00:00Z" },
    ]);
    expect(recentRecords([w("x", "2026-10-14", 60)], 7, now)).toEqual([]);
    expect(logs).toEqual(before);
  });
});
