import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useApi, useMe } from "@/lib/api";

type AppView = "coach" | "personal";
const AppViewContext = createContext<{ personal: boolean; setView: (view: AppView) => void }>({
  personal: false,
  setView: () => {},
});

export function AppViewProvider({ children }: { children: ReactNode }) {
  const me = useMe().data;
  const { mode } = useApi();
  const key = me ? `strata:app-view:${mode}:${me.id}` : "";
  const [preference, setPreference] = useState<{ key: string; view: AppView }>({
    key: "",
    view: "coach",
  });
  useEffect(() => {
    if (!key) return;
    try {
      setPreference({ key, view: localStorage.getItem(key) === "personal" ? "personal" : "coach" });
    } catch {
      setPreference({ key, view: "coach" });
    }
  }, [key]);
  const setView = (view: AppView) => {
    setPreference({ key, view });
    try {
      if (key) localStorage.setItem(key, view);
    } catch {
      /* The switch still works without storage. */
    }
  };
  return (
    <AppViewContext.Provider
      value={{
        personal:
          me?.role === "trainer" && preference.key === key && preference.view === "personal",
        setView,
      }}
    >
      {children}
    </AppViewContext.Provider>
  );
}

export const useAppView = () => useContext(AppViewContext);
