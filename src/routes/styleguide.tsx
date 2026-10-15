import { createFileRoute, notFound } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { MotionConfig } from "motion/react";
import {
  Activity,
  Dumbbell,
  Flame,
  Moon,
  Smile,
  Frown,
  Meh,
  Laugh,
  Angry,
  Plus,
  Trophy,
  Utensils,
} from "lucide-react";
import { toast } from "sonner";
import {
  Avatar,
  AvatarStack,
  Badge,
  Bars,
  Chip,
  Divider,
  Empty,
  ErrorState,
  IconButton,
  IconScale,
  ListRow,
  NumberTicker,
  Panel,
  PageHeader,
  PrimaryButton,
  ProgressBar,
  Ring,
  SaveButton,
  SectionTitle,
  Segmented,
  Segments,
  Skeleton,
  Sparkline,
  Stat,
  Tag,
  TextAction,
  Value,
} from "@/components/strata/ui";
import { Switch } from "@/components/ui/switch";
import { useThemePref, type ThemePref } from "@/lib/theme";
import { dur, spring } from "@/lib/motion";

export const Route = createFileRoute("/styleguide")({
  beforeLoad: () => {
    if (!import.meta.env.DEV) throw notFound();
  },
  head: () => ({ meta: [{ title: "Styleguide — Kinra" }, { name: "robots", content: "noindex" }] }),
  component: Styleguide,
});

const COLORS: [string, string][] = [
  ["background", "--background"],
  ["surface", "--surface"],
  ["surface-2", "--surface-2"],
  ["surface-3", "--surface-3"],
  ["text-1", "--text-1"],
  ["text-2", "--text-2"],
  ["text-3", "--text-3"],
  ["volt", "--volt"],
  ["pulse", "--pulse"],
  ["ember", "--ember"],
  ["dream", "--dream"],
  ["success", "--success"],
  ["warning", "--warning"],
  ["danger", "--danger"],
];
const TYPE: [string, string][] = [
  ["display-xl", "font-display text-display-xl font-extrabold"],
  ["display", "font-display text-display font-extrabold"],
  ["title-l", "font-display text-title-l font-extrabold"],
  ["title", "font-display text-title font-bold"],
  ["body", "text-body"],
  ["label", "text-label font-semibold"],
  ["caption", "text-caption text-muted-foreground"],
  ["micro / eyebrow", "eyebrow"],
];
const mood = [
  { icon: Angry, label: "Rough" },
  { icon: Frown, label: "Low" },
  { icon: Meh, label: "Okay" },
  { icon: Smile, label: "Good" },
  { icon: Laugh, label: "Great" },
];

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-12">
      <h2 className="eyebrow mb-4">{title}</h2>
      {children}
    </section>
  );
}

