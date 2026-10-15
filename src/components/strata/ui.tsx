import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import {
  Children,
  isValidElement,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { ChevronRight, Loader2, RotateCw, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { initials } from "@/lib/stats";
import { dur, ease, exitTween, press, spring, stagger, tween, useIntro } from "@/lib/motion";
import { feedback } from "@/lib/feedback";

/* ---------- motion re-exports (kept for existing imports) ---------- */
export { useIntro };
export const EASE = ease.out;
export const springPress = press.button;

/* ---------- numbers ---------- */
const DIGITS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];

/**
 * Odometer number: each digit rolls to its new value. On a screen's first
 * visit it counts up from zero; later changes roll with a spring.
 */
export function NumberTicker({
  value,
  decimals = 0,
  format,
  className,
  intro: introProp,
  delay = 0,
}: {
  value: number | null | undefined;
  decimals?: number;
  format?: (n: number) => string;
  className?: string;
  intro?: boolean;
  /** Seconds to wait before the first count-up. */
  delay?: number;
}) {
  const routeIntro = useIntro();
  const intro = introProp ?? routeIntro;
  const reduce = useReducedMotion();
  const [armed, setArmed] = useState(!intro || !!reduce);
  const prev = useRef(value);
  const changed = prev.current !== value;
  useEffect(() => {
    prev.current = value;
  });
  useEffect(() => {
    if (armed) return;
    const t = setTimeout(() => setArmed(true), Math.max(16, delay * 1000));
    return () => clearTimeout(t);
  }, [armed, delay]);
  if (value == null || !Number.isFinite(value))
    return <span className={cn("num", className)}>—</span>;
  const text = format
    ? format(value)
    : value.toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });
  const chars = text.split("");
  return (
    <span className={cn("num inline-flex items-baseline", className)}>
      <span className="sr-only">{text}</span>
      {chars.map((ch, i) => {
        const fromRight = chars.length - i;
        const d = DIGITS.indexOf(ch);
        if (d < 0)
          return (
            <span key={`s${fromRight}`} aria-hidden>
              {ch}
            </span>
          );
        const target = armed ? d : 0;
        return (
          <span
            key={`d${fromRight}`}
            aria-hidden
            className="relative inline-block h-[1.1em] overflow-hidden leading-[1.1em]"
          >
            <span className="invisible">0</span>
            <motion.span
              className="absolute inset-x-0 top-0 flex flex-col"
              initial={false}
              animate={{ y: `${-target * 1.1}em` }}
              transition={
                reduce || (intro && !armed)
                  ? { duration: 0 }
                  : changed || !intro
                    ? spring.smooth
                    : { duration: dur.deliberate + fromRight * 0.05, ease: ease.out }
              }
            >
              {DIGITS.map((x) => (
                <span key={x} className="block h-[1.1em]">
                  {x}
                </span>
              ))}
            </motion.span>
          </span>
        );
      })}
    </span>
  );
}

/** A value with a smaller, lighter unit sitting on the same baseline. */
export function Value({
  children,
  unit,
  className,
}: {
  children: ReactNode;
  unit?: string | undefined;
  className?: string;
}) {
  return (
    <span className={cn("num inline-flex items-baseline", className)}>
      {children}
      {unit && <span className="unit">{unit}</span>}
    </span>
  );
}

/* ---------- ring ---------- */
export function Ring({
  value,
  size = 120,
  stroke = 10,
  color = "var(--volt)",
  track = "var(--surface-2)",
  children,
}: {
  value: number;
  size?: number;
  stroke?: number;
  color?: string;
  track?: string;
  children?: ReactNode;
}) {
  const intro = useIntro();
  const reduce = useReducedMotion();
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, value));
  const complete = v >= 1;
  return (
    <motion.div
      className="relative grid shrink-0 place-items-center"
      style={{ width: size, height: size }}
      animate={complete && intro && !reduce ? { scale: [1, 1.04, 1] } : { scale: 1 }}
      transition={{ duration: dur.slow, delay: dur.cinematic + 0.2, ease: ease.standard }}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={c}
          initial={intro ? { strokeDashoffset: c } : false}
          animate={{ strokeDashoffset: c * (1 - v), opacity: v > 0 ? 1 : 0 }}
          transition={{
            duration: intro ? dur.cinematic : dur.slow,
            ease: ease.out,
            delay: intro ? 0.1 : 0,
          }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </motion.div>
  );
}

