import type { FoodLog, SleepLog, Workout } from "./types";

export const iso = (d: Date) => {
  const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return z.toISOString().slice(0, 10);
};
export const today = () => iso(new Date());
export const lastNDays = (n: number) =>
  Array.from({ length: n }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (n - 1 - i));
    return iso(d);
  });
export const dayOf = (ts: string) => iso(new Date(ts));
export const volume = (w: Workout) => w.sets.reduce((a, s) => a + s.reps * s.weight, 0);
export const within = (ts: string, days: number) =>
  Date.now() - new Date(ts).getTime() < days * 86400000;

export function streak(workouts: Workout[]) {
  const days = new Set(workouts.map((w) => dayOf(w.performed_at)));
  let n = 0;
  const d = new Date();
  if (!days.has(iso(d))) d.setDate(d.getDate() - 1);
  // allow one rest day gap
  let gaps = 0;
  while (gaps < 2) {
    if (days.has(iso(d))) {
      n++;
      gaps = 0;
    } else gaps++;
    d.setDate(d.getDate() - 1);
    if (n > 365) break;
  }
  return n;
}

export function macrosFor(foods: FoodLog[], date: string) {
  const f = foods.filter((x) => x.log_date === date);
  return f.reduce(
    (a, x) => ({
      calories: a.calories + x.calories,
      protein: a.protein + x.protein,
      carbs: a.carbs + x.carbs,
      fat: a.fat + x.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );
}

export const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

export function readiness(sleep: SleepLog[], workouts: Workout[]) {
  const last = sleep.slice(0, 3);
  const s = avg(last.map((x) => Math.min(x.hours / 8, 1) * 0.7 + (x.quality / 5) * 0.3));
  const load = workouts
    .filter((w) => within(w.performed_at, 2))
    .reduce((a, w) => a + (w.rpe ?? 6), 0);
  return Math.max(20, Math.min(99, Math.round(s * 100 - Math.max(0, load - 14) * 2)));
}

export const fmtK = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${Math.round(n)}`);
export const firstName = (n?: string | null) => (n ?? "there").split(" ")[0];
export const initials = (n?: string | null) =>
  (n ?? "?")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

/** "39.2 t" above a tonne, "850 kg" below. Returns value + unit separately for <Stat>. */
export function fmtVolume(kg: number): { value: string; unit: string } {
  if (kg >= 1000) return { value: (kg / 1000).toFixed(1), unit: "t" };
  return { value: `${Math.round(kg)}`, unit: "kg" };
}
export const volumeText = (kg: number) => {
  const v = fmtVolume(kg);
  return `${v.value} ${v.unit}`;
};
export const isCardio = (w: Workout) => volume(w) === 0;

export function readinessParts(sleep: SleepLog[], workouts: Workout[], moods: number[]) {
  const last = sleep.slice(0, 3);
  const sleepScore = Math.round(
    avg(last.map((x) => Math.min(x.hours / 8, 1) * 0.7 + (x.quality / 5) * 0.3)) * 100,
  );
  const load = workouts
    .filter((w) => within(w.performed_at, 2))
    .reduce((a, w) => a + (w.rpe ?? 6), 0);
  const mood = moods.length ? +avg(moods.slice(0, 3)).toFixed(1) : null;
  return {
    sleepScore,
    sleepHours: +avg(last.map((x) => +x.hours)).toFixed(1),
    load,
    sessions48h: workouts.filter((w) => within(w.performed_at, 2)).length,
    mood,
  };
}

/** Monday-based week start (YYYY-MM-DD). */
export function weekStart(ts: string | Date) {
  const d = new Date(ts);
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  return iso(d);
}

export function trend(values: number[]): "up" | "down" | "flat" {
  if (values.length < 4) return "flat";
  const a = avg(values.slice(0, 3));
  const b = avg(values.slice(3, 6));
  return a - b > 0.3 ? "up" : b - a > 0.3 ? "down" : "flat";
}

/** First name for addressing a coach: "Coach Rio Vance" → "Rio". */
export const coachFirst = (n?: string | null) =>
  firstName((n ?? "").replace(/^coach\s+/i, "").trim() || "your coach");
