import { clock, useNow } from "./session";
import {
  doneCount,
  elapsedMs,
  isPaused,
  nextProgramDay,
  unfinishedCount,
} from "@/lib/session-state";
import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Dumbbell,
  Flame,
  Moon,
  Smile,
  Play,
  Check,
  Activity,
  ChevronRight,
  Droplets,
  Beef,
  Sparkles,
  Scale,
  MessageSquare,
} from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { Switch } from "@/components/ui/switch";
import { format, formatDistanceToNowStrict } from "date-fns";
import { useApi, useLog, useQ } from "@/lib/api";
import {
  avg,
  coachFirst,
  dayOf,
  fmtVolume,
  isCardio,
  lastNDays,
  macrosFor,
  readiness,
  readinessParts,
  streak,
  today,
  volume,
  volumeText,
  weekStart,
  within,
} from "@/lib/stats";
import { FUEL_TARGET } from "@/lib/fuel";
import {
  Avatar,
  Bars,
  Divider,
  NumberTicker,
  Panel,
  PrimaryButton,
  Ring,
  SectionTitle,
  Segments,
  Skeleton,
  Sparkline,
  Stat,
  Tag,
  TextAction,
  Value,
} from "./ui";
import { Sheet } from "./sheets";
import { useShell } from "./shell";
import { dur, ease, press, spring, tween } from "@/lib/motion";
import { feedback } from "@/lib/feedback";
import { cn } from "@/lib/utils";
import type { Program, Workout } from "@/lib/types";

export function useClientData(userId?: string) {
  const workouts = useLog("workouts", userId);
  const sleep = useLog("sleep_logs", userId);
  const food = useLog("nutrition_logs", userId);
  const journal = useLog("journal_entries", userId);
  const metrics = useLog("body_metrics", userId);
  return {
    workouts: workouts.data ?? [],
    sleep: sleep.data ?? [],
    food: food.data ?? [],
    journal: journal.data ?? [],
    metrics: metrics.data ?? [],
    loading: workouts.isLoading || sleep.isLoading || food.isLoading || journal.isLoading,
  };
}

/** One coach-voiced sentence for today's readiness. */
export function readinessAdvice(score: number, hasData: boolean) {
  if (!hasData)
    return {
      title: "Log last night's sleep",
      body: "Your readiness appears here once there's a night to read.",
    };
  if (score >= 75)
    return { title: "Recovery is strong", body: "Today is a good day to push your top set." };
  if (score >= 55)
    return { title: "You're steady", body: "Train as planned and leave a rep in reserve." };
  return { title: "Still catching up", body: "Keep today lighter and focus on moving well." };
}

