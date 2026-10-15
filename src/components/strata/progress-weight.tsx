import { format } from "date-fns";
import { Scale, TrendingDown, TrendingUp } from "lucide-react";
import { weightPoints, type WeightRange } from "@/lib/progress";
import { NumberTicker, Tag } from "./ui";
import { ScrubChart } from "./charts";
import type { BodyMetric } from "@/lib/types";

/** Smoothed 7-day trend over raw weigh-ins, scrubbable with a finger. */
export function WeightChart({
  metrics,
  range = "All",
}: {
  metrics: BodyMetric[];
  range?: WeightRange;
}) {
  const points = weightPoints(metrics, range);
  const latest = points.at(-1);
  if (!latest)
    return (
      <div className="flex items-center gap-3 py-8 text-label text-muted-foreground">
        <Scale className="size-5 shrink-0" strokeWidth={1.75} />
        No weigh-ins in this period.
      </div>
    );
  const first = points[0]!;
  const delta = +(latest.avg - first.avg).toFixed(1);
  const span = range === "All" ? "overall" : `in ${range}`;
  return (
    <div aria-label="Weight history">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="eyebrow">7-day average</div>
          <div className="num mt-2 text-display font-semibold">
            <NumberTicker value={latest.avg} decimals={1} />
            <span className="unit">kg</span>
          </div>
        </div>
        {points.length > 1 && (
          <Tag tone={delta === 0 ? "muted" : "pulse"}>
            {delta < 0 ? (
              <TrendingDown className="size-3" />
            ) : delta > 0 ? (
              <TrendingUp className="size-3" />
            ) : null}
            <span className="num">
              {delta > 0 ? "+" : delta < 0 ? "−" : "±"}
              {Math.abs(delta)} kg
            </span>{" "}
            {span}
          </Tag>
        )}
      </div>
      <ScrubChart
        points={points.map((p) => ({ x: p.date, y: p.avg, raw: p.v }))}
        color="var(--pulse)"
        height={176}
        readout="scrub"
        format={(n) => `${n.toFixed(1)} kg`}
        formatX={(x) => format(new Date(x + "T12:00"), "d MMM")}
        label={`Weight trend: ${latest.avg} kilograms, ${delta < 0 ? "down" : "up"} ${Math.abs(delta)} kilograms ${span}. ${points.length} weigh-ins.`}
      />
      <div className="mt-3 flex items-center gap-4 text-caption text-faint">
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded-full bg-pulse" /> Trend
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-faint" /> Weigh-ins
        </span>
        <span className="ml-auto">{points.length} in view</span>
      </div>
    </div>
  );
}
