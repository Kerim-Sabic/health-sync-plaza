import { createFileRoute } from "@tanstack/react-router";
import { format } from "date-fns";
import { ChevronDown, Moon, NotebookPen, Plus, Wind, ArrowRight } from "lucide-react";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useLog, useMe } from "@/lib/api";
import {
  Divider,
  ErrorState,
  PageHeader,
  SectionTitle,
  Skeleton,
  TextAction,
} from "@/components/strata/ui";
import { Button } from "@/components/ui/button";
import { useShell } from "@/components/strata/shell";
import { moodOptions } from "@/components/strata/sheets";
import { RecoverSleep } from "@/components/strata/recover-sleep";
import { SwipeRow, useRemoveWithUndo } from "@/components/strata/swipe-delete";
import { RecoverBreathing } from "@/components/strata/recover-breathing";
import { lastNDays, dayOf } from "@/lib/stats";
import { exitTween, press, spring } from "@/lib/motion";
import { feedback } from "@/lib/feedback";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/recover")({
  head: () => ({
    meta: [
      { title: "Recover — Kinra" },
      {
        name: "description",
        content: "Track sleep, reflect on your day and take a breathing break with Kinra.",
      },
      { property: "og:title", content: "Recover — Kinra" },
      {
        property: "og:description",
        content: "Track sleep, reflect on your day and take a breathing break with Kinra.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Recover,
});

function Recover() {
  const me = useMe().data;
  const { log } = useShell();
  const sq = useLog("sleep_logs", me?.id);
  const jq = useLog("journal_entries", me?.id);
  const sleep = sq.data ?? [];
  const journal = jq.data ?? [];
  const removeSleep = useRemoveWithUndo("sleep_logs");
  const removeEntry = useRemoveWithUndo("journal_entries");
  const [breathe, setBreathe] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [expanded, setExpanded] = useState<string[]>([]);
  const recent = journal.filter(
    (entry) => new Date(entry.created_at).getTime() >= Date.now() - 7 * 86400000,
  );
  const avgMood = recent.length
    ? recent.reduce((sum, entry) => sum + entry.mood, 0) / recent.length
    : null;
  const avgEnergy = recent.length
    ? recent.reduce((sum, entry) => sum + entry.energy, 0) / recent.length
    : null;
  const month = lastNDays(28);
  const moodByDay = new Map<string, number[]>();
  for (const j of journal)
    moodByDay.set(dayOf(j.created_at), [...(moodByDay.get(dayOf(j.created_at)) ?? []), j.mood]);
  if (!me) return null;

  return (
    <div className="min-w-0">
      <PageHeader eyebrow="Sleep & mind" title="Recover" />
      <div className="mb-6 grid grid-cols-2 gap-2">
        <Button
          variant="secondary"
          className="h-12 rounded-full text-label font-semibold"
          onClick={() => log("sleep")}
        >
          <Moon className="text-dream" /> Log sleep
        </Button>
        <Button
          variant="secondary"
          className="h-12 rounded-full text-label font-semibold"
          onClick={() => log("journal")}
        >
          <NotebookPen className="text-pulse" /> Check in
        </Button>
      </div>
      {sq.isLoading ? (
        <Skeleton className="h-[340px] !rounded-card" />
      ) : sq.error ? (
        <ErrorState
          message="Your sleep entries couldn't load. They're still saved."
          onRetry={() => sq.refetch()}
        />
      ) : (
        <>
          <RecoverSleep sleep={sleep} onLog={() => log("sleep")} />
          {sleep.length > 0 && (
            <>
              <SectionTitle
                action={<span className="text-caption text-faint">Swipe left to delete</span>}
              >
                Recent nights
              </SectionTitle>
              <div className="space-y-2">
                {sleep.slice(0, 5).map((night) => (
                  <SwipeRow
                    key={night.id}
                    label={`Sleep ${night.log_date}`}
                    onDelete={() => removeSleep(night, "Sleep entry deleted")}
                  >
                    <div className="panel flex min-h-[56px] items-center justify-between rounded-card px-4 py-3">
                      <span className="text-label font-semibold">
                        {format(new Date(`${night.log_date}T12:00`), "EEE d MMM")}
                      </span>
                      <span className="num text-label">
                        <span className="font-semibold">{night.hours}</span>
                        <span className="unit">h</span>
                        <span className="ml-3 font-sans text-caption text-faint">
                          quality {night.quality}/5
                        </span>
                      </span>
                    </div>
                  </SwipeRow>
                ))}
              </div>
            </>
          )}
        </>
      )}

      <section aria-label="Breathing break" className="mt-10">
        <motion.button
          whileTap={press.card}
          type="button"
          onClick={() => (feedback.impactLight(), setBreathe(true))}
          className="relative w-full overflow-hidden rounded-card border border-pulse/20 bg-[radial-gradient(120%_120%_at_100%_0%,color-mix(in_oklab,var(--pulse)_18%,transparent),transparent_60%)] p-5 text-left transition-[filter] hover-device:brightness-110"
        >
          <div className="flex items-center gap-4">
            <span className="grid size-12 shrink-0 place-items-center rounded-full bg-pulse/15 text-pulse">
              <Wind className="size-5" strokeWidth={1.9} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-display text-title font-bold">A moment to reset</span>
              <span className="mt-0.5 block text-label text-muted-foreground">
                Guided breathing · 2 minutes
              </span>
            </span>
            <ArrowRight className="size-5 shrink-0 text-pulse" />
          </div>
        </motion.button>
      </section>

      <section aria-label="Journal entries">
        <SectionTitle action={<TextAction onClick={() => log("journal")}>Check in</TextAction>}>
          Your headspace
        </SectionTitle>
        {jq.isLoading ? (
          <Skeleton className="h-40 !rounded-card" />
        ) : jq.error ? (
          <ErrorState
            message="Your journal couldn't load. Your words are still saved."
            onRetry={() => jq.refetch()}
          />
        ) : (
          <>
            {journal.length > 0 && (
              <div className="panel mb-3 p-5">
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <div className="eyebrow">Mood · 7 days</div>
                    <div className="num mt-2 text-title font-semibold">
                      {avgMood?.toFixed(1) ?? "—"}
                      {avgMood != null && <span className="unit">/ 5</span>}
                    </div>
                  </div>
                  <div>
                    <div className="eyebrow">Energy · 7 days</div>
                    <div className="num mt-2 text-title font-semibold">
                      {avgEnergy?.toFixed(1) ?? "—"}
                      {avgEnergy != null && <span className="unit">/ 5</span>}
                    </div>
                  </div>
                </div>
                <Divider className="my-4" />
                <div className="eyebrow mb-3">Last 4 weeks</div>
                <div
                  className="grid grid-cols-7 gap-2"
                  role="img"
                  aria-label="Mood over the last four weeks"
                >
                  {month.map((d, i) => {
                    const ms = moodByDay.get(d);
                    const m = ms ? ms.reduce((a, b) => a + b, 0) / ms.length : null;
                    return (
                      <motion.span
                        key={d}
                        title={`${format(new Date(d + "T12:00"), "EEE d MMM")}${m ? `: mood ${m.toFixed(1)}` : ""}`}
                        initial={{ scale: 0.4, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ ...spring.smooth, delay: Math.min(i, 27) * 0.012 }}
                        className="mx-auto block size-3.5 rounded-full"
                        style={{
                          background: m
                            ? `color-mix(in oklab, var(--pulse) ${Math.round(25 + (m / 5) * 75)}%, var(--surface-2))`
                            : "var(--surface-2)",
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            )}
            <div className="space-y-2">
              <AnimatePresence initial={false}>
                {journal.slice(0, showAll ? journal.length : 5).map((entry) => {
                  const mood = moodOptions[entry.mood - 1] ?? moodOptions[2];
                  if (!mood) return null;
                  const open = expanded.includes(entry.id);
                  const long =
                    (entry.body?.length ?? 0) > 180 || (entry.body?.split("\n").length ?? 0) > 3;
                  return (
                    <motion.div
                      key={entry.id}
                      layout
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, transition: exitTween("fast") }}
                      transition={spring.smooth}
                    >
                      <SwipeRow
                        label="Check-in: swipe left to delete"
                        onDelete={() => removeEntry(entry, "Check-in deleted")}
                      >
                        <article className="panel rounded-card p-4">
                          <div className="flex items-center gap-3">
                            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-pulse/12 text-pulse">
                              <mood.icon
                                className="size-5"
                                strokeWidth={1.75}
                                aria-label={mood.label}
                              />
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-baseline justify-between gap-2">
                                <h3 className="font-sans text-label font-semibold [font-stretch:100%]">
                                  {mood.label}
                                </h3>
                                <time
                                  dateTime={entry.created_at}
                                  className="text-caption text-faint"
                                >
                                  {format(new Date(entry.created_at), "EEE d MMM · HH:mm")}
                                </time>
                              </div>
                              <div className="text-caption text-faint">
                                Energy {entry.energy} of 5
                              </div>
                            </div>
                          </div>
                          <p
                            className={cn(
                              "mt-3 whitespace-pre-wrap break-words text-body [overflow-wrap:anywhere]",
                              long && !open && "line-clamp-3",
                            )}
                          >
                            {entry.body || (
                              <span className="text-faint">A check-in, without words.</span>
                            )}
                          </p>
                          {long && (
                            <button
                              type="button"
                              className="mt-2 flex min-h-11 items-center gap-1 text-label font-semibold text-pulse"
                              aria-expanded={open}
                              onClick={() =>
                                setExpanded((ids) =>
                                  open ? ids.filter((id) => id !== entry.id) : [...ids, entry.id],
                                )
                              }
                            >
                              <motion.span
                                animate={{ rotate: open ? 180 : 0 }}
                                transition={spring.snappy}
                              >
                                <ChevronDown className="size-4" />
                              </motion.span>
                              {open ? "Read less" : "Read more"}
                            </button>
                          )}
                        </article>
                      </SwipeRow>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
              {!journal.length && (
                <div className="panel flex flex-col items-start p-5">
                  <p className="text-body">A few words. A clearer head.</p>
                  <p className="mt-1 text-label text-muted-foreground">
                    Check-ins tell your coach how you're really doing.
                  </p>
                  <Button
                    variant="secondary"
                    className="mt-4 h-11 rounded-full text-label font-semibold"
                    onClick={() => log("journal")}
                  >
                    <Plus /> First check-in
                  </Button>
                </div>
              )}
              {journal.length > 5 && (
                <div className="flex justify-center">
                  <TextAction onClick={() => setShowAll((value) => !value)}>
                    {showAll ? "Show less" : `Show all ${journal.length} check-ins`}
                  </TextAction>
                </div>
              )}
            </div>
          </>
        )}
      </section>
      <AnimatePresence>
        {breathe && <RecoverBreathing onClose={() => setBreathe(false)} />}
      </AnimatePresence>
    </div>
  );
}