function Styleguide() {
  const [pref, setPref] = useThemePref();
  const [seg, setSeg] = useState<"week" | "month" | "year">("week");
  const [n, setN] = useState(1657);
  const [scale, setScale] = useState(4);
  const [on, setOn] = useState(true);
  return (
    <MotionConfig reducedMotion="user">
      <div className="app-backdrop min-h-dvh">
        <div className="mx-auto max-w-3xl px-5 pb-24 pt-6 lg:px-8">
          <PageHeader
            eyebrow="Kinra design system"
            title="Obsidian & Porcelain"
            action={
              <Segmented
                value={pref}
                onChange={(v) => setPref(v as ThemePref)}
                options={[
                  { value: "dark", label: "Dark" },
                  { value: "light", label: "Light" },
                  { value: "system", label: "Auto" },
                ]}
                className="w-64"
              />
            }
          />
          <p className="max-w-xl text-body text-muted-foreground">
            Graphite surfaces lit from above. Volt is a signal: the one primary action, live state,
            records and completed goals. Everything else is quiet.
          </p>

          <Block title="Color">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {COLORS.map(([name, v]) => (
                <div key={name} className="panel overflow-hidden p-0">
                  <div
                    className="h-16 border-b border-hairline"
                    style={{ background: `var(${v})` }}
                  />
                  <div className="p-3">
                    <div className="text-label font-semibold">{name}</div>
                    <div className="num text-caption text-faint">{v}</div>
                  </div>
                </div>
              ))}
            </div>
          </Block>

          <Block title="Type">
            <div className="panel space-y-4">
              {TYPE.map(([name, cls]) => (
                <div key={name} className="flex items-baseline gap-4">
                  <div className="num w-28 shrink-0 text-caption text-faint">{name}</div>
                  <div className={cls}>Train with intent</div>
                </div>
              ))}
              <Divider />
              <div className="flex flex-wrap items-baseline gap-6">
                <Value unit="kg" className="text-title-l font-semibold">
                  102.5
                </Value>
                <Value unit="kcal" className="text-title-l font-semibold">
                  1,657
                </Value>
                <Value unit="h" className="text-title-l font-semibold">
                  7.8
                </Value>
                <span className="num text-title-l font-semibold">4×6 · 6–8 · −2.1</span>
              </div>
            </div>
          </Block>

          <Block title="Elevation">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {["elev-0", "elev-1", "elev-2", "elev-3"].map((e) => (
                <div key={e} className={`${e} grid h-28 place-items-center rounded-card`}>
                  <span className="num text-caption text-muted-foreground">{e}</span>
                </div>
              ))}
            </div>
            <div className="glass mt-4 grid h-16 place-items-center rounded-full border border-hairline-strong">
              <span className="num text-caption text-muted-foreground">glass</span>
            </div>
          </Block>

          <Block title="Radii">
            <div className="flex flex-wrap items-end gap-4">
              {[
                ["sm 10", "rounded-sm"],
                ["md 14", "rounded-tile"],
                ["lg 22", "rounded-card"],
                ["xl 32", "rounded-sheet"],
                ["full", "rounded-full"],
              ].map(([l, c]) => (
                <div key={l} className="text-center">
                  <div className={`size-20 border border-hairline-strong bg-surface-2 ${c}`} />
                  <div className="num mt-2 text-caption text-faint">{l}</div>
                </div>
              ))}
            </div>
          </Block>

          <Block title="Motion">
            <div className="panel grid gap-2 sm:grid-cols-2">
              {Object.entries(dur).map(([k, v]) => (
                <div key={k} className="flex justify-between text-label">
                  <span>{k}</span>
                  <span className="num text-muted-foreground">{Math.round(v * 1000)} ms</span>
                </div>
              ))}
              <Divider className="sm:col-span-2" />
              {Object.entries(spring).map(([k, v]) => (
                <div key={k} className="flex justify-between text-label">
                  <span>{k}</span>
                  <span className="num text-muted-foreground">
                    {v.stiffness}/{v.damping}/{v.mass}
                  </span>
                </div>
              ))}
            </div>
          </Block>

          <Block title="Icons">
            <div className="flex flex-wrap items-center gap-6">
              {[16, 20, 24, 28].map((s) => (
                <div key={s} className="flex items-center gap-2">
                  <Dumbbell style={{ width: s, height: s }} strokeWidth={s <= 18 ? 2 : 1.75} />
                  <span className="num text-caption text-faint">{s}</span>
                </div>
              ))}
            </div>
          </Block>

          <Block title="Numbers & charts">
            <div className="grid gap-4 sm:grid-cols-2">
              <Panel>
                <Stat label="Eaten today" value={<NumberTicker value={n} />} unit="kcal" />
                <div className="mt-4 flex gap-2">
                  <Chip onClick={() => setN((x) => x + 248)}>+ Add meal</Chip>
                  <Chip onClick={() => setN((x) => Math.max(0, x - 248))}>Remove</Chip>
                </div>
              </Panel>
              <Panel className="flex items-center gap-5">
                <Ring value={0.82} size={104} stroke={9}>
                  <div className="num text-title font-semibold">82</div>
                </Ring>
                <div className="flex-1 space-y-3">
                  <ProgressBar value={0.64} label="Protein" />
                  <ProgressBar value={0.3} color="var(--pulse)" label="Water" />
                  <Segments total={6} done={2} current={2} />
                </div>
              </Panel>
              <Panel>
                <Bars
                  values={[4, 0, 6, 3, 0, 7, 5, 6, 0, 4, 8, 6, 5, 7]}
                  tip={(i) => `Day ${i + 1}`}
                  highlightLast
                />
              </Panel>
              <Panel className="flex items-center justify-between">
                <div>
                  <div className="text-label font-semibold">Back squat</div>
                  <div className="text-caption text-muted-foreground">Estimated max, 8 weeks</div>
                </div>
                <Sparkline values={[92, 94, 93, 97, 99, 98, 102, 105]} width={120} height={40} />
              </Panel>
            </div>
          </Block>

          <Block title="Controls">
            <div className="panel space-y-5">
              <Segmented
                value={seg}
                onChange={setSeg}
                options={[
                  { value: "week", label: "Week" },
                  { value: "month", label: "Month" },
                  { value: "year", label: "Year" },
                ]}
              />
              <div className="flex flex-wrap gap-2">
                <Chip active>Active</Chip>
                <Chip>Idle</Chip>
                <Tag tone="volt">
                  <Trophy className="size-3" /> PR
                </Tag>
                <Tag tone="pulse">Cardio</Tag>
                <Tag tone="ember">Ember</Tag>
                <Tag tone="danger">Missed</Tag>
                <Tag>Muted</Tag>
                <Badge count={3} />
              </div>
              <IconScale
                label="Mood"
                value={scale}
                onChange={setScale}
                options={mood}
                tone="text-pulse"
              />
              <label className="flex items-center justify-between">
                <span className="text-label font-semibold">Sounds</span>
                <Switch checked={on} onCheckedChange={setOn} />
              </label>
              <div className="flex items-center gap-3">
                <IconButton label="Add">
                  <Plus className="size-5" />
                </IconButton>
                <TextAction
                  onClick={() => toast("Logged.", { action: { label: "Undo", onClick: () => {} } })}
                >
                  Show toast
                </TextAction>
                <AvatarStack
                  people={[
                    { name: "Maya Chen" },
                    { name: "Rio Alvarez" },
                    { name: "Sam Okafor" },
                    { name: "Ana Ruiz" },
                    { name: "Lee Park" },
                  ]}
                />
                <Avatar name="Maya Chen" size={44} />
              </div>
              <PrimaryButton icon={<Activity className="size-5" />}>Start session</PrimaryButton>
              <SaveButton onSave={() => new Promise((r) => setTimeout(r, 700))}>
                Save session
              </SaveButton>
            </div>
          </Block>

          <Block title="Lists">
            <div className="panel overflow-hidden p-0">
              <ListRow
                leading={<Dumbbell className="size-5 text-foreground" />}
                title="Day A · Squat focus"
                detail="Thu 15 Oct · 52 min · RPE 8"
                trailing={
                  <Value unit="t" className="font-semibold">
                    8.4
                  </Value>
                }
                onClick={() => {}}
              />
              <Divider inset />
              <ListRow
                leading={<Utensils className="size-5 text-ember" />}
                title="Chicken & rice"
                detail="Lunch · 48 g protein"
                trailing={
                  <Value unit="kcal" className="font-semibold">
                    620
                  </Value>
                }
                onClick={() => {}}
              />
              <Divider inset />
              <ListRow
                leading={<Moon className="size-5 text-dream" />}
                title="Sleep"
                detail="Last night"
                trailing={
                  <Value unit="h" className="font-semibold">
                    7.8
                  </Value>
                }
              />
            </div>
          </Block>

          <Block title="States">
            <div className="grid gap-4 sm:grid-cols-2">
              <Empty
                icon={<Flame className="size-6" />}
                title="Your first session shows up here"
                body="Start a session and log sets as you go."
                action={<Chip active>Start session</Chip>}
              />
              <ErrorState onRetry={() => {}} />
              <div className="space-y-3">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-24 w-full !rounded-card" />
                <Skeleton className="h-16 w-full !rounded-card" />
              </div>
            </div>
          </Block>
          <SectionTitle>End of styleguide</SectionTitle>
        </div>
      </div>
    </MotionConfig>
  );
}
