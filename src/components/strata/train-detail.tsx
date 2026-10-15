import { format } from "date-fns";
import { Trophy, TrendingUp } from "lucide-react";
import { Divider, NumberTicker, Stat, Tag } from "@/components/strata/ui";
import { ScrubChart } from "@/components/strata/charts";
import { exerciseHistory } from "@/lib/train-history";
import type { Workout } from "@/lib/types";

export function ExerciseTrend({ name, workouts }: { name: string; workouts: Workout[] }) {
  const points = exerciseHistory(name, workouts);
  const latest = points.at(-1);
  if (!latest)
    return <p className="text-label text-muted-foreground">No weighted sets recorded yet.</p>;
  const best = Math.max(...points.map((point) => point.estimate));
  const first = points[0];
  const gain = first ? latest.estimate - first.estimate : 0;
  return (
    <div>
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="eyebrow">Estimated one-rep max</div>
          <div className="num mt-2 text-display font-semibold">
            <NumberTicker value={latest.estimate} intro />
            <span className="unit">kg</span>
          </div>
        </div>
        {gain > 0 && (
          <Tag tone="volt">
            <TrendingUp className="size-3" /> +{gain} kg
          </Tag>
        )}
      </div>
      <p className="mt-2 text-label text-muted-foreground">
        An estimate from your strongest logged set, not a tested max.
      </p>
      <div className="mt-6 rounded-card border border-hairline bg-surface p-4">
        <ScrubChart
          points={points.map((p) => ({ x: p.date, y: p.estimate, marker: p.record }))}
          format={(n) => `${n} kg`}
          formatX={(x) => format(new Date(x), "d MMM")}
          label={`${name}: estimated one-rep max ${latest.estimate} kilograms, ${gain >= 0 ? "up" : "down"} ${Math.abs(gain)} kilograms across ${points.length} sessions. Marked points are new records.`}
        />
      </div>
      <div className="my-6 grid grid-cols-3 gap-4">
        <Stat size="sm" label="Best max" value={best} unit="kg" />
        <Stat size="sm" label="Sessions" value={points.length} />
        <Stat size="sm" label="Latest set" value={latest.weight} unit={`kg × ${latest.reps}`} />
      </div>
      <div className="overflow-hidden rounded-card border border-hairline bg-surface">
        {[...points]
          .reverse()
          .slice(0, 8)
          .map((point, i) => (
            <div key={point.id}>
              {i > 0 && <Divider className="mx-4" />}
              <div className="flex items-center justify-between gap-3 px-4 py-3">
                <div>
                  <div className="text-label font-semibold">
                    {format(new Date(point.date), "EEE, d MMM")}
                  </div>
                  <div className="num mt-0.5 text-caption text-muted-foreground">
                    {point.weight} kg × {point.reps} reps
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {point.record && (
                    <Trophy aria-label="New estimated-max record" className="size-4 text-volt" />
                  )}
                  <span className="num text-label font-semibold">{point.estimate} kg</span>
                </div>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
