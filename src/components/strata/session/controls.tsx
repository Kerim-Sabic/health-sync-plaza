import { useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Delete, Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { exitTween, press, spring, tween } from "@/lib/motion";
import { feedback } from "@/lib/feedback";
import { sound } from "../session-extras";
import { useRepeat } from "./logic";

/** In-session bottom card (the session is its own full-screen layer, so it hosts its own sheets). */
export function BottomCard({
  open,
  onClose,
  title,
  children,
  tall,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  tall?: boolean;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="bc"
          className="absolute inset-0 z-30 flex flex-col justify-end bg-scrim"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: exitTween("base") }}
          transition={tween("base")}
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-label={title}
            onClick={(e) => e.stopPropagation()}
            drag="y"
            dragListener={!tall}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.04, bottom: 0.6 }}
            onDragEnd={(_, i) => (i.offset.y > 80 || i.velocity.y > 600) && onClose()}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%", transition: { duration: 0.22, ease: [0.4, 0, 1, 1] } }}
            transition={spring.smooth}
            className={cn(
              "elev-3 pb-safe flex flex-col rounded-t-sheet border-b-0 px-5 pb-6 pt-2.5",
              tall ? "h-[88%]" : "max-h-[92%]",
            )}
          >
            <div
              aria-hidden
              className="mx-auto mb-4 h-[5px] w-10 shrink-0 rounded-full bg-surface-3"
            />
            <h3 className="mb-5 shrink-0 font-display text-title font-bold">{title}</h3>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export const SheetBtn = ({
  children,
  onClick,
  tone = "plain",
  disabled,
  icon,
}: {
  children: ReactNode;
  onClick: () => void;
  tone?: "plain" | "primary" | "danger";
  disabled?: boolean;
  icon?: ReactNode;
}) => (
  <motion.button
    type="button"
    whileTap={disabled ? {} : press.button}
    disabled={disabled}
    onClick={() => (tone === "primary" ? feedback.impactLight() : feedback.selection(), onClick())}
    className={cn(
      "flex h-14 w-full items-center justify-center gap-2 rounded-full font-semibold transition-[filter,background-color] duration-200 disabled:opacity-50",
      tone === "primary"
        ? "bg-volt-gradient text-primary-foreground hover-device:brightness-105"
        : tone === "danger"
          ? "bg-destructive/12 text-destructive hover-device:bg-destructive/18"
          : "bg-surface-2 hover-device:bg-surface-3",
    )}
  >
    {icon}
    {children}
  </motion.button>
);

export function NoteEditor({
  value,
  onChange,
  onSave,
  placeholder = "e.g. Felt the left knee, use belt next time",
}: {
  value: string;
  onChange: (v: string) => void;
  onSave: () => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-3">
      <textarea
        autoFocus
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={200}
        rows={3}
        placeholder={placeholder}
        aria-label="Note"
        className="w-full rounded-tile border border-input bg-surface p-3.5 text-body outline-none transition-colors focus:border-volt/60"
      />
      <SheetBtn tone="primary" onClick={onSave}>
        Save note
      </SheetBtn>
    </div>
  );
}

