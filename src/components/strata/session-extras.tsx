import { useEffect, useRef, useState } from "react";
import { animate, motion, useReducedMotion } from "motion/react";
import { today } from "@/lib/stats";
import { feedback } from "@/lib/feedback";
import { NumberTicker } from "./ui";

/* ---------- prefs (UI-only, localStorage "strata:") ---------- */
export const isLighterToday = () =>
  typeof window !== "undefined" && localStorage.getItem("strata:lighter") === today();
export const roundPlate = (kg: number) => Math.round(kg / 2.5) * 2.5;
export const est1RM = (kg: number, reps: number) =>
  reps <= 1 ? kg : Math.round(kg * (1 + reps / 30));

export const restFor = (ex: string, fallback = 90) => {
  if (typeof window === "undefined") return fallback;
  const v = Number(localStorage.getItem(`strata:rest:${ex}`));
  return v >= 30 && v <= 600 ? v : fallback;
};
/** Learn: blend the observed rest into the stored value. */
export const learnRest = (ex: string, seconds: number) => {
  if (seconds < 20 || seconds > 600) return;
  const prev = restFor(ex);
  localStorage.setItem(`strata:rest:${ex}`, String(Math.round((prev * 2 + seconds) / 3 / 5) * 5));
};

/* ---------- haptics + sound ---------- */
export const haptic = {
  light: feedback.impactLight,
  medium: feedback.impactMedium,
  success: feedback.success,
  error: feedback.error,
};

export const soundOn = () =>
  typeof window !== "undefined" && localStorage.getItem("strata:sound") === "1";
let ctx: AudioContext | null = null;
function tone(freq: number, dur: number, delay = 0, type: OscillatorType = "sine", gain = 0.12) {
  if (!soundOn()) return;
  ctx ??= new AudioContext();
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.value = freq;
  const t = ctx.currentTime + delay;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(gain, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(ctx.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}
export const sound = {
  tick: () => tone(1760, 0.035, 0, "sine", 0.04),
  chime: () => (tone(1046.5, 0.5, 0, "sine", 0.08), tone(1568, 0.7, 0.09, "sine", 0.05)),
  pr: () => (
    tone(784, 0.3, 0, "sine", 0.08),
    tone(1046.5, 0.32, 0.12, "sine", 0.08),
    tone(1318.5, 0.36, 0.24, "sine", 0.07),
    tone(1568, 0.9, 0.36, "sine", 0.06)
  ),
};

/* ---------- count up ---------- */
export function CountUp({
  to,
  decimals = 0,
  delay = 0,
  duration = 0.9,
  suffix,
}: {
  to: number;
  decimals?: number;
  delay?: number;
  duration?: number;
  suffix?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduce = useReducedMotion();
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reduce) {
      el.textContent = to.toFixed(decimals);
      return;
    }
    const c = animate(0, to, {
      duration,
      delay,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => (el.textContent = v.toFixed(decimals)),
    });
    return () => c.stop();
  }, [to, decimals, delay, duration, reduce]);
  return (
    <span className="num">
      <span ref={ref}>{(0).toFixed(decimals)}</span>
      {suffix && (
        <span className="ml-[0.15em] text-[0.55em] font-medium text-muted-foreground">
          {suffix}
        </span>
      )}
    </span>
  );
}

/* ---------- strata bands (signature motif) ---------- */
const BANDS = [
  "var(--volt)",
  "var(--pulse)",
  "var(--dream)",
  "var(--ember)",
  "var(--surface-3, var(--surface-2))",
];
export function StrataBands({ onDone }: { onDone?: () => void }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className="pointer-events-none absolute inset-0 z-30 flex flex-col"
      initial={{ opacity: 1 }}
      animate={{ opacity: 0 }}
      transition={{ delay: reduce ? 0.1 : 0.55, duration: 0.2 }}
      onAnimationComplete={() => onDone?.()}
      aria-hidden
    >
      {BANDS.map((c, i) => (
        <motion.div
          key={i}
          className="flex-1 origin-left"
          style={{ background: c }}
          initial={reduce ? { opacity: 0 } : { x: i % 2 ? "100%" : "-100%" }}
          animate={reduce ? { opacity: 1 } : { x: 0 }}
          transition={{ type: "spring", stiffness: 380, damping: 38, delay: i * 0.04 }}
        />
      ))}
    </motion.div>
  );
}

