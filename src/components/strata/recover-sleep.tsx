import { useRef, useState } from "react";
import { format } from "date-fns";
import { AnimatePresence, motion } from "motion/react";
import { Moon, Plus } from "lucide-react";
import { sleepTimeline } from "@/lib/recover";
import { today } from "@/lib/stats";
import { dur, ease, exitTween, spring, tween, useIntro } from "@/lib/motion";
import { feedback } from "@/lib/feedback";
import { Segmented, TextAction } from "./ui";
import type { SleepLog } from "@/lib/types";

const GOAL = 8;

export function RecoverSleep({ sleep, onLog }: { sleep: SleepLog[]; onLog: () => void }) {
  const [days, setDays] = useState<"7" | "14">("14");
  const n = Number(days);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const intro = useIntro();
  const lastPick = useRef<string | null>(null);
  const timeline = sleepTimeline(sleep, today(), n);
  const selected =
    timeline.find((day) => day.date === selectedDate) ??
    [...timeline].reverse().find((day) => day.hours !== null) ??
    timeline[timeline.length - 1];
  const recorded = timeline.filter((day) => day.hours !== null);
  const average = recorded.length
    ? recorded.reduce((sum, day) => sum + (day.hours ?? 0), 0) / recorded.length
    : null;
  const max = Math.max(10, ...timeline.map((day) => day.hours ?? 0));
  const pick = (date: string | undefined) => {
    if (!date || date === lastPick.current) return;
    lastPick.current = date;
    feedback.selection();
    setSelectedDate(date);
  };
  const selectAt = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse" && event.buttons !== 1) return;
    const box = event.currentTarget.getBoundingClientRect();
    const index = Math.max(
      0,
      Math.min(n - 1, Math.floor(((event.clientX - box.left) / box.width) * n)),
    );
    pick(timeline[index]?.date);
  };
  const gap = average != null ? +(average - GOAL).toFixed(1) : null;
  const nb = " ";
  const insight =
    gap == null
      ? null
      : gap >= 0
        ? `You're averaging ${average!.toFixed(1)}${nb}h, right on your 8${nb}h goal.`
        : `You're averaging ${average!.toFixed(1)}${nb}h, ${Math.abs(gap)}${nb}h under your 8${nb}h goal.`;
  return (
    <section aria-label="Sleep trend" className="panel p-5">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 className="font-sans text-body font-bold [font-stretch:100%]">Your nights</h2>
        <Segmented
          className="w-44"
          value={days}
          onChange={(v) => (setDays(v), setSelectedDate(null))}
          options={[
            { value: "7", label: "7 nights" },
            { value: "14", label: "14" },
          ]}
        />
      </div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div aria-live="polite">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div
              key={selected?.date ?? "none"}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, transition: exitTween("fast") }}
              transition={tween("fast")}
            >
              <div className="eyebrow">
                {selected ? format(new Date(`${selected.date}T12:00`), "EEEE d MMM") : "Sleep"}
              </div>
              <div className="num mt-2 text-display font-semibold">
                {selected?.hours?.toFixed(1) ?? "—"}
                {selected?.hours != null && <span className="unit">h</span>}
              </div>
              <div className="mt-1 text-label text-muted-foreground">
                {selected?.quality != null
                  ? `Quality ${selected.quality.toFixed(1).replace(/\.0$/, "")} of 5${selected.entries.length > 1 ? ` · average of ${selected.entries.length} logs` : ""}`
                  : "No sleep logged"}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
        <div className="text-right">
          <div className="num text-title font-semibold">
            {average?.toFixed(1) ?? "—"}
            <span className="unit">h avg</span>
          </div>
          <div className="mt-1 text-caption text-faint">
            {recorded.length} of {n} nights logged
          </div>
        </div>
      </div>
      <div
        className="relative mt-7 touch-pan-y"
        onPointerDown={selectAt}
        onPointerMove={selectAt}
        onPointerUp={() => (lastPick.current = null)}
      >
        <svg
          viewBox="0 -12 336 136"
          className="h-32 w-full overflow-visible"
          role="img"
          aria-label={`Sleep over the last ${n} nights, with an 8 hour goal. ${insight ?? ""}`}
        >
          <line
            x1="0"
            x2="336"
            y1={112 - (GOAL / max) * 100}
            y2={112 - (GOAL / max) * 100}
            stroke="var(--text-3)"
            strokeDasharray="3 4"
            opacity="0.6"
          />
          <text
            x="336"
            y={104 - (GOAL / max) * 100}
            textAnchor="end"
            fill="var(--text-3)"
            fontSize={11}
            className="num"
          >
            8 h goal
          </text>
          {timeline.map((day, i) => {
            const h = day.hours === null ? 2 : (day.hours / max) * 100;
            const on = selected?.date === day.date;
            return (
              <motion.rect
                key={`${days}-${day.date}`}
                x={(i * 336) / n + 3}
                y={112 - h}
                width={336 / n - 6}
                height={h}
                rx="4"
                fill={day.hours === null ? "var(--surface-2)" : "var(--dream)"}
                style={{ transformBox: "fill-box", transformOrigin: "50% 100%" }}
                initial={intro ? { scaleY: 0, opacity: 0.4 } : false}
                animate={{ scaleY: 1, opacity: day.hours === null ? 1 : on ? 1 : 0.42 }}
                transition={{
                  scaleY: { duration: dur.deliberate, ease: ease.out, delay: intro ? i * 0.02 : 0 },
                  opacity: tween("fast"),
                }}
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex">
          {timeline.map((day) => (
            <button
              type="button"
              key={day.date}
              className="h-full min-w-0 flex-1 rounded-tile"
              aria-label={`${format(new Date(`${day.date}T12:00`), "EEE d MMM")}: ${day.hours === null ? "no sleep logged" : `${day.hours.toFixed(1)} hours`}`}
              aria-pressed={selected?.date === day.date}
              onClick={() => pick(day.date)}
            />
          ))}
        </div>
      </div>
      <div className="num mt-2 flex justify-between text-caption text-faint">
        <span>{format(new Date(`${timeline[0]?.date}T12:00`), "d MMM")}</span>
        <span>Today</span>
      </div>
      {insight && (
        <p className="mt-4 border-t border-hairline pt-4 text-label text-muted-foreground">
          {insight}
        </p>
      )}
      {!recorded.length && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={spring.smooth}
          className="mt-5 flex items-center gap-3 border-t border-hairline pt-4 text-label text-muted-foreground"
        >
          <Moon className="size-5 shrink-0 text-dream" />
          <span>
            {sleep.length
              ? "No nights logged in this period."
              : "Your next good night starts here."}
          </span>
          <span className="ml-auto">
            <TextAction onClick={onLog}>
              <span className="inline-flex items-center gap-1">
                <Plus className="size-4" /> Log sleep
              </span>
            </TextAction>
          </span>
        </motion.div>
      )}
    </section>
  );
}
