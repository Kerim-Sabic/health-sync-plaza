import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { format } from "date-fns";
import { ChevronLeft, MessageSquare, Send, Pencil, ThumbsUp, Plus, Search } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { formatDistanceToNowStrict } from "date-fns";
import { toast } from "sonner";
import { useAct, useQ } from "@/lib/api";
import { ClientOverview, ReadinessHero, useClientData } from "@/components/strata/client-overview";
import {
  Avatar,
  Chip,
  Empty,
  Panel,
  Ring,
  SectionTitle,
  Segments,
  ErrorState,
  Skeleton,
} from "@/components/strata/ui";
import { status } from "@/components/strata/client-row";
import { COMPLIANCE_TARGET } from "@/lib/coach";
import { readiness, within } from "@/lib/stats";
import { spring } from "@/lib/motion";
import { feedback } from "@/lib/feedback";
import { cn } from "@/lib/utils";
import { CoachKudos } from "@/components/strata/coach-kudos";
import { ProgramBuilder } from "@/components/strata/program-builder";
import type { Program } from "@/lib/types";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { WeightChart } from "@/components/strata/progress-weight";
import { PhotoSection, usePhotos } from "@/components/strata/photos";
import { ReportView } from "@/components/strata/report-view";
import { buildSummary } from "@/lib/report";
import { FileText } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ProgramSummary } from "@/components/strata/program-summary";
import { Thread } from "@/components/strata/thread";
import { CheckInList } from "@/components/strata/check-in";
import { searchPrograms } from "@/lib/programs";

