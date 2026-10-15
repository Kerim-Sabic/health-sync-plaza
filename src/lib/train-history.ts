import { est1RM } from "@/components/strata/session-extras";
import type { Workout } from "@/lib/types";

/** Read-only projections of logged sessions; never modify saved sets. */
export function exerciseHistory(name: string, workouts: Workout[]) {
  let previousBest = 0;
  return [...workouts]
    .sort((a, b) => a.performed_at.localeCompare(b.performed_at))
    .flatMap((workout) => {
      const sets = workout.sets.filter(
        (set) => set.exercise === name && set.weight > 0 && set.reps > 0,
      );
      const bestSet = sets.reduce<(typeof sets)[number] | undefined>(
        (best, set) =>
          !best || est1RM(set.weight, set.reps) > est1RM(best.weight, best.reps) ? set : best,
        undefined,
      );
      if (!bestSet) return [];
      const estimate = est1RM(bestSet.weight, bestSet.reps);
      const record = previousBest > 0 && estimate > previousBest;
      previousBest = Math.max(previousBest, estimate);
      return [
        {
          id: workout.id,
          date: workout.performed_at,
          estimate,
          record,
          weight: bestSet.weight,
          reps: bestSet.reps,
          sets: sets.length,
        },
      ];
    });
}
