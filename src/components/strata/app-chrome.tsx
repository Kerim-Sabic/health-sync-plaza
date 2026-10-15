import { Link, useNavigate, useRouter, useRouterState } from "@tanstack/react-router";
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import {
  ArrowLeftRight,
  ClipboardList,
  Dumbbell,
  Home,
  LayoutDashboard,
  LineChart,
  Moon,
  Plus,
  RefreshCw,
  Search,
  User,
  Users,
  Utensils,
  X,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import type { Role } from "@/lib/types";
import { cn } from "@/lib/utils";
import { dur, exitTween, press, spring, stagger, tabIndex, tween } from "@/lib/motion";
import { feedback } from "@/lib/feedback";
import { logKinds, type LogKind } from "./sheets";
import { Avatar } from "./ui";
import { useShell } from "./shell";

export const DEMO_KEY = "strata-demo";

type Tab = { to: string; label: string; icon: typeof Home; exact?: boolean };
export const clientTabs: Tab[] = [
  { to: "/app", label: "Today", icon: Home, exact: true },
  { to: "/app/train", label: "Train", icon: Dumbbell },
  { to: "/app/fuel", label: "Fuel", icon: Utensils },
  { to: "/app/recover", label: "Recover", icon: Moon },
  { to: "/app/progress", label: "Progress", icon: LineChart },
];
export const coachTabs: Tab[] = [
  { to: "/app", label: "Overview", icon: LayoutDashboard, exact: true },
  { to: "/app/clients", label: "Clients", icon: Users },
  { to: "/app/programs", label: "Programs", icon: ClipboardList },
  { to: "/app/me", label: "Profile", icon: User },
];
export const tabsFor = (role: Role) => (role === "trainer" ? coachTabs : clientTabs);
const isActive = (t: Tab, path: string) =>
  t.exact ? path === t.to || path === t.to + "/" : path === t.to || path.startsWith(t.to + "/");

/* ---------- scroll memory + hide on scroll ---------- */

/** Each tab keeps its own scroll position; tapping a tab returns you to where you were. */
export function useTabScrollMemory(path: string) {
  const saved = useRef(new Map<string, number>());
  const current = useRef(path);
  useEffect(() => {
    const on = () => saved.current.set(current.current, window.scrollY);
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  useLayoutEffect(() => {
    current.current = path;
    window.scrollTo(0, saved.current.get(path) ?? 0);
  }, [path]);
}

/** Hides chrome while reading down a long page and brings it back on the first scroll up. */
export function useHideOnScroll() {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    let last = window.scrollY;
    let raf = 0;
    const on = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const y = window.scrollY;
        const long = document.documentElement.scrollHeight > window.innerHeight * 1.6;
        if (!long || y < 160) setHidden(false);
        else if (y - last > 6) setHidden(true);
        else if (last - y > 6) setHidden(false);
        last = y;
      });
    };
    window.addEventListener("scroll", on, { passive: true });
    return () => (window.removeEventListener("scroll", on), cancelAnimationFrame(raf));
  }, []);
  return hidden;
}

/* ---------- page transitions ---------- */
type Kind = "none" | "forward" | "back" | "push" | "pop";
const ENTER: Record<Kind, false | { x: number; opacity: number }> = {
  none: false,
  forward: { x: 24, opacity: 0 },
  back: { x: -24, opacity: 0 },
  push: { x: 64, opacity: 0 },
  pop: { x: -32, opacity: 0 },
};

function transitionKind(from: string, to: string, tabs: string[]): Kind {
  if (from === to) return "none";
  const depth = (p: string) => p.replace(/\/$/, "").split("/").length;
  const fi = tabIndex(from, tabs);
  const ti = tabIndex(to, tabs);
  if (fi === ti || fi < 0 || ti < 0)
    return depth(to) > depth(from) ? "push" : depth(to) < depth(from) ? "pop" : "forward";
  return ti > fi ? "forward" : "back";
}

/**
 * Directional shared-axis entrance: moving right along the tabs slides the
 * new screen in from the right, moving left from the left, and drilling
 * into a detail page pushes it in from the edge.
 */