/* ---------- PR moment ---------- */
export function PrMoment({
  exercise,
  kg,
  onDone,
}: {
  exercise: string;
  kg: number;
  onDone: () => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const reduce = useReducedMotion();
  useEffect(() => {
    feedback.celebration();
    sound.pr();
    const t = setTimeout(onDone, 2200);
    const c = canvas.current;
    if (!c || reduce) return () => clearTimeout(t);
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = c.clientWidth * dpr;
    c.height = c.clientHeight * dpr;
    const g = c.getContext("2d")!;
    const volt =
      getComputedStyle(document.documentElement).getPropertyValue("--volt").trim() || "#c6ff3d";
    const cx = c.width / 2;
    const cy = c.height * 0.42;
    // At most 40 particles for about 900 ms.
    const ps = Array.from({ length: 40 }, (_, i) => {
      const a = (i / 40) * Math.PI * 2 + Math.random() * 0.3;
      const sp = (3 + Math.random() * 6) * dpr;
      return {
        x: cx,
        y: cy,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 2 * dpr,
        r: (1.2 + Math.random() * 2.2) * dpr,
      };
    });
    const frames = 54;
    let raf = 0;
    let f = 0;
    const tick = () => {
      f++;
      g.clearRect(0, 0, c.width, c.height);
      g.fillStyle = volt;
      g.globalAlpha = Math.max(0, 1 - f / frames);
      for (const p of ps) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.18 * dpr;
        p.vx *= 0.97;
        g.beginPath();
        g.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        g.fill();
      }
      if (f < frames) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => (clearTimeout(t), cancelAnimationFrame(raf));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <motion.div
      className="absolute inset-0 z-40 grid place-items-center bg-background/90 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.2 } }}
      role="status"
      aria-live="assertive"
      onClick={onDone}
    >
      {!reduce && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 shadow-[inset_0_0_140px_10px_color-mix(in_oklab,var(--volt)_30%,transparent)]"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0.35] }}
          transition={{ duration: 1.4, ease: "easeOut" }}
        />
      )}
      <canvas ref={canvas} className="pointer-events-none absolute inset-0 size-full" />
      <div className="relative text-center">
        <motion.div
          className="eyebrow !text-volt"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.3 }}
        >
          Personal record
        </motion.div>
        <motion.div
          className="num mt-3 text-display-xl font-semibold"
          initial={reduce ? { opacity: 0 } : { scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 420, damping: 22, mass: 0.9 }}
        >
          <NumberTicker value={kg} decimals={kg % 1 ? 1 : 0} intro delay={0.15} />
          <span className="unit">kg</span>
        </motion.div>
        <motion.div
          className="mt-2 text-label font-semibold text-muted-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35, duration: 0.3 }}
        >
          {exercise}
        </motion.div>
        <motion.div
          className="mt-10 text-caption text-faint"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.4 }}
        >
          Tap to continue
        </motion.div>
      </div>
    </motion.div>
  );
}

