import { useState, type ReactNode } from "react";
import { Drawer, DrawerContent, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { IconScale, SaveButton, type ScaleOption } from "./ui";
import { useAct } from "@/lib/api";
import { toast } from "sonner";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { MEALS, type FoodDraft } from "@/lib/fuel";
import { FoodBarcode } from "./food-barcode";
import {
  Dumbbell,
  Utensils,
  Moon,
  NotebookPen,
  Scale as ScaleIcon,
  ScanBarcode,
  Frown,
  Annoyed,
  Meh,
  Smile,
  Laugh,
  BatteryLow,
  BatteryMedium,
  BatteryFull,
  Battery,
  Zap,
} from "lucide-react";

export const moodOptions: ScaleOption[] = [
  { icon: Frown, label: "Awful" },
  { icon: Annoyed, label: "Low" },
  { icon: Meh, label: "Okay" },
  { icon: Smile, label: "Good" },
  { icon: Laugh, label: "Great" },
];
export const energyOptions: ScaleOption[] = [
  { icon: Battery, label: "Drained" },
  { icon: BatteryLow, label: "Low" },
  { icon: BatteryMedium, label: "Steady" },
  { icon: BatteryFull, label: "High" },
  { icon: Zap, label: "Wired" },
];
export const sleepQualityOptions: ScaleOption[] = [
  { icon: Frown, label: "Terrible" },
  { icon: Annoyed, label: "Restless" },
  { icon: Meh, label: "Fair" },
  { icon: Smile, label: "Restful" },
  { icon: Laugh, label: "Deep" },
];

export function Sheet({
  open,
  onOpenChange,
  title,
  sub,
  children,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  sub?: string;
  children: ReactNode;
}) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="mx-auto max-h-[92dvh] max-w-md border-border bg-popover">
        <div className="pb-safe overflow-y-auto px-5 pt-2">
          <DrawerTitle className="font-display text-title-l font-extrabold">{title}</DrawerTitle>
          <DrawerDescription className="mb-5 mt-1 text-label text-muted-foreground">
            {sub ?? " "}
          </DrawerDescription>
          {children}
          <div className="h-4" />
        </div>
      </DrawerContent>
    </Drawer>
  );
}

const Field = ({ label, children }: { label: string; children: ReactNode }) => (
  <label className="mb-5 block">
    <div className="eyebrow mb-2">{label}</div>
    {children}
  </label>
);

type SheetProps = { open: boolean; onOpenChange: (o: boolean) => void };
const fail = (e: unknown) => {
  toast.error((e as Error).message);
  throw e;
};

const quickFoods = [
  { name: "Protein shake", calories: 160, protein: 30, carbs: 5, fat: 2 },
  { name: "Chicken & rice", calories: 620, protein: 48, carbs: 70, fat: 12 },
  { name: "Banana", calories: 105, protein: 1, carbs: 27, fat: 0 },
  { name: "3 eggs", calories: 215, protein: 18, carbs: 1, fat: 15 },
];

export function FoodSheet({
  open,
  onOpenChange,
  meal: initialMeal,
  date,
  initialFood,
}: SheetProps & { meal?: string | undefined; date?: string; initialFood?: FoodDraft }) {
  const [scanning, setScanning] = useState(false);
  const [meal, setMeal] = useState(initialFood?.meal ?? initialMeal ?? "Lunch");
  const [f, setF] = useState(
    initialFood
      ? {
          name: initialFood.name,
          calories: initialFood.calories,
          protein: initialFood.protein,
          carbs: initialFood.carbs,
          fat: initialFood.fat,
        }
      : { name: "", calories: 0, protein: 0, carbs: 0, fat: 0 },
  );
  const save = useAct((api) =>
    api.insert("nutrition_logs", { meal, ...f, ...(date ? { log_date: date } : {}) }),
  );
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="Log food"
      sub={
        date
          ? `For ${new Date(date + "T12:00").toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}`
          : "Your daily nutrition."
      }
    >
      {scanning ? (
        <FoodBarcode
          onClose={() => setScanning(false)}
          onUse={(food) => {
            setF(food);
            setScanning(false);
          }}
        />
      ) : (
        <Button
          variant="glass"
          className="mb-5 h-12 w-full text-body"
          onClick={() => setScanning(true)}
        >
          <ScanBarcode />
          Scan food barcode
        </Button>
      )}
      <div className="mb-5 grid grid-cols-2 gap-2">
        {MEALS.map((m) => (
          <Button
            variant="glass"
            key={m}
            aria-pressed={meal === m}
            onClick={() => setMeal(m)}
            className={`h-11 text-label ${meal === m ? "border-ember bg-ember/10 text-ember" : ""}`}
          >
            {m}
          </Button>
        ))}
      </div>
      <div className="mb-5 grid grid-cols-2 gap-2">
        {quickFoods.map((q) => (
          <motion.button
            key={q.name}
            type="button"
            whileTap={{ scale: 0.97 }}
            onClick={() => setF(q)}
            aria-pressed={f.name === q.name}
            className={`rounded-tile border p-3 text-left ${f.name === q.name ? "border-ember bg-ember/10" : "border-border bg-surface"}`}
          >
            <div className="text-label font-semibold">{q.name}</div>
            <div className="num text-caption text-muted-foreground">
              {q.calories} kcal · {q.protein} g protein
            </div>
          </motion.button>
        ))}
      </div>
      <Field label="Food">
        <Input
          value={f.name}
          onChange={(e) => setF({ ...f, name: e.target.value })}
          placeholder="What did you eat?"
          className="h-12 rounded-tile bg-surface text-body"
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        {(["calories", "protein", "carbs", "fat"] as const).map((k) => (
          <Field key={k} label={k === "calories" ? "kcal" : `${k} g`}>
            <Input
              type="number"
              inputMode="numeric"
              value={f[k]}
              onChange={(e) => setF({ ...f, [k]: +e.target.value })}
              className="num h-12 rounded-tile bg-surface text-center text-body"
            />
          </Field>
        ))}
      </div>
      <SaveButton
        disabled={!f.name}
        onSave={() => save.mutateAsync(undefined).catch(fail)}
        onDone={() => (toast.success(`Added to ${meal.toLowerCase()}`), onOpenChange(false))}
      >
        Add to {meal.toLowerCase()}
      </SaveButton>
    </Sheet>
  );
}