/* ---------- surfaces ---------- */
export function Panel({
  className,
  children,
  index = 0,
  onClick,
  label,
}: {
  className?: string;
  children: ReactNode;
  index?: number;
  delay?: number;
  onClick?: (() => void) | undefined;
  label?: string | undefined;
}) {
  const intro = useIntro();
  const play = intro && index < 6;
  const common = {
    initial: play ? { opacity: 0, y: 10 } : false,
    animate: { opacity: 1, y: 0 },
    transition: { ...tween("slow", "emphasized"), delay: play ? stagger(index, 0.045) : 0 },
    className: cn(
      "panel block w-full p-5 text-left",
      onClick && "hover-device:brightness-[1.06] transition-[filter] duration-200",
      className,
    ),
  } as const;
  if (onClick)
    return (
      <motion.button
        type="button"
        aria-label={label}
        whileTap={press.card}
        onClick={onClick}
        {...common}
      >
        {children}
      </motion.button>
    );
  return <motion.div {...common}>{children}</motion.div>;
}

export function Stat({
  label,
  value,
  unit,
  tone = "foreground",
  size = "md",
}: {
  label: string;
  value: ReactNode;
  unit?: string | undefined;
  tone?: "foreground" | "volt" | "pulse" | "ember" | "dream";
  size?: "sm" | "md" | "lg";
}) {
  const toneCls = {
    foreground: "text-foreground",
    volt: "text-volt",
    pulse: "text-pulse",
    ember: "text-ember",
    dream: "text-dream",
  }[tone];
  const sz = { sm: "text-title", md: "text-[1.625rem]", lg: "text-title-l" }[size];
  return (
    <div className="min-w-0">
      <div className="text-caption font-semibold text-muted-foreground">{label}</div>
      <div
        className={cn(
          "num mt-1 flex flex-wrap items-baseline font-semibold leading-tight",
          sz,
          toneCls,
        )}
      >
        {value}
        {unit && <span className="unit">{unit}</span>}
      </div>
    </div>
  );
}

/**
 * Large title that hands over to a compact glass bar once it scrolls away
 * (the iOS large-title pattern).
 */
export function PageHeader({
  eyebrow,
  title,
  action,
}: {
  eyebrow?: string;
  title: ReactNode;
  action?: ReactNode;
}) {
  const ref = useRef<HTMLHeadingElement>(null);
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      ([e]) => setCompact(!!e && !e.isIntersecting && e.boundingClientRect.top < 0),
      { threshold: 0, rootMargin: "-8px 0px 0px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <>
      <div className="sticky top-0 z-20 -mx-5 h-0 lg:-mx-8">
        <AnimatePresence>
          {compact && (
            <motion.div
              key="bar"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: exitTween("fast") }}
              transition={tween("fast")}
              className="glass pt-safe border-b border-hairline"
            >
              <motion.div
                initial={{ y: 6 }}
                animate={{ y: 0 }}
                transition={spring.smooth}
                className="flex h-12 items-center justify-center px-14 text-label font-bold"
              >
                <span className="truncate">{title}</span>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3 pb-6 pt-3">
        <div className="min-w-0">
          {eyebrow && <div className="eyebrow mb-2">{eyebrow}</div>}
          <motion.h1
            ref={ref}
            className="font-display text-title-l font-extrabold"
            animate={{ opacity: compact ? 0 : 1 }}
            transition={tween("fast")}
          >
            {title}
          </motion.h1>
        </div>
        {action}
      </header>
    </>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 mt-10 grid min-h-[28px] grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
      <h2 className="min-w-0 font-sans text-body font-bold [font-stretch:100%]">{children}</h2>
      {action}
    </div>
  );
}

