import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Download, Share, SquarePlus } from "lucide-react";
import { press } from "@/lib/motion";
import { feedback } from "@/lib/feedback";

type PromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

let deferred: PromptEvent | null = null;
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e as PromptEvent;
  });
}

/** Add Kinra to the home screen: a native prompt where the browser offers one, clear steps on iPhone. */
export function InstallCard() {
  const [state, setState] = useState<"hidden" | "native" | "ios">("hidden");
  useEffect(() => {
    const nav = navigator as Navigator & { standalone?: boolean };
    if (nav.standalone || matchMedia("(display-mode: standalone)").matches) return;
    const ios =
      /iphone|ipad|ipod/i.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    if (ios) return setState("ios");
    if (deferred) return setState("native");
    const on = () => setState("native");
    window.addEventListener("beforeinstallprompt", on);
    return () => window.removeEventListener("beforeinstallprompt", on);
  }, []);
  if (state === "hidden") return null;
  return (
    <div className="panel p-5">
      <div className="flex items-center gap-4">
        <img
          src="/icon-192.png"
          alt=""
          width={48}
          height={48}
          className="size-12 rounded-[12px] ring-1 ring-hairline-strong"
        />
        <div className="min-w-0 flex-1">
          <div className="text-label font-semibold">Kinra on your Home Screen</div>
          <div className="text-caption text-muted-foreground">
            Full screen, one tap away, with rest-timer alerts.
          </div>
        </div>
      </div>
      {state === "ios" ? (
        <ol className="mt-4 space-y-2 text-label text-muted-foreground">
          <li className="flex items-center gap-2">
            <span className="num grid size-6 place-items-center rounded-full bg-surface-3 text-caption text-foreground">
              1
            </span>{" "}
            Tap <Share className="size-4 text-foreground" /> Share in Safari
          </li>
          <li className="flex items-center gap-2">
            <span className="num grid size-6 place-items-center rounded-full bg-surface-3 text-caption text-foreground">
              2
            </span>{" "}
            Choose <SquarePlus className="size-4 text-foreground" /> Add to Home Screen
          </li>
        </ol>
      ) : (
        <motion.button
          whileTap={press.button}
          type="button"
          onClick={async () => {
            feedback.impactLight();
            if (!deferred) return;
            await deferred.prompt();
            const choice = await deferred.userChoice;
            if (choice.outcome === "accepted") setState("hidden");
            deferred = null;
          }}
          className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-full bg-surface-2 text-label font-semibold transition-colors hover-device:bg-surface-3"
        >
          <Download className="size-4" /> Install the app
        </motion.button>
      )}
    </div>
  );
}