export function SleepSheet({ open, onOpenChange }: SheetProps) {
  const [hours, setHours] = useState(7.5);
  const [quality, setQuality] = useState(4);
  const save = useAct((api) => api.insert("sleep_logs", { hours, quality }));
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Log sleep" sub="Last night's recovery.">
      <div className="num mb-4 text-center text-display font-bold text-dream">
        {hours.toFixed(2).replace(/0$/, "").replace(/\.0$/, "")}
        <span className="text-title text-muted-foreground"> h</span>
      </div>
      <Slider
        aria-label="Hours slept"
        value={[hours]}
        min={3}
        max={12}
        step={0.25}
        onValueChange={(v) => setHours(v[0]!)}
        className="mb-8"
      />
      <div className="mb-6">
        <IconScale
          label="Quality"
          value={quality}
          onChange={setQuality}
          options={sleepQualityOptions}
          tone="text-dream"
        />
      </div>
      <SaveButton
        onSave={() => save.mutateAsync(undefined).catch(fail)}
        onDone={() => (toast.success("Sleep logged"), onOpenChange(false))}
      >
        Save sleep
      </SaveButton>
    </Sheet>
  );
}

export function JournalSheet({ open, onOpenChange }: SheetProps) {
  const [mood, setMood] = useState(4);
  const [energy, setEnergy] = useState(3);
  const [body, setBody] = useState("");
  const save = useAct((api) => api.insert("journal_entries", { mood, energy, body: body || null }));
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Check in" sub="How are you, really?">
      <div className="mb-5">
        <IconScale
          label="Mood"
          value={mood}
          onChange={setMood}
          options={moodOptions}
          tone="text-pulse"
        />
      </div>
      <div className="mb-5">
        <IconScale
          label="Energy"
          value={energy}
          onChange={setEnergy}
          options={energyOptions}
          tone="text-pulse"
        />
      </div>
      <Field label="Journal">
        <Textarea
          rows={4}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Wins, stress, soreness, anything…"
          className="rounded-tile bg-surface text-body"
        />
      </Field>
      <SaveButton
        onSave={() => save.mutateAsync(undefined).catch(fail)}
        onDone={() => (toast.success("Check-in saved"), onOpenChange(false))}
      >
        Save check-in
      </SaveButton>
    </Sheet>
  );
}

export function MetricSheet({ open, onOpenChange }: SheetProps) {
  const [weight, setWeight] = useState<number | "">("");
  const [bf, setBf] = useState<number | "">("");
  const save = useAct((api) =>
    api.insert("body_metrics", {
      weight: weight === "" ? null : weight,
      body_fat: bf === "" ? null : bf,
    }),
  );
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="Weigh-in"
      sub="Same time, same conditions, every time."
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label="Weight · kg">
          <Input
            type="number"
            inputMode="decimal"
            value={weight}
            onChange={(e) => setWeight(e.target.value === "" ? "" : +e.target.value)}
            className="num h-16 rounded-tile bg-surface text-center text-title"
          />
        </Field>
        <Field label="Body fat · %">
          <Input
            type="number"
            inputMode="decimal"
            value={bf}
            onChange={(e) => setBf(e.target.value === "" ? "" : +e.target.value)}
            className="num h-16 rounded-tile bg-surface text-center text-title"
          />
        </Field>
      </div>
      <SaveButton
        disabled={weight === ""}
        onSave={() => save.mutateAsync(undefined).catch(fail)}
        onDone={() => (toast.success("Weigh-in saved"), onOpenChange(false))}
      >
        Save weigh-in
      </SaveButton>
    </Sheet>
  );
}

export type LogKind = "workout" | "food" | "sleep" | "journal" | "metric";
export const logKinds: { kind: LogKind; label: string; icon: typeof Dumbbell; tone: string }[] = [
  { kind: "workout", label: "Workout", icon: Dumbbell, tone: "text-volt" },
  { kind: "food", label: "Food", icon: Utensils, tone: "text-ember" },
  { kind: "sleep", label: "Sleep", icon: Moon, tone: "text-dream" },
  { kind: "journal", label: "Check-in", icon: NotebookPen, tone: "text-pulse" },
  { kind: "metric", label: "Weigh-in", icon: ScaleIcon, tone: "text-foreground" },
];

export function LogSheets({
  kind,
  onClose,
  meal,
}: {
  kind: LogKind | null;
  onClose: () => void;
  meal?: string | undefined;
}) {
  const oc = (o: boolean) => !o && onClose();
  return (
    <>
      {kind === "food" && <FoodSheet open onOpenChange={oc} meal={meal} />}
      {kind === "sleep" && <SleepSheet open onOpenChange={oc} />}
      {kind === "journal" && <JournalSheet open onOpenChange={oc} />}
      {kind === "metric" && <MetricSheet open onOpenChange={oc} />}
    </>
  );
}
