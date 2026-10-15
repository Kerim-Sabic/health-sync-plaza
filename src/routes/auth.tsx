import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Eye, EyeOff, Loader2, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import hero from "@/assets/hero.jpg";
import { exitTween, press, spring, tween } from "@/lib/motion";
import { feedback } from "@/lib/feedback";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Sign in — Kinra" },
      { name: "description", content: "Sign in or create your Kinra account." },
      { property: "og:title", content: "Sign in — Kinra" },
      { property: "og:description", content: "Sign in or create your Kinra account." },
    ],
  }),
  component: AuthPage,
});

type Mode = "in" | "up" | "link";

function friendly(message: string) {
  if (/invalid login/i.test(message))
    return "That email and password don't match. Try again, or use a sign-in link.";
  if (/already registered|already exists/i.test(message))
    return "There's already an account with this email. Sign in instead.";
  if (/rate limit|too many/i.test(message))
    return "Too many attempts. Give it a minute, then try again.";
  if (/network|fetch/i.test(message))
    return "You seem to be offline. Check your connection, then try again.";
  return message;
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string | null | undefined;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-label font-semibold">{label}</span>
      {children}
      <AnimatePresence initial={false}>
        {error && (
          <motion.span
            key={error}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, transition: exitTween("fast") }}
            transition={tween("fast")}
            className="mt-1.5 block text-caption text-destructive"
            role="alert"
          >
            {error}
          </motion.span>
        )}
      </AnimatePresence>
    </label>
  );
}