function ReadinessSheet({
  open,
  onOpenChange,
  userId,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  userId: string;
}) {
  const d = useClientData(userId);
  const [lighter, setLighter] = useLighter();
  const score = readiness(d.sleep, d.workouts);
  const parts = readinessParts(
    d.sleep,
    d.workouts,
    d.journal.map((j) => j.mood),
  );
  const hasData = d.sleep.length > 0;
  const advice = readinessAdvice(score, hasData);
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={hasData ? `Readiness ${score}` : "Readiness"}
      sub="A daily blend of how you slept, how hard you've trained and how you feel."
    >
      <div className="overflow-hidden rounded-card border border-hairline bg-surface">
        {[
          {
            icon: Moon,
            tone: "text-dream",
            name: "Sleep",
            value: hasData ? `${parts.sleepHours} h · ${parts.sleepScore}/100` : "No nights yet",
            body: "Your last 3 nights. Hours count for 70%, quality for the rest. Eight hours is full marks.",
          },
          {
            icon: Dumbbell,
            tone: "text-volt",
            name: "Training load",
            value: `${parts.sessions48h} session${parts.sessions48h === 1 ? "" : "s"} in 48 h`,
            body: "Hard sessions back to back lower readiness so you recover before you push again.",
          },
          {
            icon: Smile,
            tone: "text-pulse",
            name: "Mood",
            value: parts.mood ? `${parts.mood} of 5` : "No check-ins",
            body: "Your recent check-ins tell your coach how stress and energy are tracking.",
          },
        ].map((r, i) => (
          <div key={r.name}>
            {i > 0 && <Divider inset />}
            <div className="flex gap-3 p-4">
              <r.icon className={`mt-0.5 size-5 shrink-0 ${r.tone}`} strokeWidth={1.75} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <span className="font-semibold">{r.name}</span>
                  <span className="num text-label text-muted-foreground">{r.value}</span>
                </div>
                <p className="mt-1 text-label text-muted-foreground">{r.body}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-5 text-body">
        {advice.title}. {advice.body}
      </p>
      {hasData && score < 60 && (
        <label className="mt-4 flex min-h-[64px] items-center justify-between gap-3 rounded-card border border-hairline bg-surface px-4">
          <span>
            <span className="block font-semibold">Go 10% lighter today</span>
            <span className="text-caption text-muted-foreground">
              Suggested weights drop 10% for today only
            </span>
          </span>
          <Switch checked={lighter} onCheckedChange={setLighter} />
        </label>
      )}
    </Sheet>
  );
}

/** Readiness on its own (used on the coach's client page). */
export function ReadinessHero({
  userId,
  interactive = true,
}: {
  userId: string;
  interactive?: boolean;
}) {
  const d = useClientData(userId);
  const [open, setOpen] = useState(false);
  if (d.loading) return <Skeleton className="h-[164px] w-full !rounded-card" />;
  const score = readiness(d.sleep, d.workouts);
  const hasData = d.sleep.length > 0;
  const m = macrosFor(d.food, today());
  const advice = readinessAdvice(score, hasData);
  return (
    <>
      <Panel
        onClick={interactive ? () => setOpen(true) : undefined}
        label="Readiness details"
        className="p-5"
      >
        <div className="flex items-center gap-5">
          <Ring value={hasData ? score / 100 : 0} size={104} stroke={8}>
            <div>
              <div className="num text-title-l font-semibold leading-none">
                {hasData ? <NumberTicker value={score} /> : "—"}
              </div>
              <div className="eyebrow mt-1.5">Ready</div>
            </div>
          </Ring>
          <div className="min-w-0 flex-1">
            <div className="font-display text-title font-bold">{advice.title}</div>
            <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-3">
              <Stat
                size="sm"
                label="Sleep"
                value={d.sleep[0] ? (+d.sleep[0].hours).toFixed(1) : "—"}
                unit={d.sleep[0] ? "h" : undefined}
              />
              <Stat size="sm" label="Streak" value={streak(d.workouts)} unit="days" />
              <Stat
                size="sm"
                label="Eaten"
                value={m.calories ? m.calories.toLocaleString() : "—"}
                unit={m.calories ? "kcal" : undefined}
              />
              <Stat
                size="sm"
                label="Protein"
                value={m.protein || "—"}
                unit={m.protein ? "g" : undefined}
              />
            </div>
          </div>
        </div>
      </Panel>
      {interactive && <ReadinessSheet open={open} onOpenChange={setOpen} userId={userId} />}
    </>
  );
}

/** Which program day is next, and which were already done this week. */
export function programWeek(p: Program, workouts: Workout[]) {
  const ws = weekStart(new Date());
  const thisWeek = workouts.filter((w) => weekStart(w.performed_at) === ws);
  const done = p.days.map((d) => thisWeek.some((w) => w.title === d.title));
  const nextIdx = done.findIndex((x) => !x);
  return { done, nextIdx, thisWeek };
}

function LiveSessionCard() {
  const { session, openSession } = useShell();
  const now = useNow();
  if (!session) return null;
  const paused = isPaused(session);
  return (
    <div>
      <div className="flex items-center gap-2">
        <span className="relative flex size-2">
          {!paused && (
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-volt/70 motion-reduce:hidden" />
          )}
          <span
            className={cn(
              "relative inline-flex size-2 rounded-full",
              paused ? "bg-faint" : "bg-volt",
            )}
          />
        </span>
        <span className="eyebrow">{paused ? "Session paused" : "Session in progress"}</span>
      </div>
      <div className="mt-2 flex items-baseline justify-between gap-3">
        <div className="truncate font-display text-title font-bold">{session.title}</div>
        <div className="num text-title font-semibold">
          {clock(Math.floor(elapsedMs(session, now) / 1000) * 1000)}
        </div>
      </div>
      <p className="mt-1 text-label text-muted-foreground">
        {doneCount(session)} set{doneCount(session) === 1 ? "" : "s"} done ·{" "}
        {unfinishedCount(session)} to go
      </p>
      <PrimaryButton
        className="mt-5"
        onClick={openSession}
        icon={<Play className="size-5" fill="currentColor" />}
      >
        Resume
      </PrimaryButton>
    </div>
  );
}

/** The session half of the day hero: next program day, a session in progress, or what you did today. */
function SessionBlock({ userId }: { userId: string }) {
  const { startSession, session } = useShell();
  const assignments = useQ(["assignments", userId], (api) => api.assignments(userId));
  const programs = useQ(["programs"], (api) => api.programs());
  const workouts = useLog("workouts", userId).data ?? [];
  if (session && !session.editingId) return <LiveSessionCard />;
  if (assignments.isLoading || programs.isLoading)
    return (
      <div className="space-y-3">
        <Skeleton className="h-3 w-40" />
        <Skeleton className="h-6 w-56" />
        <Skeleton className="h-14 w-full !rounded-full" />
      </div>
    );
  const a = assignments.data?.[0];
  const p = programs.data?.find((x) => x.id === a?.program_id);
  const todays = workouts.filter((w) => dayOf(w.performed_at) === today());

  if (todays.length) {
    const nx = p ? nextProgramDay(p, programWeek(p, workouts).done, todays[0]!.performed_at) : null;
    return (
      <div>
        <div className="flex items-center gap-2 text-volt">
          <Check className="size-4" strokeWidth={2.4} />
          <span className="eyebrow !text-volt">Trained today</span>
        </div>
        <div className="mt-3 space-y-2">
          {todays.map((w) => (
            <WorkoutRow key={w.id} w={w} flat />
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <div className="text-label text-muted-foreground">
            {p ? (
              nx ? (
                <>
                  Next: <span className="font-semibold text-foreground">{nx.title}</span> ·{" "}
                  {nx.weekday}
                </>
              ) : (
                "Week complete. Recover well."
              )
            ) : (
              "Recover well. See you next session."
            )}
          </div>
          <TextAction onClick={() => startSession()}>Another session</TextAction>
        </div>
      </div>
    );
  }

  if (!p || !a)
    return (
      <div>
        <div className="eyebrow">Today</div>
        <div className="mt-2 font-display text-title font-bold">Open training day</div>
        <p className="mt-1 text-label text-muted-foreground">
          Start a session and log your sets as you go.
        </p>
        <PrimaryButton
          className="mt-5"
          onClick={() => startSession()}
          icon={<Play className="size-5" fill="currentColor" />}
        >
          Start session
        </PrimaryButton>
      </div>
    );

  const week = Math.min(
    p.weeks,
    Math.floor((Date.now() - new Date(a.start_date).getTime()) / (7 * 86400000)) + 1,
  );
  const { done, nextIdx } = programWeek(p, workouts);
  const day = p.days[nextIdx >= 0 ? nextIdx : 0]!;
  const allDone = nextIdx < 0;
  const est = Math.max(
    15,
    Math.round(
      day.exercises.reduce((m, e) => m + e.sets * ((e.rest_seconds ?? 90) + 40), 0) / 60 / 5,
    ) * 5,
  );
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div className="eyebrow truncate">
          {p.name} · Week {week} of {p.weeks}
        </div>
        <span className="num shrink-0 text-caption text-faint">
          {done.filter(Boolean).length}/{done.length} this week
        </span>
      </div>
      <Segments
        total={done.length}
        done={done.filter(Boolean).length}
        current={nextIdx}
        className="mt-3"
      />
      <div className="mt-4 font-display text-title font-bold">
        {allDone ? "Week complete. Bonus session?" : day.title}
      </div>
      <div className="mt-1 text-label text-muted-foreground">
        {day.exercises.length} exercise{day.exercises.length === 1 ? "" : "s"} · about {est} min
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {day.exercises.slice(0, 4).map((e) => (
          <span
            key={e.name}
            className="rounded-full bg-surface-2 px-2.5 py-1 text-caption text-muted-foreground"
          >
            {e.name}{" "}
            <span className="num text-faint">
              {e.sets}×{e.reps}
            </span>
          </span>
        ))}
      </div>
      <PrimaryButton
        className="mt-5"
        onClick={() => startSession(day)}
        icon={<Play className="size-5" fill="currentColor" />}
      >
        Start session
      </PrimaryButton>
    </div>
  );
}

/** Kept for other screens: the session card on its own. */
export function TodaySession({ userId }: { userId: string }) {
  return (
    <Panel index={2} className="mt-3">
      <SessionBlock userId={userId} />
    </Panel>
  );
}

/** Today's hero: readiness and today's session as one story. */
export function DayHero({ userId }: { userId: string }) {
  const d = useClientData(userId);
  const [open, setOpen] = useState(false);
  const reduce = useReducedMotion();
  if (d.loading) return <Skeleton className="h-[340px] w-full !rounded-card" />;
  const score = readiness(d.sleep, d.workouts);
  const hasData = d.sleep.length > 0;
  const advice = readinessAdvice(score, hasData);
  return (
    <Panel index={0} className="relative overflow-hidden p-0">
      {hasData && !reduce && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute -left-12 -top-14 size-56 rounded-full bg-volt/10 blur-3xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.45, 0.9, 0.45] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />
      )}
      <button
        type="button"
        onClick={() => (feedback.selection(), setOpen(true))}
        aria-label={hasData ? `Readiness ${score}. See what drives it` : "About readiness"}
        className="relative flex w-full items-center gap-5 p-5 text-left"
      >
        <Ring value={hasData ? score / 100 : 0} size={96} stroke={7}>
          <div>
            <div className="num text-title-l font-semibold leading-none">
              {hasData ? <NumberTicker value={score} /> : "—"}
            </div>
            <div className="eyebrow mt-1.5">Ready</div>
          </div>
        </Ring>
        <div className="min-w-0 flex-1">
          <div className="font-display text-title font-bold">{advice.title}</div>
          <p className="mt-1 text-label text-muted-foreground">{advice.body}</p>
          <span className="mt-2 inline-flex items-center gap-0.5 text-caption font-semibold text-faint">
            What drives this <ChevronRight className="size-3.5" />
          </span>
        </div>
      </button>
      <Divider className="mx-5" />
      <div className="relative p-5">
        <SessionBlock userId={userId} />
      </div>
      <ReadinessSheet open={open} onOpenChange={setOpen} userId={userId} />
    </Panel>
  );
}

/** Today's targets: compact rings, each one tap away from logging. */
export function TodayTargets({ userId }: { userId: string }) {
  const d = useClientData(userId);
  const { log } = useShell();
  const { mode } = useApi();
  const navigate = useNavigate();
  const [water, setWater] = useState(0);
  useEffect(() => {
    try {
      setWater(Number(localStorage.getItem(`strata:water:${mode}:${userId}:${today()}`) ?? 0) || 0);
    } catch {
      setWater(0);
    }
  }, [mode, userId]);
  if (d.loading) return <Skeleton className="mt-3 h-[124px] w-full !rounded-card" />;
  const m = macrosFor(d.food, today());
  const lastNight =
    d.sleep[0] && within(d.sleep[0].log_date + "T12:00", 1.5) ? d.sleep[0] : undefined;
  const items = [
    {
      key: "kcal",
      label: "Calories",
      icon: Flame,
      value: m.calories,
      target: FUEL_TARGET.calories,
      unit: "kcal",
      color: "var(--ember)",
      go: () => log("food"),
      fmt: (n: number) => (n >= 1000 ? (n / 1000).toFixed(1) + "k" : String(Math.round(n))),
    },
    {
      key: "protein",
      label: "Protein",
      icon: Beef,
      value: m.protein,
      target: FUEL_TARGET.protein,
      unit: "g",
      color: "var(--ember-2)",
      go: () => log("food"),
      fmt: (n: number) => String(Math.round(n)),
    },
    {
      key: "water",
      label: "Water",
      icon: Droplets,
      value: water * 0.25,
      target: 2,
      unit: "L",
      color: "var(--pulse)",
      go: () => navigate({ to: "/app/fuel" }),
      fmt: (n: number) => String(+n.toFixed(2)),
    },
    {
      key: "sleep",
      label: "Sleep",
      icon: Moon,
      value: lastNight ? +lastNight.hours : 0,
      target: 8,
      unit: "h",
      color: "var(--dream)",
      go: () => log("sleep"),
      fmt: (n: number) => String(+n.toFixed(1)),
    },
  ];
  return (
    <div className="mt-3 grid grid-cols-4 gap-2" role="list" aria-label="Today's targets">
      {items.map((t, i) => (
        <motion.button
          key={t.key}
          role="listitem"
          type="button"
          whileTap={press.card}
          onClick={() => (feedback.selection(), t.go())}
          aria-label={`${t.label}: ${t.value ? t.fmt(t.value) : 0} of ${t.fmt(t.target)} ${t.unit}. Log ${t.label.toLowerCase()}`}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...tween("slow", "emphasized"), delay: 0.08 + i * 0.035 }}
          className="panel flex flex-col items-center px-1 pb-3 pt-3.5 transition-[filter] hover-device:brightness-110"
        >
          <Ring value={t.value / t.target} size={48} stroke={4} color={t.color}>
            <t.icon
              className={cn("size-4", t.value ? "text-foreground" : "text-faint")}
              strokeWidth={1.9}
            />
          </Ring>
          <div className="mt-2 text-center">
            <div className="num text-label font-semibold leading-tight">
              {t.value ? t.fmt(t.value) : <span className="text-faint">0</span>}
            </div>
            <div className="text-[12px] font-medium leading-tight text-faint">
              of {t.fmt(t.target)} {t.unit}
            </div>
          </div>
        </motion.button>
      ))}
    </div>
  );
}

