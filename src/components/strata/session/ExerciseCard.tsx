import { useRef } from "react";
import {
  AnimatePresence,
  motion,
  Reorder,
  useDragControls,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "motion/react";
import {
  Check,
  Feather,
  GripVertical,
  MoreHorizontal,
  Plus,
  StickyNote,
  Trophy,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SET_TYPES } from "@/lib/session-state";
import { dur, ease, exitTween, press, spring } from "@/lib/motion";
import { feedback } from "@/lib/feedback";
import type { SEx, SSet } from "../shell";
import { Tag } from "../ui";
import { est1RM } from "../session-extras";
import { Stepper } from "./controls";
import { progression, useLongPress } from "./logic";
import { coachFirst } from "@/lib/stats";

export type Target = { e: number; s: number; field?: "kg" | "reps" };
export type RowCtx = {
  cur: { e: number; s: number } | null;
  setActive: (a: { e: number; s: number }) => void;
  toggle: (e: number, s: number) => void;
  setVal: (e: number, s: number, p: Partial<SSet>) => void;
  removeSet: (e: number, s: number) => void;
  addSet: (e: number) => void;
  applyAll: (e: number, kg: number, reps: number) => void;
  openKeypad: (t: Target) => void;
  openSetMenu: (t: Target) => void;
  openExMenu: (e: number) => void;
  openInfo: (e: number) => void;
  restore: (e: number) => void;
  last: Map<string, { reps: number; weight: number }[]>;
  lighter: boolean;
  coach?: string | null | undefined;
};

export function ExerciseCard({ ex, e, c }: { ex: SEx; e: number; c: RowCtx }) {
  const controls = useDragControls();
  const reduce = useReducedMotion();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prev = c.last.get(ex.name);
  const lt = prev
    ? `${prev.length} × ${prev[0]!.reps} @ ${Math.max(...prev.map((p) => p.weight))} kg`
    : null;
  const prog = ex.targetWeight != null ? null : progression(prev, ex.sets[0]?.reps ?? 8, c.lighter);
  const applied =
    prog && ex.sets.filter((s) => !s.done).every((s) => s.kg === prog.kg && s.reps === prog.reps);
  const complete = !ex.skipped && ex.sets.length > 0 && ex.sets.every((s) => s.done);
  const focused = c.cur?.e === e;
  const prescribed =
    ex.targetWeight != null || ex.rest_seconds != null || ex.rpe != null || !!ex.tempo;
  return (
    <Reorder.Item
      value={ex}
      id={`ex-${e}`}
      dragListener={false}
      dragControls={controls}
      className={cn(
        "panel mb-3 list-none overflow-hidden p-3 transition-[border-color] duration-300",
        focused && "border-hairline-strong",
      )}
      whileDrag={{ scale: 1.02, zIndex: 5, boxShadow: "var(--shadow-3)" }}
      initial={false}
      exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96, transition: exitTween("base") }}
    >
      <div
        className="flex select-none items-start justify-between gap-2 px-1"
        onPointerDown={(ev) => {
          const pe = ev.nativeEvent;
          timer.current = setTimeout(() => (feedback.impactMedium(), controls.start(pe)), 380);
        }}
        onPointerUp={() => timer.current && clearTimeout(timer.current)}
        onPointerLeave={() => timer.current && clearTimeout(timer.current)}
        onPointerCancel={() => timer.current && clearTimeout(timer.current)}
      >
        <button
          type="button"
          onPointerDown={(ev) => ev.stopPropagation()}
          onClick={() => c.openInfo(e)}
          className="min-w-0 pt-1 text-left"
          aria-label={`${ex.name}: details and history`}
        >
          <div className="flex items-center gap-2">
            {complete && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={spring.bouncy}
                className="grid size-5 shrink-0 place-items-center rounded-full bg-volt text-primary-foreground"
              >
                <Check className="size-3" strokeWidth={3.2} />
              </motion.span>
            )}
            <div
              className={cn(
                "truncate font-display text-title font-bold",
                ex.skipped && "text-faint line-through",
              )}
            >
              {ex.name}
            </div>
          </div>
          <div className="num mt-0.5 text-caption text-muted-foreground">
            {ex.skipped
              ? "Skipped, not saved"
              : lt
                ? `Last time ${lt}`
                : "First time. Set your baseline."}
          </div>
        </button>
        <div className="flex shrink-0 items-center">
          {ex.sets.some((s) => s.pr) && (
            <Tag tone="volt">
              <Trophy className="size-3" /> PR
            </Tag>
          )}
          <button
            type="button"
            aria-label={`${ex.name} options`}
            onPointerDown={(ev) => ev.stopPropagation()}
            onClick={() => c.openExMenu(e)}
            className="grid size-11 place-items-center rounded-full text-muted-foreground hover-device:bg-surface-2"
          >
            <MoreHorizontal className="size-5" strokeWidth={1.75} />
          </button>
          <button
            type="button"
            aria-label={`Hold to reorder ${ex.name}`}
            onPointerDown={(ev) => (ev.stopPropagation(), controls.start(ev))}
            className="grid size-11 touch-none place-items-center text-faint"
          >
            <GripVertical className="size-5" strokeWidth={1.75} />
          </button>
        </div>
      </div>
      {ex.skipped ? (
        <button
          type="button"
          onClick={() => c.restore(e)}
          className="mt-1 min-h-[44px] px-1 text-label font-semibold text-primary"
        >
          Restore exercise
        </button>
      ) : (
        <div className="mt-3">
          {(prescribed || ex.notes || ex.note) && (
            <div className="mx-1 mb-3 rounded-tile bg-surface-2/70 px-3.5 py-3">
              {prescribed && (
                <div className="num flex flex-wrap gap-x-3 gap-y-1 text-caption text-foreground">
                  <span className="font-sans font-semibold text-pulse">
                    {c.coach ? `${coachFirst(c.coach)}'s plan` : "Coach's plan"}
                  </span>
                  {ex.targetWeight != null && (
                    <span>
                      {ex.targetWeight} kg{c.lighter ? " · lighter day" : ""}
                    </span>
                  )}
                  {ex.rest_seconds != null && <span>rest {ex.rest_seconds}s</span>}
                  {ex.rpe != null && <span>RPE {ex.rpe}</span>}
                  {ex.tempo && <span>tempo {ex.tempo}</span>}
                </div>
              )}
              {ex.notes && (
                <p
                  className={cn(
                    "break-words text-label italic text-muted-foreground",
                    prescribed && "mt-1.5",
                  )}
                >
                  “{ex.notes}”
                </p>
              )}
              {ex.note && (
                <p className="mt-1.5 break-words text-label text-foreground">
                  <StickyNote className="mr-1.5 inline size-3.5 text-faint" />
                  {ex.note}
                </p>
              )}
            </div>
          )}
          {prog && (
            <motion.button
              type="button"
              whileTap={press.button}
              disabled={!!applied}
              onClick={() => (c.applyAll(e, prog.kg, prog.reps), feedback.selection())}
              className={cn(
                "mb-3 ml-1 inline-flex min-h-[36px] items-center gap-1.5 rounded-full border px-3.5 text-label font-semibold transition-colors duration-200",
                applied
                  ? "border-transparent bg-surface-2 text-faint"
                  : "border-volt/35 text-volt hover-device:bg-volt/8",
              )}
            >
              {prog.kind === "lighter" && <Feather className="size-3.5" />}
              {applied
                ? "Applied "
                : prog.kind === "up"
                  ? "Try "
                  : prog.kind === "hold"
                    ? "Hold "
                    : "Lighter day "}
              <span className="num">
                {prog.kg} kg × {prog.reps}
              </span>
            </motion.button>
          )}
          <div className="grid grid-cols-[32px_1fr_1fr_1fr_44px] items-center gap-1 px-1 pb-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-faint">
            <span>Set</span>
            <span>Last</span>
            <span className="text-center">kg</span>
            <span className="text-center">Reps</span>
            <span className="sr-only">Done</span>
          </div>
          {ex.sets.map((s, i) => (
            <SetRow
              key={i}
              s={s}
              i={i}
              e={e}
              p={prev?.[i]}
              isCur={c.cur?.e === e && c.cur.s === i}
              c={c}
            />
          ))}
          <motion.button
            type="button"
            whileTap={press.button}
            onClick={() => (feedback.selection(), c.addSet(e))}
            className="mt-1 flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-full text-label font-semibold text-muted-foreground transition-colors hover-device:text-foreground"
          >
            <Plus className="size-4" /> Add set
          </motion.button>
        </div>
      )}
    </Reorder.Item>
  );
}

