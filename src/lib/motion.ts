/*
 * Kinra motion language. Every animation in the app imports from here.
 *
 * 1. Motion explains: it shows where something came from and where it went.
 *    Only the signature moments (PR, session complete, goal hit, first open
 *    of the day) are allowed to be decorative.
 * 2. Interruptible: anything a finger touches uses springs, never tweens.
 * 3. Exits are faster than entrances (about 70% of the duration).
 * 4. Stagger at most 6 items, 35 ms apart; the rest arrive together.
 * 5. Intro animations play once per route per session (see useIntro).
 *    Revisiting a screen shows its final state instantly.
 * 6. Reduced motion: movement becomes short crossfades. MotionConfig
 *    reducedMotion="user" handles transforms; progress still resolves.
 * 7. Only transform, opacity and filter animate. Never height, width,
 *    top/left or box-shadow.
 */
import { createContext, useContext, useRef } from "react";
import type { Transition } from "motion/react";

/** Durations in seconds. */
export const dur = {
  instant: 0.09,
  fast: 0.16,
  base: 0.24,
  slow: 0.36,
  deliberate: 0.52,
  cinematic: 0.8,
} as const;

export const ease = {
  /** Most UI. */
  standard: [0.2, 0, 0, 1],
  /** Entering, important. */
  emphasized: [0.3, 0, 0, 1],
  /** Leaving: faster, accelerating. */
  exit: [0.4, 0, 1, 1],
  /** Long decelerating reveals (count-ups, ring fills). */
  out: [0.22, 1, 0.36, 1],
} as const satisfies Record<string, [number, number, number, number]>;

export const spring = {
  /** Toggles, chips, indicators. */
  snappy: { type: "spring", stiffness: 520, damping: 38, mass: 0.8 },
  /** Sheets, cards, layout. */
  smooth: { type: "spring", stiffness: 320, damping: 34, mass: 1 },
  /** Success, PRs, celebrations. Use sparingly. */
  bouncy: { type: "spring", stiffness: 420, damping: 22, mass: 0.9 },
  /** Large surfaces, page level. */
  gentle: { type: "spring", stiffness: 180, damping: 26, mass: 1 },
} as const satisfies Record<string, Transition>;

/** Press feedback: cards and rows scale a little, icon buttons a little more. */
export const press = {
  card: { scale: 0.98 },
  button: { scale: 0.97 },
  icon: { scale: 0.92 },
} as const;

export const tween = (
  d: keyof typeof dur = "base",
  e: keyof typeof ease = "standard",
): Transition => ({ duration: dur[d], ease: ease[e] });
export const exitTween = (d: keyof typeof dur = "base"): Transition => ({
  duration: dur[d] * 0.7,
  ease: ease.exit,
});

/** Stagger delay for list item i: at most 6 items, 35 ms apart. */
export const stagger = (i: number, step = 0.035) => Math.min(Math.max(i, 0), 5) * step;

/** Shared variants for the most common entrance. */
export const fadeUp = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 4, transition: exitTween("fast") },
} as const;

/* ---------- intro once per route per session ---------- */
const INTRO_WINDOW_MS = 1800;
const firstSeen = new Map<string, number>();

/** Wrap server-rendered previews in <IntroOff.Provider value> so they hydrate in their final state. */
export const IntroOff = createContext(false);

/**
 * True while a route is being shown for the first time this session.
 * Components that mount within the first 1.8 s of that visit play their
 * intro; later mounts and revisits render their final state immediately.
 */
export function useIntro(scope?: string) {
  const off = useContext(IntroOff);
  const value = useRef(
    (() => {
      if (typeof window === "undefined") return false;
      const key = scope ?? window.location.pathname;
      const now = performance.now();
      const seen = firstSeen.get(key);
      if (seen == null) {
        firstSeen.set(key, now);
        return true;
      }
      return now - seen < INTRO_WINDOW_MS;
    })(),
  ).current;
  return off ? false : value;
}

/** Order of the main tabs, used for directional page transitions. */
export function tabIndex(path: string, tabs: string[]) {
  let best = -1;
  let len = -1;
  tabs.forEach((t, i) => {
    const hit =
      t === "/app"
        ? path === "/app" || path === "/app/"
        : path === t || path.startsWith(t + "/") || path.startsWith(t + ".");
    if (hit && t.length > len) {
      best = i;
      len = t.length;
    }
  });
  return best;
}
