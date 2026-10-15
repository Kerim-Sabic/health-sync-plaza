import { addDays, format } from "date-fns";
import type { BodyMetric, SleepLog, Workout } from "./types";
import { dayOf, volume } from "./stats";

export type WeightRange = "1M" | "3M" | "6M" | "1Y" | "All";
const RANGE_DAYS: Record<Exclude<WeightRange, "All">, number> = {
  "1M": 31,
  "3M": 92,
  "6M": 183,
  "1Y": 366,
};
/** Derived points only; never mutate, deduplicate, or write recorded weigh-ins. */
export function weightPoints(
  metrics: readonly BodyMetric[],
  range: WeightRange = "All",
  now = Date.now(),
) {
  const points = metrics
    .flatMap((metric) =>
      metric.weight == null
        ? []
        : [
            {
              id: metric.id,
              date: metric.log_date,
              t: new Date(`${metric.log_date}T12:00`).getTime(),
              v: Number(metric.weight),
            },
          ],
    )
    .sort((a, b) => a.t - b.t);
  const cutoff = range === "All" ? 0 : now - RANGE_DAYS[range] * 86400000;
  return points
    .map((point) => {
      const window = points.filter(
        (other) => other.t <= point.t && other.t > point.t - 7 * 86400000,
      );
      return {
        ...point,
        avg: Number((window.reduce((sum, other) => sum + other.v, 0) / window.length).toFixed(1)),
      };
    })
    .filter((point) => point.t >= cutoff && point.t <= now);
}
export function weeklyRecap(workouts: readonly Workout[], sleep: readonly SleepLog[], end: string) {
  const start = format(addDays(new Date(`${end}T12:00`), -6), "yyyy-MM-dd");
  const sessions = workouts.filter(
    (workout) => dayOf(workout.performed_at) >= start && dayOf(workout.performed_at) <= end,
  );
  const nights = sleep.filter((night) => night.log_date >= start && night.log_date <= end);
  return {
    start,
    end,
    sessions: sessions.length,
    minutes: sessions.reduce((sum, workout) => sum + (workout.duration_min ?? 0), 0),
    volume: sessions.reduce((sum, workout) => sum + volume(workout), 0),
    sleep: nights.length
      ? Number(
          (nights.reduce((sum, night) => sum + Number(night.hours), 0) / nights.length).toFixed(1),
        )
      : null,
  };
}
export function progressMilestones(workouts: readonly Workout[], metrics: readonly BodyMetric[]) {
  return [
    { name: "First session", detail: "One workout recorded", earned: workouts.length >= 1 },
    { name: "Building momentum", detail: "10 workouts recorded", earned: workouts.length >= 10 },
    { name: "Showing up", detail: "25 workouts recorded", earned: workouts.length >= 25 },
    {
      name: "Tracking the trend",
      detail: "5 weigh-ins recorded",
      earned: metrics.filter((metric) => metric.weight != null).length >= 5,
    },
  ];
}
