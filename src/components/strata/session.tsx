import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, Reorder, useReducedMotion } from "motion/react";
import {
  Check,
  ChevronDown,
  Feather,
  Pause,
  Play,
  Plus,
  Replace,
  SkipForward,
  Square,
  StickyNote,
  Timer,
  Trash2,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useAct, useLog, useMe, useQ } from "@/lib/api";
import { volumeText } from "@/lib/stats";
import { cn } from "@/lib/utils";
import { IconButton, NumberTicker, Tag } from "./ui";
import type { LiveSessionState, SSet } from "./shell";
import {
  autoPauseAt,
  countsForStats,
  doneCount,
  durationMin,
  elapsedMs,
  isPaused,
  markAllDone,
  pause,
  removeUnfinished,
  restLeft,
  resume,
  SET_TYPES,
  unfinishedCount,
} from "@/lib/session-state";
import {
  Barbell,
  learnRest,
  platesFor,
  PrMoment,
  restFor,
  roundPlate,
  shareSession,
  sound,
  usePref,
} from "./session-extras";
import { exitTween, press, spring, tween } from "@/lib/motion";
import { feedback } from "@/lib/feedback";
import { BottomCard, Keypad, NoteEditor, SheetBtn, Stepper } from "./session/controls";
import { ExerciseCard, type RowCtx, type Target } from "./session/ExerciseCard";
import { ExerciseInfo, ExercisePicker, RestIsland } from "./session/panels";
import { SessionComplete } from "./session/SessionComplete";
import {
  clock,
  elapsedClock,
  history,
  patchEx,
  patchSet,
  toWorkoutRow,
  useLongPress,
  useNow,
  usePrefList,
} from "./session/logic";

export {
  clock,
  history,
  progression,
  sessionFromTemplate,
  toWorkoutRow,
  useNow,
} from "./session/logic";

type SheetKind =
  | null
  | "end"
  | "unfinished"
  | "discard"
  | "away"
  | "keypad"
  | "plates"
  | "setMenu"
  | "exMenu"
  | "picker"
  | "quick"
  | "info";

