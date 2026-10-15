import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Dumbbell,
  HeartPulse,
  Loader2,
  Sparkles,
  Target,
  User,
  Users,
  Zap,
} from "lucide-react";
import { useAct, useMe } from "@/lib/api";
import type { Role } from "@/lib/types";
import { exitTween, press, spring, tween } from "@/lib/motion";
import { feedback } from "@/lib/feedback";
import { firstName } from "@/lib/stats";
import { cn } from "@/lib/utils";

const ROLES: { role: Role; title: string; body: string; icon: typeof User }[] = [
  {
    role: "client",
    title: "I train with a coach",
    body: "Follow their program, log sessions and stay in touch.",
    icon: Users,
  },
  {
    role: "solo",
    title: "I train on my own",
    body: "Track training, food, sleep and how you feel.",
    icon: User,
  },
  {
    role: "trainer",
    title: "I'm a coach",
    body: "Build programs, follow every client, step in at the right moment.",
    icon: Sparkles,
  },
];
const GOALS = [
  { label: "Get stronger", icon: Dumbbell },
  { label: "Change my physique", icon: Target },
  { label: "Perform in my sport", icon: Zap },
  { label: "Feel healthier", icon: HeartPulse },
];

/** First run: one clear question per screen. The role is saved last, so nothing half-finished is left behind. */
export function Onboarding() {
  const me = useMe().data;
  const [role, setRole] = useState<Role | null>(null);
  const [code, setCode] = useState("");
  const [goal, setGoal] = useState("");
  const [i, setI] = useState(0);
  const [dir, setDir] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const finish = useAct(async (api, v: { role: Role; code: string; goal: string }) => {
    if (v.goal.trim()) await api.updateProfile({ goal: v.goal.trim() });
    if (v.role === "client" && v.code.trim().length >= 6) await api.joinTrainer(v.code.trim());
    await api.setRole(v.role);
  });
  const steps = ["role", ...(role === "client" ? ["coach"] : []), "goal"] as const;
  const step = steps[i] ?? "role";
  const last = i === steps.length - 1;
  const go = (d: number) => {
    feedback.selection();
    setDir(d);
    setError(null);
    setI((x) => Math.max(0, Math.min(steps.length - 1, x + d)));
  };
  const canNext =
    step === "role" ? !!role : step === "coach" ? code.length === 0 || code.length >= 6 : true;

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col bg-background px-6 pb-[max(24px,env(safe-area-inset-bottom))] pt-[max(24px,env(safe-area-inset-top))]">
      <div className="flex items-center justify-between">
        <div className="font-display text-title font-black [font-stretch:125%]">
          KINRA<span className="text-volt">.</span>
        </div>
        <div className="flex gap-1.5" aria-label={`Step ${i + 1} of ${steps.length}`}>
          {steps.map((s, k) => (
            <motion.span
              key={s}
              animate={{ width: k === i ? 20 : 6, opacity: k <= i ? 1 : 0.3 }}
              transition={spring.snappy}
              className="h-1.5 rounded-full bg-foreground"
            />
          ))}
        </div>
      </div>

      <div className="relative flex-1 overflow-hidden pt-12">
        <AnimatePresence mode="popLayout" initial={false} custom={dir}>
          <motion.div
            key={step}
            custom={dir}
            initial={{ opacity: 0, x: dir * 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: dir * -40, transition: exitTween("fast") }}
            transition={spring.smooth}
          >
            {step === "role" && (
              <>
                <div className="eyebrow">
                  Welcome{me?.display_name ? `, ${firstName(me.display_name)}` : ""}
                </div>
                <h1 className="mt-3 font-display text-title-l font-extrabold">
                  How will you use Kinra?
                </h1>
                <div className="mt-8 space-y-2" role="radiogroup" aria-label="Account type">
                  {ROLES.map((o, k) => (
                    <motion.button
                      key={o.role}
                      type="button"
                      role="radio"
                      aria-checked={role === o.role}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ ...spring.smooth, delay: 0.08 + k * 0.05 }}
                      whileTap={press.card}
                      onClick={() => (feedback.selection(), setRole(o.role))}
                      className={cn(
                        "panel flex w-full items-center gap-4 p-5 text-left transition-[border-color,box-shadow] duration-200",
                        role === o.role && "border-volt/60 shadow-[0_0_0_1px_var(--volt)]",
                      )}
                    >
                      <span
                        className={cn(
                          "grid size-11 shrink-0 place-items-center rounded-full transition-colors",
                          role === o.role ? "bg-volt text-primary-foreground" : "bg-surface-3",
                        )}
                      >
                        <o.icon className="size-5" strokeWidth={1.9} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-display text-title font-bold">{o.title}</span>
                        <span className="mt-0.5 block text-label text-muted-foreground">
                          {o.body}
                        </span>
                      </span>
                    </motion.button>
                  ))}
                </div>
              </>
            )}
            {step === "coach" && (
              <>
                <div className="eyebrow">Your coach</div>
                <h1 className="mt-3 font-display text-title-l font-extrabold">
                  Enter your coach's code
                </h1>
                <p className="mt-2 text-label text-muted-foreground">
                  It's six characters. Your coach can find it on their profile. You can also add it
                  later.
                </p>
                <input
                  autoFocus
                  value={code}
                  onChange={(e) =>
                    setCode(
                      e.target.value
                        .toUpperCase()
                        .replace(/[^A-Z0-9]/g, "")
                        .slice(0, 6),
                    )
                  }
                  placeholder="ABC123"
                  aria-label="Coach code"
                  className="num mt-8 h-16 w-full rounded-card border border-hairline-strong bg-surface text-center text-title-l font-semibold tracking-[0.3em] outline-none transition-colors placeholder:text-faint focus:border-volt/60"
                />
              </>
            )}
            {step === "goal" && (
              <>
                <div className="eyebrow">Your goal</div>
                <h1 className="mt-3 font-display text-title-l font-extrabold">
                  {role === "trainer"
                    ? "What do you help people with?"
                    : "What are you working toward?"}
                </h1>
                <div className="mt-8 grid grid-cols-2 gap-2">
                  {GOALS.map((g) => (
                    <motion.button
                      key={g.label}
                      type="button"
                      whileTap={press.card}
                      aria-pressed={goal === g.label}
                      onClick={() => (
                        feedback.selection(),
                        setGoal(goal === g.label ? "" : g.label)
                      )}
                      className={cn(
                        "panel flex min-h-[96px] flex-col justify-between p-4 text-left transition-[border-color] duration-200",
                        goal === g.label && "border-volt/60",
                      )}
                    >
                      <g.icon
                        className={cn("size-5", goal === g.label ? "text-volt" : "text-faint")}
                        strokeWidth={1.9}
                      />
                      <span className="text-label font-semibold">{g.label}</span>
                    </motion.button>
                  ))}
                </div>
                <input
                  value={GOALS.some((g) => g.label === goal) ? "" : goal}
                  onChange={(e) => setGoal(e.target.value)}
                  placeholder="Or in your own words"
                  aria-label="Your goal in your own words"
                  className="mt-3 h-13 w-full rounded-tile border border-hairline-strong bg-surface px-4 text-body outline-none transition-colors placeholder:text-faint focus:border-volt/60"
                />
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={tween("fast")}
            role="alert"
            className="mb-3 rounded-tile bg-destructive/10 px-4 py-3 text-label text-destructive"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
      <div className="flex gap-3">
        <motion.button
          whileTap={press.icon}
          type="button"
          aria-label="Back"
          onClick={() => go(-1)}
          className={cn(
            "grid size-14 shrink-0 place-items-center rounded-full bg-surface-2 transition-opacity",
            i === 0 && "pointer-events-none opacity-0",
          )}
        >
          <ArrowLeft className="size-5" />
        </motion.button>
        <motion.button
          whileTap={canNext ? press.button : {}}
          type="button"
          disabled={!canNext || finish.isPending}
          onClick={() => {
            if (!last) return go(1);
            if (!role) return;
            feedback.impactLight();
            finish.mutate(
              { role, code, goal },
              {
                onSuccess: () => feedback.success(),
                onError: (e) => (feedback.error(), setError(e.message)),
              },
            );
          }}
          className="flex h-14 flex-1 items-center justify-center gap-2 rounded-full bg-volt-gradient text-body font-semibold text-primary-foreground shadow-glow transition-opacity disabled:opacity-40 disabled:shadow-none"
        >
          {finish.isPending ? (
            <Loader2 className="size-5 animate-spin" />
          ) : last ? (
            <Check className="size-5" />
          ) : null}
          {last ? "Enter Kinra" : step === "coach" && !code ? "I'll add it later" : "Continue"}
          {!last && <ArrowRight className="size-5" />}
        </motion.button>
      </div>
    </div>
  );
}
