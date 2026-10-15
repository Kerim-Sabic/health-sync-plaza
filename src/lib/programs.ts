import type { Program, ProgramDay, ProgramExercise } from "./types";

export type ProgramDraft = Omit<Program, "id" | "trainer_id">;
export const blankExercise = (): ProgramExercise => ({ name: "", sets: 3, reps: "8" });
export const blankDay = (number: number): ProgramDay => ({
  title: `Day ${number}`,
  exercises: [blankExercise()],
});
export function searchPrograms(programs: Program[], query: string): Program[] {
  const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return programs.filter((program) => {
    const text = [
      program.name,
      program.description ?? "",
      ...program.days.flatMap((day) => [
        day.title,
        ...day.exercises.map((exercise) => exercise.name),
      ]),
    ]
      .join(" ")
      .toLocaleLowerCase();
    return terms.every((term) => text.includes(term));
  });
}
export function programDraft(program?: Program): ProgramDraft {
  return program
    ? structuredClone({
        name: program.name,
        description: program.description,
        weeks: program.weeks,
        days: program.days,
      })
    : { name: "", description: "", weeks: 4, days: [blankDay(1)] };
}
export function programError(draft: ProgramDraft): string | null {
  if (!draft.name.trim()) return "Give your program a name.";
  if (!Number.isInteger(draft.weeks) || draft.weeks < 1)
    return "Enter a whole number of weeks, at least 1.";
  if (!draft.days.length) return "Add at least one training day.";
  for (const day of draft.days) {
    if (!day.title.trim() || !day.exercises.length)
      return "Each day needs a name and at least one exercise.";
    for (const exercise of day.exercises) {
      if (!exercise.name.trim() || !exercise.reps.trim())
        return "Give every exercise a name and rep target.";
      if (!Number.isInteger(exercise.sets) || exercise.sets < 1 || exercise.sets > 8)
        return "Use 1–8 sets per exercise.";
      if (exercise.weight != null && (!Number.isFinite(exercise.weight) || exercise.weight < 0))
        return "Weight must be 0 kg or more. Leave blank to use previous weights.";
      if (
        exercise.rest_seconds != null &&
        (!Number.isInteger(exercise.rest_seconds) || exercise.rest_seconds < 0)
      )
        return "Rest must be a whole number of seconds, 0 or more.";
      if (
        exercise.rpe != null &&
        (!Number.isInteger(exercise.rpe) || exercise.rpe < 1 || exercise.rpe > 10)
      )
        return "Effort must be an RPE from 1 to 10.";
    }
  }
  return null;
}
