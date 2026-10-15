import { useEffect, useRef, useState } from "react";
import { Barcode, Camera, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useApi } from "@/lib/api";
import { barcodePortion, type BarcodeFood } from "@/lib/barcode";

export function FoodBarcode({
  onUse,
  onClose,
}: {
  onUse: (food: ReturnType<typeof barcodePortion>) => void;
  onClose: () => void;
}) {
  const api = useApi();
  const [barcode, setBarcode] = useState("");
  const [food, setFood] = useState<BarcodeFood | null>(null);
  const [grams, setGrams] = useState("100");
  const [busy, setBusy] = useState(false);
  const [camera, setCamera] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const video = useRef<HTMLVideoElement>(null);
  const pending = useRef(false);
  const alive = useRef(true);
  const lookup = async (code: string) => {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError(null);
    setCamera(false);
    setBarcode(code);
    setFood(null);
    try {
      const result = await api.lookupBarcode(code);
      if (alive.current) {
        setFood(result);
        if (!result)
          setError(
            "No complete nutrition label found for this barcode. Try another code or enter the food manually.",
          );
      }
    } catch (e) {
      if (alive.current) setError((e as Error).message);
    } finally {
      pending.current = false;
      if (alive.current) setBusy(false);
    }
  };
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  useEffect(() => {
    if (!camera) return;
    let cancelled = false;
    let controls: { stop: () => void } | undefined;
    const start = async () => {
      try {
        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        if (cancelled || !video.current) return;
        const reader = new BrowserMultiFormatReader();
        const next = await reader.decodeFromConstraints(
          { video: { facingMode: { ideal: "environment" } }, audio: false },
          video.current,
          (result) => {
            if (result && !cancelled && /^\d{8,14}$/.test(result.getText())) {
              cancelled = true;
              controls?.stop();
              void lookup(result.getText());
            }
          },
        );
        controls = next;
        if (cancelled) next.stop();
      } catch {
        if (!cancelled) {
          setError("Camera unavailable. Allow camera access or enter the barcode below.");
          setCamera(false);
        }
      }
    };
    void start();
    return () => {
      cancelled = true;
      controls?.stop();
      const stream = video.current?.srcObject;
      if (stream instanceof MediaStream) stream.getTracks().forEach((track) => track.stop());
    };
  }, [camera]);
  const amount = Number(grams);
  const valid = Number.isFinite(amount) && amount > 0 && amount <= 10000;
  const portion = food && valid ? barcodePortion(food, amount) : null;
  return (
    <section aria-label="Food barcode scanner" className="mb-5 border-y border-border py-4">
      <div className="mb-4 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <h3 className="min-w-0 font-display text-title font-bold">Food barcode</h3>
        <Button variant="ghost" size="icon" aria-label="Close barcode scanner" onClick={onClose}>
          <X />
        </Button>
      </div>
      {camera ? (
        <>
          <video
            ref={video}
            muted
            playsInline
            autoPlay
            className="mb-3 aspect-video w-full rounded-tile bg-surface-2 object-cover"
            aria-label="Barcode camera preview"
          />
          <Button variant="glass" className="mb-4 h-12 w-full" onClick={() => setCamera(false)}>
            Stop camera
          </Button>
        </>
      ) : (
        <Button
          variant="glass"
          disabled={busy}
          className="mb-4 h-12 w-full text-body"
          onClick={() => {
            setError(null);
            setCamera(true);
          }}
        >
          <Camera />
          Scan with camera
        </Button>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void lookup(barcode);
        }}
        className="grid grid-cols-[minmax(0,1fr)_auto] gap-2"
      >
        <Input
          aria-label="Food barcode number"
          inputMode="numeric"
          placeholder="Enter barcode number"
          value={barcode}
          maxLength={14}
          onChange={(e) => setBarcode(e.target.value.replace(/\D/g, ""))}
          className="num h-12 min-w-0 bg-surface text-body"
        />
        <Button
          type="submit"
          variant="glass"
          aria-label="Look up barcode"
          disabled={busy || !/^\d{8,14}$/.test(barcode)}
          className="h-12"
        >
          {busy ? <Loader2 className="animate-spin" /> : <Barcode />}
        </Button>
      </form>
      {busy && (
        <p role="status" className="mt-3 text-body text-muted-foreground">
          Looking up food…
        </p>
      )}
      {error && (
        <p role="alert" className="mt-3 text-body text-destructive">
          {error}
        </p>
      )}
      {food && (
        <div className="mt-5">
          <h4 className="break-words text-title font-bold">{food.name}</h4>
          {food.brand && <p className="mt-1 text-label text-muted-foreground">{food.brand}</p>}
          <p className="mt-3 text-label text-muted-foreground">
            Per 100 g: {Math.round(food.calories)} kcal · {food.protein} g protein · {food.carbs} g
            carbs · {food.fat} g fat
          </p>
          <label className="mt-4 block">
            <span className="mb-2 block text-label font-semibold">Portion · grams</span>
            <Input
              type="number"
              min={1}
              max={10000}
              step="any"
              inputMode="decimal"
              value={grams}
              onChange={(e) => setGrams(e.target.value)}
              className="num h-12 bg-surface text-body"
            />
          </label>
          {portion && (
            <p className="num mt-3 text-body">
              {portion.calories} kcal · {portion.protein} g protein
            </p>
          )}
          <Button
            variant="volt"
            className="mt-4 h-14 w-full text-body"
            disabled={!portion}
            onClick={() => {
              if (portion) onUse(portion);
            }}
          >
            Use this food
          </Button>
          <p className="mt-3 text-label text-muted-foreground">
            Open Food Facts · Verify against the package label.
          </p>
        </div>
      )}
    </section>
  );
}