const input =
  "h-13 w-full rounded-tile border border-hairline-strong bg-surface px-4 text-body outline-none transition-colors placeholder:text-faint focus:border-volt/60 aria-[invalid=true]:border-destructive/60";

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<null | "confirm" | "link">(null);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("mode") === "up") setMode("up");
    sessionStorage.removeItem("strata-demo");
    supabase.auth.getUser().then(({ data }) => data.user && navigate({ to: "/app" }));
    const { data } = supabase.auth.onAuthStateChange((e, s) => {
      if (e === "SIGNED_IN" && s) navigate({ to: "/app" });
    });
    return () => data.subscription.unsubscribe();
  }, [navigate]);

  const emailError =
    touched["email"] && !/^\S+@\S+\.\S+$/.test(email) ? "Enter a valid email address." : null;
  const passError =
    mode !== "link" && touched["password"] && password.length < 6
      ? "Use at least 6 characters."
      : null;
  const nameError =
    mode === "up" && touched["name"] && !name.trim() ? "Tell us what to call you." : null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ email: true, password: true, name: true });
    if (
      !/^\S+@\S+\.\S+$/.test(email) ||
      (mode !== "link" && password.length < 6) ||
      (mode === "up" && !name.trim())
    )
      return void feedback.error();
    setBusy(true);
    setError(null);
    try {
      if (mode === "up") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin + "/app",
            data: { display_name: name.trim() },
          },
        });
        if (error) throw error;
        if (!data.session) setSent("confirm");
      } else if (mode === "link") {
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: { emailRedirectTo: window.location.origin + "/app", shouldCreateUser: false },
        });
        if (error) throw error;
        setSent("link");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      feedback.success();
    } catch (err) {
      feedback.error();
      setError(friendly((err as Error).message));
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    feedback.impactLight();
    const r = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin + "/auth",
    });
    if (r.error) setError(friendly(r.error.message));
  };

  const title =
    mode === "up"
      ? "Create your account"
      : mode === "link"
        ? "Sign in with a link"
        : "Welcome back";
  const sub =
    mode === "up"
      ? "You'll choose how you use Kinra next."
      : mode === "link"
        ? "We'll email you a one-tap sign-in link."
        : "Sign in to pick up where you left off.";

  return (
    <div
      data-theme="dark"
      className="grid min-h-dvh bg-background text-foreground lg:grid-cols-[1fr_minmax(480px,560px)]"
    >
      <div className="relative hidden overflow-hidden lg:block">
        <img
          src={hero}
          alt=""
          width={864}
          height={1280}
          className="absolute inset-0 h-full w-full object-cover object-[50%_30%]"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(12,13,16,0.3),rgba(12,13,16,0.85))]" />
        <div className="absolute inset-x-12 bottom-12">
          <p className="max-w-md font-display text-title-l font-extrabold leading-tight">
            Every session, every night, every note from your coach. In one place.
          </p>
        </div>
      </div>
      <div className="flex min-h-dvh flex-col px-6 pb-[max(24px,env(safe-area-inset-bottom))] pt-[max(20px,env(safe-area-inset-top))] sm:px-12">
        <Link to="/" className="font-display text-title font-black [font-stretch:125%]">
          KINRA<span className="text-volt">.</span>
        </Link>
        <div className="mx-auto my-auto w-full max-w-sm py-10">
          <AnimatePresence mode="wait" initial={false}>
            {sent ? (
              <motion.div
                key="sent"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={spring.smooth}
              >
                <div className="grid size-14 place-items-center rounded-full bg-volt/15 text-volt">
                  <Mail className="size-6" strokeWidth={1.75} />
                </div>
                <h1 className="mt-6 font-display text-title-l font-extrabold">Check your inbox</h1>
                <p className="mt-2 text-body text-muted-foreground">
                  We sent a {sent === "link" ? "sign-in" : "confirmation"} link to{" "}
                  <span className="text-foreground">{email}</span>. Open it on this device to
                  continue.
                </p>
                <button
                  type="button"
                  onClick={() => (setSent(null), setMode("in"))}
                  className="mt-8 text-label font-semibold text-primary"
                >
                  Use a different email
                </button>
              </motion.div>
            ) : (
              <motion.div
                key={mode}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, transition: exitTween("fast") }}
                transition={spring.smooth}
              >
                <h1 className="font-display text-title-l font-extrabold">{title}</h1>
                <p className="mt-2 text-label text-muted-foreground">{sub}</p>
                {mode !== "link" && (
                  <>
                    <motion.button
                      whileTap={press.button}
                      type="button"
                      onClick={google}
                      className="mt-8 flex h-13 w-full items-center justify-center gap-3 rounded-full border border-hairline-strong bg-surface text-label font-semibold transition-colors hover-device:bg-surface-2"
                    >
                      <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
                        <path
                          fill="#4285F4"
                          d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.7z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 24c3.2 0 6-1.1 7.9-2.9l-3.9-3c-1.1.7-2.4 1.2-4 1.2-3.1 0-5.7-2.1-6.6-4.9h-4v3.1A12 12 0 0 0 12 24z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.4 14.3a7.2 7.2 0 0 1 0-4.6V6.6h-4a12 12 0 0 0 0 10.8l4-3.1z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.4 6.6l4 3.1C6.3 6.9 8.9 4.8 12 4.8z"
                        />
                      </svg>
                      Continue with Google
                    </motion.button>
                    <div className="my-6 flex items-center gap-3 text-caption text-faint">
                      <div className="h-px flex-1 bg-hairline" />
                      or with email
                      <div className="h-px flex-1 bg-hairline" />
                    </div>
                  </>
                )}
                <form
                  onSubmit={submit}
                  noValidate
                  className={cn("space-y-4", mode === "link" && "mt-8")}
                >
                  {mode === "up" && (
                    <Field label="Your name" error={nameError}>
                      <input
                        autoComplete="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        onBlur={() => setTouched((t) => ({ ...t, name: true }))}
                        aria-invalid={!!nameError}
                        placeholder="Maya Chen"
                        className={input}
                      />
                    </Field>
                  )}
                  <Field label="Email" error={emailError}>
                    <input
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value.trim())}
                      onBlur={() => setTouched((t) => ({ ...t, email: true }))}
                      aria-invalid={!!emailError}
                      placeholder="you@example.com"
                      className={input}
                    />
                  </Field>
                  {mode !== "link" && (
                    <Field label="Password" error={passError}>
                      <span className="relative block">
                        <input
                          type={show ? "text" : "password"}
                          autoComplete={mode === "up" ? "new-password" : "current-password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          onBlur={() => setTouched((t) => ({ ...t, password: true }))}
                          aria-invalid={!!passError}
                          placeholder={mode === "up" ? "At least 6 characters" : "Your password"}
                          className={cn(input, "pr-12")}
                        />
                        <button
                          type="button"
                          onClick={() => setShow((v) => !v)}
                          aria-label={show ? "Hide password" : "Show password"}
                          className="absolute right-1.5 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full text-faint transition-colors hover-device:text-foreground"
                        >
                          {show ? (
                            <EyeOff className="size-5" strokeWidth={1.75} />
                          ) : (
                            <Eye className="size-5" strokeWidth={1.75} />
                          )}
                        </button>
                      </span>
                    </Field>
                  )}
                  <AnimatePresence initial={false}>
                    {error && (
                      <motion.p
                        key={error}
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="rounded-tile bg-destructive/10 px-4 py-3 text-label text-destructive"
                        role="alert"
                      >
                        {error}
                      </motion.p>
                    )}
                  </AnimatePresence>
                  <motion.button
                    whileTap={press.button}
                    type="submit"
                    disabled={busy}
                    className="flex h-14 w-full items-center justify-center gap-2 rounded-full bg-volt-gradient text-body font-semibold text-primary-foreground shadow-glow transition-[filter,opacity] hover-device:brightness-105 disabled:opacity-70"
                  >
                    {busy ? <Loader2 className="size-5 animate-spin" /> : null}
                    {mode === "up"
                      ? "Create account"
                      : mode === "link"
                        ? "Email me a link"
                        : "Sign in"}
                    {!busy && <ArrowRight className="size-5" />}
                  </motion.button>
                </form>
                <div className="mt-6 space-y-3 text-center text-label text-muted-foreground">
                  {mode === "in" && (
                    <button
                      type="button"
                      onClick={() => (setMode("link"), setError(null))}
                      className="block w-full font-semibold text-foreground"
                    >
                      Email me a sign-in link instead
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => (
                      setMode(mode === "up" ? "in" : mode === "link" ? "in" : "up"),
                      setError(null),
                      setTouched({})
                    )}
                    className="block w-full"
                  >
                    {mode === "up"
                      ? "Already have an account? "
                      : mode === "link"
                        ? "Use your password? "
                        : "New to Kinra? "}
                    <span className="font-semibold text-primary">
                      {mode === "up"
                        ? "Sign in"
                        : mode === "link"
                          ? "Sign in"
                          : "Create an account"}
                    </span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <p className="text-center text-caption text-faint">
          Private by design. Your data is seen by you and your coach.
        </p>
      </div>
    </div>
  );
}
