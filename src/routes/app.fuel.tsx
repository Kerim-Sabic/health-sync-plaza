import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { addDays, format } from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Copy,
  Check,
  Loader2,
  Utensils,
  RotateCcw,
} from "lucide-react";
import { motion, AnimatePresence, useMotionValue, useTransform } from "motion/react";
import { toast } from "sonner";
import { useAct, useApi, useLog, useMe } from "@/lib/api";
import {
  ErrorState,
  IconButton,
  NumberTicker,
  PageHeader,
  SectionTitle,
  Skeleton,
} from "@/components/strata/ui";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { FoodSheet, Sheet } from "@/components/strata/sheets";
import { FuelWater } from "@/components/strata/fuel-water";
import { FUEL_TARGET as TARGET, MEALS, copyFood, recentFoods, type FoodDraft } from "@/lib/fuel";
import { iso, macrosFor, today } from "@/lib/stats";
import { dur, ease, exitTween, press, spring, useIntro } from "@/lib/motion";
import { feedback } from "@/lib/feedback";
import { cn } from "@/lib/utils";
import type { FoodLog } from "@/lib/types";

export const Route = createFileRoute("/app/fuel")({
  head: () => ({
    meta: [
      { title: "Fuel — Kinra" },
      { name: "description", content: "Track meals, daily nutrition and hydration in Kinra." },
      { property: "og:title", content: "Fuel — Kinra" },
      {
        property: "og:description",
        content: "Track meals, daily nutrition and hydration in Kinra.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Fuel,
});

/** Three concentric macro rings around the calories left for the day. */
function MacroRings({
  protein,
  carbs,
  fat,
  left,
}: {
  protein: number;
  carbs: number;
  fat: number;
  left: number;
}) {
  const intro = useIntro();
  const size = 188;
  const rings = [
    { v: protein / TARGET.protein, color: "var(--ember)", r: 86 },
    { v: carbs / TARGET.carbs, color: "var(--ember-2)", r: 72 },
    { v: fat / TARGET.fat, color: "var(--ember-3)", r: 58 },
  ];
  return (
    <div
      className="relative grid shrink-0 place-items-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        {rings.map((ring, i) => {
          const c = 2 * Math.PI * ring.r;
          const v = Math.max(0, Math.min(1, ring.v));
          return (
            <g key={i}>
              <circle
                cx={size / 2}
                cy={size / 2}
                r={ring.r}
                stroke="var(--surface-2)"
                strokeWidth={9}
                fill="none"
              />
              <motion.circle
                cx={size / 2}
                cy={size / 2}
                r={ring.r}
                stroke={ring.color}
                strokeWidth={9}
                strokeLinecap="round"
                fill="none"
                strokeDasharray={c}
                initial={intro ? { strokeDashoffset: c } : false}
                animate={{ strokeDashoffset: c * (1 - v), opacity: v > 0 ? 1 : 0 }}
                transition={{
                  duration: intro ? dur.cinematic : dur.slow,
                  delay: intro ? 0.1 + i * 0.08 : 0,
                  ease: ease.out,
                }}
              />
            </g>
          );
        })}
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <div className="num text-title-l font-semibold leading-none">
            <NumberTicker value={Math.abs(left)} />
          </div>
          <div className="mt-1.5 text-caption text-muted-foreground">
            {left >= 0 ? "kcal left" : "kcal over"}
          </div>
        </div>
      </div>
    </div>
  );
}

function FoodRow({ f }: { f: FoodLog }) {
  const del = useAct((api, id: string) => api.remove("nutrition_logs", id));
  const undo = useAct((api, row: FoodLog) =>
    api.insert("nutrition_logs", copyFood(row, row.log_date)),
  );
  const x = useMotionValue(0);
  const reveal = useTransform(x, [-120, -12, 0], [1, 0.45, 0]);
  const armed = useRef(false);
  const remove = () => {
    if (del.isPending) return;
    feedback.impactMedium();
    del.mutate(f.id, {
      onSuccess: () =>
        toast(`Removed ${f.name}`, {
          action: {
            label: "Undo",
            onClick: () =>
              undo.mutate(f, {
                onError: () => toast.error("Couldn't restore this food. Try again."),
              }),
          },
        }),
      onError: () => toast.error("Couldn't remove this food. Your entry is still saved."),
    });
  };
  return (
    <div className="relative overflow-hidden">
      <motion.div
        style={{ opacity: reveal }}
        className="absolute inset-0 flex items-center justify-end bg-destructive/20 pr-5 text-destructive"
        aria-hidden
      >
        <Trash2 className="size-5" />
      </motion.div>
      <motion.div
        style={{ x }}
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={{ left: 0.6, right: 0 }}
        dragDirectionLock
        onDrag={(_, i) => {
          const over = i.offset.x < -100;
          if (over !== armed.current) {
            armed.current = over;
            feedback.selection();
          }
        }}
        onDragEnd={(_, i) => {
          armed.current = false;
          if (i.offset.x < -100) remove();
        }}
        className="relative flex min-h-[64px] touch-pan-y items-center gap-3 bg-surface px-4 py-3"
      >
        <div className="min-w-0 flex-1">
          <div className="break-words text-body font-semibold">{f.name}</div>
          <div className="num mt-0.5 text-caption text-faint">
            P {f.protein} · C {f.carbs} · F {f.fat}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <span className="num text-label font-semibold">{f.calories}</span>
          <span className="unit">kcal</span>
        </div>
        <button
          type="button"
          className="-mr-2 grid size-10 shrink-0 place-items-center rounded-full text-faint transition-colors hover-device:bg-surface-2 hover-device:text-destructive"
          aria-label={`Delete ${f.name}`}
          disabled={del.isPending}
          onClick={remove}
        >
          <Trash2 className="size-4" />
        </button>
      </motion.div>
    </div>
  );
}

function Fuel() {
  const me = useMe().data;
  const api = useApi();
  const q = useLog("nutrition_logs", me?.id);
  const food = q.data ?? [];
  const [date, setDate] = useState(today());
  const [dir, setDir] = useState(0);
  const [entry, setEntry] = useState<{ meal: string; food?: FoodDraft } | null>(null);
  const [repeatOpen, setRepeatOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [repeatError, setRepeatError] = useState<string | null>(null);
  const completed = useRef(new Set<string>());
  const m = macrosFor(food, date);
  const items = food.filter((f) => f.log_date === date);
  const previousDate = iso(addDays(new Date(date + "T12:00"), -1));
  const previous = food.filter((f) => f.log_date === previousDate);
  const suggestions = recentFoods(food, date);
  const shift = (n: number) => (
    feedback.selection(),
    setDir(n),
    setDate(iso(addDays(new Date(date + "T12:00"), n)))
  );
  const left = TARGET.calories - m.calories;
  const repeat = useAct(async (api) => {
    let added = 0;
    try {
      for (const row of previous.filter((f) => selected.includes(f.id))) {
        if (completed.current.has(row.id)) continue;
        await api.insert("nutrition_logs", copyFood(row, date));
        completed.current.add(row.id);
        added++;
      }
    } finally {
      if (added) await q.refetch();
    }
  });
  const openRepeat = () => {
    setSelected(previous.map((f) => f.id));
    completed.current.clear();
    setRepeatError(null);
    setRepeatOpen(true);
  };
  if (!me) return null;

  return (
    <div className="min-w-0">
      <PageHeader eyebrow="Nourish your day" title="Fuel" />
      <div className="mb-6 flex items-center justify-between">
        <IconButton label="Previous day" onClick={() => shift(-1)} className="bg-transparent">
          <ChevronLeft className="size-5" />
        </IconButton>
        <AnimatePresence mode="popLayout" initial={false} custom={dir}>
          <motion.div
            key={date}
            initial={{ opacity: 0, x: dir * 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: dir * -16, transition: exitTween("fast") }}
            transition={spring.smooth}
            className="text-center"
          >
            <div className="font-display text-title font-bold">
              {date === today() ? "Today" : format(new Date(date + "T12:00"), "EEEE")}
            </div>
            <div className="mt-0.5 text-caption text-faint">
              {format(new Date(date + "T12:00"), "d MMMM yyyy")}
            </div>
          </motion.div>
        </AnimatePresence>
        <IconButton
          label="Next day"
          onClick={() => date !== today() && shift(1)}
          className={cn("bg-transparent", date === today() && "pointer-events-none opacity-30")}
        >
          <ChevronRight className="size-5" />
        </IconButton>
      </div>
      {q.isLoading ? (
        <div aria-busy="true" aria-label="Loading nutrition">
          <Skeleton className="h-60 !rounded-card" />
          {MEALS.map((meal) => (
            <Skeleton key={meal} className="mt-3 h-24 !rounded-card" />
          ))}
        </div>
      ) : q.error ? (
        <ErrorState
          message="Your nutrition entries couldn't load. They're still saved."
          onRetry={() => q.refetch()}
        />
      ) : (
        <>
          <section aria-label="Daily nutrition" className="panel p-5">
            <div className="flex flex-wrap items-center justify-center gap-6">
              <MacroRings protein={m.protein} carbs={m.carbs} fat={m.fat} left={left} />
              <div className="min-w-40 flex-1 space-y-4">
                {(
                  [
                    ["Protein", m.protein, TARGET.protein, "bg-ember"],
                    ["Carbs", m.carbs, TARGET.carbs, "bg-ember-2"],
                    ["Fat", m.fat, TARGET.fat, "bg-ember-3"],
                  ] as const
                ).map(([label, value, target, tone]) => (
                  <div key={label} className="flex items-center gap-3">
                    <span className={cn("size-2.5 shrink-0 rounded-full", tone)} aria-hidden />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-label font-semibold">{label}</span>
                        <span className="num text-label">
                          {value}
                          <span className="text-faint">/{target} g</span>
                        </span>
                      </div>
                      <div className="text-caption text-faint">
                        {target >= value ? `${target - value} g to go` : `${value - target} g over`}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="num mt-5 border-t border-hairline pt-4 text-center text-caption text-faint">
              {m.calories.toLocaleString()} of {TARGET.calories.toLocaleString()} kcal eaten
            </div>
          </section>

          <div className="mt-8 flex items-center justify-between gap-3">
            <h2 className="font-sans text-body font-bold [font-stretch:100%]">Meals</h2>
            <Button
              variant="secondary"
              className="h-10 rounded-full px-4 text-label font-semibold"
              disabled={!previous.length}
              onClick={openRepeat}
            >
              <RotateCcw /> {date === today() ? "Repeat yesterday" : "Repeat previous day"}
            </Button>
          </div>
          <div className="mt-3 space-y-3">
            {MEALS.map((meal) => {
              const list = items.filter((i) => i.meal === meal);
              const kcal = list.reduce((sum, row) => sum + row.calories, 0);
              return (
                <section
                  key={meal}
                  aria-label={`${meal} entries`}
                  className="panel overflow-hidden p-0"
                >
                  <div className="flex items-center justify-between gap-3 px-4 pb-2 pt-3.5">
                    <div>
                      <h3 className="font-sans text-label font-bold [font-stretch:100%]">{meal}</h3>
                      <div className={cn("text-caption text-faint", list.length && "num")}>
                        {list.length ? `${kcal.toLocaleString()} kcal` : "Nothing logged yet"}
                      </div>
                    </div>
                    <motion.button
                      whileTap={press.icon}
                      type="button"
                      aria-label={`Add to ${meal}`}
                      onClick={() => (feedback.impactLight(), setEntry({ meal }))}
                      className="grid size-10 place-items-center rounded-full bg-surface-2 text-foreground transition-colors hover-device:bg-surface-3"
                    >
                      <Plus className="size-5" />
                    </motion.button>
                  </div>
                  <AnimatePresence initial={false}>
                    {list.map((f) => (
                      <motion.div
                        key={f.id}
                        layout
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -24, transition: exitTween("base") }}
                        transition={spring.smooth}
                        className="border-t border-hairline"
                      >
                        <FoodRow f={f} />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  {!list.length && <div className="h-2" />}
                </section>
              );
            })}
          </div>

          {suggestions.length > 0 && (
            <section aria-label="Recent food suggestions">
              <SectionTitle>Log again</SectionTitle>
              <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 pb-1 lg:-mx-8 lg:px-8">
                {suggestions.map((f) => (
                  <motion.button
                    whileTap={press.card}
                    type="button"
                    key={f.id}
                    onClick={() => (
                      feedback.selection(),
                      setEntry({ meal: f.meal, food: copyFood(f, date) })
                    )}
                    aria-label={`Log ${f.name} again`}
                    className="panel w-[200px] shrink-0 p-4 text-left transition-[filter] hover-device:brightness-110"
                  >
                    <Utensils className="size-4 text-ember" strokeWidth={1.9} />
                    <div className="mt-3 line-clamp-2 text-label font-semibold">{f.name}</div>
                    <div className="mt-1 text-caption text-faint">
                      {f.calories} kcal · {f.protein} g protein
                    </div>
                  </motion.button>
                ))}
              </div>
            </section>
          )}
          <FuelWater
            key={`${api.mode}:${me.id}:${date}`}
            date={date}
            owner={`${api.mode}:${me.id}`}
          />
        </>
      )}
      {entry && (
        <FoodSheet
          open
          date={date}
          meal={entry.meal}
          {...(entry.food ? { initialFood: entry.food } : {})}
          onOpenChange={(open) => {
            if (!open) setEntry(null);
          }}
        />
      )}
      <Sheet
        open={repeatOpen}
        onOpenChange={(open) => {
          if (!repeat.isPending) setRepeatOpen(open);
        }}
        title="Repeat meals"
        sub={`From ${format(new Date(previousDate + "T12:00"), "d MMM")} to ${format(new Date(date + "T12:00"), "d MMM")}`}
      >
        <p className="mb-4 text-label text-muted-foreground">
          Selected entries are added as new meals. Your existing entries stay unchanged.
        </p>
        <div className="overflow-hidden rounded-card border border-hairline bg-surface">
          {previous.map((f, i) => (
            <label
              key={f.id}
              className={cn(
                "flex min-h-16 items-center gap-3 p-4",
                i > 0 && "border-t border-hairline",
              )}
            >
              <Checkbox
                disabled={repeat.isPending || completed.current.has(f.id)}
                checked={selected.includes(f.id)}
                onCheckedChange={(checked) =>
                  setSelected((prev) =>
                    checked ? [...prev, f.id] : prev.filter((id) => id !== f.id),
                  )
                }
              />
              <span className="min-w-0 flex-1">
                <span className="block text-label font-semibold">{f.name}</span>
                <span className="num text-caption text-faint">
                  {f.meal} · {f.calories} kcal
                </span>
              </span>
              {completed.current.has(f.id) && <Check className="size-4 text-volt" />}
            </label>
          ))}
        </div>
        {repeatError && (
          <p role="alert" className="mt-4 text-label text-destructive">
            {repeatError}
          </p>
        )}
        <Button
          className="mt-5 h-14 w-full rounded-full text-body"
          variant="volt"
          disabled={!selected.length || repeat.isPending}
          onClick={() => {
            setRepeatError(null);
            repeat.mutate(undefined, {
              onSuccess: () => {
                setRepeatOpen(false);
                feedback.success();
                toast.success("Meals added. Original entries unchanged.");
              },
              onError: () =>
                setRepeatError(
                  "Some entries couldn't be added. Retry to add only the remaining meals.",
                ),
            });
          }}
        >
          {repeat.isPending ? <Loader2 className="animate-spin" /> : <Copy />}
          {repeat.isPending
            ? "Adding meals…"
            : repeatError
              ? "Retry remaining meals"
              : `Add ${selected.length} ${selected.length === 1 ? "entry" : "entries"}`}
        </Button>
      </Sheet>
    </div>
  );
}
