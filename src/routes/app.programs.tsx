import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ClipboardList, Plus, Pencil, Search, UserPlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAct, useMe, useQ } from "@/lib/api";
import {
  Avatar,
  Empty,
  ErrorState,
  PageHeader,
  Skeleton,
  TextAction,
} from "@/components/strata/ui";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ProgramBuilder } from "@/components/strata/program-builder";
import { Sheet } from "@/components/strata/sheets";
import type { Program } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { ProgramSummary } from "@/components/strata/program-summary";
import { searchPrograms } from "@/lib/programs";
import { feedback } from "@/lib/feedback";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/programs")({
  head: () => ({
    meta: [
      { title: "Programs — Kinra" },
      {
        name: "description",
        content: "Manage training programs and session plans for your Kinra athletes.",
      },
      { property: "og:title", content: "Programs — Kinra" },
      {
        property: "og:description",
        content: "Manage training programs and session plans for your Kinra athletes.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Programs,
});

/** Assign one program to several clients at once. */
function AssignSheet({ program, onClose }: { program: Program; onClose: () => void }) {
  const clients = useQ(["clients"], (api) => api.clients());
  const [picked, setPicked] = useState<string[]>([]);
  const assign = useAct(async (api, ids: string[]) => {
    for (const id of ids) await api.assign(program.id, id);
  });
  return (
    <Sheet
      open
      onOpenChange={(o) => !o && !assign.isPending && onClose()}
      title={`Assign ${program.name}`}
      sub="It becomes each client's current program. Their logged sessions stay unchanged."
    >
      {clients.isLoading ? (
        <Skeleton className="h-40 !rounded-card" />
      ) : !clients.data?.length ? (
        <p className="text-label text-muted-foreground">Connect a client first.</p>
      ) : (
        <div className="overflow-hidden rounded-card border border-hairline bg-surface">
          {clients.data.map((c, i) => (
            <label
              key={c.id}
              className={cn(
                "flex min-h-[60px] cursor-pointer items-center gap-3 px-4",
                i > 0 && "border-t border-hairline",
              )}
            >
              <Checkbox
                checked={picked.includes(c.id)}
                onCheckedChange={(on) => (
                  feedback.selection(),
                  setPicked((p) => (on ? [...p, c.id] : p.filter((x) => x !== c.id)))
                )}
                disabled={assign.isPending}
              />
              <Avatar name={c.display_name} src={c.avatar_url} size={32} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-label font-semibold">{c.display_name}</span>
                <span className="block truncate text-caption text-faint">
                  {c.goal ?? "No goal set"}
                </span>
              </span>
            </label>
          ))}
        </div>
      )}
      <Button
        variant="volt"
        className="mt-5 h-14 w-full rounded-full text-body"
        disabled={!picked.length || assign.isPending}
        onClick={() =>
          assign.mutate(picked, {
            onSuccess: () => {
              feedback.success();
              toast.success(`Assigned to ${picked.length} client${picked.length === 1 ? "" : "s"}`);
              onClose();
            },
            onError: (e) => toast.error(e.message),
          })
        }
      >
        {assign.isPending ? <Loader2 className="animate-spin" /> : <UserPlus />}
        {assign.isPending
          ? "Assigning…"
          : picked.length
            ? `Assign to ${picked.length}`
            : "Choose clients"}
      </Button>
    </Sheet>
  );
}

function Programs() {
  const me = useMe().data;
  const [editing, setEditing] = useState<Program | "new" | null>(null);
  const [assigning, setAssigning] = useState<Program | null>(null);
  const [query, setQuery] = useState("");
  const programs = useQ(["programs"], (api) => api.programs());
  const filtered = searchPrograms(programs.data ?? [], query);
  const coach = me?.role === "trainer";
  return (
    <div className="min-w-0">
      <PageHeader
        eyebrow="Training library"
        title="Programs"
        action={
          coach ? (
            <Button
              variant="volt"
              className="h-11 rounded-full px-4 text-label shadow-none"
              onClick={() => (feedback.impactLight(), setEditing("new"))}
            >
              <Plus /> New
            </Button>
          ) : undefined
        }
      />
      <div className="relative mb-4">
        <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-faint" />
        <Input
          aria-label="Search program library"
          placeholder="Search programs or exercises"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-12 rounded-full border-hairline-strong bg-surface pl-11 text-body"
        />
      </div>
      {programs.isLoading ? (
        <div aria-busy="true" className="space-y-2">
          <Skeleton className="h-24 !rounded-card" />
          <Skeleton className="h-24 !rounded-card" />
        </div>
      ) : programs.error ? (
        <ErrorState onRetry={() => programs.refetch()} />
      ) : (
        <>
          {!programs.data?.length && (
            <Empty
              icon={<ClipboardList className="size-6" />}
              title="Your next block starts here"
              body="Build a program once and assign it to as many clients as you like."
              action={
                coach ? (
                  <Button
                    variant="secondary"
                    className="h-12 rounded-full px-6 text-label font-semibold"
                    onClick={() => setEditing("new")}
                  >
                    Build a program
                  </Button>
                ) : undefined
              }
            />
          )}
          {!!programs.data?.length && (
            <p className="mb-3 text-caption text-faint">
              {filtered.length} of {programs.data.length} programs
            </p>
          )}
          <div className="space-y-2 xl:grid xl:grid-cols-2 xl:items-start xl:gap-2 xl:space-y-0">
            {filtered.map((program) => (
              <ProgramSummary
                key={program.id}
                program={program}
                actions={
                  coach && program.trainer_id === me?.id ? (
                    <>
                      <Button
                        variant="secondary"
                        className="h-11 rounded-full text-label font-semibold"
                        aria-label={`Edit ${program.name}`}
                        onClick={() => setEditing(program)}
                      >
                        <Pencil /> Edit plan
                      </Button>
                      <Button
                        variant="secondary"
                        className="h-11 rounded-full text-label font-semibold"
                        onClick={() => setAssigning(program)}
                      >
                        <UserPlus /> Assign to clients
                      </Button>
                    </>
                  ) : undefined
                }
              />
            ))}
          </div>
          {!!programs.data?.length && !filtered.length && (
            <div className="py-10 text-center">
              <p className="text-label text-muted-foreground">No programs match “{query}”.</p>
              <TextAction onClick={() => setQuery("")}>Clear search</TextAction>
            </div>
          )}
        </>
      )}
      {editing && (
        <ProgramBuilder
          {...(editing === "new" ? {} : { program: editing })}
          onClose={() => setEditing(null)}
        />
      )}
      {assigning && <AssignSheet program={assigning} onClose={() => setAssigning(null)} />}
    </div>
  );
}