export function PageTransition({
  path,
  tabs,
  children,
}: {
  path: string;
  tabs: string[];
  children: ReactNode;
}) {
  const prev = useRef(path);
  const kind = transitionKind(prev.current, path, tabs);
  useEffect(() => {
    prev.current = path;
  }, [path]);
  return (
    <motion.div
      key={path}
      initial={ENTER[kind]}
      animate={{ x: 0, opacity: 1 }}
      transition={{
        x: kind === "push" ? spring.gentle : spring.smooth,
        opacity: tween(kind === "push" ? "slow" : "base"),
      }}
    >
      {children}
    </motion.div>
  );
}

/** iOS-style swipe from the left edge to go back. Only in the installed app, where the browser has no back gesture of its own. */
export function EdgeSwipeBack({ enabled, children }: { enabled: boolean; children: ReactNode }) {
  const router = useRouter();
  const x = useMotionValue(0);
  const shade = useTransform(x, [0, 400], [0, 0.35]);
  const [standalone, setStandalone] = useState(false);
  useEffect(() => {
    const nav = navigator as Navigator & { standalone?: boolean };
    setStandalone(!!nav.standalone || matchMedia("(display-mode: standalone)").matches);
  }, []);
  useEffect(() => {
    if (!enabled || !standalone) return;
    let start: { x: number; y: number } | null = null;
    let horizontal: boolean | null = null;
    const down = (e: TouchEvent) => {
      const t = e.touches[0];
      if (t && t.clientX < 24) {
        start = { x: t.clientX, y: t.clientY };
        horizontal = null;
      }
    };
    const move = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!start || !t) return;
      const dx = t.clientX - start.x;
      const dy = t.clientY - start.y;
      if (horizontal == null && Math.hypot(dx, dy) > 8) horizontal = Math.abs(dx) > Math.abs(dy);
      if (!horizontal) return;
      e.preventDefault();
      x.set(Math.max(0, dx));
    };
    const up = () => {
      if (!start) return;
      const go = x.get() > Math.min(120, window.innerWidth * 0.3);
      start = null;
      if (go) {
        feedback.impactLight();
        void animate(x, window.innerWidth, {
          ...spring.smooth,
          onComplete: () => (router.history.back(), x.set(0)),
        });
      } else void animate(x, 0, spring.snappy);
    };
    window.addEventListener("touchstart", down, { passive: true });
    window.addEventListener("touchmove", move, { passive: false });
    window.addEventListener("touchend", up);
    window.addEventListener("touchcancel", up);
    return () => {
      window.removeEventListener("touchstart", down);
      window.removeEventListener("touchmove", move);
      window.removeEventListener("touchend", up);
      window.removeEventListener("touchcancel", up);
    };
  }, [enabled, standalone, router, x]);
  if (!enabled || !standalone) return <>{children}</>;
  return (
    <div className="relative">
      <motion.div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-10 bg-black"
        style={{ opacity: shade }}
      />
      <motion.div style={{ x }} className="relative z-20">
        {children}
      </motion.div>
    </div>
  );
}

/* ---------- mobile tab bar ---------- */
function TabIcon({ t, active }: { t: Tab; active: boolean }) {
  const reduce = useReducedMotion();
  return (
    <motion.span
      key={String(active)}
      initial={active && !reduce ? { scale: 0.86 } : false}
      animate={{ scale: 1 }}
      transition={spring.bouncy}
      className="relative grid h-8 w-14 place-items-center"
    >
      {active && (
        <motion.span
          layoutId="tab-pill"
          className="absolute inset-0 rounded-full bg-surface-3"
          transition={spring.snappy}
        />
      )}
      <t.icon
        className={cn(
          "relative size-[22px] transition-colors duration-200",
          active ? "text-foreground" : "text-faint",
        )}
        strokeWidth={active ? 2.1 : 1.75}
        fill={active ? "currentColor" : "none"}
        fillOpacity={active ? 0.14 : 0}
      />
    </motion.span>
  );
}

