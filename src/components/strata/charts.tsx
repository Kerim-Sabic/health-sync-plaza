import { useEffect, useId, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { dur, ease, spring, tween, useIntro } from "@/lib/motion";
import { feedback } from "@/lib/feedback";
import { cn } from "@/lib/utils";

export type ChartPoint = { x: string; y: number; marker?: boolean; raw?: number | null };

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    setW(el.clientWidth);
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([e]) => e && setW(Math.round(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

/** Smooth path through points (Catmull-Rom converted to cubic Béziers). */
function smoothPath(pts: [number, number][]) {
  if (pts.length < 2) return "";
  let d = `M${pts[0]![0]},${pts[0]![1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i]!;
    const p1 = pts[i]!;
    const p2 = pts[i + 1]!;
    const p3 = pts[i + 2] ?? p2;
    const t = 0.18;
    d += ` C${p1[0] + (p2[0] - p0[0]) * t},${p1[1] + (p2[1] - p0[1]) * t} ${p2[0] - (p3[0] - p1[0]) * t},${p2[1] - (p3[1] - p1[1]) * t} ${p2[0]},${p2[1]}`;
  }
  return d;
}

/**
 * Line chart you can scrub with a finger: a crosshair follows, the value
 * snaps to the nearest point and each point gives a light haptic tick.
 */
export function ScrubChart({
  points,
  color = "var(--volt)",
  height = 180,
  format = (n) => String(n),
  formatX = (x) => x,
  goal,
  label,
  className,
  readout = "always",
}: {
  points: ChartPoint[];
  /** "scrub" shows the value line only while a finger is on the chart. */
  readout?: "always" | "scrub";
  color?: string;
  height?: number;
  format?: (n: number) => string;
  formatX?: (x: string) => string;
  goal?: { value: number; label: string } | undefined;
  label: string;
  className?: string;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const intro = useIntro();
  const id = useId().replace(/:/g, "");
  const [sel, setSel] = useState<number | null>(null);
  const last = useRef<number | null>(null);
  const padX = 8;
  const padTop = 28;
  const padBottom = 24;
  const geo = useMemo(() => {
    if (!width || points.length === 0) return null;
    const ys = points
      .flatMap((p) => [p.y, ...(p.raw != null ? [p.raw] : [])])
      .concat(goal ? [goal.value] : []);
    let min = Math.min(...ys);
    let max = Math.max(...ys);
    if (max - min < 1e-6) {
      min -= 1;
      max += 1;
    }
    const span = max - min;
    min -= span * 0.12;
    max += span * 0.12;
    const innerW = width - padX * 2;
    const innerH = height - padTop - padBottom;
    const xOf = (i: number) =>
      padX + (points.length === 1 ? innerW / 2 : (i / (points.length - 1)) * innerW);
    const yOf = (v: number) => padTop + (1 - (v - min) / (max - min)) * innerH;
    const xy = points.map((p, i) => [xOf(i), yOf(p.y)] as [number, number]);
    return {
      xy,
      xOf,
      yOf,
      line: smoothPath(xy),
      area: `${smoothPath(xy)} L${xy.at(-1)![0]},${height - padBottom} L${xy[0]![0]},${height - padBottom} Z`,
    };
  }, [width, points, height, goal]);

  const pick = (clientX: number) => {
    const el = ref.current;
    if (!el || !geo) return;
    const x = clientX - el.getBoundingClientRect().left;
    let best = 0;
    let dist = Infinity;
    geo.xy.forEach(([px], i) => {
      const d = Math.abs(px - x);
      if (d < dist) {
        dist = d;
        best = i;
      }
    });
    if (best !== last.current) {
      last.current = best;
      feedback.selection();
    }
    setSel(best);
  };
  const end = () => {
    last.current = null;
    setSel(null);
  };

  const cur = sel != null ? points[sel] : points.at(-1);
  const curXY = sel != null && geo ? geo.xy[sel] : null;
  return (
    <div className={cn("relative select-none", className)}>
      <div className="mb-1 flex h-6 items-baseline justify-between gap-3">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={sel ?? "latest"}
            initial={{ opacity: 0, y: 3 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, transition: { duration: dur.instant } }}
            transition={tween("fast")}
            className="num text-label font-semibold"
          >
            {readout === "scrub" && sel == null ? null : (
              <>
                {cur ? format(cur.y) : "—"}
                <span className="ml-2 font-sans text-caption font-medium text-faint">
                  {cur ? (sel != null ? formatX(cur.x) : "Latest") : ""}
                </span>
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
      <div
        ref={ref}
        role="img"
        aria-label={label}
        className="relative touch-pan-y"
        style={{ height }}
        onPointerDown={(e) => pick(e.clientX)}
        onPointerMove={(e) =>
          e.pointerType === "mouse" || e.buttons ? pick(e.clientX) : undefined
        }
        onPointerUp={(e) => e.pointerType !== "mouse" && end()}
        onPointerLeave={end}
        onPointerCancel={end}
      >
        {geo && (
          <svg
            width={width}
            height={height}
            className="absolute inset-0 overflow-visible"
            aria-hidden
          >
            <defs>
              <linearGradient id={`area${id}`} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity="0.2" />
                <stop offset="100%" stopColor={color} stopOpacity="0" />
              </linearGradient>
            </defs>
            {[0.25, 0.5, 0.75].map((f) => (
              <line
                key={f}
                x1={padX}
                x2={width - padX}
                y1={padTop + f * (height - padTop - padBottom)}
                y2={padTop + f * (height - padTop - padBottom)}
                stroke="var(--hairline)"
                strokeDasharray="2 4"
              />
            ))}
            {goal && (
              <g>
                <line
                  x1={padX}
                  x2={width - padX}
                  y1={geo.yOf(goal.value)}
                  y2={geo.yOf(goal.value)}
                  stroke="var(--text-3)"
                  strokeOpacity={0.6}
                  strokeDasharray="4 4"
                />
                <text
                  x={width - padX}
                  y={geo.yOf(goal.value) - 6}
                  textAnchor="end"
                  className="num"
                  fontSize={11}
                  fill="var(--text-3)"
                >
                  {goal.label}
                </text>
              </g>
            )}
            <motion.path
              d={geo.area}
              fill={`url(#area${id})`}
              initial={intro ? { opacity: 0 } : false}
              animate={{ opacity: 1 }}
              transition={{ ...tween("deliberate"), delay: intro ? 0.4 : 0 }}
            />
            {points.map((p, i) =>
              p.raw != null ? (
                <circle
                  key={`r${i}`}
                  cx={geo.xOf(i)}
                  cy={geo.yOf(p.raw)}
                  r={2}
                  fill="var(--text-3)"
                  opacity={0.5}
                />
              ) : null,
            )}
            <motion.path
              d={geo.line}
              fill="none"
              stroke={color}
              strokeWidth={2.25}
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={intro ? { pathLength: 0 } : false}
              animate={{ pathLength: 1 }}
              transition={{ duration: dur.cinematic + 0.2, ease: ease.out }}
            />
            {points.map((p, i) =>
              p.marker ? (
                <motion.g
                  key={`m${i}`}
                  initial={intro ? { scale: 0, opacity: 0 } : false}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ ...spring.bouncy, delay: intro ? 0.6 + i * 0.02 : 0 }}
                  style={{ transformOrigin: `${geo.xy[i]![0]}px ${geo.xy[i]![1]}px` }}
                >
                  <circle cx={geo.xy[i]![0]} cy={geo.xy[i]![1]} r={9} fill={color} opacity={0.18} />
                  <circle
                    cx={geo.xy[i]![0]}
                    cy={geo.xy[i]![1]}
                    r={4.5}
                    fill="var(--background)"
                    stroke={color}
                    strokeWidth={2}
                  />
                </motion.g>
              ) : null,
            )}
            {curXY && (
              <g>
                <line
                  x1={curXY[0]}
                  x2={curXY[0]}
                  y1={padTop - 6}
                  y2={height - padBottom}
                  stroke="var(--text-2)"
                  strokeOpacity={0.5}
                  strokeWidth={1}
                />
                <circle
                  cx={curXY[0]}
                  cy={curXY[1]}
                  r={6}
                  fill={color}
                  stroke="var(--background)"
                  strokeWidth={2.5}
                />
              </g>
            )}
            {!curXY && geo.xy.length > 0 && (
              <motion.circle
                cx={geo.xy.at(-1)![0]}
                cy={geo.xy.at(-1)![1]}
                r={4}
                fill={color}
                initial={intro ? { scale: 0 } : false}
                animate={{ scale: 1 }}
                transition={{ ...spring.bouncy, delay: intro ? dur.cinematic : 0 }}
              />
            )}
            <text x={padX} y={height - 6} className="num" fontSize={11} fill="var(--text-3)">
              {points[0] ? formatX(points[0].x) : ""}
            </text>
            <text
              x={width - padX}
              y={height - 6}
              textAnchor="end"
              className="num"
              fontSize={11}
              fill="var(--text-3)"
            >
              {points.at(-1) ? formatX(points.at(-1)!.x) : ""}
            </text>
          </svg>
        )}
      </div>
    </div>
  );
}

