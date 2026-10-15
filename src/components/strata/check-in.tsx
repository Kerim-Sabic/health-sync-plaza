import { useState, type ReactNode } from "react";
import { format } from "date-fns";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, ArrowRight, ClipboardCheck, Minus, Plus, X, Loader2, Send } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { toast } from "sonner";
import { useAct, useApi, useLog, useQ } from "@/lib/api";
import { coachFirst, weekStart } from "@/lib/stats";
import { exitTween, press, spring } from "@/lib/motion";
import { feedback } from "@/lib/feedback";
import { cn } from "@/lib/utils";
import type { CheckIn, CheckInAnswers } from "@/lib/types";
import { Slider } from "@/components/ui/slider";
import { Avatar, IconScale, Panel, SaveButton, Skeleton, type ScaleOption } from "./ui";
import { energyOptions, sleepQualityOptions } from "./sheets";
import { Frown, Annoyed, Meh, Smile, Laugh } from "lucide-react";

const stressOptions: ScaleOption[] = [
  { icon: Laugh, label: "Calm" },
  { icon: Smile, label: "Light" },
  { icon: Meh, label: "Manageable" },
  { icon: Annoyed, label: "High" },
  { icon: Frown, label: "Overwhelming" },
];

export const thisWeek = () => weekStart(new Date());

/** Today's prompt: from Friday until the week's check-in is in. */
export function CheckInCard({ userId }: { userId: string }) {
  const { mode } = useApi();
  const list = useQ(["check-ins", userId], (api) => api.checkIns(userId));
  const coach = useQ(["my-trainer"], (api) => api.myTrainer());
  const [open, setOpen] = useState(false);
  if (list.isLoading || !coach.data) return null;
  const flow = (
    <AnimatePresence>
      {open && (
        <CheckInFlow
          key="flow"
          userId={userId}
          coach={coach.data.display_name}
          onClose={() => setOpen(false)}
        />
      )}
    </AnimatePresence>
  );
  const mine = list.data?.find((c) => c.week_start === thisWeek());
  const day = (new Date().getDay() + 6) % 7; // Monday 0
  const lastReply = list.data?.find(
    (c) =>
      c.coach_reply && c.replied_at && Date.now() - new Date(c.replied_at).getTime() < 5 * 86400000,
  );
  if (!mine && (day >= 4 || mode !== "live"))
    return (
      <>
        <Panel index={2} className="mt-3 overflow-hidden p-0">
          <div className="flex items-center gap-4 p-5">
            <span className="grid size-12 shrink-0 place-items-center rounded-full bg-volt/15 text-volt">
              <ClipboardCheck className="size-5" strokeWidth={1.9} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="font-display text-title font-bold">Your weekly check-in</div>
              <div className="text-label text-muted-foreground">
                Two minutes. {coachFirst(coach.data.display_name)} reads every answer.
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => (feedback.impactLight(), setOpen(true))}
            className="flex h-12 w-full items-center justify-center gap-1.5 border-t border-hairline text-label font-semibold text-primary transition-colors hover-device:bg-surface-2/60"
          >
            Start check-in <ArrowRight className="size-4" />
          </button>
        </Panel>
        {flow}
      </>
    );
  if (lastReply)
    return (
      <>
        {flow}
        <Panel index={2} className="mt-3 p-5">
          <div className="flex items-center gap-3">
            <Avatar name={coach.data.display_name} src={coach.data.avatar_url} size={36} />
            <div className="min-w-0">
              <div className="text-label font-semibold">
                {coachFirst(coach.data.display_name)} replied to your check-in
              </div>
              <div className="text-caption text-faint">
                Week of {format(new Date(lastReply.week_start + "T12:00"), "d MMM")}
              </div>
            </div>
          </div>
          <p className="mt-3 text-body">{lastReply.coach_reply}</p>
        </Panel>
      </>
    );
  return flow;
}

type Step = {
  key: string;
  title: string;
  hint?: string;
  render: () => ReactNode;
  valid?: () => boolean;
};

