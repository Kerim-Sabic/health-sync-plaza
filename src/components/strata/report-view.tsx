import { format } from "date-fns";
import {
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  TriangleAlert,
  Trophy,
  MessageSquareQuote,
} from "lucide-react";
import type { ProgressPhoto, ReportSummary } from "@/lib/types";
import { fmtK, fmtVolume } from "@/lib/stats";
import { Panel, Ring, Stat } from "./ui";
import { CompareSlider } from "./photos";

export function ReportView({
  s,
  comment,
  coach,
  photos,
}: {
  s: ReportSummary;
  comment?: string | null;
  coach?: string | null | undefined;
  photos?: ProgressPhoto[];
}) {
  const wDelta =
    s.weightStart != null && s.weightEnd != null ? +(s.weightEnd - s.weightStart).toFixed(1) : null;
  const sessDelta = s.sessions - s.prevSessions;
  const front = photos?.filter((p) => p.pose === "Front" && p.taken_on >= s.from) ?? [];
  const allFront = photos?.filter((p) => p.pose === "Front") ?? [];
  const before = allFront.at(-1);
  const after = front[0];

  return (
    <div className="space-y-3">
      <Panel className="relative overflow-hidden">
        <div className="eyebrow">
          {s.periodDays}-day report · {format(new Date(s.from + "T12:00"), "d MMM")} –{" "}
          {format(new Date(s.to + "T12:00"), "d MMM")}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-5">
          <Ring value={s.adherence} size={96} stroke={9}>
            <div>
              <div className="num text-2xl font-bold">{Math.round(s.adherence * 100)}%</div>
              <div className="eyebrow">Adherence</div>
            </div>
          </Ring>
          <div className="grid min-w-40 flex-1 grid-cols-2 gap-3">
            <div>
              <Stat label="Sessions" value={s.sessions} tone="volt" />
              <Delta v={sessDelta} suffix=" vs prev" />
            </div>
            <div>
              <Stat
                label="Volume"
                value={fmtVolume(s.volume).value}
                unit={fmtVolume(s.volume).unit}
              />
              {s.volumeDeltaPct != null && <Delta v={s.volumeDeltaPct} suffix="%" />}
            </div>
            <Stat label="Hours" value={(s.minutes / 60).toFixed(1)} />
            <Stat label="Avg RPE" value={s.avgRpe || "—"} />
          </div>
        </div>
      </Panel>

      {comment && (
        <Panel className="flex gap-3 border-primary/30">
          <MessageSquareQuote className="size-5 shrink-0 text-primary" />
          <div>
            <div className="text-label leading-relaxed">{comment}</div>
            {coach && (
              <div className="mt-1.5 text-caption font-semibold text-muted-foreground">
                — {coach}
              </div>
            )}
          </div>
        </Panel>
      )}

      {before && after && before.id !== after.id && (
        <Panel className="p-2">
          <CompareSlider before={before} after={after} />
        </Panel>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Panel>
          <Stat label="Avg sleep" value={s.avgSleep || "—"} unit="h" tone="dream" />
          <div className="num mt-1 text-caption text-muted-foreground">
            quality {s.avgSleepQuality || "—"}/5
          </div>
        </Panel>
        <Panel>
          <Stat label="Bodyweight" value={s.weightEnd ?? "—"} unit="kg" />
          {wDelta != null && <Delta v={wDelta} suffix=" kg" neutral />}
        </Panel>
        <Panel>
          <Stat label="Avg kcal" value={s.avgKcal ? fmtK(s.avgKcal) : "—"} tone="ember" />
          <div className="num mt-1 text-caption text-muted-foreground">
            {s.avgProtein} g protein · {s.loggedFoodDays} days logged
          </div>
        </Panel>
        <Panel>
          <Stat label="Mood" value={s.avgMood || "—"} unit="/5" tone="pulse" />
          <div className="num mt-1 text-caption text-muted-foreground">
            energy {s.avgEnergy || "—"}/5
          </div>
        </Panel>
      </div>

      {s.prs.length > 0 && (
        <Panel>
          <div className="eyebrow mb-2 flex items-center gap-1.5">
            <Trophy className="size-3.5 text-volt" /> New records
          </div>
          {s.prs.map((p) => (
            <div
              key={p.exercise}
              className="flex flex-wrap items-center justify-between gap-2 border-b border-border py-2 last:border-0"
            >
              <span className="text-label">{p.exercise}</span>
              <span className="num text-label">
                <span className="text-muted-foreground">{p.prev || "—"} →</span>{" "}
                <b className="text-volt">{p.weight} kg</b>
              </span>
            </div>
          ))}
        </Panel>
      )}

      {(s.highlights.length > 0 || s.watchouts.length > 0) && (
        <Panel className="space-y-2">
          {s.highlights.map((h) => (
            <div key={h} className="flex gap-2 text-label">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-volt" />
              {h}
            </div>
          ))}
          {s.watchouts.map((h) => (
            <div key={h} className="flex gap-2 text-label">
              <TriangleAlert className="mt-0.5 size-4 shrink-0 text-ember" />
              {h}
            </div>
          ))}
        </Panel>
      )}
    </div>
  );
}

function Delta({ v, suffix, neutral }: { v: number; suffix: string; neutral?: boolean }) {
  const up = v > 0;
  const cls = neutral
    ? "text-muted-foreground"
    : up
      ? "text-volt"
      : v < 0
        ? "text-ember"
        : "text-muted-foreground";
  return (
    <div className={`num mt-0.5 flex items-center text-caption ${cls}`}>
      {up ? (
        <ArrowUpRight className="size-3" />
      ) : v < 0 ? (
        <ArrowDownRight className="size-3" />
      ) : null}
      {up ? "+" : ""}
      {v}
      {suffix}
    </div>
  );
}