export function TextAction({ children, onClick }: { children: ReactNode; onClick?: () => void }) {
  return (
    <motion.button
      type="button"
      whileTap={press.button}
      onClick={onClick}
      className="-mr-2 min-h-[44px] rounded-full px-2 text-label font-semibold text-primary hover-device:opacity-80"
    >
      {children}
    </motion.button>
  );
}

export function Divider({ inset = false, className }: { inset?: boolean; className?: string }) {
  return <div role="separator" className={cn("h-px bg-hairline", inset && "ml-14", className)} />;
}

/** iOS-grade row: leading icon or avatar, title and detail, trailing value and chevron. */
export function ListRow({
  leading,
  title,
  detail,
  trailing,
  onClick,
  chevron = !!onClick,
  className,
  label,
}: {
  leading?: ReactNode;
  title: ReactNode;
  detail?: ReactNode;
  trailing?: ReactNode;
  onClick?: () => void;
  chevron?: boolean;
  className?: string;
  label?: string;
}) {
  const inner = (
    <>
      {leading && <div className="grid size-10 shrink-0 place-items-center">{leading}</div>}
      <div className="min-w-0 flex-1">
        <div className="truncate text-body font-semibold">{title}</div>
        {detail && <div className="truncate text-caption text-muted-foreground">{detail}</div>}
      </div>
      {trailing && <div className="shrink-0 text-right">{trailing}</div>}
      {chevron && <ChevronRight className="size-4 shrink-0 text-faint" strokeWidth={2} />}
    </>
  );
  const cls = cn("flex min-h-[60px] w-full items-center gap-3 px-4 py-2.5 text-left", className);
  if (!onClick) return <div className={cls}>{inner}</div>;
  return (
    <motion.button
      type="button"
      aria-label={label}
      whileTap={{ scale: 0.99, opacity: 0.85 }}
      onClick={onClick}
      className={cn(cls, "hover-device:bg-surface-2/60 transition-colors")}
    >
      {inner}
    </motion.button>
  );
}

/* ---------- charts ---------- */

