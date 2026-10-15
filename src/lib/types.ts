export type Role = "solo" | "client" | "trainer";

export interface SetEntry {
  exercise: string;
  reps: number;
  weight: number;
}
export interface Workout {
  id: string;
  user_id: string;
  title: string;
  performed_at: string;
  duration_min: number | null;
  rpe: number | null;
  notes: string | null;
  sets: SetEntry[];
}
export interface SleepLog {
  id: string;
  user_id: string;
  log_date: string;
  hours: number;
  quality: number;
}
export interface FoodLog {
  id: string;
  user_id: string;
  log_date: string;
  meal: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}
export interface JournalEntry {
  id: string;
  user_id: string;
  created_at: string;
  mood: number;
  energy: number;
  body: string | null;
}
export interface BodyMetric {
  id: string;
  user_id: string;
  log_date: string;
  weight: number | null;
  body_fat: number | null;
}
export interface ProgramExercise {
  name: string;
  sets: number;
  reps: string;
  weight?: number | null;
  rest_seconds?: number | null;
  rpe?: number | null;
  tempo?: string;
  notes?: string;
}
export interface ProgramDay {
  title: string;
  exercises: ProgramExercise[];
}
export interface Program {
  id: string;
  trainer_id: string;
  name: string;
  description: string | null;
  weeks: number;
  days: ProgramDay[];
}
export interface Assignment {
  id: string;
  program_id: string;
  client_id: string;
  trainer_id: string;
  start_date: string;
}
export interface TrainerNote {
  id: string;
  trainer_id: string;
  client_id: string;
  body: string;
  shared: boolean;
  created_at: string;
  /** Written by the client as a reply; coach notes are false. */
  from_client?: boolean;
}
export interface CheckIn {
  id: string;
  client_id: string;
  week_start: string;
  weight: number | null;
  adherence: number | null;
  energy: number | null;
  sleep: number | null;
  stress: number | null;
  wins: string | null;
  struggles: string | null;
  questions: string | null;
  coach_reply: string | null;
  replied_at: string | null;
  created_at: string;
}
export type CheckInAnswers = Pick<
  CheckIn,
  "weight" | "adherence" | "energy" | "sleep" | "stress" | "wins" | "struggles" | "questions"
>;
export interface Person {
  id: string;
  display_name: string | null;
  goal: string | null;
  bio?: string | null;
  avatar_path?: string | null;
  avatar_url?: string | undefined;
}
export interface Me extends Person {
  trainer_code: string | null;
  role: Role | null;
}

export interface LogTables {
  workouts: Workout;
  sleep_logs: SleepLog;
  nutrition_logs: FoodLog;
  journal_entries: JournalEntry;
  body_metrics: BodyMetric;
}
export type LogTable = keyof LogTables;

export interface ProgressPhoto {
  id: string;
  user_id: string;
  taken_on: string;
  pose: string;
  storage_path: string;
  note: string | null;
  url: string;
}
export interface ReportSummary {
  periodDays: number;
  from: string;
  to: string;
  sessions: number;
  prevSessions: number;
  adherence: number;
  volume: number;
  volumeDeltaPct: number | null;
  minutes: number;
  avgRpe: number;
  avgSleep: number;
  avgSleepQuality: number;
  avgKcal: number;
  avgProtein: number;
  loggedFoodDays: number;
  weightStart: number | null;
  weightEnd: number | null;
  avgMood: number;
  avgEnergy: number;
  prs: { exercise: string; weight: number; prev: number }[];
  highlights: string[];
  watchouts: string[];
}
export interface ProgressReport {
  id: string;
  trainer_id: string;
  client_id: string;
  period_days: number;
  summary: ReportSummary;
  comment: string | null;
  created_at: string;
}
