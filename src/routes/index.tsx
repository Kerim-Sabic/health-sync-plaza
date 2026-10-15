import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { ArrowRight, Lock, MessageSquare, Sparkles, Waves } from "lucide-react";
import hero from "@/assets/hero.jpg";
import { CoachMock, ProgressMock, SessionMock, TodayMock } from "@/components/landing-mocks";
import { dur, ease, IntroOff, press, spring, tween } from "@/lib/motion";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Kinra — Private coaching, every day" },
      {
        name: "description",
        content:
          "Your coach's program, your sessions, recovery and every conversation, in one quietly brilliant app.",
      },
      { property: "og:title", content: "Kinra — Private coaching, every day" },
      {
        property: "og:description",
        content:
          "Your coach's program, your sessions, recovery and every conversation, in one quietly brilliant app.",
      },
      { property: "og:image", content: "/og-image.png" },
      { name: "twitter:image", content: "/og-image.png" },
    ],
  }),
  component: Landing,
});

/** Real quotes from clients go here. The section stays hidden while this is empty. */
const TESTIMONIALS: { quote: string; name: string; role: string }[] = [];

function useDemo() {
  const navigate = useNavigate();
  return (as: "client" | "trainer") => {
    sessionStorage.setItem("strata-demo", as);
    navigate({ to: "/app" });
  };
}

function Logo() {
  return (
    <div className="font-display text-title font-black tracking-tight [font-stretch:125%]">
      KINRA<span className="text-volt">.</span>
    </div>
  );
}

function Phone({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "relative aspect-[9/19.2] w-[300px] rounded-[52px] bg-[linear-gradient(160deg,oklch(0.32_0.006_265),oklch(0.16_0.005_265))] p-[3px] shadow-[0_40px_120px_-30px_rgba(0,0,0,0.85),0_0_0_1px_rgba(255,255,255,0.06)]",
        className,
      )}
    >
      <div className="relative h-full overflow-hidden rounded-[49px] bg-background ring-1 ring-black">
        <div className="absolute left-1/2 top-3 z-10 h-[26px] w-[92px] -translate-x-1/2 rounded-full bg-black" />
        <IntroOff.Provider value>{children}</IntroOff.Provider>
      </div>
    </div>
  );
}

/** Headline that rises in one line at a time. */
function RevealLines({ lines, className }: { lines: string[]; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <h1 className={className}>
      {lines.map((l, i) => (
        <span key={l} className="block overflow-hidden pb-[0.06em]">
          <motion.span
            className="block"
            initial={reduce ? { opacity: 0 } : { y: "105%" }}
            animate={reduce ? { opacity: 1 } : { y: 0 }}
            transition={{ duration: dur.cinematic, ease: ease.out, delay: 0.15 + i * 0.12 }}
          >
            {l}
          </motion.span>
        </span>
      ))}
    </h1>
  );
}

const CHAPTERS = [
  {
    key: "today",
    eyebrow: "Every morning",
    title: "A briefing written for you.",
    body: "Readiness from last night's sleep, today's session from your coach's program, and a note from them waiting at the top. One clear next step.",
    Mock: TodayMock,
  },
  {
    key: "session",
    eyebrow: "In the gym",
    title: "A session that knows you.",
    body: "Last week's weights already there, your coach's targets under every lift, a rest timer that floats out of the way, and the moment you hit a record, you'll feel it.",
    Mock: SessionMock,
  },
  {
    key: "progress",
    eyebrow: "Over the weeks",
    title: "Progress you can see.",
    body: "Trends that ignore the noise, a weekly story of what you did, private photos side by side and milestones that mean something.",
    Mock: ProgressMock,
  },
  {
    key: "coach",
    eyebrow: "For your coach",
    title: "Nothing slips through.",
    body: "Your coach sees who needs them in five seconds: missed sessions, low sleep, new records, check-ins waiting. Then answers in two taps.",
    Mock: CoachMock,
  },
];