/* ---------- plate calculator ---------- */
const PLATES = [25, 20, 15, 10, 5, 2.5, 1.25];
const PLATE_STYLE: Record<number, { h: number; c: string }> = {
  25: { h: 92, c: "var(--ember)" },
  20: { h: 92, c: "var(--dream)" },
  15: { h: 80, c: "var(--volt)" },
  10: { h: 68, c: "var(--pulse)" },
  5: { h: 52, c: "var(--foreground)" },
  2.5: { h: 42, c: "var(--muted-foreground)" },
  1.25: { h: 34, c: "var(--muted-foreground)" },
};
export function platesFor(total: number, bar = 20) {
  let side = Math.max(0, (total - bar) / 2);
  const out: number[] = [];
  for (const p of PLATES)
    while (side >= p - 1e-6) {
      out.push(p);
      side -= p;
    }
  return { out, rest: +(side * 2).toFixed(2) };
}
export function Barbell({ kg, bar = 20 }: { kg: number; bar?: number }) {
  const { out } = platesFor(kg, bar);
  const reduce = useReducedMotion();
  const sides = [1, -1] as const;
  return (
    <svg
      viewBox="0 0 340 110"
      className="w-full"
      role="img"
      aria-label={`${kg} kg: ${bar} kg bar plus ${out.length ? out.join(", ") + " kg per side" : "no plates"}`}
    >
      <rect
        x="4"
        y="51"
        width="332"
        height="8"
        rx="4"
        fill="var(--muted-foreground)"
        opacity="0.5"
      />
      <rect x="226" y="44" width="8" height="22" rx="3" fill="var(--muted-foreground)" />
      <rect x="106" y="44" width="8" height="22" rx="3" fill="var(--muted-foreground)" />
      {sides.map((dir) => {
        let x = dir === 1 ? 236 : 104;
        return out.map((p, i) => {
          const st = PLATE_STYLE[p]!;
          const w = p >= 10 ? 13 : 9;
          const px = dir === 1 ? x : x - w;
          x += dir * (w + 2);
          return (
            <motion.rect
              key={`${dir}-${p}-${i}-${kg}`}
              x={px}
              y={55 - st.h / 2}
              width={w}
              height={st.h}
              rx="3"
              fill={st.c}
              initial={reduce ? { opacity: 0 } : { x: dir * 90, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ type: "spring", stiffness: 380, damping: 38, delay: i * 0.05 }}
            />
          );
        });
      })}
    </svg>
  );
}

/* ---------- body map ---------- */
type Muscle =
  "chest" | "shoulders" | "arms" | "core" | "quads" | "back" | "glutes" | "hamstrings" | "calves";