export function TabBar({
  role,
  onPlus,
  hubOpen,
}: {
  role: Role;
  onPlus: () => void;
  hubOpen: boolean;
}) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const hidden = useHideOnScroll() && !hubOpen;
  const tabs = tabsFor(role);
  const Item = (t: Tab) => {
    const active = isActive(t, path);
    return (
      <Link
        key={t.to}
        to={t.to}
        resetScroll={false}
        aria-label={t.label}
        aria-current={active ? "page" : undefined}
        onClick={() => {
          if (active) window.scrollTo({ top: 0, behavior: "smooth" });
          else feedback.selection();
        }}
        className={cn(
          "relative flex min-h-[58px] min-w-0 flex-1 basis-0 flex-col items-center justify-center gap-0.5 transition-opacity duration-200",
          hubOpen && "pointer-events-none opacity-25",
        )}
      >
        <TabIcon t={t} active={active} />
        <span
          className={cn(
            "text-[11.5px] font-semibold tracking-[0.01em] transition-colors duration-200",
            active ? "text-foreground" : "text-faint",
          )}
        >
          {t.label}
        </span>
      </Link>
    );
  };
  return (
    <motion.nav
      aria-label="Main"
      initial={false}
      animate={{ y: hidden ? "110%" : 0 }}
      transition={spring.smooth}
      className={cn(
        "glass pb-safe fixed inset-x-0 bottom-0 mx-auto max-w-md border-t border-hairline px-1 lg:hidden",
        hubOpen ? "z-[45]" : "z-30",
      )}
    >
      <div className="flex items-center">
        {role === "trainer" ? (
          tabs.map(Item)
        ) : (
          <>
            {tabs.slice(0, 2).map(Item)}
            <motion.button
              whileTap={press.icon}
              onClick={() => (feedback.impactLight(), onPlus())}
              aria-label={hubOpen ? "Close log menu" : "Log something"}
              aria-expanded={hubOpen}
              className="relative mx-1 -mt-7 grid size-[56px] shrink-0 place-items-center rounded-full bg-volt-gradient text-primary-foreground shadow-glow ring-[5px] ring-background"
            >
              <motion.span
                animate={{ rotate: hubOpen ? 45 : 0 }}
                transition={spring.snappy}
                className="grid place-items-center"
              >
                <Plus className="size-7" strokeWidth={2.4} />
              </motion.span>
            </motion.button>
            {tabs.slice(2).map(Item)}
          </>
        )}
      </div>
    </motion.nav>
  );
}

/* ---------- desktop sidebar ---------- */
export function Sidebar({
  role,
  onPlus,
  name,
  avatar,
}: {
  role: Role;
  onPlus: () => void;
  name: string | null;
  avatar?: string | undefined;
}) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const tabs = tabsFor(role);
  const meActive = path.startsWith("/app/me");
  return (
    <aside
      aria-label="Main"
      className="fixed inset-y-0 left-0 z-30 hidden w-[264px] flex-col border-r border-hairline bg-surface/40 px-4 py-6 backdrop-blur-xl lg:flex"
    >
      <Link
        to="/app"
        className="mb-8 px-3 font-display text-title font-black tracking-tight [font-stretch:125%]"
      >
        KINRA<span className="text-volt">.</span>
      </Link>
      {role !== "trainer" && (
        <motion.button
          whileTap={press.button}
          onClick={onPlus}
          className="mb-6 flex h-12 items-center justify-center gap-2 rounded-full bg-volt-gradient text-label font-semibold text-primary-foreground shadow-glow hover-device:brightness-105"
        >
          <Plus className="size-5" strokeWidth={2.4} /> Log
        </motion.button>
      )}
      <button
        type="button"
        onClick={() => window.dispatchEvent(new Event("kinra:command"))}
        className="mb-4 flex h-10 items-center gap-2 rounded-full border border-hairline bg-surface-2/60 px-3 text-label text-faint transition-colors hover-device:text-muted-foreground"
      >
        <Search className="size-4" strokeWidth={1.75} />
        <span className="flex-1 text-left">Search</span>
        <kbd className="num rounded-md border border-hairline-strong px-1.5 text-caption">⌘K</kbd>
      </button>
      <nav className="flex flex-col gap-1">
        {tabs.map((t) => {
          const active = isActive(t, path);
          return (
            <Link
              key={t.to}
              to={t.to}
              resetScroll={false}
              aria-current={active ? "page" : undefined}
              className="relative flex h-11 items-center gap-3 rounded-full px-3 text-label font-semibold"
            >
              {active && (
                <motion.span
                  layoutId="side-pill"
                  className="absolute inset-0 rounded-full bg-surface-2 ring-1 ring-hairline"
                  transition={spring.snappy}
                />
              )}
              <t.icon
                className={cn("relative size-5", active ? "text-foreground" : "text-faint")}
                strokeWidth={active ? 2 : 1.75}
              />
              <span
                className={cn(
                  "relative transition-colors",
                  active ? "text-foreground" : "text-muted-foreground hover-device:text-foreground",
                )}
              >
                {t.label}
              </span>
            </Link>
          );
        })}
      </nav>
      <Link
        to="/app/me"
        className={cn(
          "mt-auto flex items-center gap-3 rounded-full p-2 pr-4 transition-colors",
          meActive ? "bg-surface-2" : "hover-device:bg-surface-2/60",
        )}
      >
        <Avatar name={name} src={avatar} size={36} />
        <span className="min-w-0">
          <span className="block truncate text-label font-semibold">{name ?? "Your profile"}</span>
          <span className="block text-caption text-faint">Profile & settings</span>
        </span>
      </Link>
    </aside>
  );
}

