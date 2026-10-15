import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Loader2, Search, Send, Users } from "lucide-react";
import { toast } from "sonner";
import { useAct, useQ } from "@/lib/api";
import {
  Empty,
  ErrorState,
  PageHeader,
  Segmented,
  Skeleton,
  TextAction,
} from "@/components/strata/ui";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ClientRow } from "@/components/strata/client-row";
import { Sheet } from "@/components/strata/sheets";
import { clientAttention } from "@/lib/coach";
import { exitTween, spring } from "@/lib/motion";
import { feedback } from "@/lib/feedback";

export const Route = createFileRoute("/app/clients/")({
  head: () => ({
    meta: [
      { title: "Clients — Kinra" },
      {
        name: "description",
        content: "Review your connected athletes and their recent activity in Kinra.",
      },
      { property: "og:title", content: "Clients — Kinra" },
      {
        property: "og:description",
        content: "Review your connected athletes and their recent activity in Kinra.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Clients,
});

function Clients() {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "attention">("all");
  const [selecting, setSelecting] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [composing, setComposing] = useState(false);
  const [body, setBody] = useState("");
  const data = useQ(["clients-list"], async (api) => {
    const cs = await api.clients();
    return Promise.all(
      cs.map(async (c) => {
        const [workouts, journal, sleep] = await Promise.all([
          api.list("workouts", c.id),
          api.list("journal_entries", c.id),
          api.list("sleep_logs", c.id),
        ]);
        return { ...c, workouts, journal, sleep };
      }),
    );
  });
  const sendAll = useAct(async (api, v: { ids: string[]; body: string }) => {
    for (const id of v.ids) await api.addNote(id, v.body);
  });
  const rows = (data.data ?? [])
    .map((r) => ({ r, reasons: clientAttention(r) }))
    .sort(
      (a, b) =>
        b.reasons.length - a.reasons.length ||
        (a.r.display_name ?? "").localeCompare(b.r.display_name ?? ""),
    );
  const list = rows.filter(
    ({ r, reasons }) =>
      (r.display_name ?? "").toLowerCase().includes(q.toLowerCase()) &&
      (filter === "all" || reasons.length),
  );
  const toggle = (id: string) =>
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const endSelect = () => (setSelecting(false), setPicked([]));

  return (
    <div>
      <PageHeader
        eyebrow={`${data.data?.length ?? 0} athletes`}
        title="Clients"
        action={
          data.data?.length ? (
            <TextAction
              onClick={() => (feedback.selection(), selecting ? endSelect() : setSelecting(true))}
            >
              {selecting ? "Cancel" : "Select"}
            </TextAction>
          ) : undefined
        }
      />
      <div className="relative mb-3">
        <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-faint" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search clients"
          aria-label="Search clients"
          className="h-12 rounded-full border-hairline-strong bg-surface pl-11 text-body"
        />
      </div>
      <Segmented
        value={filter}
        onChange={setFilter}
        options={[
          { value: "all", label: `All · ${rows.length}` },
          {
            value: "attention",
            label: `Need you · ${rows.filter((r) => r.reasons.length).length}`,
          },
        ]}
        className="mb-4"
      />
      {data.isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-[88px] !rounded-card" />
          ))}
        </div>
      ) : data.error ? (
        <ErrorState onRetry={() => data.refetch()} />
      ) : !data.data?.length ? (
        <Empty
          icon={<Users className="size-6" />}
          title="No clients yet"
          body="Share your coach code and your first client can connect in a minute."
          action={
            <Link
              to="/app/me"
              className="flex h-12 items-center rounded-full bg-volt-gradient px-6 text-label font-semibold text-primary-foreground"
            >
              Get my code
            </Link>
          }
        />
      ) : !list.length ? (
        <div className="py-10 text-center">
          <p className="text-label text-muted-foreground">
            {q ? `No clients match “${q}”.` : "Nobody needs you right now."}
          </p>
          <TextAction
            onClick={() => {
              setQ("");
              setFilter("all");
            }}
          >
            Show all clients
          </TextAction>
        </div>
      ) : (
        <div className="space-y-2 xl:grid xl:grid-cols-2 xl:gap-2 xl:space-y-0">
          {list.map(({ r, reasons }, i) => (
            <ClientRow
              key={r.id}
              r={r}
              index={i}
              reasons={reasons}
              kudos={!selecting}
              selectable={selecting}
              selected={picked.includes(r.id)}
              onSelect={() => toggle(r.id)}
            />
          ))}
        </div>
      )}

      <AnimatePresence>
        {selecting && (
          <motion.div
            key="bulk"
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0, transition: exitTween("base") }}
            transition={spring.smooth}
            className="fixed inset-x-0 bottom-[calc(max(env(safe-area-inset-bottom),12px)+76px)] z-40 mx-auto w-[calc(100%-40px)] max-w-[400px] lg:bottom-8 lg:left-[264px]"
          >
            <div className="glass flex items-center gap-2 rounded-full border border-hairline-strong p-1.5 pl-5 shadow-2">
              <span className="num flex-1 text-label font-semibold">{picked.length} selected</span>
              <TextAction
                onClick={() =>
                  setPicked(picked.length === list.length ? [] : list.map((x) => x.r.id))
                }
              >
                {picked.length === list.length ? "None" : "All"}
              </TextAction>
              <Button
                variant="volt"
                className="h-11 rounded-full px-5 text-label shadow-none"
                disabled={!picked.length}
                onClick={() => (feedback.impactLight(), setComposing(true))}
              >
                <Send /> Note
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Sheet
        open={composing}
        onOpenChange={(o) => !sendAll.isPending && setComposing(o)}
        title={`Note to ${picked.length} client${picked.length === 1 ? "" : "s"}`}
        sub="Each client sees it on their Today screen, from you."
      >
        <Textarea
          autoFocus
          rows={5}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="e.g. Deload week starts Monday. Keep sessions crisp and sleep long."
          aria-label="Note to selected clients"
          className="rounded-tile border-hairline-strong bg-surface text-body"
        />
        <Button
          variant="volt"
          className="mt-4 h-14 w-full rounded-full text-body"
          disabled={!body.trim() || sendAll.isPending}
          onClick={() =>
            sendAll.mutate(
              { ids: picked, body: body.trim() },
              {
                onSuccess: () => {
                  feedback.success();
                  toast.success(`Sent to ${picked.length} client${picked.length === 1 ? "" : "s"}`);
                  setComposing(false);
                  setBody("");
                  endSelect();
                },
                onError: (e) => toast.error(e.message),
              },
            )
          }
        >
          {sendAll.isPending ? <Loader2 className="animate-spin" /> : <Send />}
          {sendAll.isPending ? "Sending…" : "Send note"}
        </Button>
      </Sheet>
    </div>
  );
}
