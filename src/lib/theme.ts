import { useEffect, useState } from "react";

export type ThemePref = "system" | "dark" | "light";
export type Theme = "dark" | "light";

const KEY = "kinra:theme";
const COLOR: Record<Theme, string> = { dark: "#0c0d10", light: "#f6f4f0" };

export function readThemePref(): ThemePref {
  try {
    const v = localStorage.getItem(KEY);
    return v === "light" || v === "dark" || v === "system" ? v : "dark";
  } catch {
    return "dark";
  }
}

export function resolveTheme(pref: ThemePref): Theme {
  if (pref !== "system") return pref;
  return typeof matchMedia !== "undefined" && matchMedia("(prefers-color-scheme: light)").matches
    ? "light"
    : "dark";
}

export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.dataset["theme"] = theme;
  document
    .querySelectorAll('meta[name="theme-color"]')
    .forEach((m) => m.setAttribute("content", COLOR[theme]));
}

/** Runs before first paint (inlined in <head>) so the page never flashes the wrong theme. */
export const themeBootScript = `(function(){try{var p=localStorage.getItem("${KEY}")||"dark";var t=p==="system"?(matchMedia("(prefers-color-scheme: light)").matches?"light":"dark"):(p==="light"?"light":"dark");if(location.pathname==="/"||location.pathname.indexOf("/auth")===0)t="dark";document.documentElement.dataset.theme=t;}catch(e){document.documentElement.dataset.theme="dark";}})();`;

export function useThemePref() {
  const [pref, setPrefState] = useState<ThemePref>(() =>
    typeof window === "undefined" ? "dark" : readThemePref(),
  );

  useEffect(() => {
    if (pref !== "system") return;
    const mq = matchMedia("(prefers-color-scheme: light)");
    const on = () => applyTheme(resolveTheme("system"));
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [pref]);

  const setPref = (next: ThemePref) => {
    try {
      localStorage.setItem(KEY, next);
    } catch {
      /* private mode: the choice lasts for this page only */
    }
    setPrefState(next);
    const run = () => applyTheme(resolveTheme(next));
    const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown };
    if (doc.startViewTransition && !matchMedia("(prefers-reduced-motion: reduce)").matches)
      doc.startViewTransition(run);
    else run();
  };

  return [pref, setPref] as const;
}

/** The signed-in app follows the saved preference; marketing pages stay dark. */
export function useAppTheme() {
  useEffect(() => {
    applyTheme(resolveTheme(readThemePref()));
    return () => applyTheme("dark");
  }, []);
}
