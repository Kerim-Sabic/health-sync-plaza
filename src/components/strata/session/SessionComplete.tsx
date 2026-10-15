import { motion, useReducedMotion } from "motion/react";
import { Share2, Trophy, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { dur, ease, spring, tween } from "@/lib/motion";
import { feedback } from "@/lib/feedback";
import { Slider } from "@/components/ui/slider";
import { IconButton, NumberTicker, SaveButton } from "../ui";
import { BodyMap } from "../session-extras";
import { SheetBtn } from "./controls";
import { rpeAnchors } from "./logic";
import { coachFirst } from "@/lib/stats";

type Pr = { ex: string; kg: number; reps: number };

/**
 * Review → saved. Review collects effort and an optional note for the coach;
 * saved is the cinematic summary: stats count up in sequence, muscles light up.
 */
export function SessionComplete({
  phase,
  editing,
  title,
  mins,
  vol,
  sets,
  warmups,
  prs,
  exercises,
  rpe,
  setRpe,
  note,
  setNote,
  coach,
  onBack,
  onSave,
  onSaved,
  onShare,
  onClose,
}: {
  phase: "review" | "saved";
  editing: boolean;
  title: string;
  mins: number;
  vol: number;
  sets: number;
  warmups: number;
  prs: Pr[];
  exercises: string[];
  rpe: number;
  setRpe: (n: number) => void;
  note: string;
  setNote: (s: string) => void;
  coach?: string | null | undefined;
  onBack: () => void;
  onSave: () => Promise<unknown>;
  onSaved: () => void;
  onShare: () => void;
  onClose: () => void;
}) {
  const reduce = useReducedMotion();
  const saved = phase === "saved";
  const tonnes = vol >= 1000;
  const stats = [
    { l: "Duration", v: mins, unit: "min", d: 0 },
    { l: "Volume", v: tonnes ? vol / 1000 : vol, unit: tonnes ? "t" : "kg", d: tonnes ? 1 : 0 },
    { l: "Sets", v: sets, unit: undefined, d: 0 },
    { l: "Records", v: prs.length, unit: undefined, d: 0 },
  ];
  return (
    <motion.div
      key="done"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={tween("slow")}
      className="absolute inset-0 z-40 flex flex-col overflow-y-auto bg-background px-5 pb-8 pt-[max(16px,env(safe-area-inset-top))]"
    >
      {saved && !reduce && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-[radial-gradient(60%_80%_at_50%_0%,color-mix(in_oklab,var(--volt)_22%,transparent),transparent_70%)]"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0.55] }}
          transition={{ duration: 1.6, ease: ease.out }}
        />
      )}
      <div className="relative flex h-11 items-center justify-between">
        {!saved ? (
          <IconButton label="Back to session" onClick={onBack}>
            <X className="size-5" />
          </IconButton>
        ) : (
          <span />
        )}
      </div>
      <motion.div
        className="relative"
        initial={saved ? { opacity: 0, y: 10 } : false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...tween("deliberate", "emphasized"), delay: 0.1 }}
      >
        <div className={cn("eyebrow mt-4", saved && "!text-volt")}>
          {saved ? (editing ? "Changes saved" : "Session complete") : "Review"}
        </div>
        <h2 className="mt-2 font-display text-title-l font-extrabold">{title}</h2>
        {saved && (
          <p className="mt-2 text-body text-muted-foreground">
            {prs.length
              ? "New records today. That's the work paying off."
              : "Logged. Every session like this one adds up."}
          </p>
        )}
      </motion.div>

      <div className="relative mt-6 grid grid-cols-2 gap-2">
        {stats.map((x, i) => (
          <motion.div
            key={x.l}
            initial={saved && !reduce ? { opacity: 0, y: 12 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring.smooth, delay: saved ? 0.35 + i * 0.16 : 0 }}
            className="panel p-4"
          >
            <div className="eyebrow">{x.l}</div>
            <div
              className={cn(
                "num mt-2 text-title-l font-semibold",
                x.l === "Records" && x.v > 0 && "text-volt",
              )}
            >
              {saved ? (
                <NumberTicker value={x.v} decimals={x.d} intro delay={0.4 + i * 0.16} />
              ) : (
                x.v.toLocaleString(undefined, { maximumFractionDigits: x.d })
              )}
              {x.unit && <span className="unit">{x.unit}</span>}
            </div>
          </motion.div>
        ))}
      </div>
      {warmups > 0 && (
        <p className="mt-2 text-caption text-faint">
          {warmups} warm-up set{warmups === 1 ? "" : "s"} not counted or saved.
        </p>
      )}

      {prs.length > 0 && (
        <motion.div
          className="relative mt-4 overflow-hidden rounded-card border border-volt/25 bg-volt/[0.06]"
          initial={saved ? { opacity: 0, y: 8 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...tween("slow"), delay: saved ? 1.1 : 0 }}
        >
          {prs.map((p, i) => (
            <div
              key={i}
              className={cn(
                "flex items-center gap-3 px-4 py-3 text-label",
                i > 0 && "border-t border-volt/15",
              )}
            >
              <Trophy className="size-4 shrink-0 text-volt" strokeWidth={2} />
              <span className="flex-1 truncate">{p.ex}</span>
              <span className="num font-semibold text-volt">
                {p.kg} kg × {p.reps}
              </span>
            </div>
          ))}
        </motion.div>
      )}

      {saved && (
        <motion.div
          className="panel relative mt-4 p-4"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...tween("slow"), delay: 1.2 }}
        >
          <div className="eyebrow mb-3">Muscles worked</div>
          <BodyMap exercises={exercises} />
        </motion.div>
      )}

      {!saved && (
        <>
          <div className="mt-8 flex items-baseline justify-between">
            <span className="text-label font-semibold">How did it feel?</span>
            <span className="num text-label font-semibold">RPE {rpe}</span>
          </div>
          <Slider
            className="mt-2"
            min={1}
            max={10}
            step={1}
            value={[rpe]}
            onValueChange={([v]) => v && v !== rpe && (setRpe(v), feedback.selection())}
            aria-label="Session effort, 1 to 10"
          />
          <div className="mt-1 flex justify-between text-caption text-faint">
            <span>Easy</span>
            <motion.span
              key={rpe}
              initial={{ opacity: 0, y: 3 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: dur.fast }}
              className="font-semibold text-foreground"
            >
              {rpeAnchors[rpe]}
            </motion.span>
            <span>Max</span>
          </div>
          {!editing && (
            <label className="mt-7 block">
              <span className="text-label font-semibold">
                {coach ? `A note for ${coachFirst(coach)}` : "Session note"}
              </span>
              <span className="ml-2 text-caption text-faint">Optional</span>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={280}
                rows={3}
                placeholder="How it went, anything that felt off, what you're proud of"
                className="mt-2 w-full rounded-tile border border-input bg-surface p-3.5 text-body outline-none transition-colors placeholder:text-faint focus:border-volt/60"
              />
            </label>
          )}
        </>
      )}

      <div className="relative mt-auto space-y-2 pt-8">
        {!saved ? (
          <SaveButton onSave={onSave} onDone={onSaved}>
            {editing ? "Save changes" : "Save session"}
          </SaveButton>
        ) : (
          <motion.div
            className="space-y-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ ...tween("slow"), delay: 1.4 }}
          >
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={onShare}
              className="flex h-14 w-full items-center justify-center gap-2 rounded-full border border-hairline-strong bg-surface font-semibold transition-colors hover-device:bg-surface-2"
            >
              <Share2 className="size-5" strokeWidth={1.75} /> Share card
            </motion.button>
            <SheetBtn tone="primary" onClick={onClose}>
              Done
            </SheetBtn>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