/** Bar chart with tap-to-inspect. Bars grow with transforms only. */
export function Bars({
  values,
  max,
  color = "var(--volt)",
  height = 56,
  labels,
  tip,
  goal,
  highlightLast = false,
}: {
  values: number[];
  max?: number;
  color?: string;
  height?: number;
  labels?: string[];
  tip?: (i: number) => string;
  goal?: { value: number; label: string };
  highlightLast?: boolean;
}) {
  const intro = useIntro();
  const [sel, setSel] = useState<number | null>(null);
  const m = max ?? Math.max(1, ...values, goal?.value ?? 0);
  return (
    <div className="relative">
      <AnimatePresence>
        {sel != null && tip && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, transition: exitTween("fast") }}
            transition={spring.snappy}
            className="pointer-events-none mb-3 rounded-tile border border-hairline bg-surface-2 px-3 py-2 text-label font-semibold text-foreground"
            role="status"
          >
            {tip(sel)}
          </motion.div>
        )}
      </AnimatePresence>
      <div className="relative flex items-end gap-1" style={{ height }}>
        {goal && (
          <div
            className="pointer-events-none absolute inset-x-0 border-t border-dashed border-faint/60"
            style={{ bottom: (goal.value / m) * height }}
          >
            <span className="num absolute -top-5 right-0 text-caption text-faint">
              {goal.label}
            </span>
          </div>
        )}
        {values.map((v, i) => {
          const ratio = Math.max(v ? 0.06 : 0.04, Math.min(1, v / m));
          const dim = sel != null ? sel !== i : highlightLast ? i !== values.length - 1 : false;
          return (
            <button
              type="button"
              key={i}
              aria-label={tip ? tip(i) : `${v}`}
              onClick={() => (setSel(sel === i ? null : i), feedback.selection())}
              className="flex h-full flex-1 items-end focus-visible:outline-offset-0"
            >
              <span className="relative block h-full w-full overflow-hidden rounded-[4px]">
                <motion.span
                  className="absolute inset-0 rounded-[4px]"
                  style={{ background: v ? color : "var(--surface-2)" }}
                  initial={intro ? { y: "100%" } : false}
                  animate={{ y: `${(1 - ratio) * 100}%`, opacity: dim ? 0.35 : v ? 0.92 : 1 }}
                  transition={{
                    y: intro
                      ? { duration: dur.deliberate, delay: Math.min(i, 24) * 0.012, ease: ease.out }
                      : spring.smooth,
                    opacity: tween("fast"),
                  }}
                />
              </span>
            </button>
          );
        })}
      </div>
      {labels && (
        <div className="mt-3 flex justify-between gap-2">
          {labels.filter(Boolean).map((l, i) => (
            <div key={i} className="num text-caption text-faint">
              {l}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Small trend line that draws on from left to right. */
export function Sparkline({
  values,
  color = "var(--volt)",
  width = 96,
  height = 32,
  fill = true,
  className,
}: {
  values: number[];
  color?: string;
  width?: number;
  height?: number;
  fill?: boolean;
  className?: string;
}) {
  const intro = useIntro();
  const id = useId().replace(/:/g, "");
  const pts = values.filter((v) => Number.isFinite(v));
  if (pts.length < 2) return null;
  const min = Math.min(...pts);
  const max = Math.max(...pts);
  const span = max - min || 1;
  const pad = 3;
  const xy = pts.map(
    (v, i) =>
      [
        pad + (i / (pts.length - 1)) * (width - pad * 2),
        pad + (1 - (v - min) / span) * (height - pad * 2),
      ] as const,
  );
  const d = xy.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const last = xy.at(-1)!;
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={cn("overflow-visible", className)}
      aria-hidden
    >
      {fill && (
        <>
          <defs>
            <linearGradient id={`sg${id}`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.22" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          <motion.path
            d={`${d} L${last[0]} ${height} L${xy[0]![0]} ${height} Z`}
            fill={`url(#sg${id})`}
            initial={intro ? { opacity: 0 } : false}
            animate={{ opacity: 1 }}
            transition={{ ...tween("deliberate"), delay: intro ? 0.3 : 0 }}
          />
        </>
      )}
      <motion.path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={intro ? { pathLength: 0 } : false}
        animate={{ pathLength: 1 }}
        transition={{ duration: dur.cinematic, ease: ease.out }}
      />
      <motion.circle
        cx={last[0]}
        cy={last[1]}
        r={3}
        fill={color}
        initial={intro ? { scale: 0 } : false}
        animate={{ scale: 1 }}
        transition={{ ...spring.bouncy, delay: intro ? dur.cinematic : 0 }}
      />
    </svg>
  );
}

/** Linear progress that fills with a transform. */
export function ProgressBar({
  value,
  color = "var(--volt)",
  className,
  label,
}: {
  value: number;
  color?: string;
  className?: string;
  label?: string;
}) {
  const intro = useIntro();
  const v = Math.max(0, Math.min(1, value));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(v * 100)}
      className={cn("h-1.5 overflow-hidden rounded-full bg-surface-2", className)}
    >
      <motion.div
        className="h-full w-full origin-left rounded-full"
        style={{ background: color }}
        initial={intro ? { scaleX: 0 } : false}
        animate={{ scaleX: v }}
        transition={
          intro ? { duration: dur.deliberate, ease: ease.out, delay: 0.15 } : spring.smooth
        }
      />
    </div>
  );
}

/** Segmented progress, e.g. week 3 of 6. */
export function Segments({
  total,
  done,
  current,
  className,
}: {
  total: number;
  done: number;
  current?: number;
  className?: string;
}) {
  return (
    <div className={cn("flex gap-1", className)} aria-label={`${done} of ${total}`} role="img">
      {Array.from({ length: Math.max(1, total) }, (_, i) => (
        <span
          key={i}
          className={cn(
            "h-1 flex-1 rounded-full",
            i < done ? "bg-foreground" : i === current ? "bg-volt" : "bg-surface-3",
          )}
        />
      ))}
    </div>
  );
}

/* ---------- people ---------- */
export function Avatar({
  name,
  src,
  size = 40,
  className,
}: {
  name?: string | null | undefined;
  src?: string | undefined;
  size?: number;
  className?: string | undefined;
}) {
  const [failed, setFailed] = useState<string | null>(null);
  return (
    <div
      aria-hidden
      className={cn(
        "grid shrink-0 place-items-center overflow-hidden rounded-full bg-surface-3 font-display font-bold text-foreground ring-1 ring-hairline-strong",
        className,
      )}
      style={{ width: size, height: size, fontSize: Math.max(12, size * 0.36) }}
    >
      {src && failed !== src ? (
        <img
          src={src}
          alt=""
          width={size}
          height={size}
          className="h-full w-full object-cover"
          onError={() => setFailed(src)}
        />
      ) : (
        initials(name)
      )}
    </div>
  );
}

export function AvatarStack({
  people,
  size = 28,
  max = 4,
}: {
  people: { name?: string | null; src?: string | undefined }[];
  size?: number;
  max?: number;
}) {
  const shown = people.slice(0, max);
  const extra = people.length - shown.length;
  return (
    <div className="flex items-center" aria-label={`${people.length} people`}>
      {shown.map((p, i) => (
        <div key={i} className="-ml-2 rounded-full ring-2 ring-background first:ml-0">
          <Avatar name={p.name} src={p.src} size={size} />
        </div>
      ))}
      {extra > 0 && (
        <div
          className="num -ml-2 grid place-items-center rounded-full bg-surface-3 text-caption font-semibold ring-2 ring-background"
          style={{ width: size, height: size }}
        >
          +{extra}
        </div>
      )}
    </div>
  );
}

/** Count badge: hidden at zero. */
export function Badge({ count, className }: { count: number; className?: string }) {
  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.span
          key="b"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0, transition: exitTween("fast") }}
          transition={spring.bouncy}
          className={cn(
            "num grid h-5 min-w-5 place-items-center rounded-full bg-volt px-1.5 text-[11px] font-bold text-primary-foreground",
            className,
          )}
        >
          {count > 99 ? "99+" : count}
        </motion.span>
      )}
    </AnimatePresence>
  );
}

