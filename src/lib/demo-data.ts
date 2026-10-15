import type {
  Assignment,
  BodyMetric,
  FoodLog,
  JournalEntry,
  Person,
  Program,
  SleepLog,
  TrainerNote,
  Workout,
  CheckIn,
} from "./types";

export const DEMO_TRAINER_ID = "demo-trainer";
export const DEMO_CLIENT_ID = "demo-client";

let seed = 42;
const rand = () => {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
};
const pick = <T>(a: T[]) => a[Math.floor(rand() * a.length)]!;
const id = () => Math.random().toString(36).slice(2, 11);
const dayISO = (daysAgo: number) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
};

export const demoPeople: (Person & { adherence: number; baseWeight: number })[] = [
  {
    id: DEMO_CLIENT_ID,
    display_name: "Maya Chen",
    goal: "Build strength · first pull-up",
    adherence: 0.7,
    baseWeight: 64,
  },
  { id: "c2", display_name: "Jordan Blake", goal: "Cut to 82 kg", adherence: 0.55, baseWeight: 88 },
  {
    id: "c3",
    display_name: "Priya Nair",
    goal: "Half-marathon in May",
    adherence: 0.8,
    baseWeight: 58,
  },
  {
    id: "c4",
    display_name: "Leo Marquez",
    goal: "Return from knee rehab",
    adherence: 0.35,
    baseWeight: 79,
  },
  {
    id: "c5",
    display_name: "Sam Okafor",
    goal: "Powerlifting meet prep",
    adherence: 0.75,
    baseWeight: 101,
  },
];
export const demoTrainer: Person = {
  id: DEMO_TRAINER_ID,
  display_name: "Coach Rio Vance",
  goal: "Strength & conditioning",
};

const templates: { title: string; lifts: [string, number][] }[] = [
  {
    title: "Lower · Strength",
    lifts: [
      ["Back Squat", 70],
      ["Romanian Deadlift", 60],
      ["Walking Lunge", 20],
    ],
  },
  {
    title: "Upper · Push",
    lifts: [
      ["Bench Press", 50],
      ["Overhead Press", 32],
      ["Dips", 0],
    ],
  },
  {
    title: "Upper · Pull",
    lifts: [
      ["Deadlift", 90],
      ["Weighted Pull-up", 5],
      ["Barbell Row", 50],
    ],
  },
  { title: "Zone 2 Run", lifts: [] },
  {
    title: "Full Body · Power",
    lifts: [
      ["Power Clean", 45],
      ["Front Squat", 55],
      ["Push Press", 40],
    ],
  },
];
const foods: Record<string, [string, number, number, number, number][]> = {
  Breakfast: [
    ["Greek yogurt, berries & granola", 420, 28, 55, 10],
    ["Eggs, sourdough & avocado", 520, 26, 38, 28],
    ["Protein oats", 480, 35, 62, 9],
  ],
  Lunch: [
    ["Chicken burrito bowl", 680, 48, 72, 18],
    ["Salmon poke", 610, 38, 66, 19],
    ["Turkey & hummus wrap", 540, 36, 50, 18],
  ],
  Dinner: [
    ["Steak, potatoes & greens", 780, 55, 60, 30],
    ["Tofu stir fry & rice", 640, 30, 82, 18],
    ["Pasta bolognese", 720, 42, 88, 20],
  ],
  Snack: [
    ["Whey shake & banana", 280, 27, 32, 3],
    ["Apple & almond butter", 260, 6, 28, 15],
    ["Cottage cheese", 180, 24, 8, 5],
  ],
};
const journalLines = [
  "Felt strong today — the squat moved fast.",
  "Busy work week, energy a bit low but got it done.",
  "Slept badly. Took an easy walk instead.",
  "PR on deadlift! Coach was right about the bracing cue.",
  "Knees felt great on the lunges.",
  "Stressed, but training cleared my head.",
];

export interface DemoStore {
  workouts: Workout[];
  sleep_logs: SleepLog[];
  nutrition_logs: FoodLog[];
  journal_entries: JournalEntry[];
  body_metrics: BodyMetric[];
  programs: Program[];
  assignments: Assignment[];
  notes: TrainerNote[];
  check_ins: CheckIn[];
}

