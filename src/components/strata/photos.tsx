import { useRef, useState } from "react";
import { format } from "date-fns";
import { Camera, Columns2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAct, useQ } from "@/lib/api";
import type { ProgressPhoto } from "@/lib/types";
import { Empty, Panel, Segmented } from "./ui";
import { motion } from "motion/react";
import { spring } from "@/lib/motion";
import { feedback } from "@/lib/feedback";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

const POSES = ["Front", "Side", "Back"];

export function usePhotos(userId: string) {
  return useQ(["photos", userId], (api) => api.photos(userId));
}

/** Tap to zoom in where you tapped; tap again to fit. */
function ZoomImage({ src, alt }: { src: string; alt: string }) {
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);
  return (
    <button
      type="button"
      aria-label={zoom ? "Zoom out" : "Zoom in"}
      className="relative block w-full overflow-hidden rounded-tile"
      onClick={(e) => {
        feedback.selection();
        const r = e.currentTarget.getBoundingClientRect();
        setZoom(
          zoom
            ? null
            : {
                x: ((e.clientX - r.left) / r.width) * 100,
                y: ((e.clientY - r.top) / r.height) * 100,
              },
        );
      }}
    >
      <motion.img
        src={src}
        alt={alt}
        className="w-full"
        style={{ transformOrigin: zoom ? `${zoom.x}% ${zoom.y}%` : "50% 50%" }}
        animate={{ scale: zoom ? 2.2 : 1 }}
        transition={spring.smooth}
      />
    </button>
  );
}

export function CompareSlider({ before, after }: { before: ProgressPhoto; after: ProgressPhoto }) {
  const [pos, setPos] = useState(50);
  return (
    <div className="relative aspect-[3/4] w-full select-none overflow-hidden rounded-tile bg-surface-2">
      <img
        src={after.url}
        alt={`${after.pose} photo ${after.taken_on}`}
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
      >
        <img
          src={before.url}
          alt={`${before.pose} photo ${before.taken_on}`}
          className="absolute inset-0 h-full w-full object-cover"
        />
      </div>
      <div
        className="pointer-events-none absolute inset-y-0 w-px -translate-x-1/2 bg-white/90 shadow-[0_0_12px_rgba(0,0,0,0.4)]"
        style={{ left: `${pos}%` }}
      >
        <div className="glass absolute left-1/2 top-1/2 grid size-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-white/30 text-white shadow-2">
          <Columns2 className="size-4" />
        </div>
      </div>
      <div className="glass absolute left-3 top-3 rounded-full px-2.5 py-1 text-caption font-semibold">
        Before · {format(new Date(before.taken_on + "T12:00"), "d MMM")}
      </div>
      <div className="glass absolute right-3 top-3 rounded-full px-2.5 py-1 text-caption font-semibold">
        {format(new Date(after.taken_on + "T12:00"), "d MMM")} · Now
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={pos}
        onChange={(e) => setPos(+e.target.value)}
        aria-label="Compare before and after"
        className="absolute inset-0 h-full w-full cursor-ew-resize opacity-0"
      />
    </div>
  );
}

export function PhotoSection({ userId, canEdit }: { userId: string; canEdit: boolean }) {
  const photos = usePhotos(userId);
  const [pose, setPose] = useState("Front");
  const [view, setView] = useState<ProgressPhoto | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const upload = useAct((api, file: File) => api.uploadPhoto({ file, pose }));
  const remove = useAct((api, p: ProgressPhoto) => api.removePhoto(p));
  const list = photos.data ?? [];
  const posed = list.filter((p) => p.pose === pose);
  const first = posed.at(-1);
  const last = posed[0];

  return (
    <div>
      <Segmented
        className="mb-3"
        value={pose}
        onChange={setPose}
        options={POSES.map((p) => ({ value: p, label: p }))}
      />

      {first && last && first.id !== last.id ? (
        <Panel className="p-2">
          <CompareSlider before={first} after={last} />
          <div className="px-2 pb-1 pt-2.5 text-center text-caption text-faint">
            Drag to compare · {posed.length} {pose.toLowerCase()} photos
          </div>
        </Panel>
      ) : !photos.isLoading && !posed.length ? (
        <Empty
          icon={<Camera className="size-6" />}
          title={`No ${pose.toLowerCase()} photos yet`}
          body={
            canEdit
              ? "Same light, same spot, every 2–4 weeks. Only you and your coach can see them."
              : "Your client hasn't added any yet."
          }
        />
      ) : null}

      {list.length > 0 && (
        <div className="mt-3 grid grid-cols-3 gap-2">
          {list.map((p) => (
            <button
              key={p.id}
              onClick={() => setView(p)}
              className="relative aspect-[3/4] overflow-hidden rounded-tile bg-surface-2 transition-transform duration-200 active:scale-[0.97]"
            >
              <img
                src={p.url}
                alt={`${p.pose} progress photo ${p.taken_on}`}
                loading="lazy"
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2 pb-1.5 pt-6 text-left text-caption font-semibold text-white">
                {format(new Date(p.taken_on + "T12:00"), "d MMM")} · {p.pose}
              </div>
            </button>
          ))}
        </div>
      )}

      {canEdit && (
        <>
          <input
            ref={input}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (!f) return;
              if (f.size > 10 * 1024 * 1024) return void toast.error("Photo must be under 10 MB");
              upload.mutate(f, {
                onSuccess: () => toast.success("Photo saved privately"),
                onError: (er) => toast.error(er.message),
              });
            }}
          />
          <Button
            variant="secondary"
            size="xl"
            className="mt-3 w-full rounded-full text-label font-semibold"
            disabled={upload.isPending}
            onClick={() => input.current?.click()}
          >
            <Camera /> {upload.isPending ? "Uploading…" : `Add ${pose.toLowerCase()} photo`}
          </Button>
        </>
      )}

      <Dialog open={!!view} onOpenChange={(o) => !o && setView(null)}>
        <DialogContent className="max-w-sm rounded-card border-hairline-strong bg-popover p-3">
          <DialogTitle className="px-1 text-label font-semibold">
            {view && `${view.pose} · ${format(new Date(view.taken_on + "T12:00"), "d MMM yyyy")}`}
          </DialogTitle>
          {view && <ZoomImage src={view.url} alt={`${view.pose} progress photo`} />}
          {view?.note && <p className="px-1 text-label text-muted-foreground">{view.note}</p>}
          {canEdit && view && (
            <Button
              variant="ghost"
              className="text-destructive"
              onClick={() =>
                remove.mutate(view, { onSuccess: () => (setView(null), toast.success("Deleted")) })
              }
            >
              <Trash2 /> Delete photo
            </Button>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
