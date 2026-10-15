import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  Play,
  Trophy,
  Check,
  ArrowUpRight,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useLog, useMe, useQ } from "@/lib/api";
import {
  Empty,
  ErrorState,
  IconButton,
  PageHeader,
  PrimaryButton,
  SectionTitle,
  Segments,
  SkeletonPage,
  Tag,
  TextAction,
} from "@/components/strata/ui";
import { Heatmap } from "@/components/strata/charts";
import { press, spring } from "@/lib/motion";
import { feedback } from "@/lib/feedback";
import { Button } from "@/components/ui/button";
import { WorkoutRow, programWeek } from "@/components/strata/client-overview";
import { ExerciseTrend } from "@/components/strata/train-detail";
import { Sheet } from "@/components/strata/sheets";
import { useShell } from "@/components/strata/shell";
import { SwipeRow, useRemoveWithUndo } from "@/components/strata/swipe-delete";
import { dayOf, lastNDays, volume, volumeText, weekStart } from "@/lib/stats";
import { cn } from "@/lib/utils";
import type { Workout } from "@/lib/types";

export const Route = createFileRoute("/app/train")({
  head: () => ({
    meta: [
      { title: "Train — Programs & personal records | Kinra" },
      {
        name: "description",
        content: "Your next program session, strength records and session history in Kinra.",
      },
      { property: "og:title", content: "Train — Programs & personal records | Kinra" },
      {
        property: "og:description",
        content: "Follow your program and track your strength, one session at a time.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Train,
});

function Train() {
  const me = useMe().data;
  const { startSession, editWorkout } = useShell();
  const removeWorkout = useRemoveWithUndo("workouts");
  const wq = useLog("workouts", me?.id);
  const workouts = wq.data ?? [];
  const assignments = useQ(["assignments", me?.id], (api) => api.assignments(me?.id ?? ""));
  const programs = useQ(["programs"], (api) => api.programs());
  const coach = useQ(["my-trainer"], (api) => api.myTrainer(), me?.role === "client");
  const assignment = assignments.data?.[0];
  const program = programs.data?.find((p) => p.id === assignment?.program_id);
  const [weeksShown, setWeeksShown] = useState(3);
  const [pr, setPr] = useState<string | null>(null);
  const [day, setDay] = useState<string | null>(null);
  const [weekOverrides, setWeekOverrides] = useState<Record<string, boolean>>({});
  const [activeDay, setActiveDay] = useState(0);
  const carousel = useRef<HTMLDivElement>(null);
  const { done, nextIdx } = program ? programWeek(program, workouts) : { done: [], nextIdx: -1 };
  useEffect(() => {
    const index = Math.max(0, nextIdx);
    setActiveDay(index);
    const child = carousel.current?.children[index] as HTMLElement | undefined;
    if (child && carousel.current)
      carousel.current.scrollTo({
        left: child.offsetLeft - carousel.current.offsetLeft - 20,
        behavior: "instant",
      });
  }, [program?.id, nextIdx]);

  const prs = new Map<string, number>();
  for (const w of workouts)
    for (const s of w.sets)
      if (s.weight > (prs.get(s.exercise) ?? 0)) prs.set(s.exercise, s.weight);
  const topPrs = [...prs.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  const groups = new Map<string, Workout[]>();
  for (const w of [...workouts].sort((a, b) => b.performed_at.localeCompare(a.performed_at))) {
    const key = weekStart(w.performed_at);
    const group = groups.get(key) ?? [];
    group.push(w);
    groups.set(key, group);
  }
  const weeks = [...groups.entries()];
  const thisWeek = weekStart(new Date());
  const loading = wq.isLoading || assignments.isLoading || programs.isLoading;
  const error = wq.error || assignments.error || programs.error;
  const scrollDay = (index: number) => {
    const child = carousel.current?.children[index] as HTMLElement | undefined;
    if (!child || !carousel.current) return;
    feedback.selection();
    carousel.current.scrollTo({
      left: child.offsetLeft - carousel.current.offsetLeft - 20,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
  };
  const programWeekNo =
    program && assignment
      ? Math.min(
          program.weeks,
          Math.floor((Date.now() - new Date(assignment.start_date).getTime()) / (7 * 86400000)) + 1,
        )
      : 0;
  const calendar = lastNDays(84);
  const byDay = new Map<string, Workout[]>();
  for (const w of workouts)
    byDay.set(dayOf(w.performed_at), [...(byDay.get(dayOf(w.performed_at)) ?? []), w]);
  const loadOf = (ws: Workout[]) =>
    ws.reduce((a, w) => a + Math.max(volume(w), (w.duration_min ?? 0) * 40), 0);
  const maxVol = Math.max(1, ...calendar.map((d) => loadOf(byDay.get(d) ?? [])));
  const dayWorkouts = day ? (byDay.get(day) ?? []) : [];
  const trained = calendar.filter((d) => byDay.has(d)).length;
  const coachName = coach.data?.display_name?.replace(/^coach\s+/i, "");

  return (
    <div className="min-w-0">
      <PageHeader
        eyebrow="Build your strength"
        title="Train"
        action={
          <Button
            variant="secondary"
            className="h-11 rounded-full px-4 text-label font-semibold"
            onClick={() => startSession()}
          >
            <Play /> Freestyle
          </Button>
        }
      />
      {loading ? (
        <SkeletonPage />
      ) : error ? (
        <ErrorState
          onRetry={() => {
            wq.refetch();
            assignments.refetch();
            programs.refetch();
          }}
        />
      ) : (
        <>
          {program ? (
            <section aria-label="Your program">
              <div className="mb-4">
                <div className="eyebrow">
                  {coachName ? `Built for you by ${coachName}` : "Your program"}
                </div>
                <div className="mt-2 flex items-end justify-between gap-3">
                  <h2 className="min-w-0 font-display text-title font-bold">{program.name}</h2>
                  <span className="num shrink-0 text-caption text-faint">
                    Week {programWeekNo} of {program.weeks}
                  </span>
                </div>
                <Segments
                  total={program.weeks}
                  done={Math.max(0, programWeekNo - 1)}
                  current={programWeekNo - 1}
                  className="mt-3"
                />
              </div>
              <div
                ref={carousel}
                onScroll={(event) => {
                  const el = event.currentTarget;
                  const first = el.children[0] as HTMLElement | undefined;
                  if (first) setActiveDay(Math.round(el.scrollLeft / (first.offsetWidth + 12)));
                }}
                className="no-scrollbar relative -mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-5 px-5 pb-2 lg:-mx-8 lg:scroll-px-8 lg:px-8"
              >
                {program.days.map((d, i) => {
                  const est = Math.max(
                    15,
                    Math.round(
                      d.exercises.reduce((m, e) => m + e.sets * ((e.rest_seconds ?? 90) + 40), 0) /
                        60 /
                        5,
                    ) * 5,
                  );
                  return (
                    <motion.article
                      key={`${program.id}-${i}`}
                      animate={{
                        scale: i === activeDay ? 1 : 0.97,
                        opacity: i === activeDay ? 1 : 0.7,
                      }}
                      transition={spring.smooth}
                      className={cn(
                        "panel w-[86%] shrink-0 snap-start p-5",
                        i === nextIdx && "border-volt/30",
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="eyebrow">Day {i + 1}</span>
                        {done[i] ? (
                          <Tag tone="volt">
                            <Check className="size-3" /> Done
                          </Tag>
                        ) : i === nextIdx ? (
                          <Tag tone="volt">Next up</Tag>
                        ) : (
                          <Tag>Upcoming</Tag>
                        )}
                      </div>
                      <h3 className="mt-3 font-display text-title font-bold">{d.title}</h3>
                      <div className="mt-1 text-caption text-muted-foreground">
                        {d.exercises.length} exercises ·{" "}
                        {d.exercises.reduce((sum, ex) => sum + ex.sets, 0)} sets · about {est} min
                      </div>
                      <ul className="mt-4 divide-y divide-hairline">
                        {d.exercises.map((ex, n) => (
                          <li
                            key={`${ex.name}-${n}`}
                            className="flex items-center gap-3 py-3 text-label"
                          >
                            <span className="num text-caption text-faint">
                              {String(n + 1).padStart(2, "0")}
                            </span>
                            <span className="min-w-0 flex-1 font-semibold">{ex.name}</span>
                            <span className="num shrink-0 text-caption text-muted-foreground">
                              {ex.sets}×{ex.reps}
                            </span>
                          </li>
                        ))}
                      </ul>
                      {i === nextIdx ? (
                        <PrimaryButton
                          className="mt-4"
                          onClick={() => startSession(d)}
                          icon={<Play className="size-5" fill="currentColor" />}
                        >
                          Start session
                        </PrimaryButton>
                      ) : (
                        <Button
                          variant="secondary"
                          size="xl"
                          className="mt-4 w-full rounded-full text-label font-semibold"
                          onClick={() => startSession(d)}
                        >
                          <Play /> {done[i] ? "Train again" : "Start this day"}
                        </Button>
                      )}
                    </motion.article>
                  );
                })}
              </div>
              <div className="mt-2 flex items-center justify-between">
                <div className="flex gap-1.5" aria-hidden>
                  {program.days.map((_, i) => (
                    <motion.span
                      key={i}
                      animate={{
                        width: i === activeDay ? 18 : 6,
                        opacity: i === activeDay ? 1 : 0.35,
                      }}
                      transition={spring.snappy}
                      className="h-1.5 rounded-full bg-foreground"
                    />
                  ))}
                </div>
                <div className="flex gap-1">
                  <IconButton
                    label="Previous program day"
                    onClick={() => activeDay > 0 && scrollDay(activeDay - 1)}
                    className={cn(
                      "bg-transparent",
                      activeDay === 0 && "pointer-events-none opacity-30",
                    )}
                  >
                    <ChevronLeft className="size-5" />
                  </IconButton>
                  <IconButton
                    label="Next program day"
                    onClick={() => activeDay < program.days.length - 1 && scrollDay(activeDay + 1)}
                    className={cn(
                      "bg-transparent",
                      activeDay >= program.days.length - 1 && "pointer-events-none opacity-30",
                    )}
                  >
                    <ChevronRight className="size-5" />
                  </IconButton>
                </div>
              </div>
            </section>
          ) : (
            <Empty
              icon={<Dumbbell className="size-6" />}
              title="Your next session starts here"
              body="When your coach assigns a program it shows up here. Until then, train freestyle."
              action={
                <PrimaryButton
                  onClick={() => startSession()}
                  icon={<Play className="size-5" fill="currentColor" />}
                >
                  Start session
                </PrimaryButton>
              }
            />
          )}

          <section aria-label="Training calendar">
            <SectionTitle
              action={
                <span className="num text-caption text-faint">{trained} days in 12 weeks</span>
              }
            >
              Consistency
            </SectionTitle>
            <div className="panel p-4">
              <Heatmap
                selected={day}
                onPick={(d) => setDay(day === d ? null : d)}
                days={calendar.map((d) => {
                  const ws = byDay.get(d) ?? [];
                  return {
                    date: d,
                    v: loadOf(ws) / maxVol,
                    label: `${format(new Date(d + "T12:00"), "EEE d MMM")}: ${ws.length ? ws.map((w) => w.title).join(", ") : "rest"}`,
                  };
                })}
              />
              <AnimatePresence initial={false}>
                {day && (
                  <motion.div
                    key={day}
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, transition: { duration: 0.12 } }}
                    transition={spring.smooth}
                    className="mt-4 space-y-2 border-t border-hairline pt-4"
                  >
                    <div className="text-label font-semibold">
                      {format(new Date(day + "T12:00"), "EEEE d MMMM")}
                    </div>
                    {dayWorkouts.length ? (
                      dayWorkouts.map((w) => (
                        <WorkoutRow key={w.id} w={w} flat onEdit={() => editWorkout(w)} />
                      ))
                    ) : (
                      <p className="text-label text-muted-foreground">Rest day.</p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </section>

          {topPrs.length > 0 && (
            <section aria-label="Personal records">
              <SectionTitle
                action={<span className="text-caption text-faint">Heaviest logged sets</span>}
              >
                Personal records
              </SectionTitle>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {topPrs.map(([name, weight], i) => (
                  <motion.button
                    key={name}
                    type="button"
                    whileTap={press.card}
                    onClick={() => (feedback.selection(), setPr(name))}
                    aria-label={`${name}, best logged weight ${weight} kilograms. View strength trend`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ ...spring.smooth, delay: Math.min(i, 5) * 0.035 }}
                    className="panel flex min-h-[112px] min-w-0 flex-col justify-between p-4 text-left transition-[filter] hover-device:brightness-110"
                  >
                    <div className="flex w-full items-center justify-between">
                      <Trophy
                        className={cn("size-4", i === 0 ? "text-volt" : "text-faint")}
                        strokeWidth={1.9}
                      />
                      <ArrowUpRight className="size-4 text-faint" />
                    </div>
                    <div>
                      <div className="num text-title font-semibold">
                        {weight}
                        <span className="unit">kg</span>
                      </div>
                      <span className="line-clamp-1 text-caption font-medium text-muted-foreground">
                        {name}
                      </span>
                    </div>
                  </motion.button>
                ))}
              </div>
            </section>
          )}

          <section aria-label="Workout history">
            <SectionTitle
              action={
                <span className="num text-caption text-faint">{workouts.length} sessions</span>
              }
            >
              History
            </SectionTitle>
            {!workouts.length ? (
              <Empty
                icon={<Dumbbell className="size-6" />}
                title="A fresh start"
                body="Your completed sessions will appear here."
              />
            ) : (
              <div className="space-y-2">
                {weeks.slice(0, weeksShown).map(([week, sessions], index) => {
                  const open = weekOverrides[week] ?? index === 0;
                  const label =
                    week === thisWeek
                      ? "This week"
                      : `Week of ${format(new Date(week + "T12:00"), "d MMM")}`;
                  const id = `history-${week}`;
                  return (
                    <div key={week} className="border-b border-hairline pb-2 last:border-0">
                      <button
                        type="button"
                        aria-expanded={open}
                        aria-controls={id}
                        onClick={() => (
                          feedback.selection(),
                          setWeekOverrides((prev) => ({ ...prev, [week]: !open }))
                        )}
                        className="flex min-h-16 w-full items-center justify-between rounded-tile px-1 py-3 text-left"
                      >
                        <div>
                          <div className="text-label font-semibold">{label}</div>
                          <div className="num mt-1 text-caption text-muted-foreground">
                            {sessions.length} session{sessions.length === 1 ? "" : "s"} ·{" "}
                            {volumeText(
                              sessions.reduce((sum, workout) => sum + volume(workout), 0),
                            )}
                          </div>
                        </div>
                        <motion.span
                          animate={{ rotate: open ? 180 : 0 }}
                          transition={spring.snappy}
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
                            exit={{ opacity: 0, transition: { duration: 0.12 } }}
                            transition={spring.smooth}
                            className="space-y-2 pb-2 pt-1"
                          >
                            {sessions.map((workout) => (
                              <SwipeRow
                                key={workout.id}
                                label={`${workout.title}: swipe left to delete`}
                                onDelete={() => removeWorkout(workout, "Session deleted")}
                              >
                                <WorkoutRow w={workout} onEdit={() => editWorkout(workout)} />
                              </SwipeRow>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
                {weeks.length > weeksShown && (
                  <div className="flex justify-center">
                    <TextAction onClick={() => setWeeksShown((count) => count + 3)}>
                      Show earlier weeks
                    </TextAction>
                  </div>
                )}
              </div>
            )}
          </section>
        </>
      )}
      <Sheet
        open={pr !== null}
        onOpenChange={(open) => {
          if (!open) setPr(null);
        }}
        title={pr ?? ""}
        sub="Strength over time"
      >
        {pr && <ExerciseTrend name={pr} workouts={workouts} />}
      </Sheet>
    </div>
  );
}
