import { useState } from "react";
import { motion } from "motion/react";
import { Pause, Plus, Search, SkipForward } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { searchLifts } from "@/lib/session-state";
import { spring, exitTween, press } from "@/lib/motion";
import { feedback } from "@/lib/feedback";
import type { Workout } from "@/lib/types";
import type { RestState } from "@/lib/session-state";
import { BodyMap, est1RM } from "../session-extras";
import { Sparkline } from "../ui";
import { SheetBtn } from "./controls";
import { clock, usePrefList } from "./logic";

export function ExercisePicker({
  history,
  onPick,
}: {
  history: string[];
  onPick: (name: string) => void;
}) {
  const [q, setQ] = useState("");
  const [recent] = usePrefList("strata:recent-lifts");
  const { mine, groups } = searchLifts(q, history, recent);
  const custom =
    q.trim() &&
    ![...mine, ...groups.flatMap(([, x]) => x)].some(
      (x) => x.toLowerCase() === q.trim().toLowerCase(),
    );
  const Item = (n: string) => (
    <button
      key={n}
      type="button"
      onClick={() => onPick(n)}
      className="flex min-h-[52px] w-full items-center justify-between border-b border-hairline text-left text-body transition-colors last:border-0 hover-device:text-volt"
    >
      {n} <Plus className="size-4 text-faint" />
    </button>
  );
  return (
    <div>
      <div className="sticky top-0 z-10 bg-popover pb-3">
        <div className="flex h-12 items-center gap-2 rounded-full border border-input bg-surface px-4 transition-colors focus-within:border-volt/50">
          <Search className="size-5 text-faint" strokeWidth={1.75} />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search exercises"
            aria-label="Search exercises"
            className="h-full min-w-0 flex-1 bg-transparent text-body outline-none placeholder:text-faint"
          />
        </div>
      </div>
      {custom && (
        <SheetBtn onClick={() => onPick(q.trim())} icon={<Plus className="size-5" />}>
          Add “{q.trim()}”
        </SheetBtn>
      )}
      {mine.length > 0 && (
        <section className="mt-3">
          <div className="eyebrow mb-1">Yours</div>
          {mine.slice(0, 12).map(Item)}
        </section>
      )}
      {groups.map(([g, xs]) => (
        <section key={g} className="mt-5">
          <div className="eyebrow mb-1">{g}</div>
          {xs.map(Item)}
        </section>
      ))}
    </div>
  );
}

