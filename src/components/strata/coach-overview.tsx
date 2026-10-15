import { Link } from "@tanstack/react-router";
import { format } from "date-fns";
import { useState } from "react";
import { motion } from "motion/react";
import { ArrowRight, Check, ClipboardList, Trophy, Users } from "lucide-react";
import { useQ } from "@/lib/api";
import { clientAttention, COMPLIANCE_TARGET, recentRecords } from "@/lib/coach";
import { avg, dayOf, firstName, lastNDays, within } from "@/lib/stats";
import { cn } from "@/lib/utils";
import { press, spring, stagger, tween, useIntro } from "@/lib/motion";
import { feedback } from "@/lib/feedback";
import { Avatar, Empty, ErrorState, NumberTicker, SectionTitle, Skeleton } from "./ui";
import { ClientRow } from "./client-row";
import { CoachKudos } from "./coach-kudos";

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

function Kpi({
  label,
  value,
  suffix,
  tone,
  i,
}: {
  label: string;
  value: number;
  suffix?: string;
  tone?: string | undefined;
  i: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...spring.smooth, delay: stagger(i) }}
      className="panel p-4"
    >
      <div className="text-caption font-semibold text-muted-foreground">{label}</div>
      <div className={cn("num mt-2 text-title-l font-semibold", tone)}>
        <NumberTicker value={value} />
        {suffix && <span className="unit">{suffix}</span>}
      </div>
    </motion.div>
  );
}