/* ---------- log hub ---------- */
export function LogHub({ onClose, onPick }: { onClose: () => void; onPick: (k: LogKind) => void }) {
  const first = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    first.current?.focus({ preventScroll: true });
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: exitTween("base") }}
      transition={tween("base")}
      className="fixed inset-0 z-40 bg-scrim backdrop-blur-xl"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Log something"
    >
      <motion.div
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0.04, bottom: 0.5 }}
        onDragEnd={(_, i) => (i.offset.y > 80 || i.velocity.y > 600) && onClose()}
        className="absolute inset-x-0 bottom-0 mx-auto max-w-md px-5 pb-[calc(max(env(safe-area-inset-bottom),12px)+92px)] lg:bottom-10 lg:pb-0"
        onClick={(e) => e.stopPropagation()}
      >
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...tween("base"), delay: 0.04 }}
          className="eyebrow mb-3 px-1"
        >
          Log
        </motion.div>
        <div className="grid grid-cols-2 gap-3">
          {logKinds.map((l, i) => (
            <motion.button
              key={l.kind}
              ref={i === 0 ? first : undefined}
              initial={{ opacity: 0, y: 28, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{
                opacity: 0,
                y: 16,
                scale: 0.97,
                transition: { duration: dur.fast, delay: stagger(logKinds.length - 1 - i, 0.02) },
              }}
              transition={{
                ...spring.bouncy,
                damping: 26,
                delay: stagger(logKinds.length - 1 - i),
              }}
              style={{ transformOrigin: "50% 100%" }}
              whileTap={press.card}
              onClick={() => (feedback.impactLight(), onPick(l.kind))}
              className={cn(
                "elev-2 flex min-h-[68px] items-center gap-3 rounded-card p-4 text-left hover-device:brightness-110",
                i === 0 && "col-span-2 min-h-[76px]",
              )}
            >
              <span
                className={cn(
                  "grid size-10 shrink-0 place-items-center rounded-full",
                  i === 0 ? "bg-volt-gradient text-primary-foreground" : "bg-surface-3",
                )}
              >
                <l.icon className={cn("size-5", i === 0 ? "" : l.tone)} strokeWidth={1.9} />
              </span>
              <span className="min-w-0">
                <span className="block font-display text-title font-bold">
                  {i === 0 ? "Start session" : l.label}
                </span>
                {i === 0 && (
                  <span className="block text-caption text-muted-foreground">
                    Live logging with a rest timer
                  </span>
                )}
              </span>
            </motion.button>
          ))}
        </div>
        <motion.button
          whileTap={press.icon}
          onClick={onClose}
          aria-label="Close"
          className="mx-auto mt-6 hidden size-12 place-items-center rounded-full bg-surface-2 lg:grid"
        >
          <X className="size-5" />
        </motion.button>
      </motion.div>
    </motion.div>
  );
}