export function SetRow({
  s,
  i,
  e,
  p,
  isCur,
  c,
}: {
  s: SSet;
  i: number;
  e: number;
  p: { reps: number; weight: number } | undefined;
  isCur: boolean;
  c: RowCtx;
}) {
  const reduce = useReducedMotion();
  const lp = useLongPress(() => c.openSetMenu({ e, s: i }));
  const armed = useRef(false);
  const x = useMotionValue(0);
  const reveal = useTransform(x, [-110, -12, 0], [1, 0.5, 0]);
  const tag = SET_TYPES.find((t) => t.type === s.type)?.short;
  return (
    <div className="relative overflow-hidden rounded-tile">
      <motion.div
        style={{ opacity: reveal }}
        className="absolute inset-0 flex items-center justify-end rounded-tile bg-destructive/20 pr-5 text-label font-semibold text-destructive"
        aria-hidden
      >
        Delete
      </motion.div>
      <motion.div
        style={{ x }}
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={{ left: 0.7, right: 0 }}
        dragDirectionLock
        onDrag={(_, info) => {
          const over = info.offset.x < -90;
          if (over !== armed.current) {
            armed.current = over;
            feedback.selection();
          }
        }}
        onDragEnd={(_, info) => ((armed.current = false), info.offset.x < -90 && c.removeSet(e, i))}
        className="relative rounded-tile bg-surface"
      >
        <div
          className={cn(
            "relative grid min-h-[52px] grid-cols-[32px_1fr_1fr_1fr_44px] items-center gap-1 rounded-tile px-1 transition-[opacity,background-color] duration-200",
            isCur && !s.done && "bg-surface-2",
          )}
        >
          <AnimatePresence>
            {s.done && (
              <motion.div
                key="sweep"
                className={cn(
                  "absolute inset-0 origin-left rounded-tile",
                  s.type === "warmup" ? "bg-surface-2" : "bg-volt/12",
                )}
                initial={reduce ? { opacity: 0 } : { scaleX: 0 }}
                animate={reduce ? { opacity: 1 } : { scaleX: 1 }}
                exit={{ opacity: 0, transition: exitTween("fast") }}
                transition={{ duration: dur.slow, ease: ease.out }}
              />
            )}
          </AnimatePresence>
          <button
            type="button"
            {...lp.handlers}
            onClick={() => !lp.fired.current && c.setActive({ e, s: i })}
            className="num relative col-span-4 grid min-h-[52px] select-none grid-cols-[32px_1fr_1fr_1fr] items-center gap-1 text-left [-webkit-touch-callout:none]"
            aria-label={`Set ${i + 1}${s.type && s.type !== "working" ? ` (${s.type})` : ""}: ${s.kg} kg × ${s.reps}. Hold for options`}
          >
            <span className="flex items-center">
              <AnimatePresence mode="popLayout" initial={false}>
                {tag ? (
                  <motion.span
                    key={tag}
                    initial={reduce ? { opacity: 0 } : { scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={spring.snappy}
                    className={cn(
                      "grid size-7 place-items-center rounded-full text-caption font-bold",
                      s.type === "warmup"
                        ? "bg-surface-3 text-muted-foreground"
                        : s.type === "failure"
                          ? "bg-destructive/18 text-destructive"
                          : "bg-ember/18 text-ember",
                    )}
                  >
                    {tag}
                  </motion.span>
                ) : (
                  <span
                    className={cn("text-label font-semibold", s.done ? "text-volt" : "text-faint")}
                  >
                    {i + 1}
                  </span>
                )}
              </AnimatePresence>
            </span>
            <span className="text-label text-faint">{p ? `${p.weight}×${p.reps}` : "—"}</span>
            <span className="text-center text-title font-semibold">{s.kg}</span>
            <span className="text-center text-title font-semibold">{s.reps}</span>
          </button>
          <motion.button
            type="button"
            whileTap={press.icon}
            aria-label={s.done ? `Undo set ${i + 1}` : `Complete set ${i + 1}`}
            aria-pressed={s.done}
            onClick={() => c.toggle(e, i)}
            className={cn(
              "relative grid size-11 place-items-center rounded-full transition-colors duration-200",
              s.done
                ? "bg-volt text-primary-foreground"
                : "bg-surface-3 text-faint hover-device:text-foreground",
            )}
          >
            <svg
              viewBox="0 0 24 24"
              className="size-5"
              fill="none"
              stroke="currentColor"
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <motion.path
                key={String(s.done)}
                d="M5 12.5l4.5 4.5L19 7.5"
                initial={s.done && !reduce ? { pathLength: 0 } : false}
                animate={{ pathLength: 1 }}
                transition={{ duration: dur.slow, ease: ease.out }}
              />
            </svg>
          </motion.button>
        </div>
        {s.note && (
          <p className="px-2 pb-2 text-caption text-muted-foreground">
            <StickyNote className="mr-1 inline size-3" />
            {s.note}
          </p>
        )}
        <AnimatePresence initial={false}>
          {isCur && !s.done && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, transition: exitTween("fast") }}
              transition={spring.smooth}
            >
              <div className="flex gap-3 px-1 pt-3">
                <Stepper
                  label="Weight"
                  unit="kg"
                  value={s.kg}
                  step={2.5}
                  onChange={(v) => c.setVal(e, i, { kg: v })}
                  onValueTap={() => c.openKeypad({ e, s: i, field: "kg" })}
                />
                <Stepper
                  label="Reps"
                  unit=""
                  value={s.reps}
                  step={1}
                  onChange={(v) => c.setVal(e, i, { reps: v })}
                  onValueTap={() => c.openKeypad({ e, s: i, field: "reps" })}
                />
              </div>
              <div className="num pb-3 pt-2.5 text-center text-caption text-muted-foreground">
                Est. 1RM{" "}
                <span className="font-semibold text-foreground">{est1RM(s.kg, s.reps)} kg</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
