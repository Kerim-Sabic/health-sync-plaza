import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Command as Cmdk } from "cmdk";
import * as Dialog from "@radix-ui/react-dialog";
import { motion } from "motion/react";
import {
  ClipboardList,
  Dumbbell,
  MessageSquare,
  Moon,
  NotebookPen,
  Scale,
  Search,
  Sun,
  SunMoon,
  User,
  Utensils,
} from "lucide-react";
import { useQ } from "@/lib/api";
import type { Role } from "@/lib/types";
import { useThemePref } from "@/lib/theme";
import { spring } from "@/lib/motion";
import { feedback } from "@/lib/feedback";
import { useShell } from "./shell";
import { tabsFor } from "./app-chrome";
import { Avatar } from "./ui";

const item =
  "flex min-h-12 cursor-pointer items-center gap-3 rounded-tile px-3 text-label font-semibold text-muted-foreground aria-selected:bg-surface-2 aria-selected:text-foreground";
const group =
  "px-2 pb-2 [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pb-2 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:text-micro [&_[cmdk-group-heading]]:font-bold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.08em] [&_[cmdk-group-heading]]:text-faint";

/** ⌘K / Ctrl+K: jump to any client, program or action. */
export function CommandPalette({ role }: { role: Role }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { log, startSession } = useShell();
  const [, setTheme] = useThemePref();
  const coach = role === "trainer";
  const clients = useQ(["clients"], (api) => api.clients(), coach && open);
  const programs = useQ(["programs"], (api) => api.programs(), coach && open);

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    const ev = () => setOpen(true);
    window.addEventListener("keydown", k);
    window.addEventListener("kinra:command", ev);
    return () => (
      window.removeEventListener("keydown", k),
      window.removeEventListener("kinra:command", ev)
    );
  }, []);
  const run = (fn: () => void) => {
    feedback.selection();
    setOpen(false);
    fn();
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[70] bg-scrim backdrop-blur-sm" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed left-1/2 top-[12vh] z-[70] w-[min(92vw,560px)] -translate-x-1/2 outline-none"
        >
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={spring.snappy}
            className="elev-3 overflow-hidden rounded-card"
          >
            <Dialog.Title className="sr-only">Search Kinra</Dialog.Title>
            <Cmdk loop>
              <div className="flex items-center gap-3 border-b border-hairline px-4">
                <Search className="size-5 text-faint" strokeWidth={1.75} />
                <Cmdk.Input
                  autoFocus
                  placeholder={
                    coach
                      ? "Jump to a client, program or action"
                      : "Jump to a screen or log something"
                  }
                  className="h-14 min-w-0 flex-1 bg-transparent text-body outline-none placeholder:text-faint"
                />
                <kbd className="num rounded-md border border-hairline-strong px-1.5 py-0.5 text-caption text-faint">
                  esc
                </kbd>
              </div>
              <Cmdk.List className="max-h-[56vh] overflow-y-auto py-1">
                <Cmdk.Empty className="py-10 text-center text-label text-muted-foreground">
                  Nothing matches that.
                </Cmdk.Empty>
                {coach && !!clients.data?.length && (
                  <Cmdk.Group heading="Clients" className={group}>
                    {clients.data.map((c) => (
                      <Cmdk.Item
                        key={c.id}
                        value={`client ${c.display_name ?? ""} ${c.goal ?? ""}`}
                        onSelect={() =>
                          run(() =>
                            navigate({ to: "/app/clients/$clientId", params: { clientId: c.id } }),
                          )
                        }
                        className={item}
                      >
                        <Avatar name={c.display_name} src={c.avatar_url} size={28} />
                        <span className="min-w-0 flex-1 truncate text-foreground">
                          {c.display_name}
                        </span>
                        <span className="truncate text-caption font-medium text-faint">
                          {c.goal}
                        </span>
                      </Cmdk.Item>
                    ))}
                  </Cmdk.Group>
                )}
                {coach && !!programs.data?.length && (
                  <Cmdk.Group heading="Programs" className={group}>
                    {programs.data.map((p) => (
                      <Cmdk.Item
                        key={p.id}
                        value={`program ${p.name}`}
                        onSelect={() => run(() => navigate({ to: "/app/programs" }))}
                        className={item}
                      >
                        <ClipboardList className="size-5" strokeWidth={1.75} />
                        <span className="flex-1 truncate">{p.name}</span>
                        <span className="num text-caption font-medium text-faint">
                          {p.weeks} wk
                        </span>
                      </Cmdk.Item>
                    ))}
                  </Cmdk.Group>
                )}
                {!coach && (
                  <Cmdk.Group heading="Log" className={group}>
                    <Cmdk.Item
                      value="start session workout"
                      onSelect={() => run(() => startSession())}
                      className={item}
                    >
                      <Dumbbell className="size-5 text-volt" strokeWidth={1.75} /> Start a session
                    </Cmdk.Item>
                    <Cmdk.Item
                      value="log food meal"
                      onSelect={() => run(() => log("food"))}
                      className={item}
                    >
                      <Utensils className="size-5 text-ember" strokeWidth={1.75} /> Log food
                    </Cmdk.Item>
                    <Cmdk.Item
                      value="log sleep"
                      onSelect={() => run(() => log("sleep"))}
                      className={item}
                    >
                      <Moon className="size-5 text-dream" strokeWidth={1.75} /> Log sleep
                    </Cmdk.Item>
                    <Cmdk.Item
                      value="check in journal mood"
                      onSelect={() => run(() => log("journal"))}
                      className={item}
                    >
                      <NotebookPen className="size-5 text-pulse" strokeWidth={1.75} /> Check in
                    </Cmdk.Item>
                    <Cmdk.Item
                      value="weigh in weight"
                      onSelect={() => run(() => log("metric"))}
                      className={item}
                    >
                      <Scale className="size-5" strokeWidth={1.75} /> Weigh in
                    </Cmdk.Item>
                    {role === "client" && (
                      <Cmdk.Item
                        value="message coach reply"
                        onSelect={() => run(() => navigate({ to: "/app/messages" }))}
                        className={item}
                      >
                        <MessageSquare className="size-5" strokeWidth={1.75} /> Message your coach
                      </Cmdk.Item>
                    )}
                  </Cmdk.Group>
                )}
                <Cmdk.Group heading="Go to" className={group}>
                  {tabsFor(role).map((t) => (
                    <Cmdk.Item
                      key={t.to}
                      value={`go ${t.label}`}
                      onSelect={() => run(() => navigate({ to: t.to }))}
                      className={item}
                    >
                      <t.icon className="size-5" strokeWidth={1.75} /> {t.label}
                    </Cmdk.Item>
                  ))}
                  {!coach && (
                    <Cmdk.Item
                      value="go profile settings"
                      onSelect={() => run(() => navigate({ to: "/app/me" }))}
                      className={item}
                    >
                      <User className="size-5" strokeWidth={1.75} /> Profile & settings
                    </Cmdk.Item>
                  )}
                </Cmdk.Group>
                <Cmdk.Group heading="Appearance" className={group}>
                  <Cmdk.Item
                    value="theme dark obsidian"
                    onSelect={() => run(() => setTheme("dark"))}
                    className={item}
                  >
                    <Moon className="size-5" strokeWidth={1.75} /> Dark theme
                  </Cmdk.Item>
                  <Cmdk.Item
                    value="theme light porcelain"
                    onSelect={() => run(() => setTheme("light"))}
                    className={item}
                  >
                    <Sun className="size-5" strokeWidth={1.75} /> Light theme
                  </Cmdk.Item>
                  <Cmdk.Item
                    value="theme system automatic"
                    onSelect={() => run(() => setTheme("system"))}
                    className={item}
                  >
                    <SunMoon className="size-5" strokeWidth={1.75} /> Match my device
                  </Cmdk.Item>
                </Cmdk.Group>
              </Cmdk.List>
            </Cmdk>
          </motion.div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