/* ---------- demo chip ---------- */
export function DemoChip({ role }: { role: Role }) {
  const navigate = useNavigate();
  const router = useRouter();
  const switchRole = async () => {
    sessionStorage.setItem(DEMO_KEY, role === "trainer" ? "client" : "trainer");
    await router.invalidate();
    navigate({ to: "/app" });
  };
  return (
    <div className="flex justify-center pb-1 pt-1">
      <div className="glass inline-flex items-center gap-0.5 rounded-full border border-hairline-strong py-1 pl-3 pr-1 text-caption font-semibold shadow-1">
        <span className="mr-1.5 flex items-center gap-1.5 text-foreground">
          <span className="relative flex size-1.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-volt/60 motion-reduce:hidden" />
            <span className="relative inline-flex size-1.5 rounded-full bg-volt" />
          </span>
          Demo · {role === "trainer" ? "Coach" : "Client"}
        </span>
        <button
          onClick={switchRole}
          className="flex min-h-[32px] items-center gap-1 rounded-full px-2.5 text-muted-foreground transition-colors hover-device:text-foreground"
        >
          <ArrowLeftRight className="size-3.5" /> Switch
        </button>
        <button
          onClick={() => {
            sessionStorage.removeItem(DEMO_KEY);
            navigate({ to: "/" });
          }}
          className="min-h-[32px] rounded-full bg-surface-2 px-3 text-foreground transition-colors hover-device:bg-surface-3"
        >
          Exit
        </button>
      </div>
    </div>
  );
}

/** Home-screen shortcuts: /app?start=session opens a live session straight away. */
export function LaunchShortcuts() {
  const { startSession } = useShell();
  useEffect(() => {
    const u = new URL(window.location.href);
    if (u.searchParams.get("start") !== "session") return;
    u.searchParams.delete("start");
    window.history.replaceState(window.history.state, "", u.pathname + u.search);
    startSession();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

/** Pull down at the top of a screen to refresh. Installed app only: browsers bring their own. */
export function PullToRefresh() {
  const qc = useQueryClient();
  const y = useMotionValue(0);
  const rotate = useTransform(y, [0, 72], [0, 270]);
  const opacity = useTransform(y, [8, 48], [0, 1]);
  const [busy, setBusy] = useState(false);
  const [standalone, setStandalone] = useState(false);
  useEffect(() => {
    const nav = navigator as Navigator & { standalone?: boolean };
    setStandalone(!!nav.standalone || matchMedia("(display-mode: standalone)").matches);
  }, []);
  useEffect(() => {
    if (!standalone) return;
    let start: number | null = null;
    let armed = false;
    const down = (e: TouchEvent) => {
      if (window.scrollY <= 0 && !document.querySelector("[role=dialog]"))
        start = e.touches[0]?.clientY ?? null;
    };
    const move = (e: TouchEvent) => {
      if (start == null) return;
      const dy = (e.touches[0]?.clientY ?? start) - start;
      if (dy <= 0) return y.set(0);
      const eased = Math.min(110, dy * 0.45);
      y.set(eased);
      if (eased > 72 !== armed) {
        armed = eased > 72;
        feedback.selection();
      }
    };
    const up = async () => {
      if (start == null) return;
      start = null;
      if (armed) {
        armed = false;
        setBusy(true);
        feedback.impactLight();
        void animate(y, 56, spring.snappy);
        await qc.invalidateQueries();
        feedback.success();
        setBusy(false);
      }
      void animate(y, 0, spring.smooth);
    };
    window.addEventListener("touchstart", down, { passive: true });
    window.addEventListener("touchmove", move, { passive: true });
    window.addEventListener("touchend", up);
    return () => {
      window.removeEventListener("touchstart", down);
      window.removeEventListener("touchmove", move);
      window.removeEventListener("touchend", up);
    };
  }, [standalone, qc, y]);
  if (!standalone) return null;
  return (
    <motion.div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-[max(8px,env(safe-area-inset-top))] z-[55] flex justify-center"
      style={{ y, opacity }}
    >
      <motion.span
        className="glass grid size-10 place-items-center rounded-full border border-hairline-strong shadow-2"
        style={busy ? {} : { rotate }}
        animate={busy ? { rotate: 360 } : {}}
        transition={busy ? { repeat: Infinity, duration: 0.8, ease: "linear" } : {}}
      >
        <RefreshCw className="size-4" strokeWidth={2} />
      </motion.span>
    </motion.div>
  );
}
