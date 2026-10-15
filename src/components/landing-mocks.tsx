import { Check, Play, Trophy } from "lucide-react";
import { Ring } from "@/components/strata/ui";

/** Static, lightweight previews of real Kinra screens for the landing page phone. */
const Eyebrow = ({ children }: { children: string }) => (
  <div className="text-[10px] font-bold uppercase tracking-[0.08em] text-faint">{children}</div>
);

export function TodayMock() {
  return (
    <div className="flex h-full flex-col gap-3 bg-background px-4 pt-12 text-left">
      <Eyebrow>Wednesday 14 October</Eyebrow>
      <div className="-mt-1 font-display text-[22px] font-extrabold leading-tight">
        Good morning, Maya
      </div>
      <div className="panel overflow-hidden p-0">
        <div className="flex items-center gap-4 p-4">
          <Ring value={0.86} size={72} stroke={6}>
            <div className="num text-[22px] font-semibold">86</div>
          </Ring>
          <div>
            <div className="font-display text-[15px] font-bold">Recovery is strong</div>
            <div className="text-[12px] text-muted-foreground">
              A good day to push your top set.
            </div>
          </div>
        </div>
        <div className="mx-4 h-px bg-hairline" />
        <div className="p-4">
          <Eyebrow>Foundations · Week 3 of 6</Eyebrow>
          <div className="mt-2 flex gap-1">
            {[1, 1, 0, 0, 0, 0].map((x, i) => (
              <span
                key={i}
                className={`h-1 flex-1 rounded-full ${x ? "bg-foreground" : i === 2 ? "bg-volt" : "bg-surface-3"}`}
              />
            ))}
          </div>
          <div className="mt-3 font-display text-[15px] font-bold">Day B · Hinge focus</div>
          <div className="mt-3 flex h-10 items-center justify-center gap-2 rounded-full bg-volt-gradient text-[13px] font-semibold text-primary-foreground">
            <Play className="size-3.5" fill="currentColor" /> Start session
          </div>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {[
          ["1.6k", "kcal", 0.7, "var(--ember)"],
          ["118", "g", 0.84, "var(--ember-2)"],
          ["1.5", "L", 0.75, "var(--pulse)"],
          ["7.8", "h", 0.97, "var(--dream)"],
        ].map(([v, u, p, c]) => (
          <div key={u as string} className="panel flex flex-col items-center px-1 py-2.5">
            <Ring value={p as number} size={34} stroke={3} color={c as string}>
              <span />
            </Ring>
            <div className="num mt-1.5 text-[11px] font-semibold">
              {v}
              <span className="text-faint"> {u}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="panel p-3.5">
        <div className="flex items-center gap-2">
          <span className="grid size-6 place-items-center rounded-full bg-surface-3 text-[9px] font-bold">
            RV
          </span>
          <span className="text-[11px] font-semibold">Rio · your coach</span>
        </div>
        <p className="mt-2 text-[12px] leading-relaxed">
          Great bracing on squats this week. Next: add 2.5 kg to top sets.
        </p>
      </div>
    </div>
  );
}

export function SessionMock() {
  return (
    <div className="flex h-full flex-col bg-background pt-10 text-left">
      <div className="mx-auto mb-2 flex h-8 items-center gap-2 rounded-full bg-surface-pop px-3 shadow-2 ring-1 ring-hairline-strong">
        <Ring value={0.62} size={16} stroke={2.5}>
          <span />
        </Ring>
        <span className="num text-[12px] font-semibold">1:12</span>
      </div>
      <div className="border-b border-hairline px-4 pb-3 text-center">
        <div className="text-[11px] font-semibold text-muted-foreground">Day B · Hinge focus</div>
        <div className="num text-[26px] font-semibold leading-none">24:08</div>
      </div>
      <div className="flex gap-1.5 px-3 py-2.5">
        <span className="rounded-full bg-surface-2 px-2.5 py-1 text-[10px] font-semibold ring-1 ring-hairline-strong">
          <Check className="mr-1 inline size-2.5 text-volt" />
          Deadlift
        </span>
        <span className="rounded-full px-2.5 py-1 text-[10px] font-semibold text-faint">
          2/4 Overhead press
        </span>
      </div>
      <div className="mx-3 panel p-3">
        <div className="font-display text-[15px] font-bold">Overhead Press</div>
        <div className="num text-[10px] text-muted-foreground">Last time 4 × 6 @ 40 kg</div>
        <div className="mt-2 inline-flex rounded-full border border-volt/35 px-2.5 py-1 text-[11px] font-semibold text-volt">
          Try 42.5 kg × 6
        </div>
        {[
          [1, "42.5", 6, true],
          [2, "42.5", 6, true],
          [3, "42.5", 6, false],
          [4, "42.5", 6, false],
        ].map(([n, kg, r, done]) => (
          <div
            key={n as number}
            className={`mt-1.5 grid grid-cols-[20px_1fr_1fr_28px] items-center gap-1 rounded-[10px] px-1.5 py-1.5 ${done ? "bg-volt/12" : n === 3 ? "bg-surface-2" : ""}`}
          >
            <span className={`num text-[11px] font-semibold ${done ? "text-volt" : "text-faint"}`}>
              {n}
            </span>
            <span className="num text-center text-[14px] font-semibold">{kg}</span>
            <span className="num text-center text-[14px] font-semibold">{r}</span>
            <span
              className={`grid size-6 place-items-center rounded-full ${done ? "bg-volt text-primary-foreground" : "bg-surface-3 text-faint"}`}
            >
              <Check className="size-3" strokeWidth={3} />
            </span>
          </div>
        ))}
      </div>
      <div className="mx-3 mt-3 flex items-center gap-3 rounded-card bg-volt/[0.08] p-3 ring-1 ring-volt/25">
        <Trophy className="size-4 text-volt" />
        <div className="text-[12px]">
          <span className="font-semibold">Personal record</span>{" "}
          <span className="num text-volt">92.5 kg</span> deadlift
        </div>
      </div>
    </div>
  );
}

export function ProgressMock() {
  const pts = [64.2, 64, 63.9, 64.1, 63.7, 63.5, 63.6, 63.2, 63.1, 62.8, 62.9, 62.6];
  const min = 62.4,
    max = 64.4;
  const d = pts
    .map(
      (v, i) =>
        `${i ? "L" : "M"}${(i / (pts.length - 1)) * 220} ${8 + (1 - (v - min) / (max - min)) * 84}`,
    )
    .join(" ");
  return (
    <div className="flex h-full flex-col gap-3 bg-background px-4 pt-12 text-left">
      <div className="font-display text-[22px] font-extrabold">Progress</div>
      <div className="relative overflow-hidden rounded-card border border-hairline-strong bg-[radial-gradient(120%_140%_at_0%_0%,color-mix(in_oklab,var(--volt)_16%,transparent),transparent_55%),var(--gradient-surface)] p-4">
        <Eyebrow>9 Oct – 15 Oct</Eyebrow>
        <div className="mt-1.5 font-display text-[15px] font-bold">Your week in review</div>
        <div className="text-[11px] text-muted-foreground">5 sessions · 10.6 t · 7.4 h sleep</div>
      </div>
      <div className="panel p-4">
        <Eyebrow>7-day average</Eyebrow>
        <div className="num mt-1 text-[30px] font-semibold leading-none">
          62.6<span className="unit">kg</span>
        </div>
        <svg viewBox="0 0 220 100" className="mt-3 h-24 w-full overflow-visible" aria-hidden>
          <defs>
            <linearGradient id="pm" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="var(--pulse)" stopOpacity=".25" />
              <stop offset="1" stopColor="var(--pulse)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={`${d} L220 100 L0 100 Z`} fill="url(#pm)" />
          <path d={d} fill="none" stroke="var(--pulse)" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {["First session", "Building momentum"].map((m) => (
          <div key={m} className="panel shine p-3">
            <Trophy className="size-4 text-volt" />
            <div className="mt-2 text-[12px] font-semibold">{m}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CoachMock() {
  const rows = [
    ["MC", "Maya Chen", "Check-in waiting for your reply", 1, "var(--volt)"],
    ["JB", "Jordan Blake", "No session in 4 days", 0.62, "var(--ember)"],
    ["PN", "Priya Nair", "New record: bench 47.5 kg", 0.9, "var(--volt)"],
  ] as const;
  return (
    <div className="flex h-full flex-col gap-3 bg-background px-4 pt-12 text-left">
      <Eyebrow>Thursday 15 October</Eyebrow>
      <div className="-mt-1 font-display text-[22px] font-extrabold leading-tight">
        Good morning, Rio
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {[
          ["Active", "5/5"],
          ["Adherence", "88%"],
          ["Need you", "2"],
        ].map(([l, v]) => (
          <div key={l} className="panel p-2.5">
            <div className="text-[10px] font-semibold text-muted-foreground">{l}</div>
            <div
              className={`num mt-1 text-[17px] font-semibold ${l === "Need you" ? "text-ember" : ""}`}
            >
              {v}
            </div>
          </div>
        ))}
      </div>
      <div className="text-[13px] font-bold">Needs your attention</div>
      {rows.map(([i, n, r, p, c]) => (
        <div key={n} className="panel flex items-center gap-2.5 p-2.5">
          <Ring value={p} size={36} stroke={2.5} color={c}>
            <span className="grid size-7 place-items-center rounded-full bg-surface-3 text-[9px] font-bold">
              {i}
            </span>
          </Ring>
          <div className="min-w-0">
            <div className="text-[12px] font-semibold">{n}</div>
            <div
              className={`truncate text-[10.5px] ${r.startsWith("New") ? "text-volt" : "text-ember"}`}
            >
              {r}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