/* ---------- states ---------- */
export function Empty({
  icon,
  title,
  body,
  action,
}: {
  icon?: ReactNode;
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div className="panel flex flex-col items-center px-6 py-12 text-center">
      {icon && (
        <div className="mb-4 grid size-14 place-items-center rounded-full bg-surface-2 text-foreground ring-1 ring-hairline">
          {icon}
        </div>
      )}
      <div className="font-display text-title font-bold">{title}</div>
      {body && <p className="mt-2 max-w-xs text-label text-muted-foreground">{body}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div className="panel flex flex-col items-center px-6 py-10 text-center">
      <div className="font-display text-title font-bold">That didn't load</div>
      <p className="mt-2 max-w-xs text-label text-muted-foreground">
        {message ?? "Check your connection, then try again."}
      </p>
      {onRetry && (
        <motion.button
          whileTap={press.button}
          onClick={onRetry}
          className="mt-5 inline-flex min-h-[44px] items-center gap-2 rounded-full bg-surface-2 px-5 text-label font-semibold hover-device:bg-surface-3"
        >
          <RotateCw className="size-4" /> Try again
        </motion.button>
      )}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("shimmer rounded-tile", className)} aria-hidden />;
}

/** Shows children only if loading takes longer than 150 ms, so fast loads never flash a skeleton. */
export function Delayed({ children, ms = 150 }: { children: ReactNode; ms?: number }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShow(true), ms);
    return () => clearTimeout(t);
  }, [ms]);
  return show ? (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={tween("fast")}>
      {children}
    </motion.div>
  ) : null;
}