/** Desktop scrollytelling: copy scrolls past a sticky phone that changes screens. */
function Story() {
  const [active, setActive] = useState(0);
  const refs = useRef<(HTMLDivElement | null)[]>([]);
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        const hit = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (hit) setActive(Number((hit.target as HTMLElement).dataset["i"]));
      },
      { rootMargin: "-40% 0px -40% 0px", threshold: [0, 0.25, 0.5, 1] },
    );
    refs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);
  const Mock = CHAPTERS[active]!.Mock;
  return (
    <section
      className="relative mx-auto hidden max-w-6xl grid-cols-[1fr_380px] gap-16 px-8 md:grid"
      aria-label="Inside Kinra"
    >
      <div>
        {CHAPTERS.map((c, i) => (
          <div
            key={c.key}
            ref={(el) => void (refs.current[i] = el)}
            data-i={i}
            className="flex min-h-[86vh] flex-col justify-center"
          >
            <motion.div animate={{ opacity: active === i ? 1 : 0.28 }} transition={tween("slow")}>
              <div className="eyebrow !text-volt">{c.eyebrow}</div>
              <h2 className="mt-4 max-w-lg font-display text-display font-extrabold">{c.title}</h2>
              <p className="mt-5 max-w-md text-title font-normal leading-relaxed text-muted-foreground">
                {c.body}
              </p>
            </motion.div>
          </div>
        ))}
      </div>
      <div className="sticky top-0 flex h-dvh items-center justify-center">
        <div className="[perspective:1600px]">
          <motion.div
            initial={{ rotateY: -12, rotateX: 4 }}
            whileInView={{ rotateY: -6, rotateX: 2 }}
            transition={spring.gentle}
            style={{ transformStyle: "preserve-3d" }}
          >
            <Phone>
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.div
                  key={active}
                  className="absolute inset-0"
                  initial={{ opacity: 0, scale: 1.02 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, transition: { duration: dur.fast } }}
                  transition={tween("slow")}
                >
                  <Mock />
                </motion.div>
              </AnimatePresence>
            </Phone>
          </motion.div>
          <div className="mt-6 flex justify-center gap-1.5" aria-hidden>
            {CHAPTERS.map((c, i) => (
              <motion.span
                key={c.key}
                animate={{ width: active === i ? 20 : 6, opacity: active === i ? 1 : 0.3 }}
                transition={spring.snappy}
                className="h-1.5 rounded-full bg-foreground"
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/** Mobile: each chapter with its own phone. */
function StoryMobile() {
  return (
    <section className="md:hidden" aria-label="Inside Kinra">
      {CHAPTERS.map((c) => (
        <motion.div
          key={c.key}
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-15%" }}
          transition={spring.gentle}
          className="px-6 py-16"
        >
          <div className="eyebrow !text-volt">{c.eyebrow}</div>
          <h2 className="mt-3 font-display text-title-l font-extrabold">{c.title}</h2>
          <p className="mt-3 text-body text-muted-foreground">{c.body}</p>
          <Phone className="mx-auto mt-10 w-[260px]">
            <c.Mock />
          </Phone>
        </motion.div>
      ))}
    </section>
  );
}

const PRINCIPLES = [
  {
    icon: Lock,
    title: "Private by design",
    body: "Your photos, notes and numbers are seen by you and your coach. Nobody else.",
  },
  {
    icon: MessageSquare,
    title: "Your coach, always close",
    body: "Programs, check-ins and conversation live in the same place you train.",
  },
  {
    icon: Waves,
    title: "Calm, not noisy",
    body: "No streak shaming, no feeds, no ads. Just the next right thing to do.",
  },
];

function Landing() {
  const demo = useDemo();
  const reduce = useReducedMotion();
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const imgY = useTransform(scrollYProgress, [0, 1], ["0%", reduce ? "0%" : "18%"]);
  const fade = useTransform(scrollYProgress, [0, 0.8], [1, reduce ? 1 : 0]);
  const [loaded, setLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  // The image can finish loading before hydration, when onLoad has no listener yet.
  useEffect(() => {
    if (imgRef.current?.complete) setLoaded(true);
  }, []);
  return (
    <div data-theme="dark" className="min-h-dvh overflow-x-clip bg-background text-foreground">
      <section ref={heroRef} className="relative h-[100svh] min-h-[640px] overflow-hidden">
        <motion.div className="absolute inset-0" style={{ y: imgY }}>
          <img
            ref={imgRef}
            src={hero}
            alt="Athlete preparing to deadlift under low green light"
            width={864}
            height={1280}
            fetchPriority="high"
            onLoad={() => setLoaded(true)}
            className={cn(
              "h-full w-full object-cover object-[50%_30%] transition-[opacity,filter,transform] duration-1000",
              loaded ? "scale-100 opacity-100 blur-0" : "scale-105 opacity-0 blur-md",
            )}
          />
        </motion.div>
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(12,13,16,0.55)_0%,rgba(12,13,16,0.15)_35%,rgba(12,13,16,0.85)_78%,#0c0d10_100%)]" />
        <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 pt-[max(20px,env(safe-area-inset-top))] md:px-8 md:pt-7">
          <Logo />
          <nav className="flex items-center gap-1">
            <Link
              to="/auth"
              className="flex min-h-[44px] items-center rounded-full px-4 text-label font-semibold text-white/80 transition-colors hover-device:text-white"
            >
              Sign in
            </Link>
          </nav>
        </header>
        <motion.div
          style={{ opacity: fade }}
          className="absolute inset-x-0 bottom-0 z-10 mx-auto max-w-6xl px-6 pb-[max(32px,env(safe-area-inset-bottom))] md:px-8 md:pb-20"
        >
          <motion.div
            className="eyebrow !text-volt"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ ...tween("slow"), delay: 0.05 }}
          >
            Private coaching, every day
          </motion.div>
          <RevealLines
            lines={["Coaching that", "never leaves", "your side."]}
            className="mt-4 font-display text-[3rem] font-extrabold leading-[0.95] tracking-[-0.025em] md:text-[5.5rem]"
          />
          <motion.p
            className="mt-6 max-w-md text-body text-white/75 md:text-title md:font-normal md:leading-relaxed"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...tween("deliberate", "emphasized"), delay: 0.65 }}
          >
            Your coach's program, your sessions, your recovery and every conversation, in one
            quietly brilliant app.
          </motion.p>
          <motion.div
            className="mt-8 flex flex-col gap-2 sm:flex-row"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...tween("deliberate", "emphasized"), delay: 0.8 }}
          >
            <motion.div whileTap={press.button}>
              <Link
                to="/auth"
                search={{ mode: "up" } as never}
                className="flex h-14 items-center justify-center gap-2 rounded-full bg-volt-gradient px-8 text-body font-semibold text-primary-foreground shadow-glow transition-[filter] hover-device:brightness-105"
              >
                Request access <ArrowRight className="size-5" />
              </Link>
            </motion.div>
            <motion.button
              whileTap={press.button}
              onClick={() => demo("client")}
              className="glass h-14 rounded-full border border-white/15 px-8 text-body font-semibold text-white transition-colors hover-device:bg-white/10"
            >
              Explore the app
            </motion.button>
          </motion.div>
        </motion.div>
      </section>

      <Story />
      <StoryMobile />

      <section
        className="mx-auto max-w-6xl px-6 py-20 md:px-8 md:py-32"
        aria-label="What we believe"
      >
        <div className="grid gap-3 md:grid-cols-3">
          {PRINCIPLES.map((p, i) => (
            <motion.div
              key={p.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-10%" }}
              transition={{ ...spring.gentle, delay: i * 0.06 }}
              className="panel p-7"
            >
              <p.icon className="size-5 text-volt" strokeWidth={1.75} />
              <h3 className="mt-6 font-display text-title font-bold">{p.title}</h3>
              <p className="mt-2 text-label text-muted-foreground">{p.body}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {TESTIMONIALS.length > 0 && (
        <section className="mx-auto max-w-6xl px-6 pb-24 md:px-8" aria-label="What clients say">
          <div className="grid gap-3 md:grid-cols-2">
            {TESTIMONIALS.map((t) => (
              <figure key={t.name} className="panel p-8">
                <blockquote className="text-title font-normal leading-relaxed">
                  “{t.quote}”
                </blockquote>
                <figcaption className="mt-6 text-label text-muted-foreground">
                  <span className="font-semibold text-foreground">{t.name}</span> · {t.role}
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}

      <section className="relative overflow-hidden border-t border-hairline">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(50%_70%_at_50%_100%,color-mix(in_oklab,var(--volt)_14%,transparent),transparent_70%)]"
        />
        <div className="relative mx-auto max-w-3xl px-6 py-24 text-center md:py-32">
          <Sparkles className="mx-auto size-6 text-volt" strokeWidth={1.75} />
          <h2 className="mt-6 font-display text-title-l font-extrabold md:text-display">
            Train with someone in your corner.
          </h2>
          <p className="mx-auto mt-4 max-w-md text-body text-muted-foreground">
            Start with your coach's code, or look around first.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-2 sm:flex-row">
            <Link
              to="/auth"
              search={{ mode: "up" } as never}
              className="flex h-14 items-center justify-center gap-2 rounded-full bg-volt-gradient px-8 text-body font-semibold text-primary-foreground shadow-glow"
            >
              Request access <ArrowRight className="size-5" />
            </Link>
            <button
              onClick={() => demo("trainer")}
              className="h-14 rounded-full border border-hairline-strong px-8 text-body font-semibold transition-colors hover-device:bg-surface-2"
            >
              See it as a coach
            </button>
          </div>
        </div>
      </section>

      <footer className="border-t border-hairline">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 px-6 py-10 pb-[max(40px,env(safe-area-inset-bottom))] text-caption text-faint md:flex-row md:items-center md:px-8">
          <Logo />
          <div className="flex items-center gap-5">
            <Link to="/auth" className="hover-device:text-foreground">
              Sign in
            </Link>
            <button onClick={() => demo("client")} className="hover-device:text-foreground">
              Demo
            </button>
            <span>© {new Date().getFullYear()} Kinra</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
