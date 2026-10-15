import { Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { formatDistanceToNowStrict } from "date-fns";
import { motion, useMotionValue, useTransform } from "motion/react";
import { Check, ChevronRight, TrendingDown, TrendingUp, Minus, ThumbsUp } from "lucide-react";
import { Avatar, Ring } from "./ui";
import { CoachKudos } from "./coach-kudos";
import { COMPLIANCE_TARGET } from "@/lib/coach";
import { trend, within } from "@/lib/stats";
import { spring, stagger } from "@/lib/motion";
import { feedback } from "@/lib/feedback";
import { cn } from "@/lib/utils";

export function status(pct: number) {
  if (pct >= 0.8)
    return { label: "On track", bar: "bg-volt", text: "text-volt", ring: "var(--volt)" };
  if (pct >= 0.5)
    return { label: "Behind", bar: "bg-ember", text: "text-ember", ring: "var(--ember)" };
  return {
    label: "At risk",
    bar: "bg-destructive",
    text: "text-destructive",
    ring: "var(--danger)",
  };
}

type Row = {
  id: string;
  display_name: string | null;
  goal: string | null;
  avatar_url?: string | undefined;
  workouts: { performed_at: string; title?: string }[];
  journal?: { mood: number }[];
};

/** One client at a glance: compliance ring, why they need you, and swipe left for kudos. */
export function ClientRow({
  r,
  index,
  reasons = [],
  kudos = false,
  selectable,
  selected,
  onSelect,
}: {
  r: Row;
  index: number;
  reasons?: string[];
  kudos?: boolean;
  selectable?: boolean;
  selected?: boolean;
  onSelect?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const dragging = useRef(false);
  const armed = useRef(false);
  const x = useMotionValue(0);
  const reveal = useTransform(x, [-90, -12, 0], [1, 0.4, 0]);
  const n = r.workouts.filter((w) => within(w.performed_at, 30)).length;
  const pct = Math.min(1, n / COMPLIANCE_TARGET);
  const st = status(pct);
  const last = r.workouts[0];
  const t = trend((r.journal ?? []).map((j) => j.mood));
  const TrendIcon = t === "up" ? TrendingUp : t === "down" ? TrendingDown : Minus;
  const body = (
    <>
      <div
        className="relative shrink-0"
        aria-label={`${Math.round(pct * 100)}% of the 30-day session target`}
      >
        <Ring value={pct} size={52} stroke={3.5} color={st.ring}>
          <Avatar name={r.display_name} src={r.avatar_url} size={40} />
        </Ring>
        {selectable && (
          <motion.span
            initial={false}
            animate={{ scale: selected ? 1 : 0.6, opacity: selected ? 1 : 0 }}
            transition={spring.snappy}
            className="absolute -bottom-0.5 -right-0.5 grid size-5 place-items-center rounded-full bg-volt text-primary-foreground ring-2 ring-surface"
          >
            <Check className="size-3" strokeWidth={3} />
          </motion.span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="truncate font-sans text-body font-semibold [font-stretch:100%]">
            {r.display_name ?? "Client"}
          </h3>
          <span className={cn("num shrink-0 text-caption font-semibold", st.text)}>
            {Math.round(pct * 100)}%
          </span>
        </div>
        {reasons.length ? (
          <div className="truncate text-caption text-ember">{reasons.join(" · ")}</div>
        ) : (
          <div className="truncate text-caption text-muted-foreground">
            {r.goal ?? "No goal set"}
          </div>
        )}
        <div className="mt-1 flex items-center gap-2 text-caption text-faint">
          <span className="truncate">
            {last
              ? `Trained ${formatDistanceToNowStrict(new Date(last.performed_at))} ago`
              : "No training yet"}
          </span>
          {!!r.journal?.length && (
            <span
              className={cn(
                "flex shrink-0 items-center gap-1",
                t === "up" ? "text-volt" : t === "down" ? "text-ember" : "",
              )}
              aria-label={`Mood trend ${t}`}
            >
              · <TrendIcon className="size-3.5" />
              mood
            </span>
          )}
        </div>
      </div>
      {!selectable && !kudos && <ChevronRight className="size-4 shrink-0 text-faint" />}
    </>
  );
  return (
    <motion.div
      className="relative min-w-0"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...spring.smooth, delay: stagger(index) }}
    >
      {kudos && (
        <motion.div
          style={{ opacity: reveal }}
          aria-hidden
          className="absolute inset-0 flex items-center justify-end gap-2 rounded-card bg-volt/15 pr-5 text-label font-semibold text-volt"
        >
          <ThumbsUp className="size-5" /> Kudos
        </motion.div>
      )}
      <motion.article
        style={{ x }}
        drag={kudos && !selectable ? "x" : false}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={{ left: 0.5, right: 0 }}
        dragDirectionLock
        onDragStart={() => {
          dragging.current = true;
        }}
        onDrag={(_, info) => {
          const over = info.offset.x < -64;
          if (over !== armed.current) {
            armed.current = over;
            feedback.selection();
          }
        }}
        onDragEnd={(_, info) => {
          armed.current = false;
          if (info.offset.x < -64) {
            feedback.impactLight();
            setOpen(true);
          }
          setTimeout(() => {
            dragging.current = false;
          }, 120);
        }}
        className={cn(
          "panel relative min-w-0 touch-pan-y p-0 transition-[filter,border-color] duration-200 hover-device:brightness-110",
          selected && "border-volt/50",
        )}
      >
        {selectable ? (
          <button
            type="button"
            onClick={() => (feedback.selection(), onSelect?.())}
            aria-pressed={selected}
            className="flex w-full min-w-0 items-center gap-3 p-3.5 text-left"
          >
            {body}
          </button>
        ) : (
          <div className="flex min-w-0 items-center">
            <Link
              draggable={false}
              to="/app/clients/$clientId"
              params={{ clientId: r.id }}
              onClick={(e) => {
                if (dragging.current) e.preventDefault();
              }}
              className="flex min-w-0 flex-1 items-center gap-3 rounded-card p-3.5"
              aria-label={`View ${r.display_name ?? "client"}`}
            >
              {body}
            </Link>
            {kudos && (
              <button
                type="button"
                aria-label={`Give kudos to ${r.display_name ?? "client"}`}
                onClick={() => (feedback.impactLight(), setOpen(true))}
                className="mr-2 grid size-11 shrink-0 place-items-center rounded-full text-faint transition-colors hover-device:bg-surface-2 hover-device:text-volt"
              >
                <ThumbsUp className="size-[18px]" />
              </button>
            )}
          </div>
        )}
      </motion.article>
      {open && (
        <CoachKudos
          open
          clientId={r.id}
          name={r.display_name}
          workout={last?.title ? { title: last.title } : undefined}
          onClose={() => setOpen(false)}
        />
      )}
    </motion.div>
  );
}