export function SkeletonPage() {
  return (
    <Delayed>
      <div aria-busy="true" aria-label="Loading">
        <Skeleton className="mb-3 h-3 w-28" />
        <Skeleton className="mb-7 h-8 w-52" />
        <Skeleton className="mb-3 h-[212px] w-full !rounded-card" />
        <Skeleton className="mb-3 h-[164px] w-full !rounded-card" />
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-28 !rounded-card" />
          <Skeleton className="h-28 !rounded-card" />
        </div>
      </div>
    </Delayed>
  );
}

/* ---------- controls ---------- */
export function Chip({
  active,
  children,
  onClick,
  className,
}: {
  active?: boolean;
  children: ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <motion.button
      type="button"
      whileTap={press.button}
      aria-pressed={!!active}
      {...(onClick ? { onClick: () => (feedback.selection(), onClick()) } : {})}
      className={cn(
        "min-h-[44px] shrink-0 rounded-full border px-4 text-label font-semibold transition-colors duration-200",
        active
          ? "border-transparent bg-foreground text-background"
          : "border-hairline-strong bg-surface text-muted-foreground hover-device:text-foreground",
        className,
      )}
    >
      {children}
    </motion.button>
  );
}

/** Segmented control: equal-width, never scrolls; the thumb glides between options. */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  className?: string;
}) {
  const group = useId();
  return (
    <div
      role="tablist"
      className={cn(
        "flex rounded-full bg-surface-2 p-1 ring-1 ring-inset ring-hairline",
        className,
      )}
    >
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={value === o.value}
          onClick={() => value !== o.value && (feedback.selection(), onChange(o.value))}
          className="relative min-h-[40px] flex-1 rounded-full px-1 text-label font-semibold"
        >
          {value === o.value && (
            <motion.span
              layoutId={`seg-${group}`}
              className="absolute inset-0 rounded-full bg-popover shadow-1 ring-1 ring-hairline-strong"
              transition={spring.snappy}
            />
          )}
          <span
            className={cn(
              "relative transition-colors duration-200",
              value === o.value ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {o.label}
          </span>
        </button>
      ))}
    </div>
  );
}

export type ScaleOption = { icon: LucideIcon; label: string };
/** 1–5 picker using icons plus a word label for the selection. */
export function IconScale({
  value,
  onChange,
  options,
  tone = "text-volt",
  label,
}: {
  value: number;
  onChange: (n: number) => void;
  options: ScaleOption[];
  tone?: string;
  label: string;
}) {
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <span className="eyebrow">{label}</span>
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={value}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4, transition: exitTween("fast") }}
            transition={tween("fast")}
            className={cn("text-label font-semibold", tone)}
          >
            {options[value - 1]?.label}
          </motion.span>
        </AnimatePresence>
      </div>
      <div role="radiogroup" aria-label={label} className="grid grid-cols-5 gap-2">
        {options.map((o, i) => (
          <motion.button
            type="button"
            role="radio"
            aria-checked={value === i + 1}
            aria-label={o.label}
            key={o.label}
            whileTap={press.icon}
            onClick={() => (feedback.selection(), onChange(i + 1))}
            className={cn(
              "grid min-h-[52px] place-items-center rounded-tile border transition-colors duration-200",
              value === i + 1
                ? cn("border-current bg-current/10", tone)
                : "border-hairline bg-surface text-muted-foreground",
            )}
          >
            <o.icon className="size-6" strokeWidth={1.75} />
          </motion.button>
        ))}
      </div>
    </div>
  );
}

