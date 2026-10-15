import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { format, isSameDay, isToday, isYesterday } from "date-fns";
import { AnimatePresence, motion } from "motion/react";
import { ArrowUp, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAct, useApi, useQ } from "@/lib/api";
import type { TrainerNote } from "@/lib/types";
import { cn } from "@/lib/utils";
import { press, spring } from "@/lib/motion";
import { feedback } from "@/lib/feedback";
import { Avatar, Skeleton } from "./ui";

const dayLabel = (d: Date) =>
  isToday(d) ? "Today" : isYesterday(d) ? "Yesterday" : format(d, "EEEE d MMMM");

/** Keeps a client's notes thread fresh while it's on screen. */
export function useLiveNotes(clientId: string) {
  const api = useApi();
  const qc = useQueryClient();
  useEffect(
    () =>
      api.subscribeNotes(clientId, () =>
        qc.invalidateQueries({ queryKey: [api.mode, "notes", clientId] }),
      ),
    [api, qc, clientId],
  );
}

/**
 * The coach and client conversation. `viewer` decides which side is "mine":
 * the coach's notes sit on the right for the coach, on the left for the client.
 */
export function Thread({
  clientId,
  viewer,
  other,
}: {
  clientId: string;
  viewer: "coach" | "client";
  other: { name: string | null; avatar?: string | undefined };
}) {
  const notes = useQ(["notes", clientId], (api) => api.notes(clientId));
  useLiveNotes(clientId);
  const [body, setBody] = useState("");
  const end = useRef<HTMLDivElement>(null);
  const first = useRef(true);
  const send = useAct((api, b: string) =>
    viewer === "coach" ? api.addNote(clientId, b) : api.reply(b),
  );
  const list = [...(notes.data ?? [])].sort((a, b) => a.created_at.localeCompare(b.created_at));
  const mine = (n: TrainerNote) => (viewer === "coach" ? !n.from_client : !!n.from_client);

  useEffect(() => {
    end.current?.scrollIntoView({ behavior: first.current ? "auto" : "smooth", block: "end" });
    if (list.length) first.current = false;
  }, [list.length]);

  const submit = () => {
    const b = body.trim();
    if (!b || send.isPending) return;
    feedback.impactLight();
    send.mutate(b, {
      onSuccess: () => (setBody(""), feedback.success()),
      onError: (e) => toast.error(e.message),
    });
  };

  if (notes.isLoading)
    return (
      <div className="space-y-3">
        <Skeleton className="h-14 w-3/4 !rounded-card" />
        <Skeleton className="ml-auto h-12 w-2/3 !rounded-card" />
        <Skeleton className="h-16 w-4/5 !rounded-card" />
      </div>
    );

  return (
    <div>
      <div className="space-y-1.5" role="log" aria-live="polite" aria-label="Conversation">
        {!list.length && (
          <div className="rounded-card border border-dashed border-hairline-strong p-6 text-center text-label text-muted-foreground">
            {viewer === "coach"
              ? "No notes yet. A short hello goes a long way."
              : "Your coach's notes and your replies live here."}
          </div>
        )}
        <AnimatePresence initial={false}>
          {list.map((n, i) => {
            const prev = list[i - 1];
            const d = new Date(n.created_at);
            const newDay = !prev || !isSameDay(new Date(prev.created_at), d);
            const me = mine(n);
            const grouped =
              prev &&
              !newDay &&
              mine(prev) === me &&
              d.getTime() - new Date(prev.created_at).getTime() < 10 * 60000;
            return (
              <motion.div
                key={n.id}
                layout="position"
                initial={{ opacity: 0, y: 14, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={spring.smooth}
                style={{ transformOrigin: me ? "100% 100%" : "0% 100%" }}
              >
                {newDay && (
                  <div className="py-3 text-center text-caption font-semibold text-faint">
                    {dayLabel(d)}
                  </div>
                )}
                <div
                  className={cn(
                    "flex items-end gap-2",
                    me ? "justify-end" : "justify-start",
                    !grouped && "mt-2",
                  )}
                >
                  {!me &&
                    (grouped ? (
                      <span className="w-7 shrink-0" />
                    ) : (
                      <Avatar name={other.name} src={other.avatar} size={28} />
                    ))}
                  <div
                    className={cn(
                      "max-w-[78%] px-4 py-2.5 text-body leading-relaxed",
                      me
                        ? "rounded-[20px] rounded-br-md bg-volt text-primary-foreground"
                        : "rounded-[20px] rounded-bl-md bg-surface-3",
                    )}
                  >
                    <p className="whitespace-pre-wrap break-words">{n.body}</p>
                  </div>
                </div>
                <div
                  className={cn("mt-0.5 text-[11px] text-faint", me ? "pr-1 text-right" : "pl-10")}
                >
                  {format(d, "HH:mm")}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        <div ref={end} className="h-px scroll-mb-[180px] lg:scroll-mb-28" />
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="glass sticky bottom-[calc(max(env(safe-area-inset-bottom),12px)+76px)] z-10 mt-6 flex items-end gap-2 rounded-[26px] border border-hairline-strong p-1.5 shadow-2 lg:bottom-6"
      >
        <textarea
          rows={1}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder={
            viewer === "coach"
              ? `Message ${other.name?.split(" ")[0] ?? "your client"}`
              : "Reply to your coach"
          }
          aria-label={viewer === "coach" ? "Note to client" : "Reply to your coach"}
          className="max-h-40 min-h-[44px] flex-1 resize-none bg-transparent px-3.5 py-2.5 text-body outline-none [field-sizing:content] placeholder:text-faint"
        />
        <motion.button
          type="submit"
          whileTap={press.icon}
          disabled={!body.trim() || send.isPending}
          aria-label="Send"
          className="grid size-11 shrink-0 place-items-center rounded-full bg-volt text-primary-foreground transition-opacity disabled:opacity-35"
        >
          {send.isPending ? (
            <Loader2 className="size-5 animate-spin" />
          ) : (
            <ArrowUp className="size-5" strokeWidth={2.4} />
          )}
        </motion.button>
      </form>
    </div>
  );
}