/**
 * Calendar heatmap of recent days, Monday first. Intensity is 0–1.
 */
export function Heatmap({
  days,
  onPick,
  selected,
  color = "var(--text-1)",
}: {
  days: { date: string; v: number; label: string }[];
  onPick?: (date: string) => void;
  selected?: string | null;
  color?: string;
}) {
  const intro = useIntro();
  const first = days[0] ? (new Date(days[0].date + "T12:00").getDay() + 6) % 7 : 0;
  const cells: ({ date: string; v: number; label: string } | null)[] = [
    ...Array.from({ length: first }, () => null),
    ...days,
  ];
  const weeks: (typeof cells)[] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return (
    <div className="flex gap-[5px]" role="grid" aria-label="Training calendar">
      {weeks.map((w, wi) => (
        <div key={wi} className="flex flex-1 flex-col gap-[5px]" role="row">
          {Array.from({ length: 7 }, (_, di) => {
            const c = w[di];
            if (!c) return <span key={di} className="aspect-square rounded-[5px]" />;
            const on = selected === c.date;
            return (
              <motion.button
                key={di}
                type="button"
                role="gridcell"
                aria-label={c.label}
                aria-pressed={on}
                onClick={() => (feedback.selection(), onPick?.(c.date))}
                initial={intro ? { opacity: 0, scale: 0.6 } : false}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ ...spring.smooth, delay: intro ? Math.min(wi * 0.03, 0.4) : 0 }}
                className={cn(
                  "aspect-square rounded-[5px] transition-shadow",
                  on && "ring-2 ring-foreground ring-offset-2 ring-offset-surface",
                )}
                style={{
                  background:
                    c.v > 0
                      ? `color-mix(in oklab, ${color} ${Math.round(22 + c.v * 63)}%, var(--surface-2))`
                      : "var(--surface-2)",
                }}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}