/** Primary save button: spinner inside the same pill, then it closes into a circle and the check draws. */
export function SaveButton({
  children,
  onSave,
  onDone,
  disabled,
  className,
}: {
  children: ReactNode;
  onSave: () => Promise<unknown>;
  onDone?: () => void;
  disabled?: boolean;
  className?: string;
}) {
  const [st, setSt] = useState<"idle" | "busy" | "done">("idle");
  const reduce = useReducedMotion();
  return (
    <motion.button
      type="button"
      whileTap={st === "idle" ? press.button : {}}
      disabled={disabled || st !== "idle"}
      aria-live="polite"
      onClick={async () => {
        setSt("busy");
        try {
          await onSave();
          setSt("done");
          feedback.success();
          setTimeout(() => onDone?.(), 620);
        } catch {
          setSt("idle");
        }
      }}
      animate={{
        clipPath:
          st === "done" && !reduce
            ? "inset(0 calc(50% - 28px) round 999px)"
            : "inset(0 0% round 999px)",
      }}
      transition={spring.smooth}
      className={cn(
        "relative mx-auto flex h-14 w-full items-center justify-center rounded-full bg-volt-gradient font-semibold text-primary-foreground disabled:opacity-60 data-[done=true]:!opacity-100",
        className,
      )}
      data-done={st === "done"}
    >
      <AnimatePresence mode="wait" initial={false}>
        {st === "done" ? (
          <motion.span
            key="d"
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={spring.bouncy}
          >
            <svg
              viewBox="0 0 24 24"
              className="size-6"
              fill="none"
              stroke="currentColor"
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-label="Saved"
            >
              <motion.path
                d="M5 12.5l4.5 4.5L19 7.5"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: dur.slow, ease: ease.out, delay: 0.08 }}
              />
            </svg>
          </motion.span>
        ) : st === "busy" ? (
          <motion.span
            key="b"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={tween("fast")}
          >
            <Loader2 className="size-5 animate-spin" aria-label="Saving" />
          </motion.span>
        ) : (
          <motion.span
            key="i"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={tween("fast")}
            className="flex items-center gap-2 text-body"
          >
            {children}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

/** Large pill for the single primary action on a screen. */
export function PrimaryButton({
  children,
  onClick,
  disabled,
  className,
  icon,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  icon?: ReactNode;
}) {
  return (
    <motion.button
      type="button"
      whileTap={disabled ? {} : press.button}
      disabled={disabled}
      onClick={() => (feedback.impactLight(), onClick?.())}
      className={cn(
        "flex h-14 w-full items-center justify-center gap-2 rounded-full bg-volt-gradient text-body font-semibold text-primary-foreground shadow-glow transition-[filter,opacity] duration-200 hover-device:brightness-105 disabled:opacity-50 disabled:shadow-none",
        className,
      )}
    >
      {icon}
      {children}
    </motion.button>
  );
}

export function IconButton({
  label,
  children,
  onClick,
  className,
}: {
  label: string;
  children: ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <motion.button
      type="button"
      aria-label={label}
      whileTap={press.icon}
      onClick={onClick}
      className={cn(
        "grid size-11 shrink-0 place-items-center rounded-full bg-surface-2 text-foreground transition-colors duration-200 hover-device:bg-surface-3",
        className,
      )}
    >
      {children}
    </motion.button>
  );
}

export function Tag({
  children,
  tone = "muted",
}: {
  children: ReactNode;
  tone?: "muted" | "volt" | "ember" | "pulse" | "dream" | "danger";
}) {
  const cls = {
    muted: "bg-surface-2 text-muted-foreground",
    volt: "bg-volt/12 text-volt",
    ember: "bg-ember/12 text-ember",
    pulse: "bg-pulse/12 text-pulse",
    dream: "bg-dream/12 text-dream",
    danger: "bg-destructive/12 text-destructive",
  }[tone];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-caption font-semibold",
        cls,
      )}
    >
      {children}
    </span>
  );
}

/** Staggered list entrance for a group of children (at most 6 animate). */
export function StaggerList({ children, className }: { children: ReactNode; className?: string }) {
  const intro = useIntro();
  return (
    <div className={className}>
      {Children.map(children, (child, i) =>
        isValidElement(child) ? (
          <motion.div
            initial={intro && i < 6 ? { opacity: 0, y: 8 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...tween("slow", "emphasized"), delay: intro ? stagger(i) : 0 }}
          >
            {child}
          </motion.div>
        ) : (
          child
        ),
      )}
    </div>
  );
}