/** The latest coach note, written like a personal letter. */
export function PinnedCoachNote({ userId }: { userId: string }) {
  const notes = useQ(["notes", userId], (api) => api.notes(userId));
  const coach = useQ(["my-trainer"], (api) => api.myTrainer());
  const n = notes.data?.find((x) => !x.from_client);
  const [seen, setSeen] = useState(true);
  useEffect(() => {
    if (!n) return;
    let t: ReturnType<typeof setTimeout> | undefined;
    try {
      setSeen(localStorage.getItem("strata:note-seen") === n.id);
      t = setTimeout(() => localStorage.setItem("strata:note-seen", n.id), 2500);
    } catch {
      setSeen(true);
    }
    return () => clearTimeout(t);
  }, [n]);
  if (!n || !within(n.created_at, 7)) return null;
  const name = coach.data?.display_name ?? "Your coach";
  return (
    <Panel index={2} className="mt-3 p-5">
      <div className="flex items-center gap-3">
        <div className="relative">
          <Avatar name={name} src={coach.data?.avatar_url} size={40} />
          {!seen && (
            <span
              aria-label="New"
              className="absolute -right-0.5 -top-0.5 size-3 rounded-full bg-volt ring-2 ring-surface"
            />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-label font-semibold">{name}</div>
          <div className="text-caption text-faint">
            Your coach · {formatDistanceToNowStrict(new Date(n.created_at))} ago
          </div>
        </div>
      </div>
      <p className="mt-4 text-[17px] leading-[1.6] text-foreground">{n.body}</p>
      {coach.data && (
        <Link
          to="/app/messages"
          className="mt-4 inline-flex min-h-[40px] items-center gap-1.5 rounded-full bg-surface-2 px-4 text-label font-semibold transition-colors hover-device:bg-surface-3"
        >
          <MessageSquare className="size-4" strokeWidth={1.9} /> Reply
        </Link>
      )}
    </Panel>
  );
}

export function FirstRun({ userId }: { userId: string }) {
  const d = useClientData(userId);
  const { log, startSession } = useShell();
  const trainer = useQ(["my-trainer"], (api) => api.myTrainer());
  if (d.loading) return null;
  const coach = trainer.data?.display_name;
  const steps = [
    { done: d.food.length > 0, label: "Log your first meal", go: () => log("food") },
    { done: d.workouts.length > 0, label: "Do your first session", go: () => startSession() },
    { done: d.sleep.length > 0, label: "Log last night's sleep", go: () => log("sleep") },
  ];
  const n = steps.filter((s) => s.done).length;
  if (n >= steps.length || d.workouts.length + d.food.length + d.sleep.length > 6) return null;
  return (
    <Panel index={1} className="mt-3">
      <div className="flex items-center gap-2 text-volt">
        <Sparkles className="size-4" strokeWidth={2} />
        <span className="eyebrow !text-volt">Welcome</span>
      </div>
      <div className="mt-2 font-display text-title font-bold">
        {coach ? `${coachFirst(coach)} is ready for you` : "Let's set your baseline"}
      </div>
      {trainer.data?.bio ? (
        <blockquote className="mt-3 flex gap-3">
          <Avatar name={coach} src={trainer.data.avatar_url} size={32} />
          <p className="text-body italic text-foreground">“{trainer.data.bio}”</p>
        </blockquote>
      ) : (
        <p className="mt-1 text-label text-muted-foreground">
          Three small steps give {coach ? "your coach" : "you"} a picture of where you're starting.
        </p>
      )}
      <ul className="mt-4 overflow-hidden rounded-tile border border-hairline">
        {steps.map((s, i) => (
          <li key={s.label} className={cn(i > 0 && "border-t border-hairline")}>
            <button
              disabled={s.done}
              onClick={s.go}
              className="flex min-h-[52px] w-full items-center gap-3 px-4 text-left text-body hover-device:bg-surface-2/50 disabled:cursor-default"
            >
              <motion.span
                initial={false}
                animate={{ scale: s.done ? [1, 1.2, 1] : 1 }}
                transition={{ duration: dur.slow, ease: ease.standard }}
                className={cn(
                  "grid size-6 shrink-0 place-items-center rounded-full border",
                  s.done
                    ? "border-transparent bg-volt text-primary-foreground"
                    : "border-hairline-strong",
                )}
              >
                {s.done && <Check className="size-3.5" strokeWidth={3} />}
              </motion.span>
              <span
                className={cn("flex-1", s.done && "text-faint line-through decoration-faint/50")}
              >
                {s.label}
              </span>
              {!s.done && <ChevronRight className="size-4 text-faint" />}
            </button>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

export function WorkoutRow({
  w,
  onEdit,
  flat,
  showNote,
}: {
  w: Workout;
  onEdit?: () => void;
  flat?: boolean;
  showNote?: boolean;
}) {
  const cardio = isCardio(w);
  const v = fmtVolume(volume(w));
  const Tagname = onEdit ? "button" : "div";
  return (
    <Tagname
      {...(onEdit
        ? {
            type: "button" as const,
            onClick: onEdit,
            "aria-label": `Edit ${w.title}, ${format(new Date(w.performed_at), "EEE d MMM")}`,
          }
        : {})}
      className={cn(
        "flex w-full items-center gap-3 text-left",
        flat ? "rounded-tile bg-surface-2/60 p-3" : "panel p-3.5",
        onEdit && "transition-[filter] hover-device:brightness-110",
      )}
    >
      <div className="grid size-11 shrink-0 place-items-center rounded-tile bg-surface-3">
        {cardio ? (
          <Activity className="size-5 text-foreground" strokeWidth={1.75} />
        ) : (
          <Dumbbell className="size-5 text-foreground" strokeWidth={1.75} />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate font-semibold">{w.title}</div>
        <div className="num text-caption text-muted-foreground">
          {format(new Date(w.performed_at), "EEE d MMM")} · {w.duration_min ?? "–"} min
          {w.rpe ? ` · RPE ${w.rpe}` : ""}
        </div>
        {showNote && w.notes && (
          <p className="mt-1.5 line-clamp-2 text-label italic text-foreground">“{w.notes}”</p>
        )}
      </div>
      {cardio ? (
        <Tag tone="pulse">Cardio</Tag>
      ) : (
        <Value unit={v.unit} className="text-body font-semibold">
          {v.value}
        </Value>
      )}
    </Tagname>
  );
}

export function ClientOverview({ userId, trainerView }: { userId: string; trainerView?: boolean }) {
  const d = useClientData(userId);
  if (d.loading)
    return (
      <div className="mt-10 space-y-3">
        <Skeleton className="h-44 !rounded-card" />
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-32 !rounded-card" />
          <Skeleton className="h-32 !rounded-card" />
        </div>
      </div>
    );
  const days = lastNDays(28);
  const byDay = days.map((day) => d.workouts.filter((w) => dayOf(w.performed_at) === day));
  const sessions = d.workouts.filter((w) => within(w.performed_at, 28));
  const sleep7 = d.sleep.slice(0, 7);
  const mood7 = d.journal.slice(0, 7);
  const kcal7Days = lastNDays(7);
  const kcal7 = kcal7Days.map((day) => macrosFor(d.food, day).calories);
  const w = d.metrics.filter((x) => x.weight != null);
  const weightDelta = w.length > 1 ? +(w[0]!.weight! - w.at(-1)!.weight!).toFixed(1) : null;
  const vol = fmtVolume(sessions.reduce((a, x) => a + volume(x), 0));
  const avgRpe = avg(sessions.map((x) => x.rpe ?? 0).filter(Boolean));

  return (
    <div>
      <SectionTitle>Last 28 days</SectionTitle>
      <div className="panel p-5">
        <div className="mb-6 grid grid-cols-3 gap-3">
          <Stat label="Sessions" value={<NumberTicker value={sessions.length} />} />
          <Stat label="Lifted" value={vol.value} unit={vol.unit} />
          <Stat
            label="Avg effort"
            value={avgRpe ? avgRpe.toFixed(1) : "—"}
            unit={avgRpe ? "/ 10" : undefined}
          />
        </div>
        <Bars
          values={byDay.map((ws) =>
            ws.reduce((a, x) => a + Math.max(volume(x), (x.duration_min ?? 0) * 40), 0),
          )}
          color="var(--text-2)"
          highlightLast
          labels={days.map((x, i) => (i % 7 === 0 ? format(new Date(x + "T12:00"), "d MMM") : ""))}
          tip={(i) => {
            const ws = byDay[i]!;
            const dt = format(new Date(days[i]! + "T12:00"), "EEE d MMM");
            return ws.length ? `${dt} · ${ws.map((x) => x.title).join(", ")}` : `${dt} · Rest`;
          }}
        />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <MiniTrend
          icon={Moon}
          tone="text-dream"
          color="var(--dream)"
          label="Sleep"
          value={sleep7.length ? avg(sleep7.map((x) => +x.hours)).toFixed(1) : "—"}
          unit={sleep7.length ? "h / night" : undefined}
          note="Last 7 nights"
          values={[...sleep7].reverse().map((x) => +x.hours)}
        />
        <MiniTrend
          icon={Flame}
          tone="text-ember"
          color="var(--ember)"
          label="Food"
          value={kcal7.some(Boolean) ? Math.round(avg(kcal7)).toLocaleString() : "—"}
          unit={kcal7.some(Boolean) ? "kcal / day" : undefined}
          note="Last 7 days"
          values={kcal7}
        />
        <MiniTrend
          icon={Smile}
          tone="text-pulse"
          color="var(--pulse)"
          label="Mood"
          value={mood7.length ? avg(mood7.map((x) => x.mood)).toFixed(1) : "—"}
          unit={mood7.length ? "/ 5" : undefined}
          note="Last 7 check-ins"
          values={[...mood7].reverse().map((x) => x.mood)}
        />
        <div className="panel p-4">
          <Scale className="mb-3 size-4 text-faint" strokeWidth={1.9} />
          <Stat
            label="Weight"
            value={w[0]?.weight ?? "—"}
            unit={w[0]?.weight != null ? "kg" : undefined}
          />
          <div className="mt-3 text-caption text-muted-foreground">
            {weightDelta != null ? (
              <>
                <span className="num font-semibold text-foreground">
                  {weightDelta > 0 ? "+" : weightDelta < 0 ? "−" : ""}
                  {Math.abs(weightDelta)} kg
                </span>{" "}
                since your first weigh-in
              </>
            ) : (
              "Weigh in twice to see a trend"
            )}
          </div>
        </div>
      </div>

      <SectionTitle
        action={
          !trainerView ? (
            <Link
              to="/app/train"
              className="-mr-2 flex min-h-[44px] items-center px-2 text-label font-semibold text-primary"
            >
              See all
            </Link>
          ) : undefined
        }
      >
        Recent sessions
      </SectionTitle>
      <div className="space-y-2">
        {d.workouts.slice(0, trainerView ? 6 : 3).map((x) => (
          <WorkoutRow key={x.id} w={x} showNote={!!trainerView} />
        ))}
        {!d.workouts.length && (
          <div className="rounded-card border border-dashed border-hairline-strong p-5 text-center text-label text-muted-foreground">
            Your first session will show up here.
          </div>
        )}
      </div>

      {trainerView && (
        <>
          <SectionTitle>Latest check-ins</SectionTitle>
          <div className="space-y-2">
            {d.journal.slice(0, 4).map((j) => (
              <div key={j.id} className="panel p-4">
                <div className="num mb-1.5 text-caption text-faint">
                  {format(new Date(j.created_at), "EEE d MMM")} · mood {j.mood}/5 · energy{" "}
                  {j.energy}/5
                </div>
                <div className="text-body">{j.body ?? "No note."}</div>
              </div>
            ))}
            {!d.journal.length && (
              <div className="rounded-card border border-dashed border-hairline-strong p-5 text-center text-label text-muted-foreground">
                No check-ins yet.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function MiniTrend({
  icon: Icon,
  tone,
  color,
  label,
  value,
  unit,
  note,
  values,
}: {
  icon: typeof Moon;
  tone: string;
  color: string;
  label: string;
  value: string | number;
  unit?: string | undefined;
  note: string;
  values: number[];
}) {
  return (
    <div className="panel p-4">
      <Icon className={cn("mb-3 size-4", tone)} strokeWidth={1.9} />
      <Stat label={label} value={value} unit={unit} />
      <div className="mt-3 flex items-end justify-between gap-2">
        <span className="text-caption text-faint">{note}</span>
        <Sparkline values={values} color={color} width={64} height={24} fill={false} />
      </div>
    </div>
  );
}

export { volumeText };

const LIGHTER_KEY = "strata:lighter";
export function useLighter() {
  const [on, setOn] = useState(
    () => typeof window !== "undefined" && localStorage.getItem(LIGHTER_KEY) === today(),
  );
  const set = (v: boolean) => {
    setOn(v);
    if (v) localStorage.setItem(LIGHTER_KEY, today());
    else localStorage.removeItem(LIGHTER_KEY);
    feedback.selection();
  };
  return [on, set] as const;
}

/** Streak chip: appears from three days in a row. */
export function StreakFlame({ userId }: { userId: string }) {
  const d = useClientData(userId);
  const s = streak(d.workouts);
  if (s < 3) return null;
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={spring.smooth}
      className="flex h-11 items-center gap-1.5 rounded-full border border-hairline bg-surface px-3.5"
      aria-label={`${s} day streak`}
    >
      <Flame className="size-4 text-ember" strokeWidth={2} fill="currentColor" fillOpacity={0.2} />
      <span className="num text-label font-semibold">
        {s}
        <span className="unit">d</span>
      </span>
    </motion.div>
  );
}

/** At most two insights, each one sentence with one number and a trend line. Rotates daily. */
export function Insights({ userId }: { userId: string }) {
  const d = useClientData(userId);
  if (d.loading) return null;
  const days7 = lastNDays(7);
  const days14 = lastNDays(14).slice(0, 7);
  const sl = (ds: string[]) =>
    avg(d.sleep.filter((s) => ds.includes(s.log_date)).map((s) => +s.hours));
  const s7 = sl(days7);
  const sPrev = sl(days14);
  const prot = avg(days7.map((x) => macrosFor(d.food, x).protein).filter(Boolean));
  const w7 = d.workouts.filter((w) => within(w.performed_at, 7)).length;
  const w14 = d.workouts.filter((w) => within(w.performed_at, 14)).length - w7;
  type Insight = {
    icon: typeof Moon;
    tone: string;
    color: string;
    to: "/app/recover" | "/app/fuel" | "/app/train";
    lead: string;
    num: string;
    tail: string;
    spark: number[];
  };
  const out: Insight[] = [];
  if (s7 && sPrev && Math.abs(s7 - sPrev) >= 0.3)
    out.push({
      icon: Moon,
      tone: "text-dream",
      color: "var(--dream)",
      to: "/app/recover",
      lead: "You slept ",
      num: `${Math.abs(s7 - sPrev).toFixed(1)} h ${s7 > sPrev ? "more" : "less"}`,
      tail: " a night this week.",
      spark: [...d.sleep.slice(0, 10)].reverse().map((s) => +s.hours),
    });
  const weekly = [3, 2, 1, 0].map(
    (k) =>
      d.workouts.filter(
        (w) => within(w.performed_at, (k + 1) * 7) && !within(w.performed_at, k * 7),
      ).length,
  );
  if (w7 || w14)
    out.push({
      icon: Dumbbell,
      tone: "text-volt",
      color: "var(--volt)",
      to: "/app/train",
      lead: "",
      num: `${w7} session${w7 === 1 ? "" : "s"}`,
      tail:
        w7 >= w14
          ? " this week, on pace with last week."
          : ` this week, ${w14 - w7} fewer than last.`,
      spark: weekly,
    });
  if (prot)
    out.push({
      icon: Flame,
      tone: "text-ember",
      color: "var(--ember)",
      to: "/app/fuel",
      lead: "You're averaging ",
      num: `${Math.round(prot)} g protein`,
      tail: " a day.",
      spark: [...days7].reverse().map((x) => macrosFor(d.food, x).protein),
    });
  if (!out.length) return null;
  const rot = new Date().getDate() % out.length;
  const shown = [...out.slice(rot), ...out.slice(0, rot)].slice(0, 2);
  return (
    <>
      <SectionTitle>Worth knowing</SectionTitle>
      <div className="space-y-2">
        {shown.map((x, i) => (
          <Link key={x.to} to={x.to} className="block">
            <Panel
              index={3 + i}
              className="flex items-center gap-4 p-4 transition-[filter] hover-device:brightness-110"
            >
              <x.icon className={`size-5 shrink-0 ${x.tone}`} strokeWidth={1.75} />
              <span className="flex-1 text-label text-muted-foreground">
                {x.lead}
                <span className="font-semibold text-foreground">{x.num}</span>
                {x.tail}
              </span>
              <Sparkline values={x.spark} color={x.color} width={56} height={24} fill={false} />
            </Panel>
          </Link>
        ))}
      </div>
    </>
  );
}
