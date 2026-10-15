import type { BodyMetric, FoodLog, JournalEntry, ReportSummary, SleepLog, Workout } from "./types";
import { avg, iso, volume } from "./stats";

const inRange = (d: string, from: number, to: number) => {
  const t = new Date(d.length === 10 ? d + "T12:00" : d).getTime();
  return t >= from && t <= to;
};

export function buildSummary(
  data: {
    workouts: Workout[];
    sleep: SleepLog[];
    food: FoodLog[];
    journal: JournalEntry[];
    metrics: BodyMetric[];
  },
  periodDays: number,
  targetPerWeek = 4,
): ReportSummary {
  const now = Date.now();
  const from = now - periodDays * 86400000;
  const prevFrom = from - periodDays * 86400000;
  const w = data.workouts.filter((x) => inRange(x.performed_at, from, now));
  const pw = data.workouts.filter((x) => inRange(x.performed_at, prevFrom, from));
  const s = data.sleep.filter((x) => inRange(x.log_date, from, now));
  const f = data.food.filter((x) => inRange(x.log_date, from, now));
  const j = data.journal.filter((x) => inRange(x.created_at, from, now));
  const m = data.metrics
    .filter((x) => x.weight != null && inRange(x.log_date, from, now))
    .sort((a, b) => a.log_date.localeCompare(b.log_date));

  const vol = w.reduce((a, x) => a + volume(x), 0);
  const pvol = pw.reduce((a, x) => a + volume(x), 0);
  const foodDays = new Set(f.map((x) => x.log_date));
  const perDay = [...foodDays].map((d) => f.filter((x) => x.log_date === d));
  const expected = Math.max(1, Math.round((periodDays / 7) * targetPerWeek));

  const best = (list: Workout[]) => {
    const mp = new Map<string, number>();
    for (const x of list)
      for (const st of x.sets)
        if (st.weight > (mp.get(st.exercise) ?? 0)) mp.set(st.exercise, st.weight);
    return mp;
  };
  const before = best(data.workouts.filter((x) => new Date(x.performed_at).getTime() < from));
  const prs = [...best(w).entries()]
    .filter(([ex, wt]) => wt > (before.get(ex) ?? 0) && wt > 0)
    .map(([exercise, weight]) => ({ exercise, weight, prev: before.get(exercise) ?? 0 }))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 5);

  const sum: ReportSummary = {
    periodDays,
    from: iso(new Date(from)),
    to: iso(new Date(now)),
    sessions: w.length,
    prevSessions: pw.length,
    adherence: Math.min(1, w.length / expected),
    volume: Math.round(vol),
    volumeDeltaPct: pvol ? Math.round(((vol - pvol) / pvol) * 100) : null,
    minutes: w.reduce((a, x) => a + (x.duration_min ?? 0), 0),
    avgRpe: +avg(w.map((x) => x.rpe ?? 0).filter(Boolean)).toFixed(1),
    avgSleep: +avg(s.map((x) => +x.hours)).toFixed(1),
    avgSleepQuality: +avg(s.map((x) => x.quality)).toFixed(1),
    avgKcal: Math.round(avg(perDay.map((d) => d.reduce((a, x) => a + x.calories, 0)))),
    avgProtein: Math.round(avg(perDay.map((d) => d.reduce((a, x) => a + x.protein, 0)))),
    loggedFoodDays: foodDays.size,
    weightStart: m[0]?.weight != null ? +m[0].weight : null,
    weightEnd: m.at(-1)?.weight != null ? +m.at(-1)!.weight! : null,
    avgMood: +avg(j.map((x) => x.mood)).toFixed(1),
    avgEnergy: +avg(j.map((x) => x.energy)).toFixed(1),
    prs,
    highlights: [],
    watchouts: [],
  };

  if (sum.adherence >= 0.85)
    sum.highlights.push(`Hit ${Math.round(sum.adherence * 100)}% of planned sessions`);
  if (sum.volumeDeltaPct != null && sum.volumeDeltaPct > 5)
    sum.highlights.push(`Training volume up ${sum.volumeDeltaPct}%`);
  if (prs.length)
    sum.highlights.push(`${prs.length} new personal record${prs.length > 1 ? "s" : ""}`);
  if (sum.avgSleep >= 7.5) sum.highlights.push(`Strong sleep — ${sum.avgSleep} h average`);
  if (sum.avgProtein >= 130) sum.highlights.push(`Protein on point at ${sum.avgProtein} g/day`);

  if (sum.adherence < 0.6)
    sum.watchouts.push(`Only ${sum.sessions} of ${expected} planned sessions`);
  if (sum.avgSleep && sum.avgSleep < 6.8)
    sum.watchouts.push(`Sleep is low at ${sum.avgSleep} h average`);
  if (sum.avgMood && sum.avgMood < 3) sum.watchouts.push(`Mood trending low (${sum.avgMood}/5)`);
  if (sum.avgRpe >= 8.5)
    sum.watchouts.push(`High average effort (RPE ${sum.avgRpe}) — watch fatigue`);
  if (sum.loggedFoodDays < periodDays * 0.5)
    sum.watchouts.push(`Food logged on ${sum.loggedFoodDays} of ${periodDays} days`);
  return sum;
}
