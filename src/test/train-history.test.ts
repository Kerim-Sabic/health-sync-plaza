import { describe, expect, it } from "vitest";
import { exerciseHistory } from "@/lib/train-history";
import type { Workout } from "@/lib/types";

const session = (id: string, weight: number, reps: number): Workout => ({
  id,
  user_id: "client",
  title: "Day B",
  performed_at: `2026-10-${id}T12:00:00Z`,
  duration_min: 45,
  rpe: null,
  notes: null,
  sets: [{ exercise: "Deadlift", weight, reps }],
});
describe("Train strength history", () => {
  it("shows estimated max from reps, not simply logged weight", () => {
    expect(exerciseHistory("Deadlift", [session("01", 100, 5)])[0]?.estimate).toBe(117);
  });
  it("marks new records chronologically, but not ties or the baseline", () => {
    const history = exerciseHistory("Deadlift", [
      session("03", 110, 5),
      session("01", 100, 5),
      session("02", 110, 5),
    ]);
    expect(history.map(({ record }) => record)).toEqual([false, true, false]);
  });
  it("omits bodyweight and zero-rep sets from estimated weighted max", () => {
    expect(exerciseHistory("Deadlift", [session("01", 0, 5), session("02", 100, 0)])).toEqual([]);
  });
});
