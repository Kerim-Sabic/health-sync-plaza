import { describe, expect, it } from "vitest";
import { programDraft, programError, searchPrograms } from "../lib/programs";
import { sessionFromTemplate } from "../components/strata/session";
import type { Program, ProgramDay } from "../lib/types";

const day: ProgramDay = {
  title: "Strength",
  exercises: [
    {
      name: "Squat",
      sets: 3,
      reps: "5",
      weight: 80,
      rest_seconds: 120,
      rpe: 8,
      tempo: "3-1-1",
      notes: "Stay controlled",
    },
  ],
};
describe("coach workout plans", () => {
  it("searches library names, descriptions, days and lifts without changing plans", () => {
    const program: Program = {
      id: "p",
      trainer_id: "coach",
      name: "Strength block",
      description: "Build power",
      weeks: 4,
      days: [day],
    };
    expect(searchPrograms([program], "  BLOCK squat ")).toEqual([program]);
    expect(searchPrograms([program], "power")).toEqual([program]);
    expect(searchPrograms([program], "running")).toEqual([]);
    expect(searchPrograms([program], "")).toEqual([program]);
    expect(program.days[0]?.exercises[0]?.weight).toBe(80);
  });
  it("starts a session with prescribed weights and carries the coach's details", () => {
    const exercise = sessionFromTemplate(day, [], false).exercises[0];
    expect(exercise?.sets.map((set) => set.kg)).toEqual([80, 80, 80]);
    expect(exercise).toMatchObject({
      rest_seconds: 120,
      rpe: 8,
      tempo: "3-1-1",
      notes: "Stay controlled",
    });
  });
  it("applies the saved lighter day to prescribed loads without changing the plan", () => {
    expect(sessionFromTemplate(day, [], true).exercises[0]?.sets[0]?.kg).toBe(72.5);
    expect(day.exercises[0]?.weight).toBe(80);
  });
  it("allows an explicit zero kg target", () => {
    const zero = {
      ...day,
      exercises: [{ ...day.exercises[0], name: "Squat", sets: 3, reps: "5", weight: 0 }],
    };
    expect(sessionFromTemplate(zero, [], false).exercises[0]?.sets[0]?.kg).toBe(0);
  });
  it("isolates edits from the saved plan and preserves all exercise details", () => {
    const original: Program = {
      id: "p",
      trainer_id: "coach",
      name: "Strength",
      description: null,
      weeks: 4,
      days: structuredClone([day]),
    };
    const draft = programDraft(original);
    const ex = draft.days[0]?.exercises[0];
    if (ex) ex.weight = 85;
    expect(original.days[0]?.exercises[0]?.weight).toBe(80);
    expect(ex?.rest_seconds).toBe(120);
    expect(programError(draft)).toBeNull();
  });
  it("rejects incomplete days and out-of-range effort targets", () => {
    expect(programError({ name: "Block", description: "", weeks: 4, days: [] })).not.toBeNull();
    expect(
      programError({
        name: "Block",
        description: "",
        weeks: 4,
        days: [
          {
            ...day,
            exercises: [{ ...day.exercises[0], name: "Squat", sets: 3, reps: "5", rpe: 11 }],
          },
        ],
      }),
    ).not.toBeNull();
  });
});
