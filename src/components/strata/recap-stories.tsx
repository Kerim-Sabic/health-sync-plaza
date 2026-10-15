import { useEffect, useRef, useState } from "react";
import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  type AnimationPlaybackControls,
} from "motion/react";
import { X } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { exitTween, press, spring, tween } from "@/lib/motion";
import { feedback } from "@/lib/feedback";
import { NumberTicker } from "./ui";

export type RecapSlide = {
  eyebrow: string;
  title: string;
  value?: number | null;
  decimals?: number;
  unit?: string;
  detail: string;
  color: string;
  quote?: { text: string; by: string };
};

const SLIDE_SECONDS = 5;

/** Weekly recap as full-screen stories: tap right for next, left for back, hold to pause, swipe down to close. */
export function RecapStories({ slides, onClose }: { slides: RecapSlide[]; onClose: () => void }) {
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const prog = useMotionValue(0);
  const ctl = useRef<AnimationPlaybackControls | null>(null);
  const held = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wasHold = useRef(false);
  const slide = slides[idx]!;
  const last = idx === slides.length - 1;

  const go = (d: number) => {
    const n = idx + d;
    if (n < 0) return prog.set(0);
    if (n >= slides.length) return onClose();
    feedback.selection();
    prog.set(0);
    setIdx(n);
  };

  useEffect(() => {
    ctl.current?.stop();
    if (paused) return;
    ctl.current = animate(prog, 1, {
      duration: SLIDE_SECONDS * (1 - prog.get()),
      ease: "linear",
      onComplete: () => (last ? undefined : go(1)),
    });
    return () => ctl.current?.stop();
  }, [idx, paused]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Dialog.Root open onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Content asChild aria-describedby={undefined}>
          <motion.div
            className="fixed inset-0 z-[60] mx-auto flex max-w-md flex-col overflow-hidden bg-background lg:inset-y-6 lg:rounded-sheet lg:border lg:border-hairline-strong"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96, transition: exitTween("base") }}
            transition={spring.smooth}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, i) => (i.offset.y > 120 || i.velocity.y > 800) && onClose()}
          >
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.div
                key={`bg${idx}`}
                aria-hidden
                className="pointer-events-none absolute inset-0"
                style={{
                  background: `radial-gradient(90% 60% at 50% 30%, color-mix(in oklab, ${slide.color} 22%, transparent), transparent 70%)`,
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={tween("deliberate")}
              />
            </AnimatePresence>
            <div className="relative z-10 px-4 pt-[max(12px,env(safe-area-inset-top))]">
              <div className="flex gap-1.5">
                {slides.map((_, i) => (
                  <div
                    key={i}
                    className="h-[3px] flex-1 overflow-hidden rounded-full bg-foreground/20"
                  >
                    <motion.div
                      className="h-full origin-left rounded-full bg-foreground"
                      style={{ scaleX: i < idx ? 1 : i === idx ? prog : 0 }}
                    />
                  </div>
                ))}
              </div>
              <div className="mt-3 flex items-center justify-between">
                <Dialog.Title className="eyebrow !text-muted-foreground">Your week</Dialog.Title>
                <motion.button
                  whileTap={press.icon}
                  type="button"
                  aria-label="Close recap"
                  onClick={onClose}
                  className="grid size-10 place-items-center rounded-full bg-foreground/10"
                >
                  <X className="size-5" />
                </motion.button>
              </div>
            </div>
            <div
              className="relative flex flex-1 select-none flex-col justify-center px-7"
              onPointerDown={() => {
                wasHold.current = false;
                held.current = setTimeout(() => ((wasHold.current = true), setPaused(true)), 220);
              }}
              onPointerUp={(e) => {
                if (held.current) clearTimeout(held.current);
                if (wasHold.current) return setPaused(false);
                const box = e.currentTarget.getBoundingClientRect();
                go(e.clientX - box.left < box.width / 3 ? -1 : 1);
              }}
              onPointerCancel={() => (held.current && clearTimeout(held.current), setPaused(false))}
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10, transition: exitTween("fast") }}
                  transition={spring.smooth}
                  aria-live="polite"
                >
                  <div className="eyebrow" style={{ color: slide.color }}>
                    {slide.eyebrow}
                  </div>
                  <h2 className="mt-3 font-display text-title-l font-extrabold">{slide.title}</h2>
                  {slide.value != null && (
                    <div className="num mt-6 text-[4.5rem] font-semibold leading-none tracking-tight">
                      <NumberTicker
                        value={slide.value}
                        decimals={slide.decimals ?? 0}
                        intro
                        delay={0.15}
                      />
                      {slide.unit && <span className="unit">{slide.unit}</span>}
                    </div>
                  )}
                  {slide.quote ? (
                    <blockquote className="mt-6">
                      <p className="text-[20px] leading-[1.5]">“{slide.quote.text}”</p>
                      <footer className="mt-4 text-label text-muted-foreground">
                        {slide.quote.by}
                      </footer>
                    </blockquote>
                  ) : (
                    <p className="mt-4 text-body text-muted-foreground">{slide.detail}</p>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
            <div className="relative z-10 px-6 pb-[max(20px,env(safe-area-inset-bottom))]">
              {last ? (
                <motion.button
                  whileTap={press.button}
                  type="button"
                  onClick={onClose}
                  className="h-14 w-full rounded-full bg-foreground text-body font-semibold text-background"
                >
                  Done
                </motion.button>
              ) : (
                <p className="text-center text-caption text-faint">
                  Tap to continue · hold to pause
                </p>
              )}
            </div>
          </motion.div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