export const Route = createFileRoute("/app/clients/$clientId")({
  head: () => ({
    meta: [
      { title: "Client progress — Kinra" },
      {
        name: "description",
        content: "Review an athlete’s training, recovery, program and private progress in Kinra.",
      },
      { property: "og:title", content: "Client progress — Kinra" },
      {
        property: "og:description",
        content: "Review an athlete’s training, recovery, program and private progress in Kinra.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ClientDetail,
});

const TABS = [
  { value: "overview", label: "Overview" },
  { value: "program", label: "Plan" },
  { value: "notes", label: "Notes" },
  { value: "checkins", label: "Check-ins" },
  { value: "report", label: "Report" },
  { value: "photos", label: "Photos" },
] as const;
type TabKey = (typeof TABS)[number]["value"];

function ClientDetail() {
  const { clientId } = Route.useParams();
  const [tab, setTab] = useState<TabKey>("overview");
  const person = useQ(["person", clientId], (api) => api.person(clientId));
  const programs = useQ(["programs"], (api) => api.programs());
  const assignments = useQ(["assignments", clientId], (api) => api.assignments(clientId));
  const d = useClientData(clientId);
  const [kudos, setKudos] = useState(false);

  if (person.isLoading)
    return (
      <div aria-busy="true">
        <Skeleton className="mb-4 h-8 w-24" />
        <Skeleton className="h-48 !rounded-card" />
        <Skeleton className="mt-4 h-64 !rounded-card" />
      </div>
    );
  if (person.error) return <ErrorState onRetry={() => person.refetch()} />;
  if (!person.data)
    return (
      <Empty
        title="This client isn't available"
        body="They may have disconnected from you."
        action={
          <Link to="/app/clients" className="text-label font-semibold text-primary">
            Back to clients
          </Link>
        }
      />
    );

  const n30 = d.workouts.filter((w) => within(w.performed_at, 30)).length;
  const pct = Math.min(1, n30 / COMPLIANCE_TARGET);
  const st = status(pct);
  const a = assignments.data?.[0];
  const prog = programs.data?.find((p) => p.id === a?.program_id);
  const week =
    prog && a
      ? Math.min(
          prog.weeks,
          Math.floor((Date.now() - new Date(a.start_date).getTime()) / (7 * 86400000)) + 1,
        )
      : null;
  const ready = d.sleep.length ? readiness(d.sleep, d.workouts) : null;
  const last = d.workouts[0];

  return (
    <div className="mx-auto xl:max-w-[760px]">
      <Link
        to="/app/clients"
        className="-ml-2 mb-3 inline-flex min-h-[44px] items-center gap-1 rounded-full px-2 text-label font-semibold text-muted-foreground transition-colors hover-device:text-foreground"
      >
        <ChevronLeft className="size-5" /> Clients
      </Link>
      <section className="panel p-5">
        <div className="flex items-center gap-4">
          <Ring value={pct} size={76} stroke={4} color={st.ring}>
            <Avatar name={person.data.display_name} src={person.data.avatar_url} size={62} />
          </Ring>
          <div className="min-w-0 flex-1">
            <h1 className="break-words font-display text-title-l font-extrabold">
              {person.data.display_name ?? "Client"}
            </h1>
            <div className="mt-1 break-words text-label text-muted-foreground">
              {person.data.goal ?? "No goal set"}
            </div>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-3 gap-3 border-t border-hairline pt-4">
          <div>
            <div className="text-caption font-semibold text-muted-foreground">Adherence</div>
            <div className={cn("num mt-1 text-title font-semibold", st.text)}>
              {Math.round(pct * 100)}
              <span className="unit">%</span>
            </div>
          </div>
          <div>
            <div className="text-caption font-semibold text-muted-foreground">Readiness</div>
            <div className="num mt-1 text-title font-semibold">{ready ?? "—"}</div>
          </div>
          <div>
            <div className="text-caption font-semibold text-muted-foreground">Last session</div>
            <div className="mt-1 truncate text-label font-semibold">
              {last
                ? formatDistanceToNowStrict(new Date(last.performed_at), { addSuffix: true })
                : "None yet"}
            </div>
          </div>
        </div>
        {prog && (
          <div className="mt-4 border-t border-hairline pt-4">
            <div className="flex items-baseline justify-between gap-3">
              <span className="truncate text-label font-semibold">{prog.name}</span>
              <span className="num shrink-0 text-caption text-faint">
                Week {week} of {prog.weeks}
              </span>
            </div>
            <Segments
              className="mt-2"
              total={prog.weeks}
              done={Math.max(0, (week ?? 1) - 1)}
              current={(week ?? 1) - 1}
            />
          </div>
        )}
        <div className="mt-5 grid grid-cols-2 gap-2">
          <Button
            variant="secondary"
            className="h-11 rounded-full text-label font-semibold"
            onClick={() => (feedback.selection(), setTab("notes"))}
          >
            <MessageSquare /> Message
          </Button>
          <Button
            variant="secondary"
            className="h-11 rounded-full text-label font-semibold"
            onClick={() => (feedback.impactLight(), setKudos(true))}
          >
            <ThumbsUp /> Kudos
          </Button>
        </div>
      </section>
      {kudos && (
        <CoachKudos
          open
          clientId={clientId}
          name={person.data.display_name}
          workout={d.workouts[0]}
          onClose={() => setKudos(false)}
        />
      )}
      <div className="glass sticky top-0 z-20 -mx-5 mb-5 mt-4 border-b border-hairline px-5 lg:-mx-8 lg:px-8">
        <div
          className="no-scrollbar flex gap-1 overflow-x-auto"
          role="tablist"
          aria-label="Client sections"
        >
          {TABS.map((t) => (
            <button
              key={t.value}
              role="tab"
              aria-selected={tab === t.value}
              onClick={() => (feedback.selection(), setTab(t.value))}
              className={cn(
                "relative h-12 shrink-0 px-3 text-label font-semibold transition-colors",
                tab === t.value
                  ? "text-foreground"
                  : "text-faint hover-device:text-muted-foreground",
              )}
            >
              {t.label}
              {tab === t.value && (
                <motion.span
                  layoutId="client-tab"
                  className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-foreground"
                  transition={spring.snappy}
                />
              )}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, transition: { duration: 0.1 } }}
          transition={spring.smooth}
        >
          {tab === "overview" && (
            <>
              <ReadinessHero userId={clientId} interactive={false} />
              {d.metrics.filter((m) => m.weight != null).length > 1 && (
                <>
                  <SectionTitle>Bodyweight</SectionTitle>
                  <div className="panel p-5">
                    <WeightChart metrics={d.metrics} range="3M" />
                  </div>
                </>
              )}
              <ClientOverview userId={clientId} trainerView />
            </>
          )}
          {tab === "report" && <ReportTab clientId={clientId} />}
          {tab === "photos" && <PhotoSection userId={clientId} canEdit={false} />}
          {tab === "program" && <ProgramTab clientId={clientId} />}
          {tab === "checkins" && <CheckInList clientId={clientId} coachView />}
          {tab === "notes" && (
            <NotesTab
              clientId={clientId}
              name={person.data.display_name}
              avatar={person.data.avatar_url}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function ProgramTab({ clientId }: { clientId: string }) {
  const [editing, setEditing] = useState<Program | "new" | null>(null);
  const [query, setQuery] = useState("");
  const programs = useQ(["programs"], (api) => api.programs());
  const assignments = useQ(["assignments", clientId], (api) => api.assignments(clientId));
  const assign = useAct((api, pid: string) => api.assign(pid, clientId));
  const current = programs.data?.find((p) => p.id === assignments.data?.[0]?.program_id);
  const start = assignments.data?.[0]?.start_date;
  if (programs.isLoading || assignments.isLoading) return <Skeleton className="h-44" />;
  if (programs.error || assignments.error)
    return (
      <ErrorState
        onRetry={() => {
          programs.refetch();
          assignments.refetch();
        }}
      />
    );
  return (
    <div>
      <Button
        variant="secondary"
        className="mb-4 h-12 w-full rounded-full text-label font-semibold"
        onClick={() => setEditing("new")}
      >
        <Plus />
        Create a custom program
      </Button>
      {current ? (
        <>
          <ProgramSummary
            key={current.id}
            program={current}
            eyebrow="Current program"
            actions={
              <Button
                variant="glass"
                className="h-11 text-label"
                onClick={() => setEditing(current)}
              >
                <Pencil />
                Edit plan
              </Button>
            }
          />
          {start && (
            <p className="num mt-2 text-caption text-muted-foreground">
              Started {format(new Date(start + "T12:00"), "d MMM")}
            </p>
          )}
        </>
      ) : (
        <div className="text-label text-muted-foreground">No program assigned yet.</div>
      )}
      <SectionTitle>Program library</SectionTitle>
      <div className="relative mb-4">
        <Search className="absolute left-3 top-3.5 size-5 text-muted-foreground" />
        <Input
          aria-label="Search programs to assign"
          placeholder="Search programs or exercises"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-12 bg-surface pl-10 text-body"
        />
      </div>
      <div className="space-y-2">
        {searchPrograms(programs.data ?? [], query).map((p) => (
          <ProgramSummary
            key={p.id}
            program={p}
            actions={
              <Button
                size="sm"
                variant={current?.id === p.id ? "secondary" : "volt"}
                disabled={current?.id === p.id || assign.isPending}
                onClick={() =>
                  assign.mutate(p.id, {
                    onSuccess: () => toast.success(`Assigned ${p.name}`),
                    onError: (e) => toast.error(e.message),
                  })
                }
              >
                {current?.id === p.id ? "Active" : "Assign"}
              </Button>
            }
          />
        ))}
        {!!programs.data?.length && !searchPrograms(programs.data, query).length && (
          <p className="text-label text-muted-foreground">No matching programs.</p>
        )}
        {!programs.data?.length && (
          <Link to="/app/programs" className="text-label font-semibold text-primary">
            Create your first program →
          </Link>
        )}
      </div>
      {editing && (
        <ProgramBuilder
          {...(editing === "new" ? { clientId } : { program: editing })}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function NotesTab({
  clientId,
  name,
  avatar,
}: {
  clientId: string;
  name: string | null;
  avatar?: string | undefined;
}) {
  return (
    <div>
      <p className="mb-4 text-center text-caption text-faint">
        Your notes appear on {name?.split(" ")[0] ?? "your client"}'s Today screen. Their replies
        land here.
      </p>
      <Thread clientId={clientId} viewer="coach" other={{ name, avatar }} />
    </div>
  );
}

function ReportTab({ clientId }: { clientId: string }) {
  const [period, setPeriod] = useState(30);
  const [comment, setComment] = useState("");
  const d = useClientData(clientId);
  const photos = usePhotos(clientId);
  const reports = useQ(["reports", clientId], (api) => api.reports(clientId));
  const send = useAct((api, v: { summary: ReturnType<typeof buildSummary> }) =>
    api.saveReport({ clientId, periodDays: period, summary: v.summary, comment }),
  );
  const [openId, setOpenId] = useState<string | null>(null);
  const summary = buildSummary(d, period);
  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2">
        {[7, 30, 90].map((p) => (
          <Chip key={p} active={period === p} onClick={() => setPeriod(p)}>
            {p} days
          </Chip>
        ))}
      </div>
      {d.loading ? (
        <div className="text-label text-muted-foreground">Crunching numbers…</div>
      ) : (
        <ReportView s={summary} photos={photos.data ?? []} />
      )}
      <SectionTitle>Your message</SectionTitle>
      <Panel className="p-3">
        <Textarea
          rows={4}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Summarise the block, celebrate wins, set the next focus…"
          className="border-0 bg-transparent"
        />
      </Panel>
      <Button
        variant="volt"
        size="xl"
        className="mt-3 w-full"
        disabled={send.isPending || d.loading}
        onClick={() =>
          send.mutate(
            { summary },
            {
              onSuccess: () => (setComment(""), toast.success("Report sent to client")),
              onError: (e) => toast.error(e.message),
            },
          )
        }
      >
        <Send /> Send report
      </Button>

      {!!reports.data?.length && (
        <>
          <SectionTitle>Sent reports</SectionTitle>
          <div className="space-y-2">
            {reports.data.map((r) => (
              <div key={r.id}>
                <Panel
                  onClick={() => setOpenId(openId === r.id ? null : r.id)}
                  className="flex items-center gap-3 p-3.5"
                >
                  <FileText className="size-5 text-volt" />
                  <div className="flex-1">
                    <div className="font-semibold">{r.period_days}-day report</div>
                    <div className="num text-caption text-muted-foreground">
                      {format(new Date(r.created_at), "d MMM yyyy · HH:mm")}
                    </div>
                  </div>
                </Panel>
                {openId === r.id && (
                  <div className="mt-2">
                    <ReportView s={r.summary} comment={r.comment} photos={photos.data ?? []} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
