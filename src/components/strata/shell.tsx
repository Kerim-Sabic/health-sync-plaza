import { createContext, useContext } from "react";
import type { ProgramDay, Workout } from "@/lib/types";
import type { RestState, SetType } from "@/lib/session-state";
import type { LogKind } from "./sheets";

export type SSet = {
  kg: number;
  reps: number;
  done: boolean;
  pr?: boolean;
  type?: SetType;
  note?: string;
  at?: number;
};
export type SEx = {
  name: string;
  sets: SSet[];
  targetWeight?: number | null | undefined;
  rest_seconds?: number | null | undefined;
  rpe?: number | null | undefined;
  tempo?: string | undefined;
  notes?: string | undefined;
  skipped?: boolean;
  note?: string;
};
export type LiveSessionState = {
  title: string;
  startedAt: number;
  exercises: SEx[];
  lighter?: boolean;
  pausedAt?: number | null;
  totalPausedMs?: number;
  lastActiveAt?: number;
  rest?: RestState | null;
  /** Review mode: editing a saved workout; saving replaces it and keeps performedAt. */
  editingId?: string;
  performedAt?: string;
  rpe?: number;
  /** Optional note to the coach, saved with the workout. */
  coachNote?: string;
  /** Saved successfully; the celebration is showing. */
  savedAt?: number;
};

export interface ShellApi {
  log: (k: Exclude<LogKind, "workout">, opts?: { meal?: string }) => void;
  startSession: (template?: ProgramDay) => void;
  openSession: () => void;
  editWorkout: (w: Workout) => void;
  session: LiveSessionState | null;
}

export const ShellCtx = createContext<ShellApi>({
  log: () => {},
  startSession: () => {},
  openSession: () => {},
  editWorkout: () => {},
  session: null,
});
export const useShell = () => useContext(ShellCtx);

/** Convenience: one function for every log kind; "workout" starts a live session. */
export function useLogger() {
  const s = useShell();
  return (k: LogKind, t?: ProgramDay) => (k === "workout" ? s.startSession(t) : s.log(k));
}
