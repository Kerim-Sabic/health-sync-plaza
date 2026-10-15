import { ChevronDown } from "lucide-react";
import { useId, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { Program } from "@/lib/types";
import { exitTween, spring } from "@/lib/motion";
import { feedback } from "@/lib/feedback";

export function ProgramDetails({ program }: { program: Program }) {
  return (
    <>
      {program.description && (
        <p className="mt-3 break-words text-label text-muted-foreground">{program.description}</p>
      )}
      {program.days.map((day, i) => (
        <section key={i} className="mt-5 border-t border-hairline pt-4">
          <h3 className="font-sans text-label font-bold [font-stretch:100%]">{day.title}</h3>
          <div className="mt-3 space-y-3">
            {day.exercises.map((exercise, j) => (
              <div key={j}>
                <div className="break-words text-label font-semibold">{exercise.name}</div>
                <div className="num mt-1 flex flex-wrap gap-x-3 gap-y-1 text-caption text-muted-foreground">
                  <span>
                    {exercise.sets}×{exercise.reps}
                  </span>
                  {exercise.weight != null && (
                    <span className="text-foreground">{exercise.weight} kg</span>
                  )}
                  {exercise.rest_seconds != null && <span>{exercise.rest_seconds}s rest</span>}
                  {exercise.rpe != null && <span>RPE {exercise.rpe}</span>}
                  {exercise.tempo && <span>tempo {exercise.tempo}</span>}
                </div>
                {exercise.notes && (
                  <p className="mt-1 break-words text-caption italic text-faint">
                    “{exercise.notes}”
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      ))}
    </>
  );
}

export function ProgramSummary({
  program,
  actions,
  eyebrow,
}: {
  program: Program;
  actions?: ReactNode;
  eyebrow?: string;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <article className="panel min-w-0 p-0">
      <button
        type="button"
        aria-label={`${open ? "Collapse" : "Open"} ${program.name}`}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => (feedback.selection(), setOpen(!open))}
        className="flex w-full min-w-0 items-center justify-between gap-3 p-5 text-left"
      >
        <span className="min-w-0">
          {eyebrow && <span className="eyebrow mb-2 block">{eyebrow}</span>}
          <span className="block break-words font-display text-title font-bold">
            {program.name}
          </span>
          <span className="mt-1 block text-caption text-faint">
            {program.weeks} weeks · {program.days.length} training days ·{" "}
            {program.days.reduce((a, d) => a + d.exercises.length, 0)} exercises
          </span>
        </span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={spring.snappy}
          className="shrink-0"
        >
          <ChevronDown className="size-5 text-faint" />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={id}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, transition: exitTween("fast") }}
            transition={spring.smooth}
            className="px-5 pb-5"
          >
            <ProgramDetails program={program} />
            {actions && <div className="mt-5 flex flex-wrap gap-2">{actions}</div>}
          </motion.div>
        )}
      </AnimatePresence>
    </article>
  );
}