/** One question per screen, Typeform-style, with springy horizontal transitions. */
export function CheckInFlow({
  userId,
  coach,
  onClose,
}: {
  userId: string;
  coach: string | null;
  onClose: () => void;
}) {
  const metrics = useLog("body_metrics", userId).data ?? [];
  const lastWeight = metrics.find((m) => m.weight != null)?.weight ?? null;
  const [a, setA] = useState<CheckInAnswers>({
    weight: lastWeight,
    adherence: 8,
    energy: 3,
    sleep: 3,
    stress: 3,
    wins: "",
    struggles: "",
    questions: "",
  });
  const [i, setI] = useState(0);
  const [dir, setDir] = useState(1);
  const [done, setDone] = useState(false);
  const submit = useAct((api, v: CheckInAnswers) =>
    api.submitCheckIn({
      ...v,
      week_start: thisWeek(),
      wins: v.wins?.trim() || null,
      struggles: v.struggles?.trim() || null,
      questions: v.questions?.trim() || null,
    }),
  );
  const name = coachFirst(coach);
  const set = (p: Partial<CheckInAnswers>) => setA((x) => ({ ...x, ...p }));
  const text = (k: "wins" | "struggles" | "questions", placeholder: string) => () => (
    <textarea
      autoFocus
      value={a[k] ?? ""}
      onChange={(e) => set({ [k]: e.target.value })}
      rows={5}
      maxLength={600}
      placeholder={placeholder}
      className="w-full rounded-card border border-hairline-strong bg-surface p-4 text-[17px] leading-relaxed outline-none transition-colors placeholder:text-faint focus:border-volt/50"
    />
  );
  const steps: Step[] = [
    {
      key: "weight",
      title: "What did you weigh this week?",
      hint: "Morning, after the bathroom, before food. Skip if you didn't weigh in.",
      render: () => (
        <div className="flex items-center justify-center gap-4">
          <motion.button
            whileTap={press.icon}
            type="button"
            aria-label="Decrease weight"
            onClick={() => (
              feedback.selection(),
              set({ weight: +((a.weight ?? lastWeight ?? 70) - 0.1).toFixed(1) })
            )}
            className="grid size-14 place-items-center rounded-full bg-surface-2"
          >
            <Minus className="size-6" />
          </motion.button>
          <label className="text-center">
            <span className="sr-only">Weight in kilograms</span>
            <input
              inputMode="decimal"
              value={a.weight ?? ""}
              placeholder="—"
              onChange={(e) =>
                set({
                  weight:
                    e.target.value === "" ? null : Number(e.target.value.replace(",", ".")) || null,
                })
              }
              className="num w-40 bg-transparent text-center text-display-xl font-semibold outline-none placeholder:text-faint"
            />
            <span className="block text-label text-muted-foreground">kg</span>
          </label>
          <motion.button
            whileTap={press.icon}
            type="button"
            aria-label="Increase weight"
            onClick={() => (
              feedback.selection(),
              set({ weight: +((a.weight ?? lastWeight ?? 70) + 0.1).toFixed(1) })
            )}
            className="grid size-14 place-items-center rounded-full bg-surface-2"
          >
            <Plus className="size-6" />
          </motion.button>
        </div>
      ),
    },
    {
      key: "adherence",
      title: "How closely did you follow the plan?",
      hint: "Training, food and sleep, honestly. There's no wrong answer.",
      render: () => (
        <div>
          <div className="num text-center text-display-xl font-semibold">
            {a.adherence}
            <span className="unit">/ 10</span>
          </div>
          <Slider
            className="mt-6"
            min={1}
            max={10}
            step={1}
            value={[a.adherence ?? 8]}
            onValueChange={([v]) =>
              v && v !== a.adherence && (feedback.selection(), set({ adherence: v }))
            }
            aria-label="Plan adherence, 1 to 10"
          />
          <div className="mt-1 flex justify-between text-caption text-faint">
            <span>Off track</span>
            <span>Every detail</span>
          </div>
        </div>
      ),
    },
    {
      key: "energy",
      title: "How was your energy?",
      render: () => (
        <IconScale
          label="Energy"
          value={a.energy ?? 3}
          onChange={(v) => set({ energy: v })}
          options={energyOptions}
          tone="text-volt"
        />
      ),
    },
    {
      key: "sleep",
      title: "And your sleep?",
      render: () => (
        <IconScale
          label="Sleep quality"
          value={a.sleep ?? 3}
          onChange={(v) => set({ sleep: v })}
          options={sleepQualityOptions}
          tone="text-dream"
        />
      ),
    },
    {
      key: "stress",
      title: "How heavy did life feel?",
      hint: "Work, family, travel. It all counts toward recovery.",
      render: () => (
        <IconScale
          label="Stress"
          value={a.stress ?? 3}
          onChange={(v) => set({ stress: v })}
          options={stressOptions}
          tone="text-pulse"
        />
      ),
    },
    {
      key: "wins",
      title: "What went well?",
      hint: "Big or small. A PR, a good night, a meal you planned.",
      render: text("wins", "This week I…"),
    },
    {
      key: "struggles",
      title: "What got in the way?",
      render: text("struggles", "It was hard to…"),
    },
    {
      key: "questions",
      title: `Anything to ask ${name}?`,
      hint: "Optional. They'll answer with your check-in.",
      render: text("questions", "I've been wondering…"),
    },
  ];
  const step = steps[i]!;
  const last = i === steps.length - 1;
  const go = (d: number) => {
    const n = i + d;
    if (n < 0) return;
    feedback.selection();
    setDir(d);
    setI(Math.min(steps.length - 1, n));
  };

  return (
    <Dialog.Root open onOpenChange={(o) => !o && !submit.isPending && onClose()}>
      <Dialog.Portal>
        <Dialog.Content asChild aria-describedby={undefined}>
          <motion.div
            className="fixed inset-0 z-[60] mx-auto flex max-w-md flex-col bg-background px-6 pb-[max(20px,env(safe-area-inset-bottom))] pt-[max(16px,env(safe-area-inset-top))] lg:inset-y-6 lg:rounded-sheet lg:border lg:border-hairline-strong"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40, transition: exitTween("base") }}
            transition={spring.smooth}
          >
            <div className="flex items-center gap-3">
              <div
                className="flex flex-1 gap-1"
                aria-label={`Question ${i + 1} of ${steps.length}`}
              >
                {steps.map((s, k) => (
                  <span
                    key={s.key}
                    className="h-1 flex-1 overflow-hidden rounded-full bg-surface-3"
                  >
                    <motion.span
                      className="block h-full origin-left rounded-full bg-foreground"
                      initial={false}
                      animate={{ scaleX: done || k < i ? 1 : k === i ? 0.5 : 0 }}
                      transition={spring.smooth}
                    />
                  </span>
                ))}
              </div>
              <motion.button
                whileTap={press.icon}
                type="button"
                aria-label="Close check-in"
                onClick={onClose}
                className="grid size-10 place-items-center rounded-full bg-surface-2"
              >
                <X className="size-5" />
              </motion.button>
            </div>
            <Dialog.Title className="sr-only">Weekly check-in</Dialog.Title>
            <div className="relative flex flex-1 flex-col justify-center overflow-hidden">
              <AnimatePresence mode="popLayout" initial={false} custom={dir}>
                {done ? (
                  <motion.div
                    key="done"
                    initial={{ opacity: 0, scale: 0.94 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={spring.bouncy}
                    className="text-center"
                  >
                    <div className="mx-auto grid size-16 place-items-center rounded-full bg-volt text-primary-foreground">
                      <Send className="size-7" />
                    </div>
                    <h2 className="mt-6 font-display text-title-l font-extrabold">
                      Sent to {name}
                    </h2>
                    <p className="mt-2 text-body text-muted-foreground">
                      They'll reply here and on your Today screen. Thank you for the honesty.
                    </p>
                  </motion.div>
                ) : (
                  <motion.div
                    key={step.key}
                    custom={dir}
                    initial={{ opacity: 0, x: dir * 48 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: dir * -48, transition: exitTween("fast") }}
                    transition={spring.smooth}
                  >
                    <div className="eyebrow">
                      {i + 1} of {steps.length}
                    </div>
                    <h2 className="mt-3 font-display text-title-l font-extrabold">{step.title}</h2>
                    {step.hint && (
                      <p className="mt-2 text-label text-muted-foreground">{step.hint}</p>
                    )}
                    <div className="mt-8">{step.render()}</div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            {done ? (
              <motion.button
                whileTap={press.button}
                type="button"
                onClick={onClose}
                className="h-14 w-full rounded-full bg-surface-2 text-body font-semibold"
              >
                Done
              </motion.button>
            ) : (
              <div className="flex gap-3">
                <motion.button
                  whileTap={press.icon}
                  type="button"
                  aria-label="Previous question"
                  onClick={() => go(-1)}
                  className={cn(
                    "grid size-14 shrink-0 place-items-center rounded-full bg-surface-2 transition-opacity",
                    i === 0 && "pointer-events-none opacity-30",
                  )}
                >
                  <ArrowLeft className="size-5" />
                </motion.button>
                {last ? (
                  <SaveButton
                    className="flex-1"
                    onSave={() =>
                      submit
                        .mutateAsync(a)
                        .catch(
                          (e) => (
                            toast.error((e as Error).message),
                            feedback.error(),
                            Promise.reject(e)
                          ),
                        )
                    }
                    onDone={() => setDone(true)}
                  >
                    <Send className="size-5" /> Send check-in
                  </SaveButton>
                ) : (
                  <motion.button
                    whileTap={press.button}
                    type="button"
                    onClick={() => go(1)}
                    className="flex h-14 flex-1 items-center justify-center gap-2 rounded-full bg-volt-gradient text-body font-semibold text-primary-foreground"
                  >
                    {(step.key === "wins" ||
                      step.key === "struggles" ||
                      step.key === "questions") &&
                    !a[step.key as "wins"]?.trim()
                      ? "Skip"
                      : "Continue"}{" "}
                    <ArrowRight className="size-5" />
                  </motion.button>
                )}
              </div>
            )}
          </motion.div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

const scaleLabel = (opts: ScaleOption[], v: number | null) =>
  v ? (opts[v - 1]?.label ?? "—") : "—";

/** Past check-ins with the coach's reply. Coaches can reply inline. */
export function CheckInList({
  clientId,
  coachView,
  coachName,
}: {
  clientId: string;
  coachView?: boolean;
  coachName?: string | null | undefined;
}) {
  const list = useQ(["check-ins", clientId], (api) => api.checkIns(clientId));
  if (list.isLoading) return <Skeleton className="h-40 !rounded-card" />;
  if (!list.data?.length)
    return (
      <div className="rounded-card border border-dashed border-hairline-strong p-5 text-center text-label text-muted-foreground">
        {coachView
          ? "No check-ins yet. They open every Friday."
          : "Your first check-in opens on Friday."}
      </div>
    );
  return (
    <div className="space-y-3">
      {list.data.map((c) => (
        <CheckInEntry key={c.id} c={c} coachView={!!coachView} coachName={coachName} />
      ))}
    </div>
  );
}

function CheckInEntry({
  c,
  coachView,
  coachName,
}: {
  c: CheckIn;
  coachView: boolean;
  coachName?: string | null | undefined;
}) {
  const [reply, setReply] = useState("");
  const send = useAct((api, v: { id: string; reply: string }) => api.replyCheckIn(v.id, v.reply));
  const rows: [string, ReactNode][] = [
    ["Weight", c.weight != null ? `${c.weight} kg` : "—"],
    ["Plan", c.adherence != null ? `${c.adherence}/10` : "—"],
    ["Energy", scaleLabel(energyOptions, c.energy)],
    ["Sleep", scaleLabel(sleepQualityOptions, c.sleep)],
    ["Stress", scaleLabel(stressOptions, c.stress)],
  ];
  return (
    <article className="panel p-5">
      <div className="flex items-baseline justify-between">
        <h3 className="font-sans text-label font-bold [font-stretch:100%]">
          Week of {format(new Date(c.week_start + "T12:00"), "d MMMM")}
        </h3>
        <span className="text-caption text-faint">
          {format(new Date(c.created_at), "EEE HH:mm")}
        </span>
      </div>
      <div className="mt-4 grid grid-cols-5 gap-2">
        {rows.map(([l, v]) => (
          <div key={l} className="min-w-0">
            <div className="text-[11px] font-semibold text-faint">{l}</div>
            <div className="num mt-0.5 truncate text-caption font-semibold">{v}</div>
          </div>
        ))}
      </div>
      {(
        [
          ["Went well", c.wins],
          ["Got in the way", c.struggles],
          ["Question", c.questions],
        ] as const
      ).map(([l, v]) =>
        v ? (
          <div key={l} className="mt-4">
            <div className="eyebrow">{l}</div>
            <p className="mt-1 text-body">{v}</p>
          </div>
        ) : null,
      )}
      {c.coach_reply ? (
        <motion.div
          initial={false}
          className="mt-5 rounded-tile bg-volt/[0.07] p-4 ring-1 ring-volt/20"
        >
          <div className="eyebrow !text-volt">
            {coachView ? "Your reply" : `${coachFirst(coachName)}'s reply`}
          </div>
          <p className="mt-1 text-body">{c.coach_reply}</p>
        </motion.div>
      ) : coachView ? (
        <form
          className="mt-5"
          onSubmit={(e) => {
            e.preventDefault();
            if (!reply.trim()) return;
            send.mutate(
              { id: c.id, reply: reply.trim() },
              {
                onSuccess: () => (feedback.success(), toast.success("Reply sent"), setReply("")),
                onError: (er) => toast.error(er.message),
              },
            );
          }}
        >
          <textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            rows={3}
            placeholder="Reply to this check-in…"
            aria-label="Reply to check-in"
            className="w-full rounded-tile border border-hairline-strong bg-surface p-3.5 text-body outline-none transition-colors placeholder:text-faint focus:border-volt/50"
          />
          <motion.button
            whileTap={press.button}
            type="submit"
            disabled={!reply.trim() || send.isPending}
            className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-full bg-volt-gradient text-label font-semibold text-primary-foreground transition-opacity disabled:opacity-40"
          >
            {send.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}{" "}
            Send reply
          </motion.button>
        </form>
      ) : (
        <p className="mt-5 text-caption text-faint">Waiting for {coachFirst(coachName)}'s reply.</p>
      )}
    </article>
  );
}
