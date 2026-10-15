import { useEffect, useRef, useState } from "react";
import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "motion/react";
import { Check, Pause, Play, RotateCcw, X } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { BREATH_PATTERNS, breathPattern, patternSeconds, type BreathPattern } from "@/lib/recover";
import { exitTween, press, spring, tween } from "@/lib/motion";
import { feedback } from "@/lib/feedback";
import { Segmented } from "./ui";

const SMALL = 0.58;

/** A full-screen, calm breathing session. Nothing is logged. */
export function RecoverBreathing({ onClose }: { onClose: () => void }) {
  const [pattern, setPattern] = useState<BreathPattern>(BREATH_PATTERNS[0]!);
  const [elapsed, setElapsed] = useState(0);
  const [started, setStarted] = useState(false);
  const [paused, setPaused] = useState(false);
  const reduce = useReducedMotion();
  const total = patternSeconds(pattern);
  const frame = breathPattern(elapsed, pattern);
  const running = started && !paused && !frame.done;
  const scale = useMotionValue(SMALL);
  const glow = useTransform(scale, [SMALL, 1], [0.35, 0.9]);
  const base = useRef(0);

  // Clock: elapsed time advances only while running.
  useEffect(() => {
    if (!running) return;
    const start = Date.now();
    base.current = elapsed;
    const t = window.setInterval(
      () => setElapsed(Math.min(total, base.current + (Date.now() - start) / 1000)),
      100,
    );
    return () => window.clearInterval(t);
  }, [running]); // eslint-disable-line react-hooks/exhaustive-deps

  // The orb follows the breath: grow on inhale, rest on hold, shrink on exhale.
  useEffect(() => {
    if (!running || reduce) return;
    const target = frame.phase === 0 || frame.phase === 1 ? 1 : SMALL;
    const secs = Math.max(0.2, frame.phaseLen * (1 - frame.phaseProgress));
    const c = animate(scale, target, { duration: frame.phase % 2 ? 0.4 : secs, ease: "easeInOut" });
    return () => c.stop();
  }, [frame.phase, frame.rounds, running, reduce]); // eslint-disable-line react-hooks/exhaustive-deps

  // A gentle tick at every phase change.
  useEffect(() => {
    if (running) feedback.selection();
    if (frame.done && started) feedback.success();
  }, [frame.phase, frame.rounds, frame.done]); // eslint-disable-line react-hooks/exhaustive-deps

  const restart = () => {
    setElapsed(0);
    setPaused(false);
    setStarted(false);
    void animate(scale, SMALL, spring.gentle);
  };
  const mins = Math.floor(frame.remaining / 60);
  const secs = String(frame.remaining % 60).padStart(2, "0");

  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay asChild>
          <motion.div
            className="fixed inset-0 z-[60] bg-background"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={tween("slow")}
          />
        </Dialog.Overlay>
        <Dialog.Content asChild aria-describedby={undefined}>
          <motion.div
            className="fixed inset-0 z-[60] flex flex-col overflow-hidden px-6 pb-safe pt-[max(20px,env(safe-area-inset-top))]"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={spring.gentle}
          >
            <motion.div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                opacity: glow,
                background:
                  "radial-gradient(60% 45% at 50% 45%, color-mix(in oklab, var(--pulse) 22%, transparent), transparent 70%)",
              }}
            />
            <div className="relative mx-auto flex w-full max-w-md items-center justify-between">
              <span className="eyebrow">Breathe</span>
              <motion.button
                whileTap={press.icon}
                type="button"
                aria-label="Close breathing"
                onClick={onClose}
                className="grid size-11 place-items-center rounded-full bg-surface-2/70"
              >
                <X className="size-5" />
              </motion.button>
            </div>
            <div className="relative mx-auto mt-6 w-full max-w-md text-center">
              <Dialog.Title className="font-display text-title-l font-extrabold">
                {frame.done
                  ? "A little more space."
                  : started
                    ? "Follow the light."
                    : "Find your rhythm."}
              </Dialog.Title>
              <p className="mt-2 text-label text-muted-foreground">
                {frame.done
                  ? "Take the calm with you."
                  : `${pattern.label} · ${pattern.rounds} rounds · ${Math.round(total / 60)} min`}
              </p>
            </div>

            <div className="relative mx-auto my-auto grid size-[min(78vw,320px)] place-items-center">
              <motion.div
                aria-hidden
                className="absolute inset-0 rounded-full bg-pulse/25 blur-3xl"
                style={{ scale }}
              />
              <motion.div
                aria-hidden
                className="absolute inset-[6%] rounded-full border border-pulse/30 bg-[radial-gradient(circle_at_40%_35%,color-mix(in_oklab,var(--pulse)_55%,transparent),color-mix(in_oklab,var(--pulse)_14%,transparent)_70%)]"
                style={{ scale }}
              />
              <div className="relative text-center" aria-live="polite">
                <AnimatePresence mode="wait" initial={false}>
                  {frame.done ? (
                    <motion.div
                      key="done"
                      initial={{ scale: 0.6, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={spring.bouncy}
                    >
                      <Check className="mx-auto size-12 text-foreground" strokeWidth={2.2} />
                    </motion.div>
                  ) : (
                    <motion.div
                      key={started ? `${frame.rounds}-${frame.phase}-${paused}` : "idle"}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6, transition: exitTween("fast") }}
                      transition={tween("slow")}
                    >
                      <div className="font-display text-title font-bold">
                        {!started ? "Ready" : paused ? "Paused" : frame.name}
                      </div>
                      {started && (
                        <div className="num mt-1 text-display font-semibold">{frame.left}</div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-md">
              {!started && !frame.done ? (
                <Segmented
                  value={pattern.id}
                  onChange={(id) => (
                    setPattern(BREATH_PATTERNS.find((p) => p.id === id)!),
                    setElapsed(0)
                  )}
                  options={BREATH_PATTERNS.map((p) => ({
                    value: p.id,
                    label: p.id === "box" ? "Box" : "4-7-8",
                  }))}
                />
              ) : (
                <div>
                  <div className="flex justify-between text-caption text-muted-foreground">
                    <span>
                      Round {Math.min(pattern.rounds, frame.rounds + 1)} of {pattern.rounds}
                    </span>
                    <span className="num">
                      {mins}:{secs}
                    </span>
                  </div>
                  <div className="mt-2 h-1 overflow-hidden rounded-full bg-surface-2">
                    <motion.div
                      className="h-full origin-left rounded-full bg-pulse"
                      initial={false}
                      animate={{ scaleX: elapsed / total }}
                      transition={{ duration: 0.12, ease: "linear" }}
                    />
                  </div>
                </div>
              )}
              <div className="mb-4 mt-6 flex gap-3">
                <motion.button
                  whileTap={press.icon}
                  type="button"
                  aria-label="Restart breathing"
                  onClick={restart}
                  className="grid size-14 shrink-0 place-items-center rounded-full bg-surface-2"
                >
                  <RotateCcw className="size-5" />
                </motion.button>
                <motion.button
                  whileTap={press.button}
                  type="button"
                  onClick={() => {
                    feedback.impactLight();
                    if (frame.done) return onClose();
                    if (!started) return setStarted(true);
                    setPaused((v) => !v);
                  }}
                  className="flex h-14 flex-1 items-center justify-center gap-2 rounded-full bg-pulse text-body font-semibold text-background"
                >
                  {frame.done ? (
                    <Check className="size-5" />
                  ) : !started || paused ? (
                    <Play className="size-5" fill="currentColor" />
                  ) : (
                    <Pause className="size-5" />
                  )}
                  {frame.done ? "Done" : !started ? "Begin" : paused ? "Resume" : "Pause"}
                </motion.button>
              </div>
              <p className="mb-2 text-center text-caption text-faint">
                Keep it comfortable. Stop if you feel dizzy.
              </p>
            </div>
          </motion.div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
