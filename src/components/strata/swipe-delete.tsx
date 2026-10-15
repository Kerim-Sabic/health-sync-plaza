import { useRef, type ReactNode } from "react";
import { motion, useMotionValue, useTransform } from "motion/react";
import { toast } from "sonner";
import { useAct } from "@/lib/api";
import type { LogTable, LogTables } from "@/lib/types";
import { feedback } from "@/lib/feedback";

/** Remove a log row through the existing Api; Undo re-inserts the same values (new id). */
export function useRemoveWithUndo<T extends LogTable>(table: T) {
  const remove = useAct((api, id: string) => api.remove(table, id));
  const restore = useAct((api, row: Partial<LogTables[T]>) => api.insert(table, row));
  return (row: LogTables[T], label: string) => {
    const { id, user_id: _u, ...rest } = row as LogTables[T] & { id: string; user_id: string };
    feedback.impactMedium();
    remove.mutate(id, {
      onSuccess: () =>
        toast(label, {
          action: {
            label: "Undo",
            onClick: () =>
              restore.mutate(rest as Partial<LogTables[T]>, {
                onError: (e) => toast.error(e.message),
              }),
          },
        }),
      onError: (e) => toast.error(e.message),
    });
  };
}

const THRESHOLD = -96;

/** Swipe left to delete: the red action grows with the drag and ticks once at the threshold. */
export function SwipeRow({
  onDelete,
  children,
  label,
}: {
  onDelete: () => void;
  children: ReactNode;
  label: string;
}) {
  const x = useMotionValue(0);
  const reveal = useTransform(x, [THRESHOLD - 20, -12, 0], [1, 0.45, 0]);
  const grow = useTransform(x, [THRESHOLD, 0], [1, 0.85]);
  const armed = useRef(false);
  return (
    <div className="relative overflow-hidden rounded-card">
      <motion.div
        style={{ opacity: reveal }}
        className="absolute inset-0 flex items-center justify-end rounded-card bg-destructive/20 pr-5 text-label font-semibold text-destructive"
        aria-hidden
      >
        <motion.span style={{ scale: grow }}>Delete</motion.span>
      </motion.div>
      <motion.div
        style={{ x }}
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={{ left: 0.7, right: 0 }}
        dragDirectionLock
        onDrag={(_, i) => {
          const over = i.offset.x < THRESHOLD;
          if (over !== armed.current) {
            armed.current = over;
            feedback.selection();
          }
        }}
        onDragEnd={(_, i) => {
          armed.current = false;
          if (i.offset.x < THRESHOLD) onDelete();
        }}
        className="relative"
        aria-label={label}
      >
        {children}
      </motion.div>
    </div>
  );
}
