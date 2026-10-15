import { useEffect, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { NumberTicker, SectionTitle } from "@/components/strata/ui";
import { clampWater } from "@/lib/fuel";
import { press, spring } from "@/lib/motion";
import { feedback } from "@/lib/feedback";
import { cn } from "@/lib/utils";

const GLASSES = 8;
const WAVE = "M0 8 Q 25 0 50 8 T 100 8 T 150 8 T 200 8 V 40 H 0 Z";

/** The bottle fills with a gently moving surface; the level rises on a spring. */
function Bottle({ level }: { level: number }) {
  const reduce = useReducedMotion();
  return (
    <div
      className="relative h-[156px] w-[92px] shrink-0 overflow-hidden rounded-[26px] border border-hairline-strong bg-surface-2"
      aria-hidden
    >
      <motion.div
        className="absolute inset-x-0 bottom-0 h-full"
        initial={false}
        animate={{ y: `${(1 - level) * 100}%` }}
        transition={{ type: "spring", stiffness: 140, damping: 20, mass: 1 }}
      >
        <svg
          viewBox="0 0 100 40"
          preserveAspectRatio="none"
          className="absolute -top-[10px] left-0 h-[14px] w-[200%]"
        >
          <motion.path
            d={WAVE}
            fill="var(--pulse)"
            fillOpacity={0.55}
            animate={reduce ? {} : { x: [0, -50] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: "linear" }}
          />
        </svg>
        <div className="absolute inset-0 bg-gradient-to-b from-pulse/55 to-pulse/30" />
      </motion.div>
      <div className="pointer-events-none absolute inset-y-3 left-2.5 w-1.5 rounded-full bg-white/10" />
    </div>
  );
}

export function FuelWater({ date, owner }: { date: string; owner: string }) {
  const key = `strata:water:${owner}:${date}`;
  const [water, setWater] = useState(0);
  useEffect(() => {
    try {
      setWater(
        clampWater(
          Number(localStorage.getItem(key) ?? localStorage.getItem(`strata-water-${date}`) ?? 0),
        ),
      );
    } catch {
      setWater(0);
    }
  }, [key, date]);
  const update = (value: number) => {
    const v = clampWater(value);
    if (v === water) return;
    setWater(v);
    if (v > water) feedback.impactLight();
    else feedback.selection();
    if (v === GLASSES && water < GLASSES) feedback.celebration();
    try {
      localStorage.setItem(key, String(v));
    } catch {
      /* Water remains usable for this visit. */
    }
  };
  const litres = water * 0.25;
  return (
    <section aria-label="Water tracking">
      <SectionTitle action={<span className="text-caption text-faint">250 ml a glass</span>}>
        Water
      </SectionTitle>
      <div className="panel flex items-center gap-5 p-5">
        <button
          type="button"
          onClick={() => update(water + 1)}
          aria-label="Add a glass of water"
          className="rounded-[26px]"
        >
          <Bottle level={water / GLASSES} />
        </button>
        <div className="min-w-0 flex-1">
          <div className="num text-title-l font-semibold">
            <NumberTicker value={litres} format={(n) => String(+n.toFixed(2))} intro={false} />
            <span className="unit">L of 2</span>
          </div>
          <p className="mt-1 text-caption text-muted-foreground">
            {water >= GLASSES
              ? "Goal reached. Nicely done."
              : `${GLASSES - water} glass${GLASSES - water === 1 ? "" : "es"} to go`}
          </p>
          <div className="mt-4 flex items-center gap-2">
            <motion.button
              whileTap={press.icon}
              type="button"
              onClick={() => update(water - 1)}
              disabled={water === 0}
              aria-label="Remove a glass"
              className="grid size-11 place-items-center rounded-full bg-surface-2 transition-opacity disabled:opacity-40"
            >
              <Minus className="size-5" />
            </motion.button>
            <motion.button
              whileTap={press.button}
              type="button"
              onClick={() => update(water + 1)}
              disabled={water >= GLASSES}
              className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-full bg-pulse/15 text-label font-semibold text-pulse transition-opacity disabled:opacity-40"
            >
              <Plus className="size-4" /> Glass
            </motion.button>
          </div>
          <div
            className="mt-4 flex gap-1.5"
            role="group"
            aria-label="Water, eight glasses of 250 millilitres"
          >
            {Array.from({ length: GLASSES }, (_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`${i + 1} glass${i ? "es" : ""}, ${(i + 1) * 250} ml`}
                aria-pressed={i < water}
                onClick={() => update(i + 1 === water ? i : i + 1)}
                className="grid h-6 flex-1 place-items-center"
              >
                <motion.span
                  className={cn(
                    "block h-1.5 w-full rounded-full",
                    i < water ? "bg-pulse" : "bg-surface-3",
                  )}
                  initial={false}
                  animate={{ scaleY: i < water ? 1 : 0.7 }}
                  transition={spring.snappy}
                />
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
