import { createFileRoute, Link } from "@tanstack/react-router";
import { format } from "date-fns";
import { motion } from "motion/react";
import { useMe } from "@/lib/api";
import {
  ClientOverview,
  DayHero,
  FirstRun,
  Insights,
  PinnedCoachNote,
  StreakFlame,
  TodayTargets,
} from "@/components/strata/client-overview";
import { Avatar } from "@/components/strata/ui";
import { firstName } from "@/lib/stats";
import { CoachHome } from "@/components/strata/coach-overview";
import { CheckInCard } from "@/components/strata/check-in";
import { useAppView } from "@/components/strata/app-view";
import { tween, useIntro } from "@/lib/motion";

export const Route = createFileRoute("/app/")({
  head: () => ({
    meta: [
      { title: "Today — Kinra" },
      {
        name: "description",
        content: "Your daily training, recovery and coaching overview in Kinra.",
      },
      { property: "og:title", content: "Today — Kinra" },
      {
        property: "og:description",
        content: "Your daily training, recovery and coaching overview in Kinra.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Home,
});

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

function Home() {
  const me = useMe().data;
  const { personal } = useAppView();
  if (!me) return null;
  return me.role === "trainer" && !personal ? (
    <CoachHome name={me.display_name} avatar={me.avatar_url} />
  ) : (
    <ClientHome id={me.id} name={me.display_name} avatar={me.avatar_url} />
  );
}

function ClientHome({
  id,
  name,
  avatar,
}: {
  id: string;
  name: string | null;
  avatar?: string | undefined;
}) {
  const intro = useIntro();
  return (
    <div>
      <header className="pb-6 pt-3">
        <div className="flex min-h-11 items-center justify-between gap-3">
          <motion.div
            className="eyebrow"
            initial={intro ? { opacity: 0 } : false}
            animate={{ opacity: 1 }}
            transition={tween("slow")}
          >
            {format(new Date(), "EEEE d MMMM")}
          </motion.div>
          <div className="flex items-center gap-2">
            <StreakFlame userId={id} />
            <Link to="/app/me" aria-label="Profile" className="rounded-full lg:hidden">
              <Avatar name={name} src={avatar} size={40} />
            </Link>
          </div>
        </div>
        <motion.h1
          className="mt-1 font-display text-title-l font-extrabold"
          initial={intro ? { opacity: 0, y: 8 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...tween("deliberate", "emphasized"), delay: 0.05 }}
        >
          {greeting()}, {firstName(name)}
        </motion.h1>
      </header>
      <DayHero userId={id} />
      <TodayTargets userId={id} />
      <CheckInCard userId={id} />
      <FirstRun userId={id} />
      <PinnedCoachNote userId={id} />
      <Insights userId={id} />
      <ClientOverview userId={id} />
    </div>
  );
}
