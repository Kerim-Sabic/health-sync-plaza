import { describe, it, expect } from "vitest";
import { weightPoints, weeklyRecap } from "../lib/progress";
import type { BodyMetric, Workout } from "../lib/types";

describe("Progress preservation", () => {
  it("preserves duplicate dates, weight history and body fat while deriving averages", () => {
    const metrics: BodyMetric[] = [
      { id: "a", user_id: "u", log_date: "2026-10-14", weight: 80, body_fat: 20 },
      { id: "b", user_id: "u", log_date: "2026-10-14", weight: 82, body_fat: null },
      { id: "c", user_id: "u", log_date: "2026-10-10", weight: 78, body_fat: 19 },
    ];
    const before = structuredClone(metrics);
    const points = weightPoints(metrics, "All", new Date("2026-10-15T12:00").getTime());
    expect(points.map((point) => point.id)).toEqual(["c", "a", "b"]);
    expect(points[2]?.avg).toBe(80);
    expect(metrics).toEqual(before);
  });
  it("bounds recaps to the displayed week without changing recorded workouts", () => {
    const base: Workout = {
      id: "a",
      user_id: "u",
      title: "Day",
      performed_at: "2026-10-14T12:00",
      duration_min: 45,
      rpe: 8,
      notes: null,
      sets: [{ exercise: "Squat", reps: 5, weight: 80 }],
    };
    const workouts = [base, { ...base, id: "old", performed_at: "2026-10-07T12:00" }];
    expect(weeklyRecap(workouts, [], "2026-10-14")).toMatchObject({
      sessions: 1,
      minutes: 45,
      volume: 400,
      sleep: null,
    });
    expect(workouts).toHaveLength(2);
    expect(base.sets[0]?.weight).toBe(80);
  });
});
