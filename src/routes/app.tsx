import { createFileRoute, Outlet, redirect, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { supabase } from "@/integrations/supabase/client";
import { ApiProvider, useAct, useLog, useMe, type Mode } from "@/lib/api";
import { LogSheets, Sheet, type LogKind } from "@/components/strata/sheets";
import { ShellCtx, type LiveSessionState } from "@/components/strata/shell";
import { LiveSession, sessionFromTemplate, toWorkoutRow } from "@/components/strata/session";
import { doneCount, isStale, lastActivity, sessionFromWorkout } from "@/lib/session-state";
import { format } from "date-fns";
import { ErrorState, SkeletonPage, springPress } from "@/components/strata/ui";
import type { ProgramDay, Role, Workout } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { AppViewProvider, useAppView } from "@/components/strata/app-view";
import {
  DEMO_KEY,
  DemoChip,
  EdgeSwipeBack,
  LaunchShortcuts,
  LogHub,
  PageTransition,
  PullToRefresh,
  Sidebar,
  TabBar,
  tabsFor,
  useTabScrollMemory,
} from "@/components/strata/app-chrome";
import { useAppTheme } from "@/lib/theme";
import { CommandPalette } from "@/components/strata/command-palette";
import { Onboarding } from "@/components/strata/onboarding";

export const Route = createFileRoute("/app")({
  ssr: false,
  beforeLoad: async () => {
    const demo = sessionStorage.getItem(DEMO_KEY);
    if (demo === "client" || demo === "trainer") return { mode: `demo-${demo}` as Mode };
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
    return { mode: "live" as Mode };
  },
  head: () => ({ meta: [{ title: "Kinra" }, { name: "robots", content: "noindex" }] }),
  component: AppLayout,
});

function AppLayout() {
  const { mode } = Route.useRouteContext();
  useAppTheme();
  return (
    <MotionConfig reducedMotion="user">
      <ApiProvider mode={mode}>
        <AppViewProvider>
          <div vaul-drawer-wrapper="" className="app-backdrop min-h-dvh bg-background">
            <Shell mode={mode} />
          </div>
        </AppViewProvider>
      </ApiProvider>
    </MotionConfig>
  );
}

function Shell({ mode }: { mode: Mode }) {
  const me = useMe();
  const { personal } = useAppView();
  const path = useRouterState({ select: (s) => s.location.pathname });
  useTabScrollMemory(path);
  const [kind, setKind] = useState<LogKind | null>(null);
  const [meal, setMeal] = useState<string | undefined>();
  const [hub, setHub] = useState(false);
  const sessKey = `strata-session-${mode}`;
  const [session, setSessionState] = useState<LiveSessionState | null>(() => {
    try {
      const s = JSON.parse(localStorage.getItem(sessKey) ?? "null") as LiveSessionState | null;
      // A session whose save already succeeded must never reopen (it would save twice).
      if (s?.savedAt) return (localStorage.removeItem(sessKey), null);
      return s;
    } catch {
      return null;
    }
  });
  const [minimized, setMinimized] = useState(() => !!localStorage.getItem(sessKey));
  const [conflict, setConflict] = useState<LiveSessionState | null>(null);
  const [stale, setStale] = useState(
    () => !!session && !session.editingId && isStale(session, Date.now()),
  );
  const workouts = useLog("workouts", me.data?.id).data ?? [];
  const saveRow = useAct((api, row: Partial<Workout>) => api.insert("workouts", row));

  const setSession = (s: LiveSessionState | null) => {
    setSessionState(s);
    if (s) localStorage.setItem(sessKey, JSON.stringify(s));
    else localStorage.removeItem(sessKey);
  };

  if (me.isLoading)
    return (
      <div className="mx-auto max-w-md px-5 pt-10">
        <SkeletonPage />
      </div>
    );
  if (me.error)
    return (
      <div className="mx-auto max-w-md px-5 pt-16">
        <ErrorState message={(me.error as Error).message} onRetry={() => me.refetch()} />
      </div>
    );
  if (!me.data?.role) return <Onboarding />;

  const role = me.data.role;
  const tabPaths = tabsFor(personal ? "solo" : role).map((t) => t.to);
  const pushed = /^\/app\/clients\/[^/]+/.test(path);
  const api = {
    session,
    log: (k: Exclude<LogKind, "workout">, o?: { meal?: string }) => {
      setMeal(o?.meal);
      setKind(k);
      setHub(false);
    },
    startSession: (t?: ProgramDay) => {
      setHub(false);
      const next = sessionFromTemplate(t, workouts);
      if (session) return setConflict(next);
      setSession(next);
      setMinimized(false);
    },
    editWorkout: (w: Workout) => {
      const next: LiveSessionState = sessionFromWorkout(w);
      if (session) return setConflict(next);
      setSession(next);
      setMinimized(false);
    },
    openSession: () => setMinimized(false),
  };
  const saveCurrent = async (cap: boolean) => {
    if (!session || doneCount(session) === 0) return;
    await saveRow.mutateAsync(toWorkoutRow(session, Date.now(), session.rpe ?? 7, cap));
  };
  const replaceWith = async (next: LiveSessionState, keep: boolean) => {
    try {
      if (keep) await saveCurrent(false);
      if (keep && session && doneCount(session) > 0) toast.success("Previous session saved");
      setConflict(null);
      setSession(next);
      setMinimized(false);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };
  const staleSets = session ? doneCount(session) : 0;

  return (
    <ShellCtx.Provider value={api}>
      <Sidebar
        role={personal ? "solo" : role}
        onPlus={() => setHub(true)}
        name={me.data.display_name}
        avatar={me.data.avatar_url}
      />
      <CommandPalette role={personal ? "solo" : role} />
      <LaunchShortcuts />
      <PullToRefresh />
      <div className="relative min-h-dvh lg:pl-[264px]">
        <div
          className={cn(
            "relative mx-auto max-w-md lg:max-w-[680px]",
            role === "trainer" && !personal && "xl:max-w-[1080px]",
          )}
        >
          <main className="px-5 pb-40 pt-2 lg:px-8 lg:pb-16 lg:pt-8">
            {mode !== "live" && <DemoChip role={role} />}
            <EdgeSwipeBack enabled={pushed}>
              <PageTransition path={path} tabs={tabPaths}>
                <Outlet />
              </PageTransition>
            </EdgeSwipeBack>
          </main>
        </div>
        <TabBar role={personal ? "solo" : role} onPlus={() => setHub((h) => !h)} hubOpen={hub} />
        <AnimatePresence>
          {hub && (
            <LogHub
              key="hub"
              onClose={() => setHub(false)}
              onPick={(k) => (k === "workout" ? api.startSession() : api.log(k))}
            />
          )}
        </AnimatePresence>
        <LogSheets key={`${kind}-${meal}`} kind={kind} meal={meal} onClose={() => setKind(null)} />
        <Sheet
          open={!!conflict}
          onOpenChange={(o) => !o && setConflict(null)}
          title="A session is already open"
          sub={session ? `${session.title} · ${doneCount(session)} sets logged` : ""}
        >
          <div className="space-y-2">
            <Button
              className="h-14 w-full rounded-full"
              variant="volt"
              onClick={() => (setConflict(null), setMinimized(false))}
            >
              Resume current
            </Button>
            {session && doneCount(session) > 0 && !session.editingId && (
              <Button
                className="h-14 w-full rounded-full"
                variant="secondary"
                disabled={saveRow.isPending}
                onClick={() => conflict && replaceWith(conflict, true)}
              >
                Save current & start new
              </Button>
            )}
            <Button
              className="h-14 w-full rounded-full text-destructive"
              variant="secondary"
              onClick={() => conflict && replaceWith(conflict, false)}
            >
              Discard current & start new
            </Button>
          </div>
        </Sheet>
        <Sheet
          open={stale && !!session}
          onOpenChange={(o) => !o && setStale(false)}
          title="Unfinished session"
          sub={
            session
              ? `${session.title} from ${format(lastActivity(session), "EEEE HH:mm")} · ${staleSets} set${staleSets === 1 ? "" : "s"}`
              : ""
          }
        >
          <div className="space-y-2">
            <Button
              className="h-14 w-full rounded-full"
              variant="volt"
              onClick={() => (setStale(false), setMinimized(false))}
            >
              Resume
            </Button>
            <Button
              className="h-14 w-full rounded-full"
              variant="secondary"
              disabled={staleSets === 0 || saveRow.isPending}
              onClick={async () => {
                try {
                  await saveCurrent(true);
                  setStale(false);
                  setSession(null);
                  toast.success("Session saved", {
                    description: "Duration ends at your last completed set.",
                  });
                } catch (e) {
                  toast.error((e as Error).message);
                }
              }}
            >
              Save as is
            </Button>
            <Button
              className="h-14 w-full rounded-full text-destructive"
              variant="secondary"
              onClick={() => (setStale(false), setSession(null), setMinimized(false))}
            >
              Discard
            </Button>
          </div>
        </Sheet>
        {session && (
          <LiveSession
            session={session}
            setSession={setSession}
            minimized={minimized}
            setMinimized={setMinimized}
            onClose={() => (setSession(null), setMinimized(false))}
          />
        )}
      </div>
    </ShellCtx.Provider>
  );
}