/** Exercise detail: muscles worked, coach cues and your recent history. */
export function ExerciseInfo({
  name,
  workouts,
  cues,
}: {
  name: string;
  workouts: Workout[];
  cues?: string | undefined;
}) {
  const sessions = workouts
    .map((w) => ({ w, sets: w.sets.filter((s) => s.exercise === name) }))
    .filter((x) => x.sets.length)
    .slice(0, 8);
  const est = [...sessions]
    .reverse()
    .map((x) => Math.max(...x.sets.map((s) => est1RM(s.weight, s.reps))));
  const best = sessions.length
    ? Math.max(...sessions.flatMap((x) => x.sets.map((s) => s.weight)))
    : null;
  return (
    <div className="space-y-5">
      <div className="rounded-card border border-hairline bg-surface p-4">
        <div className="eyebrow mb-3">Muscles worked</div>
        <BodyMap exercises={[name]} />
      </div>
      {cues && (
        <div className="rounded-card border border-hairline bg-surface p-4">
          <div className="eyebrow mb-2">From your coach</div>
          <p className="text-body italic text-foreground">“{cues}”</p>
        </div>
      )}
      <div className="rounded-card border border-hairline bg-surface p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="eyebrow">Estimated max</div>
            <div className="num mt-1 text-title-l font-semibold">
              {est.length ? est.at(-1) : "—"}
              {est.length > 0 && <span className="unit">kg</span>}
            </div>
            {best != null && (
              <div className="num mt-1 text-caption text-muted-foreground">
                Heaviest set {best} kg
              </div>
            )}
          </div>
          <Sparkline values={est} width={120} height={44} />
        </div>
        <div className="mt-4">
          {sessions.length ? (
            sessions.slice(0, 5).map(({ w, sets }) => (
              <div
                key={w.id}
                className="flex items-baseline justify-between border-t border-hairline py-2.5 text-label"
              >
                <span className="text-muted-foreground">
                  {format(new Date(w.performed_at), "EEE d MMM")}
                </span>
                <span className="num">{sets.map((s) => `${s.weight}×${s.reps}`).join("  ")}</span>
              </div>
            ))
          ) : (
            <p className="border-t border-hairline pt-3 text-label text-muted-foreground">
              No history yet. Today sets your baseline.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/** Dynamic-Island-style rest timer: a pill that expands into controls. */
export function RestIsland({
  rest,
  left,
  paused,
  open,
  onToggle,
  onNudge,
  onSkip,
}: {
  rest: RestState;
  left: number;
  paused: boolean;
  open: boolean;
  onToggle: () => void;
  onNudge: (d: number) => void;
  onSkip: () => void;
}) {
  const total = Math.max(1, rest.total * 1000);
  const frac = Math.max(0, Math.min(1, left / total));
  const ending = left <= 10_000 && !paused;
  const r = 9;
  const c = 2 * Math.PI * r;
  return (
    <motion.div
      layout
      key="island"
      initial={{ y: -48, opacity: 0, scale: 0.9 }}
      animate={{ y: 0, opacity: 1, scale: left <= 3000 && !paused ? [1, 1.04, 1] : 1 }}
      exit={{ y: -48, opacity: 0, scale: 0.9, transition: exitTween("base") }}
      transition={{ ...spring.smooth, scale: { duration: 0.32 } }}
      className="elev-2 absolute left-1/2 top-[max(8px,env(safe-area-inset-top))] z-20 -translate-x-1/2 overflow-hidden rounded-full"
      style={{ borderRadius: 999 }}
    >
      <motion.div layout className={cn("flex items-center", open ? "gap-2 p-1.5 pl-3" : "")}>
        <button
          type="button"
          onClick={() => (feedback.selection(), onToggle())}
          role="timer"
          aria-live="polite"
          aria-label={`Rest ${clock(left)} left${paused ? ", paused" : ""}. Tap to ${open ? "collapse" : "expand"}`}
          className={cn("flex items-center gap-2.5", !open && "h-11 pl-3 pr-4")}
        >
          {paused ? (
            <Pause className="size-4 text-faint" />
          ) : (
            <svg width={22} height={22} viewBox="0 0 22 22" className="-rotate-90" aria-hidden>
              <circle
                cx={11}
                cy={11}
                r={r}
                stroke="var(--surface-3)"
                strokeWidth={2.5}
                fill="none"
              />
              <circle
                cx={11}
                cy={11}
                r={r}
                stroke={ending ? "var(--ember)" : "var(--volt)"}
                strokeWidth={2.5}
                strokeLinecap="round"
                fill="none"
                strokeDasharray={c}
                strokeDashoffset={c * (1 - frac)}
                style={{ transition: "stroke-dashoffset 250ms linear, stroke 300ms" }}
              />
            </svg>
          )}
          <motion.span
            layout
            className={cn(
              "num font-semibold transition-colors duration-300",
              open ? "text-title" : "text-label",
              paused ? "text-faint" : ending ? "text-ember" : "text-foreground",
            )}
          >
            {clock(left)}
          </motion.span>
        </button>
        {open && (
          <>
            <motion.button
              whileTap={press.icon}
              type="button"
              onClick={() => (feedback.selection(), onNudge(-15))}
              className="num grid min-h-[40px] place-items-center rounded-full bg-surface-3 px-3 text-label font-semibold"
            >
              −15s
            </motion.button>
            <motion.button
              whileTap={press.icon}
              type="button"
              onClick={() => (feedback.selection(), onNudge(15))}
              className="num grid min-h-[40px] place-items-center rounded-full bg-surface-3 px-3 text-label font-semibold"
            >
              +15s
            </motion.button>
            <motion.button
              whileTap={press.icon}
              type="button"
              aria-label="Skip rest"
              onClick={onSkip}
              className="flex min-h-[40px] items-center gap-1 rounded-full bg-volt px-3.5 text-label font-semibold text-primary-foreground"
            >
              <SkipForward className="size-4" /> Skip
            </motion.button>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}
