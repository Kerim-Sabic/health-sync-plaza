import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowDown,
  ArrowUp,
  Check,
  ChevronDown,
  Copy,
  Loader2,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useAct, useApi } from "@/lib/api";
import {
  blankDay,
  blankExercise,
  programDraft,
  programError,
  type ProgramDraft,
} from "@/lib/programs";
import type { Program, ProgramDay, ProgramExercise } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { exitTween, spring } from "@/lib/motion";
import { feedback } from "@/lib/feedback";
import { cn } from "@/lib/utils";
import { Sheet } from "./sheets";

const move = <T,>(xs: T[], from: number, to: number) => {
  if (to < 0 || to >= xs.length) return xs;
  const next = [...xs];
  const [x] = next.splice(from, 1);
  next.splice(to, 0, x!);
  return next;
};

export function ProgramBuilder({
  program,
  clientId,
  onClose,
}: {
  program?: Program;
  clientId?: string;
  onClose: () => void;
}) {
  const { mode } = useApi();
  const draftKey = `kinra:program-draft:${mode}:${program?.id ?? (clientId ? `client-${clientId}` : "new")}`;
  const [draft, setDraft] = useState<ProgramDraft>(() => {
    try {
      const saved = localStorage.getItem(draftKey);
      if (saved) return JSON.parse(saved) as ProgramDraft;
    } catch {
      /* fall back to the saved program */
    }
    return programDraft(program);
  });
  const [restored] = useState(() => {
    try {
      return !!localStorage.getItem(draftKey);
    } catch {
      return false;
    }
  });
  const [error, setError] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<number[]>([]);
  const [draftSaved, setDraftSaved] = useState(false);
  const savedId = useRef<string | null>(null);
  const first = useRef(true);
  const qc = useQueryClient();
  const save = useAct(async (api) => {
    if (program) return api.updateProgram(program.id, draft);
    if (!savedId.current) savedId.current = await api.saveProgram(draft);
    if (clientId) await api.assign(savedId.current, clientId);
  });

  useEffect(() => {
    if (restored)
      toast("Restored your unsaved draft", {
        action: {
          label: "Discard",
          onClick: () => (setDraft(programDraft(program)), clearDraft()),
        },
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Autosave the draft on this device so nothing typed is ever lost.
  useEffect(() => {
    if (first.current) return void (first.current = false);
    const t = setTimeout(() => {
      try {
        localStorage.setItem(draftKey, JSON.stringify(draft));
        setDraftSaved(true);
      } catch {
        /* storage full or blocked: the draft lives in memory */
      }
    }, 600);
    setDraftSaved(false);
    return () => clearTimeout(t);
  }, [draft, draftKey]);
  const clearDraft = () => {
    try {
      localStorage.removeItem(draftKey);
    } catch {
      /* nothing stored */
    }
  };

  const updateDay = (i: number, patch: Partial<ProgramDay>) =>
    setDraft((prev) => ({
      ...prev,
      days: prev.days.map((day, index) => (index === i ? { ...day, ...patch } : day)),
    }));
  const updateExercise = (i: number, j: number, patch: Partial<ProgramExercise>) =>
    setDraft((prev) => ({
      ...prev,
      days: prev.days.map((day, index) =>
        index === i
          ? {
              ...day,
              exercises: day.exercises.map((exercise, k) =>
                j === k ? { ...exercise, ...patch } : exercise,
              ),
            }
          : day,
      ),
    }));
  const numeric = (value: string) => (value === "" ? null : Number(value));
  const inputClass = "num h-12 rounded-tile border-hairline-strong bg-surface text-body";
  const toggleDay = (i: number) => (
    feedback.selection(),
    setCollapsed((c) => (c.includes(i) ? c.filter((x) => x !== i) : [...c, i]))
  );

  return (
    <Sheet
      open
      onOpenChange={(open) => {
        if (!open && !save.isPending) onClose();
      }}
      title={program ? "Edit program" : clientId ? "Custom client program" : "New program"}
      sub={
        program
          ? "Changes apply to assigned clients' future sessions. Completed workouts stay unchanged."
          : clientId
            ? "Built for one client and assigned when you save."
            : "Build your next training block."
      }
    >
      <Button
        variant="ghost"
        size="icon"
        className="absolute right-4 top-4 size-11 rounded-full"
        aria-label="Close program editor"
        disabled={save.isPending}
        onClick={onClose}
      >
        <X />
      </Button>
      <fieldset disabled={save.isPending || !!savedId.current} className="min-w-0 space-y-4">
        <label className="block">
          <span className="mb-2 block text-label font-semibold">Program name</span>
          <Input
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            placeholder="e.g. Foundations of Strength"
            className="h-12 rounded-tile border-hairline-strong bg-surface text-body"
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-label font-semibold">Focus for this block</span>
          <Textarea
            value={draft.description ?? ""}
            onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            placeholder="What this block builds, and why"
            className="rounded-tile border-hairline-strong bg-surface text-body"
          />
        </label>
        <label className="flex items-center justify-between gap-3">
          <span className="text-label font-semibold">Weeks</span>
          <Input
            aria-label="Weeks"
            type="number"
            min={1}
            step={1}
            value={draft.weeks || ""}
            onChange={(e) => setDraft({ ...draft, weeks: Number(e.target.value) })}
            className={`${inputClass} w-24 text-center`}
          />
        </label>
        <AnimatePresence initial={false}>
          {draft.days.map((day, i) => {
            const isCollapsed = collapsed.includes(i);
            return (
              <motion.section
                key={`day-${i}`}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, transition: exitTween("fast") }}
                transition={spring.smooth}
                aria-label={`Training day ${i + 1}`}
                className="rounded-card border border-hairline bg-surface/60 p-4"
              >
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggleDay(i)}
                    aria-expanded={!isCollapsed}
                    className="flex min-h-11 min-w-0 flex-1 items-center gap-2 text-left"
                  >
                    <motion.span
                      animate={{ rotate: isCollapsed ? -90 : 0 }}
                      transition={spring.snappy}
                    >
                      <ChevronDown className="size-5 text-faint" />
                    </motion.span>
                    <span className="truncate font-display text-title font-bold">
                      {day.title || `Day ${i + 1}`}
                    </span>
                    <span className="num shrink-0 text-caption text-faint">
                      {day.exercises.length} ex ·{" "}
                      {day.exercises.reduce((a, e) => a + (e.sets || 0), 0)} sets
                    </span>
                  </button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-10 rounded-full text-muted-foreground"
                    aria-label={`Duplicate day ${i + 1}`}
                    onClick={() => (
                      feedback.selection(),
                      setDraft({
                        ...draft,
                        days: [
                          ...draft.days.slice(0, i + 1),
                          { ...structuredClone(day), title: `${day.title} (copy)` },
                          ...draft.days.slice(i + 1),
                        ],
                      })
                    )}
                  >
                    <Copy />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-10 rounded-full text-muted-foreground"
                    aria-label={`Remove day ${i + 1}`}
                    onClick={() => (
                      feedback.impactMedium(),
                      setDraft({ ...draft, days: draft.days.filter((_, index) => index !== i) })
                    )}
                  >
                    <Trash2 />
                  </Button>
                </div>
                {!isCollapsed && (
                  <div className="mt-3">
                    <Input
                      aria-label={`Day ${i + 1} title`}
                      value={day.title}
                      onChange={(e) => updateDay(i, { title: e.target.value })}
                      className="mb-4 h-12 rounded-tile border-hairline-strong bg-surface text-body font-semibold"
                    />
                    <AnimatePresence initial={false}>
                      {day.exercises.map((exercise, j) => (
                        <motion.div
                          key={`${i}-${j}`}
                          layout
                          initial={{ opacity: 0, scale: 0.98 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, transition: exitTween("fast") }}
                          transition={spring.smooth}
                          role="group"
                          aria-label={`Day ${i + 1} exercise ${j + 1}`}
                          className="mb-3 rounded-tile border border-hairline bg-surface p-4"
                        >
                          <div className="mb-3 flex items-center justify-between gap-1">
                            <span className="eyebrow">Exercise {j + 1}</span>
                            <div className="flex">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-10 rounded-full text-muted-foreground"
                                aria-label={`Move exercise ${j + 1} up`}
                                disabled={j === 0}
                                onClick={() => (
                                  feedback.selection(),
                                  updateDay(i, { exercises: move(day.exercises, j, j - 1) })
                                )}
                              >
                                <ArrowUp />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-10 rounded-full text-muted-foreground"
                                aria-label={`Move exercise ${j + 1} down`}
                                disabled={j === day.exercises.length - 1}
                                onClick={() => (
                                  feedback.selection(),
                                  updateDay(i, { exercises: move(day.exercises, j, j + 1) })
                                )}
                              >
                                <ArrowDown />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-10 rounded-full text-muted-foreground"
                                aria-label={`Remove exercise ${j + 1} from day ${i + 1}`}
                                onClick={() => (
                                  feedback.impactMedium(),
                                  updateDay(i, {
                                    exercises: day.exercises.filter((_, k) => k !== j),
                                  })
                                )}
                              >
                                <Trash2 />
                              </Button>
                            </div>
                          </div>
                          <label className="block">
                            <span className="mb-2 block text-label font-semibold">Exercise</span>
                            <Input
                              value={exercise.name}
                              placeholder="Exercise name"
                              onChange={(e) => updateExercise(i, j, { name: e.target.value })}
                              className="h-12 rounded-tile border-hairline-strong bg-surface text-body"
                            />
                          </label>
                          <div className="mt-4 grid grid-cols-2 gap-3">
                            <label>
                              <span className="mb-2 block text-caption font-semibold text-muted-foreground">
                                Sets
                              </span>
                              <Input
                                type="number"
                                min={1}
                                max={8}
                                value={exercise.sets || ""}
                                onChange={(e) =>
                                  updateExercise(i, j, { sets: Number(e.target.value) })
                                }
                                className={inputClass}
                              />
                            </label>
                            <label>
                              <span className="mb-2 block text-caption font-semibold text-muted-foreground">
                                Reps
                              </span>
                              <Input
                                value={exercise.reps}
                                placeholder="8–10"
                                onChange={(e) => updateExercise(i, j, { reps: e.target.value })}
                                className={inputClass}
                              />
                            </label>
                            <label>
                              <span className="mb-2 block text-caption font-semibold text-muted-foreground">
                                Weight · kg
                              </span>
                              <Input
                                type="number"
                                min={0}
                                step="any"
                                value={exercise.weight ?? ""}
                                placeholder="Previous"
                                onChange={(e) =>
                                  updateExercise(i, j, { weight: numeric(e.target.value) })
                                }
                                className={inputClass}
                              />
                            </label>
                            <label>
                              <span className="mb-2 block text-caption font-semibold text-muted-foreground">
                                Rest · seconds
                              </span>
                              <Input
                                type="number"
                                min={0}
                                step={1}
                                value={exercise.rest_seconds ?? ""}
                                placeholder="Auto"
                                onChange={(e) =>
                                  updateExercise(i, j, { rest_seconds: numeric(e.target.value) })
                                }
                                className={inputClass}
                              />
                            </label>
                            <label>
                              <span className="mb-2 block text-caption font-semibold text-muted-foreground">
                                Effort · RPE
                              </span>
                              <Input
                                type="number"
                                min={1}
                                max={10}
                                step={1}
                                value={exercise.rpe ?? ""}
                                placeholder="Optional"
                                onChange={(e) =>
                                  updateExercise(i, j, { rpe: numeric(e.target.value) })
                                }
                                className={inputClass}
                              />
                            </label>
                            <label>
                              <span className="mb-2 block text-caption font-semibold text-muted-foreground">
                                Tempo
                              </span>
                              <Input
                                value={exercise.tempo ?? ""}
                                placeholder="3-1-1"
                                onChange={(e) => updateExercise(i, j, { tempo: e.target.value })}
                                className={inputClass}
                              />
                            </label>
                          </div>
                          <label className="mt-4 block">
                            <span className="mb-2 block text-caption font-semibold text-muted-foreground">
                              Coach notes
                            </span>
                            <Textarea
                              value={exercise.notes ?? ""}
                              placeholder="Cues, warm-up, or substitutions"
                              onChange={(e) => updateExercise(i, j, { notes: e.target.value })}
                              className="rounded-tile border-hairline-strong bg-surface text-body"
                            />
                          </label>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                    <Button
                      variant="secondary"
                      className="h-11 w-full rounded-full text-label font-semibold"
                      onClick={() => (
                        feedback.selection(),
                        updateDay(i, { exercises: [...day.exercises, blankExercise()] })
                      )}
                    >
                      <Plus /> Add exercise
                    </Button>
                  </div>
                )}
              </motion.section>
            );
          })}
        </AnimatePresence>
        <Button
          variant="secondary"
          className="h-12 w-full rounded-full text-label font-semibold"
          onClick={() => (
            feedback.selection(),
            setDraft({ ...draft, days: [...draft.days, blankDay(draft.days.length + 1)] })
          )}
        >
          <Plus /> Add day
        </Button>
      </fieldset>
      {error && (
        <p role="alert" className="mt-4 text-label text-destructive">
          {error}
        </p>
      )}
      <div className="glass sticky bottom-0 -mx-5 mt-5 border-t border-hairline px-5 py-4">
        <div
          className={cn(
            "mb-2 flex h-4 items-center justify-center gap-1 text-caption text-faint transition-opacity duration-300",
            draftSaved ? "opacity-100" : "opacity-0",
          )}
          aria-live="polite"
        >
          <Check className="size-3.5" /> Draft saved on this device
        </div>
        <Button
          variant="volt"
          className="h-14 w-full text-body"
          disabled={save.isPending}
          onClick={() => {
            const validation = programError(draft);
            setError(validation);
            if (validation) return void feedback.error();
            save.mutate(undefined, {
              onSuccess: () => {
                clearDraft();
                feedback.success();
                toast.success(
                  program
                    ? "Program updated"
                    : clientId
                      ? "Program saved and assigned"
                      : "Program saved",
                );
                onClose();
              },
              onError: () => {
                qc.invalidateQueries({ queryKey: [mode, "programs"] });
                setError(
                  savedId.current
                    ? "Program saved in your library, but assignment failed. Retry to assign it without creating another copy."
                    : "Couldn't save this plan. Your draft is still here; try again.",
                );
              },
            });
          }}
        >
          {save.isPending ? <Loader2 className="animate-spin" /> : <Save />}
          {save.isPending
            ? "Saving…"
            : program
              ? "Save changes"
              : clientId
                ? savedId.current
                  ? "Retry assignment"
                  : "Save and assign"
                : "Save program"}
        </Button>
      </div>
    </Sheet>
  );
}