export function LiveSession({
  session,
  setSession,
  minimized,
  setMinimized,
  onClose,
}: {
  session: LiveSessionState;
  setSession: (s: LiveSessionState) => void;
  minimized: boolean;
  setMinimized: (m: boolean) => void;
  onClose: () => void;
}) {
  const me = useMe().data!;
  const workouts = useLog("workouts", me.id).data ?? [];
  const coach = useQ(["my-trainer"], (api) => api.myTrainer(), me.role === "client").data
    ?.display_name;
  const pastWorkouts = useMemo(
    () => workouts.filter((w) => w.id !== session.editingId),
    [workouts, session.editingId],
  );
  const { last, best } = useMemo(() => history(pastWorkouts), [pastWorkouts]);
  const now = useNow();
  const reduce = useReducedMotion();
  const editing = !!session.editingId;
  const paused = isPaused(session) && !editing;
  const [active, setActive] = useState<{ e: number; s: number } | null>(null);
  const [islandOpen, setIslandOpen] = useState(false);
  const [pr, setPr] = useState<{ ex: string; kg: number } | null>(null);
  const [phase, setPhase] = useState<"live" | "review" | "saved">(
    session.savedAt ? "saved" : "live",
  );
  const [sheet, setSheet] = useState<SheetKind>(null);
  const [target, setTarget] = useState<Target | null>(null);
  const [exMenu, setExMenu] = useState<number | null>(null);
  const [infoFor, setInfoFor] = useState<number | null>(null);
  const [replacing, setReplacing] = useState<number | null>(null);
  const [noteFor, setNoteFor] = useState<null | "set" | "ex">(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [away, setAway] = useState(0);
  const [flash, setFlash] = useState(0);
  const [rpe, setRpe] = useState(session.rpe ?? 7);
  const [coachNote, setCoachNote] = useState(session.coachNote ?? "");
  const [soundPref, setSoundPref] = usePref("strata:sound");
  const [, pushRecent] = usePrefList("strata:recent-lifts");
  const lastTick = useRef(0);
  const scroller = useRef<HTMLDivElement>(null);

  const commit = (s: LiveSessionState) => setSession({ ...s, lastActiveAt: Date.now() });
  const close = () => setSheet(null);

  const save = useAct(async (api, s: LiveSessionState) => {
    await api.insert("workouts", toWorkoutRow(s, Date.now(), rpe));
    if (s.editingId) await api.remove("workouts", s.editingId);
  });

  /* ---- lifecycle ---- */
  const doPause = () => (
    commit(pause(session, Date.now())),
    feedback.impactLight(),
    setIslandOpen(false)
  );
  const doResume = () => {
    setSession(resume(session, Date.now()));
    setFlash((f) => f + 1);
    feedback.impactLight();
    close();
  };

  // Auto-pause after inactivity; the pause starts at the last interaction.
  useEffect(() => {
    if (editing || phase !== "live") return;
    const at = autoPauseAt(session, now);
    if (at != null) {
      setSession(pause(session, at));
      setAway(now - at);
      setSheet("away");
    }
  }, [now]); // eslint-disable-line react-hooks/exhaustive-deps

  // Count any interaction as activity (throttled to keep storage writes calm).
  const touch = () => {
    if (!paused && !editing && Date.now() - (session.lastActiveAt ?? 0) > 30_000) commit(session);
  };

  // Keep the screen awake while training.
  useEffect(() => {
    if (paused || editing || phase !== "live") return;
    const wl = (
      navigator as unknown as {
        wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> };
      }
    ).wakeLock;
    if (!wl) return;
    let lock: { release: () => Promise<void> } | null = null;
    let off = false;
    const req = () => {
      if (document.visibilityState !== "visible") return;
      wl.request("screen")
        .then((l) => {
          if (off) void l.release();
          else lock = l;
        })
        .catch(() => {});
    };
    req();
    document.addEventListener("visibilitychange", req);
    return () => {
      off = true;
      document.removeEventListener("visibilitychange", req);
      lock?.release().catch(() => {});
    };
  }, [paused, editing, phase]);

  // Ask for notification permission once, at a meaningful moment: the first rest of the first session.
  const askNotifications = () => {
    try {
      if (
        editing ||
        typeof Notification === "undefined" ||
        Notification.permission !== "default" ||
        localStorage.getItem("strata:notif-asked")
      )
        return;
      localStorage.setItem("strata:notif-asked", "1");
      Notification.requestPermission().catch(() => {});
    } catch {
      /* notifications are optional */
    }
  };

  /* ---- sets ---- */
  const firstOpen = (() => {
    for (let e = 0; e < session.exercises.length; e++) {
      if (session.exercises[e]!.skipped) continue;
      const s = session.exercises[e]!.sets.findIndex((x) => !x.done);
      if (s >= 0) return { e, s };
    }
    return null;
  })();
  const cur = active ?? firstOpen;
  const setVal = (e: number, s: number, p: Partial<SSet>) => commit(patchSet(session, e, s, p));

  const rest = session.rest ?? null;
  const left = restLeft(session, now);
  const startRest = (exName: string, secs: number, base = session) => {
    const t = Date.now();
    return { ...base, rest: { end: t + secs * 1000, total: secs, start: t, ex: exName } };
  };
  const endRest = (skipped: boolean) => {
    if (rest) learnRest(rest.ex, skipped ? (Date.now() - rest.start) / 1000 : rest.total);
    commit({ ...session, rest: null });
    setIslandOpen(false);
  };
  const nudgeRest = (d: number) => {
    if (!rest) return;
    commit({
      ...session,
      rest: {
        ...rest,
        end: rest.end + d * 1000,
        total: Math.max(5, rest.total + d),
        ...(rest.left != null ? { left: Math.max(0, rest.left + d * 1000) } : {}),
      },
    });
  };

  const scrollToExercise = (e: number) => {
    const el = scroller.current?.querySelector<HTMLElement>(`#ex-${e}`);
    if (el) el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  };

  const toggle = (e: number, s: number) => {
    const ex = session.exercises[e];
    const st = ex?.sets[s];
    if (!ex || !st) return;
    if (st.done) return setVal(e, s, { done: false, pr: false });
    const warm = st.type === "warmup";
    const prevBest = Math.max(
      best.get(ex.name) ?? 0,
      ...ex.sets.filter((x, j) => j !== s && countsForStats(x)).map((x) => x.kg),
    );
    const isPr = !warm && st.kg > 0 && st.kg > prevBest && (best.get(ex.name) ?? 0) > 0;
    const next = patchSet(session, e, s, { done: true, pr: isPr, at: Date.now() });
    commit(
      paused || editing ? next : startRest(ex.name, ex.rest_seconds ?? restFor(ex.name), next),
    );
    feedback.success();
    sound.tick();
    if (!paused && !editing) askNotifications();
    if (isPr) setPr({ ex: ex.name, kg: st.kg });
    setActive(null);
    // Finishing an exercise brings the next one into focus.
    if (next.exercises[e]!.sets.every((x) => x.done)) {
      const nextEx = next.exercises.findIndex(
        (x, i) => i > e && !x.skipped && x.sets.some((y) => !y.done),
      );
      if (nextEx >= 0) setTimeout(() => scrollToExercise(nextEx), 450);
    }
  };

  const withUndo = (msg: string, snapshot: LiveSessionState) =>
    toast(msg, { action: { label: "Undo", onClick: () => commit(snapshot) } });
  const removeSet = (e: number, s: number) => {
    const snap = session;
    commit(patchEx(session, e, (x) => ({ ...x, sets: x.sets.filter((_, j) => j !== s) })));
    setActive(null);
    feedback.impactMedium();
    withUndo("Set deleted", snap);
  };

  // Remind when rest ends, in the background too.
  useEffect(() => {
    if (!rest || paused || phase !== "live") return;
    const secs = Math.ceil(left / 1000);
    if (left === 0) {
      endRest(false);
      feedback.success();
      sound.chime();
      if (
        document.hidden &&
        typeof Notification !== "undefined" &&
        Notification.permission === "granted"
      ) {
        const opts = {
          body: `Next set: ${rest.ex}`,
          tag: "strata-rest",
          icon: "/icon-192.png",
          badge: "/favicon-64.png",
        };
        // Prefer the service worker: it can notify while the app is in the background.
        const viaSw = navigator.serviceWorker
          ?.getRegistration()
          .then((r) => (r ? r.showNotification("Rest's up", opts).then(() => true) : false));
        Promise.resolve(viaSw)
          .then((ok) => {
            if (!ok) new Notification("Rest's up", opts);
          })
          .catch(() => undefined);
      }
    } else if (secs <= 3 && secs !== lastTick.current) {
      lastTick.current = secs;
      feedback.selection();
      sound.tick();
    }
  }, [left, paused]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---- exercises ---- */
  const addExercise = (n: string) => {
    if (session.exercises.some((x) => x.name.toLowerCase() === n.toLowerCase()))
      return void toast("Already in this session");
    const p = last.get(n);
    const f = session.lighter ? 0.9 : 1;
    commit({
      ...session,
      exercises: [
        ...session.exercises,
        {
          name: n,
          sets: Array.from({ length: p?.length ?? 3 }, (_, i) => ({
            kg: roundPlate((p?.[i]?.weight ?? 0) * f),
            reps: p?.[i]?.reps ?? 8,
            done: false,
          })),
        },
      ],
    });
    pushRecent(n);
  };
  const exAt = exMenu != null ? session.exercises[exMenu] : undefined;
  const setAt = target ? session.exercises[target.e]?.sets[target.s] : undefined;
  const infoEx = infoFor != null ? session.exercises[infoFor] : undefined;

  /* ---- numbers ---- */
  const allDone = session.exercises
    .filter((e) => !e.skipped)
    .flatMap((e) => e.sets.filter((s) => s.done).map((s) => ({ ...s, ex: e.name })));
  const doneSets = allDone.filter((s) => countsForStats(s));
  const vol = doneSets.reduce((a, s) => a + s.kg * s.reps, 0);
  const prs = doneSets.filter((s) => s.pr);
  const nDone = doneCount(session);
  const nOpen = unfinishedCount(session);
  const elapsed = elapsedClock(elapsedMs(session, now));
  const mins = durationMin(session, session.savedAt ?? now);

  const ctx: RowCtx = {
    cur,
    setActive,
    toggle,
    setVal,
    removeSet,
    addSet: (e) =>
      commit(
        patchEx(session, e, (x) => ({
          ...x,
          sets: [
            ...x.sets,
            { kg: x.sets.at(-1)?.kg ?? 0, reps: x.sets.at(-1)?.reps ?? 8, done: false },
          ],
        })),
      ),
    applyAll: (e, kg, reps) =>
      commit(
        patchEx(session, e, (x) => ({
          ...x,
          sets: x.sets.map((y) => (y.done ? y : { ...y, kg, reps })),
        })),
      ),
    openKeypad: (t) => (setTarget(t), setSheet("keypad")),
    openSetMenu: (t) => (setTarget(t), setNoteFor(null), setSheet("setMenu")),
    openExMenu: (e) => (setExMenu(e), setNoteFor(null), setSheet("exMenu")),
    openInfo: (e) => (setInfoFor(e), setSheet("info")),
    restore: (e) => commit(patchEx(session, e, (x) => ({ ...x, skipped: false }))),
    last,
    lighter: !!session.lighter,
    coach,
  };

  const finish = () => {
    if (nDone === 0) return;
    if (nOpen > 0) return setSheet("unfinished");
    close();
    setPhase("review");
  };
  const toReview = (s: LiveSessionState) => (commit(s), close(), setPhase("review"));
  const endOpen =
    sheet === "end" || sheet === "unfinished" || sheet === "discard" || sheet === "away";
  const pillPress = useLongPress(() => setSheet("quick"), 500);

  return (
    <>
      <AnimatePresence>
        {minimized && (
          <motion.div
            key="pill"
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 30, opacity: 0, transition: exitTween("base") }}
            transition={spring.smooth}
            className="fixed inset-x-0 bottom-[calc(max(env(safe-area-inset-bottom),12px)+80px)] z-40 mx-auto w-max lg:bottom-8 lg:left-[264px]"
          >
            <AnimatePresence>
              {sheet === "quick" && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, transition: exitTween("fast") }}
                  transition={spring.snappy}
                  className="elev-2 absolute bottom-full left-1/2 mb-2 flex -translate-x-1/2 gap-2 rounded-full p-1.5"
                  role="menu"
                  aria-label="Session quick actions"
                >
                  <button
                    role="menuitem"
                    type="button"
                    onClick={() => (paused ? doResume() : doPause(), close())}
                    className="flex min-h-[44px] items-center gap-1.5 rounded-full bg-surface-3 px-4 text-label font-semibold"
                  >
                    {paused ? <Play className="size-4" /> : <Pause className="size-4" />}
                    {paused ? "Resume" : "Pause"}
                  </button>
                  <button
                    role="menuitem"
                    type="button"
                    onClick={() => (setMinimized(false), setSheet("end"))}
                    className="flex min-h-[44px] items-center gap-1.5 rounded-full bg-destructive/15 px-4 text-label font-semibold text-destructive"
                  >
                    <Square className="size-4" /> End
                  </button>
                  <button
                    type="button"
                    aria-label="Close quick actions"
                    onClick={close}
                    className="grid size-11 place-items-center rounded-full"
                  >
                    <X className="size-4" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
            <div className="glass flex items-center gap-1 rounded-full border border-hairline-strong p-1 shadow-2">
              <motion.button
                type="button"
                whileTap={press.button}
                {...pillPress.handlers}
                onClick={() =>
                  !pillPress.fired.current && (feedback.impactLight(), setMinimized(false))
                }
                aria-label={`Open live session, ${paused ? "paused" : "running"} ${elapsed}. Hold for quick actions`}
                className="flex h-11 select-none items-center gap-2.5 pl-4 pr-2 text-label font-semibold"
              >
                {paused ? (
                  <Pause className="size-4 text-faint" />
                ) : (
                  <span className="relative flex size-2.5">
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-volt/60 motion-reduce:hidden" />
                    <span className="relative inline-flex size-2.5 rounded-full bg-volt" />
                  </span>
                )}
                <span className="max-w-[9rem] truncate">{session.title}</span>
                <span className="num text-muted-foreground">{elapsed}</span>
                {rest && (
                  <span className="num rounded-full bg-surface-3 px-2 py-0.5 text-foreground">
                    rest {clock(left)}
                  </span>
                )}
              </motion.button>
              {!editing && (
                <motion.button
                  whileTap={press.icon}
                  type="button"
                  onClick={paused ? doResume : doPause}
                  aria-label={paused ? "Resume session" : "Pause session"}
                  className={cn(
                    "grid size-11 place-items-center rounded-full",
                    paused ? "bg-volt text-primary-foreground" : "bg-surface-3",
                  )}
                >
                  {paused ? (
                    <Play className="size-5" fill="currentColor" />
                  ) : (
                    <Pause className="size-5" />
                  )}
                </motion.button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {!minimized && (
          <motion.div
            key="sheet"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%", transition: { duration: 0.28, ease: [0.4, 0, 1, 1] } }}
            transition={spring.smooth}
            className="fixed inset-0 z-50 mx-auto flex max-w-md flex-col overflow-hidden bg-background lg:inset-y-4 lg:max-w-lg lg:rounded-sheet lg:border lg:border-hairline-strong lg:shadow-3"
            role="dialog"
            aria-label={editing ? "Edit workout" : "Live workout session"}
            onPointerDownCapture={touch}
          >
            <motion.div
              className="flex min-h-0 flex-1 flex-col"
              animate={{
                scale: endOpen && !reduce ? 0.96 : 1,
                opacity: endOpen && reduce ? 0.6 : 1,
              }}
              transition={spring.smooth}
            >
              <AnimatePresence>
                {phase === "live" && rest && (
                  <RestIsland
                    rest={rest}
                    left={left}
                    paused={paused}
                    open={islandOpen}
                    onToggle={() => setIslandOpen((o) => !o)}
                    onNudge={nudgeRest}
                    onSkip={() => (feedback.impactLight(), endRest(true))}
                  />
                )}
              </AnimatePresence>

              <motion.div
                drag="y"
                dragConstraints={{ top: 0, bottom: 0 }}
                dragElastic={{ top: 0, bottom: 0.5 }}
                onDragEnd={(_, i) => (i.offset.y > 90 || i.velocity.y > 700) && setMinimized(true)}
                className={cn(
                  "shrink-0 cursor-grab touch-none border-b border-hairline px-4 pb-3 transition-[padding] duration-300",
                  rest
                    ? "pt-[calc(max(8px,env(safe-area-inset-top))+52px)]"
                    : "pt-[max(8px,env(safe-area-inset-top))]",
                )}
              >
                <div aria-hidden className="mx-auto mb-2 h-[5px] w-10 rounded-full bg-surface-3" />
                <div className="flex items-center gap-2">
                  <IconButton label="Minimise session" onClick={() => setMinimized(true)}>
                    <ChevronDown className="size-5" />
                  </IconButton>
                  <div className="min-w-0 flex-1 text-center">
                    <div className="truncate text-label font-semibold text-muted-foreground">
                      {editing ? `Editing · ${session.title}` : session.title}
                    </div>
                    <div className="relative mx-auto w-max">
                      <motion.div
                        className="num text-title-l font-semibold leading-none"
                        animate={
                          paused
                            ? reduce
                              ? { opacity: 0.5 }
                              : { opacity: [0.5, 0.25, 0.5] }
                            : { opacity: 1 }
                        }
                        transition={
                          paused && !reduce
                            ? { duration: 1.6, repeat: Infinity, ease: "easeInOut" }
                            : { duration: 0.2 }
                        }
                        aria-label={`${paused ? "Paused at" : "Elapsed"} ${elapsed}`}
                      >
                        {editing ? `${mins} min` : elapsed}
                      </motion.div>
                      <AnimatePresence>
                        {flash > 0 && (
                          <motion.span
                            key={flash}
                            aria-hidden
                            className="pointer-events-none absolute -inset-x-2 -inset-y-1 rounded-tile bg-volt/30"
                            initial={{ opacity: 1 }}
                            animate={{ opacity: 0 }}
                            transition={tween("base")}
                          />
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                  <motion.button
                    whileTap={press.button}
                    onClick={() => (feedback.impactLight(), setSheet("end"))}
                    className="min-h-[44px] rounded-full bg-volt px-5 text-label font-semibold text-primary-foreground"
                  >
                    {editing ? "Save" : "Finish"}
                  </motion.button>
                </div>
                {!editing && (
                  <div className="mt-3 flex items-center justify-center gap-2">
                    <motion.button
                      whileTap={press.button}
                      type="button"
                      onClick={paused ? doResume : doPause}
                      className="flex min-h-[40px] items-center gap-1.5 rounded-full bg-surface-2 px-4 text-label font-semibold transition-colors hover-device:bg-surface-3"
                    >
                      {paused ? <Play className="size-4" /> : <Pause className="size-4" />}{" "}
                      {paused ? "Resume" : "Pause"}
                    </motion.button>
                    <motion.button
                      whileTap={press.button}
                      type="button"
                      onClick={() => {
                        const ex = session.exercises[cur?.e ?? 0];
                        if (rest) setIslandOpen(true);
                        else
                          commit(
                            startRest(
                              ex?.name ?? "Rest",
                              ex?.rest_seconds ?? restFor(ex?.name ?? "Rest"),
                            ),
                          );
                      }}
                      className="flex min-h-[40px] items-center gap-1.5 rounded-full bg-surface-2 px-4 text-label font-semibold transition-colors hover-device:bg-surface-3"
                    >
                      <Timer className="size-4" /> {rest ? "Resting" : "Rest"}
                    </motion.button>
                    <IconButton
                      label={soundPref ? "Turn sounds off" : "Turn sounds on"}
                      onClick={() => setSoundPref(!soundPref)}
                      className="size-10"
                    >
                      {soundPref ? (
                        <Volume2 className="size-[18px]" />
                      ) : (
                        <VolumeX className="size-[18px] text-faint" />
                      )}
                    </IconButton>
                  </div>
                )}
                {session.lighter && !editing && (
                  <div className="mt-2 flex justify-center">
                    <Tag tone="muted">
                      <Feather className="size-3" /> Lighter day · weights −10%
                    </Tag>
                  </div>
                )}
                <div className="mt-3 grid grid-cols-3 text-center text-caption text-faint">
                  <div>
                    <span className="block text-label font-semibold text-foreground">
                      <NumberTicker value={doneSets.length} intro={false} />
                    </span>
                    sets
                  </div>
                  <div>
                    <span className="num block text-label font-semibold text-foreground">
                      {volumeText(Math.round(vol))}
                    </span>
                    volume
                  </div>
                  <div>
                    <span
                      className={cn(
                        "block text-label font-semibold",
                        prs.length ? "text-volt" : "text-foreground",
                      )}
                    >
                      <NumberTicker value={prs.length} intro={false} />
                    </span>
                    records
                  </div>
                </div>
              </motion.div>

              {session.exercises.length > 1 && (
                <div
                  className="no-scrollbar shrink-0 overflow-x-auto border-b border-hairline px-3 py-2.5"
                  role="tablist"
                  aria-label="Exercises"
                >
                  <div className="flex w-max gap-1.5">
                    {session.exercises.map((ex, i) => {
                      const d = ex.sets.filter((s) => s.done).length;
                      const complete = !ex.skipped && ex.sets.length > 0 && d === ex.sets.length;
                      const on = cur?.e === i;
                      return (
                        <motion.button
                          key={ex.name}
                          role="tab"
                          aria-selected={on}
                          whileTap={press.button}
                          onClick={() => (feedback.selection(), scrollToExercise(i))}
                          className={cn(
                            "relative flex h-9 items-center gap-1.5 rounded-full px-3 text-caption font-semibold transition-colors",
                            on ? "text-foreground" : "text-faint",
                            ex.skipped && "line-through",
                          )}
                        >
                          {on && (
                            <motion.span
                              layoutId="ex-strip"
                              className="absolute inset-0 rounded-full bg-surface-2 ring-1 ring-hairline-strong"
                              transition={spring.snappy}
                            />
                          )}
                          <span className="relative">
                            {complete ? (
                              <Check className="size-3.5 text-volt" strokeWidth={3} />
                            ) : (
                              <span className="num">
                                {d}/{ex.sets.length}
                              </span>
                            )}
                          </span>
                          <span className="relative max-w-[8rem] truncate">{ex.name}</span>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              )}

              <AnimatePresence initial={false}>
                {paused && (
                  <motion.div
                    key="paused"
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, transition: exitTween("fast") }}
                    transition={spring.smooth}
                    className="shrink-0 border-b border-hairline bg-surface"
                  >
                    <div className="flex items-center gap-3 px-4 py-3">
                      <div className="min-w-0 flex-1">
                        <div className="num text-title font-semibold">
                          Paused · {elapsedClock(now - (session.pausedAt ?? now))}
                        </div>
                        <div className="text-caption text-muted-foreground">
                          Timer and rest are frozen. Sets stay editable.
                        </div>
                      </div>
                      <motion.button
                        whileTap={press.button}
                        onClick={doResume}
                        className="flex h-12 items-center gap-2 rounded-full bg-volt-gradient px-5 font-semibold text-primary-foreground"
                      >
                        <Play className="size-5" fill="currentColor" /> Resume
                      </motion.button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div
                ref={scroller}
                className="flex-1 scroll-pt-3 overflow-y-auto overscroll-contain px-3 pb-40 pt-3"
              >
                <Reorder.Group
                  axis="y"
                  values={session.exercises}
                  onReorder={(x) => (commit({ ...session, exercises: x }), setActive(null))}
                  className="p-0"
                >
                  <AnimatePresence initial={false}>
                    {session.exercises.map((ex, e) => (
                      <ExerciseCard key={ex.name} ex={ex} e={e} c={ctx} />
                    ))}
                  </AnimatePresence>
                </Reorder.Group>
                {session.exercises.length > 0 && (
                  <p className="mb-3 mt-1 text-center text-caption text-faint">
                    Tap a number to type it · hold a set for options · swipe left to delete
                  </p>
                )}
                <SheetBtn
                  onClick={() => (setReplacing(null), setSheet("picker"))}
                  icon={<Plus className="size-5" />}
                >
                  Add exercise
                </SheetBtn>
                {session.exercises.length === 0 && (
                  <p className="mt-4 px-2 text-center text-label text-muted-foreground">
                    Pick your first exercise to start logging sets.
                  </p>
                )}
              </div>
            </motion.div>

            {/* keypad */}
            <BottomCard
              open={sheet === "keypad" && !!setAt}
              onClose={close}
              title={target?.field === "reps" ? "Reps" : "Weight"}
            >
              {setAt && target && (
                <Keypad
                  key={`${target.e}-${target.s}-${target.field}`}
                  initial={target.field === "reps" ? setAt.reps : setAt.kg}
                  unit={target.field === "reps" ? "reps" : "kg"}
                  onDone={(n) => (
                    setVal(target.e, target.s, target.field === "reps" ? { reps: n } : { kg: n }),
                    close()
                  )}
                  {...(target.field !== "reps" ? { onPlates: () => setSheet("plates") } : {})}
                />
              )}
            </BottomCard>

            {/* plate calculator */}
            <BottomCard
              open={sheet === "plates" && !!setAt}
              onClose={close}
              title="Plate calculator"
            >
              {setAt &&
                target &&
                (() => {
                  const { out, rest: rem } = platesFor(setAt.kg);
                  return (
                    <>
                      <Barbell kg={setAt.kg} />
                      <div className="mt-4 text-center">
                        <div className="num text-title-l font-semibold">
                          {setAt.kg}
                          <span className="unit">kg</span>
                        </div>
                        <p className="mt-1 text-label text-muted-foreground">
                          {setAt.kg < 20
                            ? "Lighter than an empty 20 kg bar."
                            : out.length
                              ? `20 kg bar + ${out.join(" · ")} kg each side`
                              : "Empty 20 kg bar"}
                          {rem > 0 && ` · ${rem} kg can't be loaded`}
                        </p>
                      </div>
                      <div className="mt-5">
                        <Stepper
                          label="Weight"
                          unit="kg"
                          value={setAt.kg}
                          step={2.5}
                          onChange={(v) => setVal(target.e, target.s, { kg: v })}
                        />
                      </div>
                      <div className="mt-6">
                        <SheetBtn onClick={close}>Done</SheetBtn>
                      </div>
                    </>
                  );
                })()}
            </BottomCard>

            {/* exercise detail */}
            <BottomCard
              tall
              open={sheet === "info" && !!infoEx}
              onClose={close}
              title={infoEx?.name ?? "Exercise"}
            >
              {infoEx && (
                <ExerciseInfo name={infoEx.name} workouts={pastWorkouts} cues={infoEx.notes} />
              )}
            </BottomCard>

            {/* set menu */}
            <BottomCard
              open={sheet === "setMenu" && !!setAt}
              onClose={close}
              title={target ? `Set ${target.s + 1}` : "Set"}
            >
              {setAt && target && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Set type">
                    {SET_TYPES.map((t) => {
                      const on = (setAt.type ?? "working") === t.type;
                      return (
                        <motion.button
                          key={t.type}
                          type="button"
                          role="radio"
                          aria-checked={on}
                          whileTap={press.button}
                          onClick={() => (
                            setVal(target.e, target.s, { type: t.type }),
                            feedback.selection(),
                            close()
                          )}
                          className={cn(
                            "min-h-[52px] rounded-tile text-label font-semibold transition-colors",
                            on
                              ? "bg-foreground text-background"
                              : "bg-surface-2 hover-device:bg-surface-3",
                          )}
                        >
                          {t.label}
                        </motion.button>
                      );
                    })}
                  </div>
                  <p className="text-caption text-muted-foreground">
                    Warm-ups don't count toward volume or records and aren't saved.
                  </p>
                  {noteFor === "set" ? (
                    <NoteEditor
                      value={noteDraft}
                      onChange={setNoteDraft}
                      onSave={() => (
                        setVal(target.e, target.s, { note: noteDraft.trim() }),
                        close()
                      )}
                    />
                  ) : (
                    <SheetBtn
                      onClick={() => (setNoteDraft(setAt.note ?? ""), setNoteFor("set"))}
                      icon={<StickyNote className="size-5" />}
                    >
                      {setAt.note ? "Edit note" : "Add note"}
                    </SheetBtn>
                  )}
                  <SheetBtn
                    tone="danger"
                    onClick={() => (removeSet(target.e, target.s), close())}
                    icon={<Trash2 className="size-5" />}
                  >
                    Delete set
                  </SheetBtn>
                </div>
              )}
            </BottomCard>

            {/* exercise menu */}
            <BottomCard
              open={sheet === "exMenu" && !!exAt}
              onClose={close}
              title={exAt?.name ?? "Exercise"}
            >
              {exAt && exMenu != null && (
                <div className="space-y-2">
                  {noteFor === "ex" ? (
                    <NoteEditor
                      value={noteDraft}
                      onChange={setNoteDraft}
                      onSave={() => (
                        commit(patchEx(session, exMenu, (x) => ({ ...x, note: noteDraft.trim() }))),
                        close()
                      )}
                    />
                  ) : (
                    <>
                      <SheetBtn
                        onClick={() => {
                          const snap = session;
                          commit(patchEx(session, exMenu, (x) => ({ ...x, skipped: !x.skipped })));
                          close();
                          if (!exAt.skipped) withUndo(`${exAt.name} skipped`, snap);
                        }}
                        icon={<SkipForward className="size-5" />}
                      >
                        {exAt.skipped ? "Restore" : "Skip"}
                      </SheetBtn>
                      <SheetBtn
                        onClick={() => (setReplacing(exMenu), setSheet("picker"))}
                        icon={<Replace className="size-5" />}
                      >
                        Replace
                      </SheetBtn>
                      <SheetBtn
                        onClick={() => (setNoteDraft(exAt.note ?? ""), setNoteFor("ex"))}
                        icon={<StickyNote className="size-5" />}
                      >
                        {exAt.note ? "Edit note" : "Add note"}
                      </SheetBtn>
                      <div className="pt-3">
                        <div className="eyebrow mb-2">Rest time for this exercise</div>
                        <div className="grid grid-cols-5 gap-1.5">
                          {[60, 90, 120, 180, 240].map((r) => {
                            const on = (exAt.rest_seconds ?? restFor(exAt.name)) === r;
                            return (
                              <button
                                key={r}
                                type="button"
                                aria-pressed={on}
                                onClick={() => (
                                  commit(
                                    patchEx(session, exMenu, (x) => ({ ...x, rest_seconds: r })),
                                  ),
                                  feedback.selection()
                                )}
                                className={cn(
                                  "num min-h-[48px] rounded-tile text-label font-semibold transition-colors",
                                  on
                                    ? "bg-foreground text-background"
                                    : "bg-surface-2 hover-device:bg-surface-3",
                                )}
                              >
                                {r < 120 ? `${r}s` : `${r / 60}m`}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      <div className="pt-3">
                        <SheetBtn
                          tone="danger"
                          onClick={() => {
                            const snap = session;
                            commit({
                              ...session,
                              exercises: session.exercises.filter((_, i) => i !== exMenu),
                            });
                            close();
                            setActive(null);
                            feedback.impactMedium();
                            withUndo(`${exAt.name} removed`, snap);
                          }}
                          icon={<Trash2 className="size-5" />}
                        >
                          Remove
                        </SheetBtn>
                      </div>
                    </>
                  )}
                </div>
              )}
            </BottomCard>

            {/* exercise picker */}
            <BottomCard
              tall
              open={sheet === "picker"}
              onClose={close}
              title={
                replacing != null
                  ? `Replace ${session.exercises[replacing]?.name ?? ""}`
                  : "Add exercise"
              }
            >
              <ExercisePicker
                history={[...best.keys()]}
                onPick={(n) => {
                  if (replacing != null) {
                    if (
                      session.exercises.some(
                        (x, i) => i !== replacing && x.name.toLowerCase() === n.toLowerCase(),
                      )
                    )
                      return void toast("Already in this session");
                    commit(patchEx(session, replacing, (x) => ({ ...x, name: n })));
                    pushRecent(n);
                  } else addExercise(n);
                  feedback.selection();
                  close();
                }}
              />
            </BottomCard>

            {/* end */}
            <BottomCard
              open={sheet === "end"}
              onClose={close}
              title={editing ? "Save your changes?" : "Finish this session?"}
            >
              <div className="space-y-2">
                <SheetBtn
                  tone="primary"
                  disabled={nDone === 0}
                  onClick={finish}
                  icon={<Check className="size-5" />}
                >
                  {editing ? "Save changes" : "Finish and review"}
                </SheetBtn>
                {nDone === 0 && (
                  <p className="pb-1 text-center text-label text-muted-foreground">
                    Complete at least one set to save this session.
                  </p>
                )}
                <SheetBtn onClick={close}>{editing ? "Keep editing" : "Keep training"}</SheetBtn>
                <SheetBtn tone="danger" onClick={() => (editing ? onClose() : setSheet("discard"))}>
                  {editing ? "Discard changes" : "Discard session"}
                </SheetBtn>
              </div>
            </BottomCard>

            <BottomCard
              open={sheet === "unfinished"}
              onClose={close}
              title={`${nOpen} set${nOpen === 1 ? "" : "s"} not done`}
            >
              <p className="mb-5 text-body text-muted-foreground">
                Only completed sets are saved. What should happen to the rest?
              </p>
              <div className="space-y-2">
                <SheetBtn onClick={() => toReview(markAllDone(session, Date.now()))}>
                  Mark all done
                </SheetBtn>
                <SheetBtn onClick={() => toReview(removeUnfinished(session))}>Remove them</SheetBtn>
                <SheetBtn onClick={close}>Go back</SheetBtn>
              </div>
            </BottomCard>

            <BottomCard open={sheet === "discard"} onClose={close} title="Discard this session?">
              <p className="text-body text-muted-foreground">
                {nDone
                  ? `${nDone} logged set${nDone === 1 ? "" : "s"} will be lost.`
                  : "Nothing has been logged yet."}
              </p>
              <div className="mt-6 grid grid-cols-2 gap-2">
                <SheetBtn onClick={close}>Keep training</SheetBtn>
                <motion.button
                  whileTap={press.button}
                  onClick={() => (feedback.error(), onClose())}
                  className="h-14 rounded-full bg-destructive font-semibold text-destructive-foreground"
                >
                  Discard
                </motion.button>
              </div>
            </BottomCard>

            <BottomCard
              open={sheet === "away" && paused}
              onClose={close}
              title={`You were away ${Math.max(10, Math.round(away / 60000))} min`}
            >
              <p className="mb-5 text-body text-muted-foreground">
                We paused your session so the break doesn't count. Resume, or finish here?
              </p>
              <div className="space-y-2">
                <SheetBtn tone="primary" onClick={doResume} icon={<Play className="size-5" />}>
                  Resume
                </SheetBtn>
                <SheetBtn onClick={() => setSheet("end")}>Finish session</SheetBtn>
              </div>
            </BottomCard>

            {/* PR moment */}
            <AnimatePresence>
              {pr && <PrMoment key="pr" exercise={pr.ex} kg={pr.kg} onDone={() => setPr(null)} />}
            </AnimatePresence>

            {/* review → saved */}
            <AnimatePresence>
              {phase !== "live" && (
                <SessionComplete
                  phase={phase}
                  editing={editing}
                  title={session.title}
                  mins={mins}
                  vol={vol}
                  sets={doneSets.length}
                  warmups={allDone.length - doneSets.length}
                  prs={prs.map((p) => ({ ex: p.ex, kg: p.kg, reps: p.reps }))}
                  exercises={[...new Set(doneSets.map((s) => s.ex))]}
                  rpe={rpe}
                  setRpe={setRpe}
                  note={coachNote}
                  setNote={setCoachNote}
                  coach={coach}
                  onBack={() => setPhase("live")}
                  onSave={() =>
                    save
                      .mutateAsync({ ...session, rpe, coachNote })
                      .catch(
                        (e) => (
                          toast.error((e as Error).message),
                          feedback.error(),
                          Promise.reject(e)
                        ),
                      )
                  }
                  onSaved={() => {
                    setSession({
                      ...session,
                      rpe,
                      coachNote,
                      savedAt: Date.now(),
                      rest: null,
                      pausedAt: session.pausedAt ?? Date.now(),
                    });
                    setPhase("saved");
                    sound.chime();
                  }}
                  onShare={async () => {
                    const r = await shareSession({
                      title: session.title,
                      duration: `${mins} min`,
                      volume: volumeText(vol),
                      sets: doneSets.length,
                      prs: prs.map((p) => ({ ex: p.ex, kg: p.kg, reps: p.reps })),
                      coach,
                    });
                    if (r === "downloaded")
                      toast.success("Share card saved", {
                        description: "You'll find it in your downloads.",
                      });
                  }}
                  onClose={onClose}
                />
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