export function Stepper({
  label,
  value,
  step,
  onChange,
  unit,
  onValueTap,
}: {
  label: string;
  value: number;
  step: number;
  onChange: (n: number) => void;
  unit: string;
  onValueTap?: () => void;
}) {
  const v = useRef(value);
  v.current = value;
  const bump = (d: number) => {
    const n = Math.max(0, +(v.current + d).toFixed(2));
    v.current = n;
    onChange(n);
    feedback.selection();
    sound.tick();
  };
  const dec = useRepeat(() => bump(-step));
  const inc = useRepeat(() => bump(step));
  return (
    <div className="flex-1">
      <div className="eyebrow mb-2 text-center">{label}</div>
      <div className="flex items-center gap-1.5">
        <motion.button
          type="button"
          whileTap={press.icon}
          aria-label={`Decrease ${label}`}
          {...dec}
          className="grid size-12 touch-none select-none place-items-center rounded-full bg-surface-3"
        >
          <Minus className="size-5" strokeWidth={2} />
        </motion.button>
        <button
          type="button"
          disabled={!onValueTap}
          onClick={onValueTap}
          aria-label={onValueTap ? `${value} ${unit || label}, type a value` : undefined}
          className={cn(
            "num min-h-[48px] min-w-0 flex-1 rounded-tile text-center text-title-l font-semibold transition-colors",
            onValueTap && "hover-device:bg-surface-2",
          )}
        >
          {value}
          {unit && <span className="unit">{unit}</span>}
        </button>
        <motion.button
          type="button"
          whileTap={press.icon}
          aria-label={`Increase ${label}`}
          {...inc}
          className="grid size-12 touch-none select-none place-items-center rounded-full bg-surface-3"
        >
          <Plus className="size-5" strokeWidth={2} />
        </motion.button>
      </div>
    </div>
  );
}

/** Custom numeric keypad: big thumb-sized keys plus quick nudges, so the system keyboard never appears. */
export function Keypad({
  initial,
  unit,
  onDone,
  onPlates,
}: {
  initial: number;
  unit: string;
  onDone: (n: number) => void;
  onPlates?: () => void;
}) {
  const [txt, setTxt] = useState(String(initial));
  const [fresh, setFresh] = useState(true);
  const isKg = unit === "kg";
  const key = (k: string) => {
    feedback.selection();
    if (k === "back") return (setTxt((t) => (fresh ? "" : t.slice(0, -1))), setFresh(false));
    setTxt((t) => {
      const base = fresh ? "" : t;
      if (k === "." && (base.includes(".") || !isKg)) return base;
      const n = base + k;
      return n.length > 6 ? base : n;
    });
    setFresh(false);
  };
  const nudge = (d: number) => {
    feedback.selection();
    setTxt((t) => String(Math.max(0, +((Number(t) || 0) + d).toFixed(2))));
    setFresh(false);
  };
  const val = Math.max(0, Number(txt) || 0);
  const steps = isKg ? [-5, -2.5, 2.5, 5] : [-2, -1, 1, 2];
  return (
    <div>
      <div className="num mb-5 text-center text-display font-semibold" aria-live="polite">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={txt || "0"}
            initial={{ opacity: 0.4, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={spring.snappy}
            className="inline-block"
          >
            {txt || "0"}
          </motion.span>
        </AnimatePresence>
        <span className="unit">{unit}</span>
      </div>
      <div className="mb-3 grid grid-cols-4 gap-2">
        {steps.map((d) => (
          <motion.button
            key={d}
            type="button"
            whileTap={press.icon}
            onClick={() => nudge(d)}
            className="num h-11 rounded-full bg-surface-2 text-label font-semibold text-muted-foreground hover-device:bg-surface-3"
          >
            {d > 0 ? "+" : "−"}
            {Math.abs(d)}
          </motion.button>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9", isKg ? "." : "", "0", "back"].map((k, i) =>
          k ? (
            <motion.button
              key={i}
              type="button"
              whileTap={press.icon}
              onClick={() => key(k)}
              aria-label={k === "back" ? "Delete digit" : k}
              className="num grid h-[60px] place-items-center rounded-tile bg-surface-2 text-title font-semibold transition-colors hover-device:bg-surface-3"
            >
              {k === "back" ? <Delete className="size-5" strokeWidth={1.75} /> : k}
            </motion.button>
          ) : (
            <span key={i} />
          ),
        )}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {onPlates ? <SheetBtn onClick={onPlates}>Plates</SheetBtn> : <span />}
        <SheetBtn
          tone="primary"
          onClick={() => onDone(isKg ? Math.round(val * 4) / 4 : Math.round(val))}
        >
          Done
        </SheetBtn>
      </div>
    </div>
  );
}
