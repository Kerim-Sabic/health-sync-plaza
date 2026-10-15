import { createFileRoute } from "@tanstack/react-router";
import { format } from "date-fns";
import { Scale, FileText, ChevronDown, Trophy, Lock, Play } from "lucide-react";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useLog, useMe, useQ } from "@/lib/api";
import {
  ErrorState,
  IconButton,
  PageHeader,
  SectionTitle,
  Segmented,
  Skeleton,
  Stat,
  Value,
} from "@/components/strata/ui";
import { coachFirst, fmtVolume, today, volume, within } from "@/lib/stats";
import { useShell } from "@/components/strata/shell";
import { PhotoSection, usePhotos } from "@/components/strata/photos";
import { ReportView } from "@/components/strata/report-view";
import { WeightChart } from "@/components/strata/progress-weight";
import { RecapStories, type RecapSlide } from "@/components/strata/recap-stories";
import { CheckInList } from "@/components/strata/check-in";
import { SwipeRow, useRemoveWithUndo } from "@/components/strata/swipe-delete";
import { progressMilestones, weeklyRecap, type WeightRange } from "@/lib/progress";
import { exitTween, press, spring, stagger } from "@/lib/motion";
import { feedback } from "@/lib/feedback";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/progress")({
  head: () => ({
    meta: [
      { title: "Progress — Kinra" },
      {
        name: "description",
        content:
          "Review your body metrics, consistency, private photos and coach reports in Kinra.",
      },
      { property: "og:title", content: "Progress — Kinra" },
      {
        property: "og:description",
        content:
          "Review your body metrics, consistency, private photos and coach reports in Kinra.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Progress,
});

const RANGES: WeightRange[] = ["1M", "3M", "6M", "1Y", "All"];

function Progress() {
  const me = useMe().data;
  const { log } = useShell();
  const mq = useLog("body_metrics", me?.id);
  const removeMetric = useRemoveWithUndo("body_metrics");
  const wq = useLog("workouts", me?.id);
  const sq = useLog("sleep_logs", me?.id);
  const notes = useQ(["notes", me?.id], (api) => api.notes(me?.id ?? ""), !!me?.id);
  const coach = useQ(["my-trainer"], (api) => api.myTrainer(), me?.role === "client");
  const [range, setRange] = useState<WeightRange>("3M");
  const [recapOpen, setRecapOpen] = useState(false);
  const metrics = mq.data ?? [];
  const workouts = wq.data ?? [];
  const recap = weeklyRecap(workouts, sq.data ?? [], today());
  const total = fmtVolume(workouts.reduce((sum, workout) => sum + volume(workout), 0));
  const weekSets = workouts.filter((w) => within(w.performed_at, 7)).flatMap((w) => w.sets);
  const heaviest = weekSets.reduce<(typeof weekSets)[number] | undefined>(
    (best, s) => (!best || s.weight > best.weight ? s : best),
    undefined,
  );
  const vol = fmtVolume(recap.volume);
  const note = notes.data?.find((n) => !n.from_client && within(n.created_at, 7));
  const slides: RecapSlide[] = [
    {
      eyebrow: "Consistency",
      title: recap.sessions ? "You showed up." : "A quieter week.",
      value: recap.sessions,
      unit: recap.sessions === 1 ? "session" : "sessions",
      detail: `${recap.minutes} minutes of focused training.`,
      color: "var(--volt)",
    },
    {
      eyebrow: "Work",
      title: "It adds up.",
      value: Number(vol.value),
      decimals: vol.value.includes(".") ? 1 : 0,
      unit: vol.unit,
      detail: "Total weight moved across the week.",
      color: "var(--pulse)",
    },
    {
      eyebrow: "Recovery",
      title: recap.sleep == null ? "Log your nights." : "Room to recover.",
      value: recap.sleep,
      decimals: 1,
      unit: "h a night",
      detail:
        recap.sleep == null
          ? "Sleep logs make your recaps sharper."
          : "Your average logged sleep this week.",
      color: "var(--dream)",
    },
    ...(heaviest
      ? [
          {
            eyebrow: "Best moment",
            title: heaviest.exercise,
            value: heaviest.weight,
            unit: `kg × ${heaviest.reps}`,
            detail: "Your heaviest set of the week.",
            color: "var(--ember)",
          },
        ]
      : []),
    note
      ? {
          eyebrow: "From your coach",
          title: "A word for you.",
          detail: "",
          color: "var(--volt)",
          quote: { text: note.body, by: coach.data?.display_name ?? "Your coach" },
        }
      : {
          eyebrow: "Next week",
          title: "Keep the rhythm.",
          detail: "Same time, same intent. Small sessions done well are what change you.",
          color: "var(--volt)",
        },
  ];
  if (!me) return null;
  return (
    <div className="min-w-0">
      <PageHeader
        eyebrow="The bigger picture"
        title="Progress"
        action={
          <IconButton label="Log a weigh-in" onClick={() => log("metric")}>
            <Scale className="size-5" />
          </IconButton>
        }
      />

      <section aria-label="Weekly recap">
        <motion.button
          whileTap={press.card}
          type="button"
          onClick={() => (feedback.impactLight(), setRecapOpen(true))}
          className="relative w-full overflow-hidden rounded-card border border-hairline-strong bg-[radial-gradient(120%_140%_at_0%_0%,color-mix(in_oklab,var(--volt)_16%,transparent),transparent_55%),var(--gradient-surface)] p-5 text-left shadow-1 transition-[filter] hover-device:brightness-110"
        >
          <div className="flex items-center gap-4">
            <div className="min-w-0 flex-1">
              <div className="eyebrow">
                {format(new Date(recap.start + "T12:00"), "d MMM")} –{" "}
                {format(new Date(recap.end + "T12:00"), "d MMM")}
              </div>
              <div className="mt-2 font-display text-title font-bold">Your week in review</div>
              <div className="mt-1 text-label text-muted-foreground">
                {recap.sessions} session{recap.sessions === 1 ? "" : "s"} · {vol.value} {vol.unit}
                {recap.sleep != null ? ` · ${recap.sleep} h sleep` : ""}
              </div>
            </div>
            <span className="grid size-12 shrink-0 place-items-center rounded-full bg-volt text-primary-foreground">
              <Play className="size-5 translate-x-px" fill="currentColor" />
            </span>
          </div>
        </motion.button>
      </section>

      <section aria-label="Bodyweight trend">
        <SectionTitle>Bodyweight</SectionTitle>
        <div className="panel p-5">
          <Segmented
            className="mb-5"
            value={range}
            onChange={setRange}
            options={RANGES.map((r) => ({ value: r, label: r }))}
          />
          {mq.isLoading ? (
            <Skeleton className="h-64 !rounded-card" />
          ) : mq.error ? (
            <ErrorState
              message="Your weight history couldn't load. Your records are still saved."
              onRetry={() => mq.refetch()}
            />
          ) : (
            <WeightChart metrics={metrics} range={range} />
          )}
        </div>
        {metrics.length > 0 && (
          <div className="mt-3 space-y-2">
            {metrics.slice(0, 3).map((m) => (
              <SwipeRow
                key={m.id}
                label={`Weigh-in ${m.log_date}`}
                onDelete={() => removeMetric(m, "Weigh-in deleted")}
              >
                <div className="panel flex min-h-[56px] items-center justify-between rounded-card px-4 py-3">
                  <span className="text-label font-semibold">
                    {format(new Date(`${m.log_date}T12:00`), "EEE d MMM")}
                  </span>
                  <span className="num text-label">
                    <span className="font-semibold">{m.weight ?? "—"}</span>
                    <span className="unit">kg</span>
                    {m.body_fat != null && (
                      <span className="ml-3 font-sans text-caption text-faint">
                        {m.body_fat}% body fat
                      </span>
                    )}
                  </span>
                </div>
              </SwipeRow>
            ))}
          </div>
        )}
      </section>

      <section aria-label="Training totals">
        <SectionTitle>All time</SectionTitle>
        {wq.isLoading ? (
          <Skeleton className="h-28 !rounded-card" />
        ) : wq.error ? (
          <ErrorState onRetry={() => wq.refetch()} />
        ) : (
          <div className="panel grid grid-cols-3 gap-3 p-5">
            <Stat label="Sessions" value={workouts.length} />
            <Stat label="Lifted" value={total.value} unit={total.unit} />
            <Stat
              label="Training"
              value={Math.round(
                workouts.reduce((sum, workout) => sum + (workout.duration_min ?? 0), 0) / 60,
              )}
              unit="h"
            />
          </div>
        )}
      </section>

      {!wq.error && !mq.error && !wq.isLoading && !mq.isLoading && (
        <section aria-label="Milestones">
          <SectionTitle>Milestones</SectionTitle>
          <div className="grid grid-cols-2 gap-2">
            {progressMilestones(workouts, metrics).map((badge, i) => (
              <motion.div
                key={badge.name}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...spring.smooth, delay: stagger(i) }}
                className={cn("panel relative overflow-hidden p-4", badge.earned && "shine")}
              >
                <span
                  className={cn(
                    "mb-4 grid size-11 place-items-center rounded-full",
                    badge.earned
                      ? "bg-[linear-gradient(140deg,color-mix(in_oklab,var(--volt)_35%,var(--surface-3)),var(--surface-3))] text-volt ring-1 ring-volt/30"
                      : "bg-surface-2 text-faint",
                  )}
                >
                  {badge.earned ? (
                    <Trophy className="size-5" strokeWidth={1.9} />
                  ) : (
                    <Lock className="size-4" strokeWidth={1.9} />
                  )}
                </span>
                <h3
                  className={cn(
                    "font-sans text-label font-semibold [font-stretch:100%]",
                    !badge.earned && "text-muted-foreground",
                  )}
                >
                  {badge.name}
                </h3>
                <p className="mt-1 text-caption text-faint">
                  {badge.earned ? badge.detail : `Ahead: ${badge.detail.toLowerCase()}`}
                </p>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {coach.data && (
        <section aria-label="Weekly check-ins">
          <SectionTitle>Weekly check-ins</SectionTitle>
          <CheckInList clientId={me.id} coachName={coach.data.display_name} />
        </section>
      )}
      <SectionTitle
        action={
          <span className="flex items-center gap-1 text-caption text-faint">
            <Lock className="size-3" /> Only you and your coach
          </span>
        }
      >
        Progress photos
      </SectionTitle>
      <PhotoSection userId={me.id} canEdit />
      <CoachReports userId={me.id} />
      <AnimatePresence>
        {recapOpen && (
          <RecapStories key="recap" slides={slides} onClose={() => setRecapOpen(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}

function CoachReports({ userId }: { userId: string }) {
  const reports = useQ(["reports", userId], (api) => api.reports(userId));
  const coach = useQ(["my-trainer"], (api) => api.myTrainer());
  const photos = usePhotos(userId);
  const [open, setOpen] = useState<string | null>(null);
  return (
    <section aria-label="Coach reports">
      <SectionTitle>
        {coach.data?.display_name
          ? `Reports from ${coachFirst(coach.data.display_name)}`
          : "Reports from your coach"}
      </SectionTitle>
      {reports.isLoading ? (
        <Skeleton className="h-20 !rounded-card" />
      ) : reports.error ? (
        <ErrorState
          message="Your reports couldn't load. They're still saved."
          onRetry={() => reports.refetch()}
        />
      ) : reports.data?.length ? (
        <div className="space-y-2">
          {reports.data.map((report) => (
            <div key={report.id} className="panel overflow-hidden p-0">
              <button
                type="button"
                className="flex min-h-[72px] w-full items-center gap-3 p-4 text-left"
                aria-label={`${report.period_days}-day report`}
                aria-expanded={open === report.id}
                onClick={() => (
                  feedback.selection(),
                  setOpen(open === report.id ? null : report.id)
                )}
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-surface-3">
                  <FileText className="size-5" strokeWidth={1.75} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-label font-semibold">
                    {report.period_days}-day report
                  </span>
                  <span className="mt-0.5 block text-caption text-faint">
                    {format(new Date(report.created_at), "d MMM yyyy")} ·{" "}
                    <Value className="text-caption">
                      {Math.round(report.summary.adherence * 100)}%
                    </Value>{" "}
                    adherence
                  </span>
                </span>
                <motion.span
                  animate={{ rotate: open === report.id ? 180 : 0 }}
                  transition={spring.snappy}
                >
                  <ChevronDown className="size-5 text-faint" />
                </motion.span>
              </button>
              <AnimatePresence initial={false}>
                {open === report.id && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, transition: exitTween("fast") }}
                    transition={spring.smooth}
                    className="border-t border-hairline p-4"
                  >
                    <ReportView
                      s={report.summary}
                      comment={report.comment}
                      coach={coach.data?.display_name}
                      photos={photos.data ?? []}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      ) : (
        <p className="rounded-card border border-dashed border-hairline-strong p-5 text-center text-label text-muted-foreground">
          Your coach's next report will be here.
        </p>
      )}
    </section>
  );
}