export function buildDemoStore(): DemoStore {
  seed = 42;
  const s: DemoStore = {
    workouts: [],
    sleep_logs: [],
    nutrition_logs: [],
    journal_entries: [],
    body_metrics: [],
    programs: [],
    assignments: [],
    notes: [],
    check_ins: [],
  };
  for (const p of demoPeople) {
    let ti = 0;
    for (let d = 34; d >= 0; d--) {
      const progress = (34 - d) / 34;
      // Nobody has trained yet today, so the demo opens on the next program day.
      if (rand() < p.adherence && d % 7 !== 6 && d > 0) {
        const t = templates[ti++ % templates.length]!;
        const date = new Date();
        date.setDate(date.getDate() - d);
        date.setHours(7 + Math.floor(rand() * 11), 0, 0, 0);
        s.workouts.push({
          id: id(),
          user_id: p.id,
          title: t.title,
          performed_at: date.toISOString(),
          duration_min: t.lifts.length
            ? 50 + Math.floor(rand() * 25)
            : 35 + Math.floor(rand() * 20),
          rpe: 6 + Math.floor(rand() * 4),
          notes: null,
          sets: t.lifts.flatMap(([ex, w]) =>
            [1, 2, 3].map(() => ({
              exercise: ex,
              reps: 5 + Math.floor(rand() * 4),
              weight: Math.round((w * (p.baseWeight / 70) * (1 + progress * 0.12)) / 2.5) * 2.5,
            })),
          ),
        });
      }
      s.sleep_logs.push({
        id: id(),
        user_id: p.id,
        log_date: dayISO(d),
        hours: Math.round((6 + rand() * 2.6) * 10) / 10,
        quality: 2 + Math.floor(rand() * 4),
      });
      for (const meal of ["Breakfast", "Lunch", "Dinner", ...(rand() > 0.4 ? ["Snack"] : [])]) {
        const [name, calories, protein, carbs, fat] = pick(foods[meal]!);
        s.nutrition_logs.push({
          id: id(),
          user_id: p.id,
          log_date: dayISO(d),
          meal,
          name,
          calories,
          protein,
          carbs,
          fat,
        });
      }
      if (d % 2 === 0) {
        const dt = new Date();
        dt.setDate(dt.getDate() - d);
        s.journal_entries.push({
          id: id(),
          user_id: p.id,
          created_at: dt.toISOString(),
          mood: 2 + Math.floor(rand() * 4),
          energy: 2 + Math.floor(rand() * 4),
          body: pick(journalLines),
        });
      }
      if (d % 4 === 0) {
        s.body_metrics.push({
          id: id(),
          user_id: p.id,
          log_date: dayISO(d),
          weight: Math.round((p.baseWeight - progress * 2 + rand() * 0.8) * 10) / 10,
          body_fat: Math.round((22 - progress * 1.5 + rand()) * 10) / 10,
        });
      }
    }
  }
  const prog: Program = {
    id: "prog-1",
    trainer_id: DEMO_TRAINER_ID,
    name: "Foundations of Strength",
    description: "3-day full body block built around the big lifts.",
    weeks: 6,
    days: [
      {
        title: "Day A · Squat focus",
        exercises: [
          { name: "Back Squat", sets: 5, reps: "5" },
          { name: "Bench Press", sets: 4, reps: "6-8" },
          { name: "Plank", sets: 3, reps: "45s" },
        ],
      },
      {
        title: "Day B · Hinge focus",
        exercises: [
          { name: "Deadlift", sets: 4, reps: "4" },
          { name: "Overhead Press", sets: 4, reps: "6" },
          { name: "Pull-up negatives", sets: 3, reps: "5" },
        ],
      },
      {
        title: "Day C · Power",
        exercises: [
          { name: "Power Clean", sets: 5, reps: "3" },
          { name: "Front Squat", sets: 3, reps: "6" },
          { name: "Farmer Carry", sets: 3, reps: "40m" },
        ],
      },
    ],
  };
  const prog2: Program = {
    id: "prog-2",
    trainer_id: DEMO_TRAINER_ID,
    name: "Engine Builder",
    description: "Aerobic base: zone 2, tempo and intervals.",
    weeks: 8,
    days: [
      { title: "Zone 2 · 40 min", exercises: [{ name: "Easy run", sets: 1, reps: "40 min" }] },
      { title: "Tempo", exercises: [{ name: "Tempo run", sets: 3, reps: "8 min" }] },
      { title: "Intervals", exercises: [{ name: "400m repeats", sets: 8, reps: "400m" }] },
    ],
  };
  s.programs.push(prog, prog2);
  s.assignments.push(
    {
      id: id(),
      program_id: "prog-1",
      client_id: DEMO_CLIENT_ID,
      trainer_id: DEMO_TRAINER_ID,
      start_date: dayISO(20),
    },
    {
      id: id(),
      program_id: "prog-2",
      client_id: "c3",
      trainer_id: DEMO_TRAINER_ID,
      start_date: dayISO(12),
    },
    {
      id: id(),
      program_id: "prog-1",
      client_id: "c5",
      trainer_id: DEMO_TRAINER_ID,
      start_date: dayISO(30),
    },
  );
  s.notes.push(
    {
      id: id(),
      trainer_id: DEMO_TRAINER_ID,
      client_id: DEMO_CLIENT_ID,
      body: "Great bracing on squats this week. Next: add 2.5 kg to top sets.",
      shared: true,
      created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    },
    {
      id: id(),
      trainer_id: DEMO_TRAINER_ID,
      client_id: DEMO_CLIENT_ID,
      body: "Aim for 130 g protein on training days.",
      shared: true,
      created_at: new Date(Date.now() - 86400000 * 8).toISOString(),
    },
    {
      id: id(),
      trainer_id: DEMO_TRAINER_ID,
      client_id: DEMO_CLIENT_ID,
      body: "Will do. Squats felt fast today, the bracing cue really helped.",
      shared: true,
      from_client: true,
      created_at: new Date(Date.now() - 86400000 * 1.8).toISOString(),
    },
  );
  const lastWeek = (() => {
    const d = new Date();
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7) - 7);
    return d.toISOString().slice(0, 10);
  })();
  s.check_ins.push({
    id: id(),
    client_id: DEMO_CLIENT_ID,
    week_start: lastWeek,
    weight: 62.9,
    adherence: 8,
    energy: 4,
    sleep: 3,
    stress: 3,
    wins: "Hit every session and my deadlift felt smooth at 85 kg.",
    struggles: "Two late nights for work, so sleep was patchy midweek.",
    questions: "Should I train on days I've slept under six hours?",
    coach_reply:
      "Great week, Maya. On short nights keep the session but drop to the lighter day option and stop two reps shy. We protect the habit and the joints.",
    replied_at: new Date(Date.now() - 86400000 * 4).toISOString(),
    created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
  });
  return s;
}