export function CoachHome({ name, avatar }: { name: string | null; avatar?: string | undefined }) {
  const intro = useIntro();
  const [kudosFor, setKudosFor] = useState<{
    id: string;
    name: string | null;
    title: string;
  } | null>(null);
  const agg = useQ(["coach-agg", 2], async (api) => {
    const clients = await api.clients();
    return Promise.all(
      clients.map(async (c) => {
        const [workouts, journal, sleep, checkIns, notes] = await Promise.all([
          api.list("workouts", c.id),
          api.list("journal_entries", c.id),
          api.list("sleep_logs", c.id),
          api.checkIns(c.id),
          api.notes(c.id),
        ]);
        return { ...c, workouts, journal, sleep, checkIns, notes };
      }),
    );
  });
  const rows = agg.data ?? [];
  const attention = rows
    .map((r) => ({
      r,
      reasons: [
        ...(r.notes?.[0]?.from_client ? ["New message from them"] : []),
        ...(r.checkIns?.some((c) => !c.coach_reply && within(c.created_at, 10))
          ? ["Check-in waiting for your reply"]
          : []),
        ...clientAttention(r),
      ],
    }))
    .filter((r) => r.reasons.length)
    .sort((a, b) => b.reasons.length - a.reasons.length);
  const records = rows
    .flatMap((r) =>
      recentRecords(r.workouts)
        .slice(0, 1)
        .map((rec) => ({ r, rec })),
    )
    .sort((a, b) => b.rec.at.localeCompare(a.rec.at))
    .slice(0, 3);
  const days = lastNDays(30);
  const recent = rows.filter((r) => r.workouts[0] && within(r.workouts[0].performed_at, 7));
  const adherence = rows.length
    ? Math.round(
        avg(
          rows.map((r) =>
            Math.min(
              1,
              r.workouts.filter((w) => within(w.performed_at, 30)).length / COMPLIANCE_TARGET,
            ),
          ),
        ) * 100,
      )
    : 0;
  const momentum = recent.filter((r) => !attention.some((a) => a.r.id === r.id));
  const coachName = firstName(name?.replace(/^coach\s+/i, ""));

  return (
    <div className="min-w-0">
      <header className="pb-6 pt-3">
        <div className="flex min-h-11 items-center justify-between gap-3">
          <div className="eyebrow">{format(new Date(), "EEEE d MMMM")}</div>
          <Link to="/app/me" aria-label="Coach profile" className="rounded-full lg:hidden">
            <Avatar name={name} src={avatar} size={40} />
          </Link>
        </div>
        <motion.h1
          className="mt-1 font-display text-title-l font-extrabold"
          initial={intro ? { opacity: 0, y: 8 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={tween("deliberate", "emphasized")}
        >
          {greeting()}, {coachName}
        </motion.h1>
        {!!rows.length && (
          <p className="mt-2 text-body text-muted-foreground">
            {attention.length
              ? `${attention.length} ${attention.length === 1 ? "client needs" : "clients need"} you today.`
              : "Everyone is in rhythm today."}
          </p>
        )}
      </header>
      {agg.isLoading ? (
        <div aria-busy="true" className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-24 !rounded-card" />
            ))}
          </div>
          <Skeleton className="h-20 !rounded-card" />
          <Skeleton className="h-20 !rounded-card" />
        </div>
      ) : agg.error ? (
        <ErrorState onRetry={() => agg.refetch()} />
      ) : !rows.length ? (
        <Empty
          icon={<Users className="size-6" />}
          title="Your team starts here"
          body="Share your coach code and your first client can connect in a minute."
          action={
            <Link
              to="/app/me"
              className="flex h-14 items-center justify-center rounded-full bg-volt-gradient px-8 text-body font-semibold text-primary-foreground shadow-glow"
            >
              Get my code
            </Link>
          }
        />
      ) : (
        <div className="flex flex-col xl:grid xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start xl:gap-x-8">
          <div className="grid grid-cols-3 gap-2 xl:col-start-2 xl:row-start-1">
            <Kpi i={0} label="Active · 7d" value={recent.length} suffix={`/${rows.length}`} />
            <Kpi i={1} label="Adherence" value={adherence} suffix="%" />
            <Kpi
              i={2}
              label="Need you"
              value={attention.length}
              tone={attention.length ? "text-ember" : undefined}
            />
          </div>

          <div className="min-w-0 xl:col-start-1 xl:row-span-3 xl:row-start-1">
            <section aria-labelledby="attention-title" className="xl:-mt-10">
              <SectionTitle>
                <span id="attention-title">
                  {attention.length ? "Needs your attention" : "Your team is in rhythm"}
                </span>
              </SectionTitle>
              {attention.length ? (
                <div className="space-y-2">
                  {attention.map(({ r, reasons }, index) => (
                    <ClientRow key={r.id} r={r} index={index} reasons={reasons} kudos />
                  ))}
                </div>
              ) : (
                <div className="panel flex items-center gap-3 p-4 text-label text-muted-foreground">
                  <span className="grid size-9 place-items-center rounded-full bg-volt/15 text-volt">
                    <Check className="size-4" strokeWidth={2.6} />
                  </span>
                  No inactivity, low mood or short sleep flags.
                </div>
              )}
            </section>

            {momentum.length > 0 && (
              <section aria-label="Keep the momentum">
                <SectionTitle
                  action={
                    <Link
                      to="/app/clients"
                      className="-mr-2 flex min-h-[44px] items-center rounded-full px-2 text-label font-semibold text-primary"
                    >
                      All clients
                    </Link>
                  }
                >
                  Keep the momentum
                </SectionTitle>
                <div className="space-y-2">
                  {momentum.slice(0, 3).map((r, i) => (
                    <ClientRow key={r.id} r={r} index={i} kudos />
                  ))}
                </div>
              </section>
            )}
          </div>
          <div className="min-w-0 xl:col-start-2 xl:row-start-2">
            {records.length > 0 && (
              <section aria-label="Records to celebrate">
                <SectionTitle>Worth celebrating</SectionTitle>
                <div className="panel overflow-hidden p-0">
                  {records.map(({ r, rec }, i) => (
                    <div
                      key={r.id}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3",
                        i > 0 && "border-t border-hairline",
                      )}
                    >
                      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-volt/12 text-volt">
                        <Trophy className="size-4" strokeWidth={2} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-label font-semibold">
                          {firstName(r.display_name)} · {rec.exercise}
                        </div>
                        <div className="truncate text-caption text-faint">
                          <span className="num">
                            {rec.weight} kg × {rec.reps}
                          </span>{" "}
                          · {format(new Date(rec.at), "EEE")}
                        </div>
                      </div>
                      <motion.button
                        whileTap={press.button}
                        type="button"
                        onClick={() => (
                          feedback.impactLight(),
                          setKudosFor({
                            id: r.id,
                            name: r.display_name,
                            title: `${rec.exercise} at ${rec.weight} kg`,
                          })
                        )}
                        className="h-9 shrink-0 rounded-full bg-surface-2 px-3.5 text-caption font-semibold transition-colors hover-device:bg-surface-3"
                      >
                        Send kudos
                      </motion.button>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section aria-label="Team training over the last 30 days">
              <SectionTitle action={<span className="text-caption text-faint">Last 30 days</span>}>
                Team pulse
              </SectionTitle>
              <div className="panel space-y-2.5 p-4">
                {rows.map((r) => {
                  const trained = new Set(r.workouts.map((w) => dayOf(w.performed_at)));
                  return (
                    <Link
                      key={r.id}
                      to="/app/clients/$clientId"
                      params={{ clientId: r.id }}
                      className="flex min-h-9 items-center gap-3 rounded-tile"
                      aria-label={`${r.display_name}: ${r.workouts.filter((w) => within(w.performed_at, 30)).length} sessions in 30 days`}
                    >
                      <span className="w-14 shrink-0 truncate text-caption font-semibold text-muted-foreground">
                        {firstName(r.display_name)}
                      </span>
                      <div
                        aria-hidden
                        className="grid min-w-0 flex-1 grid-cols-[repeat(30,minmax(0,1fr))] gap-[3px]"
                      >
                        {days.map((d) => (
                          <span
                            key={d}
                            className={cn(
                              "aspect-square rounded-full",
                              trained.has(d) ? "bg-foreground/80" : "bg-surface-3",
                            )}
                          />
                        ))}
                      </div>
                    </Link>
                  );
                })}
                <div className="num flex justify-between pl-[68px] pt-1 text-caption text-faint">
                  <span>{days[0] ? format(new Date(`${days[0]}T12:00`), "d MMM") : ""}</span>
                  <span>Today</span>
                </div>
              </div>
            </section>
          </div>
          <Link to="/app/programs" className="mt-3 block xl:col-start-2 xl:row-start-3">
            <motion.div
              whileTap={press.card}
              className="panel flex items-center gap-3 p-4 transition-[filter] hover-device:brightness-110"
            >
              <span className="grid size-10 place-items-center rounded-full bg-surface-3">
                <ClipboardList className="size-5" strokeWidth={1.75} />
              </span>
              <span className="flex-1 text-label font-semibold">Program library</span>
              <ArrowRight className="size-4 text-faint" />
            </motion.div>
          </Link>
        </div>
      )}
      {kudosFor && (
        <CoachKudos
          open
          clientId={kudosFor.id}
          name={kudosFor.name}
          workout={{ title: kudosFor.title }}
          onClose={() => setKudosFor(null)}
        />
      )}
    </div>
  );
}
