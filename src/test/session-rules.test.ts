import { describe, expect, it } from "vitest";
import { progression, sessionFromTemplate } from "@/components/strata/session";
import { platesFor } from "@/components/strata/session-extras";
import type { Workout } from "@/lib/types";

const w = {
  id: "1",
  user_id: "u",
  title: "Day B",
  performed_at: new Date().toISOString(),
  duration_min: 50,
  rpe: 8,
  notes: null,
  sets: [
    { exercise: "Deadlift", reps: 5, weight: 100 },
    { exercise: "Deadlift", reps: 5, weight: 100 },
  ],
} as unknown as Workout;
const day = { title: "Day B", exercises: [{ name: "Deadlift", sets: 2, reps: "5" }] } as never;

describe("lighter day", () => {
  it("drops prefilled session weights by 10%, rounded to 2.5 kg", () => {
    expect(sessionFromTemplate(day, [w], true).exercises[0]!.sets.map((s) => s.kg)).toEqual([
      90, 90,
    ]);
  });
  it("keeps normal weights when off", () => {
    expect(sessionFromTemplate(day, [w], false).exercises[0]!.sets[0]!.kg).toBe(100);
  });
  it("suggests 90% of last top set, matching the prefill", () => {
    expect(progression([{ reps: 5, weight: 100 }], 5, true)).toMatchObject({
      kg: 90,
      kind: "lighter",
    });
  });
});

describe("progression", () => {
  it("adds 2.5 kg when every target rep was hit", () => {
    expect(
      progression(
        [
          { reps: 5, weight: 70 },
          { reps: 5, weight: 70 },
        ],
        5,
        false,
      ),
    ).toMatchObject({ kg: 72.5, kind: "up" });
  });
  it("holds when reps were missed", () => {
    expect(
      progression(
        [
          { reps: 5, weight: 70 },
          { reps: 3, weight: 70 },
        ],
        5,
        false,
      ),
    ).toMatchObject({ kg: 70, kind: "hold" });
  });
});

describe("plates", () => {
  it("loads 100 kg as 25 + 15 per side on a 20 kg bar", () => {
    expect(platesFor(100).out).toEqual([25, 15]);
  });
});