const RULES: [RegExp, Muscle[]][] = [
  [/bench|press up|push|dip|fly|chest/i, ["chest", "shoulders", "arms"]],
  [/overhead|ohp|shoulder|lateral|military/i, ["shoulders", "arms"]],
  [/curl|tricep|extension|arm/i, ["arms"]],
  [/squat|lunge|leg press|split|step/i, ["quads", "glutes"]],
  [/deadlift|rdl|romanian|hinge|good morning/i, ["hamstrings", "glutes", "back"]],
  [/row|pull|chin|lat|pulldown/i, ["back", "arms"]],
  [/plank|core|ab|crunch|carry/i, ["core"]],
  [/calf|run|bike|row erg|jog/i, ["calves", "quads"]],
  [/hip thrust|bridge|glute/i, ["glutes", "hamstrings"]],
];
export function musclesFor(names: string[]) {
  const s = new Set<Muscle>();
  for (const n of names) for (const [re, m] of RULES) if (re.test(n)) m.forEach((x) => s.add(x));
  return s;
}
/** One muscle group. Kept outside BodyMap so re-renders never restart its animation. */
function MusclePath({
  d,
  on,
  delay = 0,
  reduce,
}: {
  d: string;
  on: boolean;
  delay?: number;
  reduce: boolean | null;
}) {
  return (
    <motion.path
      d={d}
      fill={on ? "var(--volt)" : "var(--surface-3)"}
      stroke="var(--background)"
      strokeWidth="1.5"
      strokeLinejoin="round"
      initial={{ opacity: on ? 0.25 : 0.9 }}
      animate={{ opacity: on ? 1 : 0.9 }}
      transition={{ delay: reduce ? 0 : 0.5 + delay, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    />
  );
}

const SILHOUETTE =
  "M50 4 C56 4 60 9 60 15 C60 21 56 25 53 26 L53 28 C62 29 72 30 76 36 C80 42 82 60 86 80 C88 92 89 98 86 99 C83 100 81 96 80 90 L74 62 L71 96 C72 120 70 146 66 190 C65 196 57 196 56 190 L52 118 L48 118 L44 190 C43 196 35 196 34 190 C30 146 28 120 29 96 L26 62 L20 90 C19 96 17 100 14 99 C11 98 12 92 14 80 C18 60 20 42 24 36 C28 30 38 29 47 28 L47 26 C44 25 40 21 40 15 C40 9 44 4 50 4 Z";
const MUSCLES: Record<"Front" | "Back", { m: Muscle; d: string; delay: number }[]> = {
  Front: [
    {
      m: "shoulders",
      d: "M30 33 C26 35 24 40 24 46 L32 44 C33 39 34 36 36 34 Z M70 33 C74 35 76 40 76 46 L68 44 C67 39 66 36 64 34 Z",
      delay: 0,
    },
    {
      m: "chest",
      d: "M37 34 C42 32 48 33 49 35 L49 52 C44 54 38 53 34 50 C33 44 34 38 37 34 Z M63 34 C58 32 52 33 51 35 L51 52 C56 54 62 53 66 50 C67 44 66 38 63 34 Z",
      delay: 0.05,
    },
    {
      m: "arms",
      d: "M23 48 L31 47 L29 70 L22 72 C21 64 21 55 23 48 Z M77 48 L69 47 L71 70 L78 72 C79 64 79 55 77 48 Z",
      delay: 0.1,
    },
    { m: "core", d: "M36 55 C42 57 58 57 64 55 L62 88 C56 92 44 92 38 88 Z", delay: 0.15 },
    {
      m: "quads",
      d: "M33 100 C38 98 46 99 48 102 L46 140 C42 144 37 143 35 139 C32 126 32 112 33 100 Z M67 100 C62 98 54 99 52 102 L54 140 C58 144 63 143 65 139 C68 126 68 112 67 100 Z",
      delay: 0.2,
    },
    {
      m: "calves",
      d: "M36 150 C39 148 44 149 45 152 L44 180 L38 180 C36 170 35 160 36 150 Z M64 150 C61 148 56 149 55 152 L56 180 L62 180 C64 170 65 160 64 150 Z",
      delay: 0.25,
    },
  ],
  Back: [
    {
      m: "shoulders",
      d: "M30 33 C26 35 24 40 24 46 L32 44 C33 39 34 36 36 34 Z M70 33 C74 35 76 40 76 46 L68 44 C67 39 66 36 64 34 Z",
      delay: 0,
    },
    {
      m: "back",
      d: "M36 33 C44 31 56 31 64 33 C67 42 66 60 62 76 C56 80 44 80 38 76 C34 60 33 42 36 33 Z",
      delay: 0.05,
    },
    {
      m: "arms",
      d: "M23 48 L31 47 L29 70 L22 72 C21 64 21 55 23 48 Z M77 48 L69 47 L71 70 L78 72 C79 64 79 55 77 48 Z",
      delay: 0.1,
    },
    {
      m: "glutes",
      d: "M31 92 C38 86 62 86 69 92 C70 100 68 108 62 110 C56 112 44 112 38 110 C32 108 30 100 31 92 Z",
      delay: 0.15,
    },
    {
      m: "hamstrings",
      d: "M33 114 C38 112 46 113 47 116 L46 142 C42 146 37 145 35 141 C33 132 32 122 33 114 Z M67 114 C62 112 54 113 53 116 L54 142 C58 146 63 145 65 141 C67 132 68 122 67 114 Z",
      delay: 0.2,
    },
    {
      m: "calves",
      d: "M36 150 C39 148 44 149 45 152 L44 180 L38 180 C36 170 35 160 36 150 Z M64 150 C61 148 56 149 55 152 L56 180 L62 180 C64 170 65 160 64 150 Z",
      delay: 0.25,
    },
  ],
};

export function BodyMap({ exercises }: { exercises: string[] }) {
  const on = musclesFor(exercises);
  const reduce = useReducedMotion();
  return (
    <div
      className="grid grid-cols-2 gap-4"
      role="img"
      aria-label={`Muscles worked: ${[...on].join(", ") || "none recorded"}`}
    >
      {(["Front", "Back"] as const).map((side) => (
        <div key={side} className="text-center">
          <svg viewBox="0 0 100 200" className="mx-auto h-44">
            <path d={SILHOUETTE} fill="var(--surface-2)" />
            {MUSCLES[side].map((x) => (
              <MusclePath key={x.m} d={x.d} on={on.has(x.m)} delay={x.delay} reduce={reduce} />
            ))}
          </svg>
          <div className="eyebrow mt-2">{side}</div>
        </div>
      ))}
    </div>
  );
}

/* ---------- share card (1080×1920 canvas) ---------- */
export async function shareSession(d: {
  title: string;
  duration: string;
  volume: string;
  sets: number;
  prs: { ex: string; kg: number; reps: number }[];
  coach?: string | null | undefined;
}) {
  const c = document.createElement("canvas");
  c.width = 1080;
  c.height = 1920;
  const g = c.getContext("2d")!;
  try {
    await document.fonts?.ready;
  } catch {
    /* fonts are a nicety */
  }
  // The card is always Obsidian, whatever theme the app is in.
  const bg = "#0c0d10";
  const fg = "#f4f4f6";
  const mute = "#a3a5ae";
  const faint = "#6a6c75";
  const volt = "#c9f55a";
  g.fillStyle = bg;
  g.fillRect(0, 0, 1080, 1920);
  const glow = g.createRadialGradient(540, -120, 40, 540, -120, 1150);
  glow.addColorStop(0, "rgba(201,245,90,0.18)");
  glow.addColorStop(1, "rgba(201,245,90,0)");
  g.fillStyle = glow;
  g.fillRect(0, 0, 1080, 1920);
  g.fillStyle = fg;
  g.font = "900 46px Archivo, sans-serif";
  g.fillText("KINRA", 96, 160);
  g.fillStyle = volt;
  g.fillText(".", 96 + g.measureText("KINRA").width, 160);
  g.fillStyle = faint;
  g.font = "700 28px Manrope, sans-serif";
  g.textAlign = "right";
  g.fillText(
    new Date()
      .toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })
      .toUpperCase(),
    984,
    158,
  );
  g.textAlign = "left";
  g.fillStyle = volt;
  g.font = "800 30px Manrope, sans-serif";
  g.fillText("SESSION COMPLETE", 96, 540);
  g.fillStyle = fg;
  g.font = "800 112px Archivo, sans-serif";
  const titleEnd = wrap(g, d.title, 96, 670, 888, 118);
  const top = Math.max(940, titleEnd + 170);
  g.fillStyle = "rgba(255,255,255,0.08)";
  g.fillRect(96, top - 92, 888, 2);
  const stats: [string, string][] = [
    ["Duration", d.duration],
    ["Volume", d.volume],
    ["Sets", String(d.sets)],
    ["Records", String(d.prs.length)],
  ];
  stats.forEach(([l, val], i) => {
    const x = 96 + (i % 2) * 456;
    const y = top + Math.floor(i / 2) * 250;
    g.fillStyle = faint;
    g.font = "800 26px Manrope, sans-serif";
    g.fillText(l.toUpperCase(), x, y);
    g.fillStyle = l === "Records" && d.prs.length ? volt : fg;
    g.font = "600 100px 'JetBrains Mono', monospace";
    g.fillText(val, x, y + 116);
  });
  d.prs.slice(0, 3).forEach((p, i) => {
    const y = top + 590 + i * 78;
    g.fillStyle = volt;
    g.beginPath();
    g.arc(108, y - 13, 8, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = fg;
    g.font = "700 40px Manrope, sans-serif";
    g.fillText(p.ex, 136, y);
    g.fillStyle = volt;
    g.font = "600 40px 'JetBrains Mono', monospace";
    g.textAlign = "right";
    g.fillText(`${p.kg} kg × ${p.reps}`, 984, y);
    g.textAlign = "left";
  });
  g.fillStyle = mute;
  g.font = "600 30px Manrope, sans-serif";
  g.fillText(d.coach ? `Coached by ${d.coach}` : "Trained with Kinra", 96, 1824);
  const blob: Blob = await new Promise((r) => c.toBlob((b) => r(b!), "image/png"));
  const file = new File([blob], "kinra-session.png", { type: "image/png" });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: d.title });
      return "shared";
    } catch {
      /* cancelled → fall through to nothing */
      return "cancelled";
    }
  }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "kinra-session.png";
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  return "downloaded";
}
function wrap(
  g: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  max: number,
  lh: number,
) {
  let line = "";
  for (const w of text.split(" ")) {
    const t = line ? `${line} ${w}` : w;
    if (g.measureText(t).width > max && line) {
      g.fillText(line, x, y);
      line = w;
      y += lh;
    } else line = t;
  }
  g.fillText(line, x, y);
  return y;
}

/** Simple state hook for a boolean pref in localStorage. */
export function usePref(key: string) {
  const [v, setV] = useState(
    () => typeof window !== "undefined" && localStorage.getItem(key) === "1",
  );
  return [
    v,
    (n: boolean) => (setV(n), n ? localStorage.setItem(key, "1") : localStorage.removeItem(key)),
  ] as const;
}
