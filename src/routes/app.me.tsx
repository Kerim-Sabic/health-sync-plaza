import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "motion/react";
import {
  Copy,
  LogOut,
  UserPlus,
  Dumbbell,
  Users,
  Camera,
  Trash2,
  Save,
  Loader2,
  MessageSquare,
  ChevronRight,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { useAct, useApi, useMe, useQ } from "@/lib/api";
import {
  Avatar,
  Divider,
  PageHeader,
  Panel,
  SectionTitle,
  Segmented,
} from "@/components/strata/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useAppView } from "@/components/strata/app-view";
import { Textarea } from "@/components/ui/textarea";
import { usePref } from "@/components/strata/session-extras";
import { InstallCard } from "@/components/strata/install";
import { useThemePref, type ThemePref } from "@/lib/theme";
import { press, spring } from "@/lib/motion";
import { feedback } from "@/lib/feedback";
import { cn } from "@/lib/utils";
import type { Me } from "@/lib/types";

export const Route = createFileRoute("/app/me")({
  head: () => ({
    meta: [
      { title: "Your profile — Kinra" },
      { name: "description", content: "Manage your Kinra profile and coach connection." },
      { property: "og:title", content: "Your profile — Kinra" },
      { property: "og:description", content: "Manage your Kinra profile and coach connection." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MePage,
});

function MePage() {
  const me = useMe().data;
  const { personal, setView } = useAppView();
  const api = useApi();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [theme, setTheme] = useThemePref();
  const [sound, setSound] = usePref("strata:sound");
  const trainer = useQ(["my-trainer"], (a) => a.myTrainer(), me?.role !== "trainer");
  const join = useAct((a, c: string) => a.joinTrainer(c));

  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    if (api.mode === "live") await supabase.auth.signOut();
    sessionStorage.removeItem("strata-demo");
    navigate({ to: "/", replace: true });
  };

  if (!me) return null;
  const coach = me.role === "trainer";
  return (
    <div className="mx-auto xl:max-w-[680px]">
      <PageHeader
        eyebrow={
          coach ? "Coach account" : me.role === "client" ? "Client account" : "Personal account"
        }
        title="Profile"
      />
      <Panel className="flex items-center gap-4">
        <Avatar name={me.display_name} src={me.avatar_url} size={72} />
        <div className="min-w-0">
          <div className="break-words font-display text-title font-bold">{me.display_name}</div>
          {me.goal && (
            <div className="mt-0.5 break-words text-label text-muted-foreground">{me.goal}</div>
          )}
          {me.bio && (
            <p className="mt-2 line-clamp-3 break-words text-label text-faint">{me.bio}</p>
          )}
        </div>
      </Panel>

      {coach && (
        <>
          <SectionTitle>App view</SectionTitle>
          <Segmented
            value={personal ? "personal" : "coach"}
            onChange={(v) => {
              setView(v);
              navigate({ to: "/app" });
            }}
            options={[
              { value: "coach", label: "Coaching" },
              { value: "personal", label: "My health" },
            ]}
          />
          <p className="mt-2 flex items-center gap-1.5 text-caption text-faint">
            {personal ? <Dumbbell className="size-3.5" /> : <Users className="size-3.5" />}
            {personal
              ? "Log your own training, food and sleep."
              : "Your clients, programs and reports."}
          </p>
        </>
      )}

      {coach && me.trainer_code && (
        <>
          <SectionTitle>Your coach code</SectionTitle>
          <Panel className="flex items-center justify-between">
            <div>
              <div className="num break-all text-title-l font-semibold tracking-[0.12em]">
                {me.trainer_code}
              </div>
              <p className="mt-1 text-caption text-faint">
                Clients enter this in their profile to connect with you.
              </p>
            </div>
            <motion.button
              whileTap={press.icon}
              type="button"
              aria-label="Copy code"
              onClick={() => {
                if (!me.trainer_code) return;
                void navigator.clipboard.writeText(me.trainer_code);
                feedback.success();
                setCopied(true);
                setTimeout(() => setCopied(false), 1600);
              }}
              className="grid size-11 place-items-center rounded-full bg-surface-2"
            >
              <motion.span
                key={String(copied)}
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={spring.bouncy}
              >
                {copied ? <Check className="size-5 text-volt" /> : <Copy className="size-5" />}
              </motion.span>
            </motion.button>
          </Panel>
        </>
      )}

      {!coach && (
        <>
          <SectionTitle>Your coach</SectionTitle>
          {trainer.data ? (
            <Panel className="p-0">
              <div className="flex items-center gap-3 p-4">
                <Avatar name={trainer.data.display_name} src={trainer.data.avatar_url} size={44} />
                <div className="min-w-0">
                  <div className="font-semibold">{trainer.data.display_name}</div>
                  <div className="text-caption text-faint">
                    Sees your logs and builds your programs
                  </div>
                </div>
              </div>
              <Divider />
              <Link
                to="/app/messages"
                className="flex min-h-[52px] items-center gap-3 px-4 text-label font-semibold transition-colors hover-device:bg-surface-2/50"
              >
                <MessageSquare className="size-5 text-faint" strokeWidth={1.75} />
                <span className="flex-1">Messages</span>
                <ChevronRight className="size-4 text-faint" />
              </Link>
            </Panel>
          ) : (
            <Panel>
              <div className="mb-3 text-label text-muted-foreground">
                Have a code from your coach?
              </div>
              <div className="flex gap-2">
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="ABC123"
                  className="num h-12 rounded-full border-hairline-strong bg-surface px-5 tracking-[0.2em]"
                  maxLength={6}
                  aria-label="Coach code"
                />
                <Button
                  variant="volt"
                  className="h-12 rounded-full px-5 shadow-none"
                  disabled={code.length < 6 || join.isPending}
                  onClick={() =>
                    join.mutate(code, {
                      onSuccess: (n) => (feedback.success(), toast.success(`Connected with ${n}`)),
                      onError: (e) => toast.error(e.message),
                    })
                  }
                >
                  <UserPlus /> Join
                </Button>
              </div>
            </Panel>
          )}
        </>
      )}

      <SectionTitle>Settings</SectionTitle>
      <Panel className="p-0">
        <div className="p-4">
          <div className="mb-3 text-label font-semibold">Appearance</div>
          <Segmented
            value={theme}
            onChange={(v) => setTheme(v as ThemePref)}
            options={[
              { value: "dark", label: "Dark" },
              { value: "light", label: "Light" },
              { value: "system", label: "Auto" },
            ]}
          />
        </div>
        <Divider />
        <label className="flex min-h-[60px] items-center justify-between gap-3 px-4">
          <span>
            <span className="block text-label font-semibold">Sounds</span>
            <span className="block text-caption text-faint">
              Soft tones for sets, rest and records
            </span>
          </span>
          <Switch checked={sound} onCheckedChange={(v) => (setSound(v), feedback.selection())} />
        </label>
      </Panel>
      <div className="mt-3">
        <InstallCard />
      </div>

      <SectionTitle>Details</SectionTitle>
      <ProfileEditor key={me.id} me={me} />

      <Button
        variant="ghost"
        className="mt-8 h-12 w-full rounded-full text-label font-semibold text-destructive"
        onClick={signOut}
      >
        <LogOut /> {api.mode === "live" ? "Sign out" : "Exit demo"}
      </Button>
    </div>
  );
}

function ProfileEditor({ me }: { me: Me }) {
  const [name, setName] = useState(me.display_name ?? "");
  const [goal, setGoal] = useState(me.goal ?? "");
  const [bio, setBio] = useState(me.bio ?? "");
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const save = useAct((api) =>
    api.updateProfile({ display_name: name.trim(), goal: goal.trim(), bio: bio.trim() }),
  );
  const photo = useAct((api, file: File | null) => api.setAvatar(file));
  const coach = me.role === "trainer";
  const choosePhoto = (file?: File) => {
    if (!file) return;
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
      file.size > 5 * 1024 * 1024
    ) {
      setError("Choose a JPG, PNG or WebP photo under 5 MB.");
      return;
    }
    setError(null);
    photo.mutate(file, {
      onSuccess: () => toast.success("Profile photo updated"),
      onError: (e) => setError(e.message),
    });
  };
  const field = "h-12 rounded-tile border-hairline-strong bg-surface text-body";
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        save.mutate(undefined, {
          onSuccess: () => (feedback.success(), toast.success("Profile updated")),
          onError: (e) => setError(e.message),
        });
      }}
      className="space-y-5"
    >
      <div className="flex flex-wrap gap-2">
        <input
          ref={fileInput}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          aria-label="Profile photo file"
          className="hidden"
          onChange={(e) => {
            choosePhoto(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        <Button
          type="button"
          variant="secondary"
          disabled={photo.isPending}
          className="h-11 rounded-full text-label font-semibold"
          onClick={() => fileInput.current?.click()}
        >
          {photo.isPending ? <Loader2 className="animate-spin" /> : <Camera />}Change photo
        </Button>
        {(me.avatar_url || me.avatar_path) && (
          <Button
            type="button"
            variant="ghost"
            disabled={photo.isPending}
            className="h-11 rounded-full text-label text-destructive"
            onClick={() =>
              photo.mutate(null, {
                onSuccess: () => toast.success("Photo removed"),
                onError: (e) => setError(e.message),
              })
            }
          >
            <Trash2 />
            Remove photo
          </Button>
        )}
      </div>
      <label className="block">
        <span className="mb-2 block text-label font-semibold">Display name</span>
        <Input
          required
          maxLength={80}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={field}
        />
      </label>
      <label className="block">
        <span className="mb-2 block text-label font-semibold">
          {coach ? "Your specialty" : "Your main goal"}
        </span>
        <Input
          maxLength={160}
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          placeholder={
            coach ? "e.g. Strength for busy professionals" : "What are you working toward?"
          }
          className={field}
        />
      </label>
      <label className="block">
        <span className="mb-2 block text-label font-semibold">
          {coach ? "Welcome message for new clients" : "About you"}
        </span>
        <Textarea
          maxLength={500}
          rows={4}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder={
            coach
              ? "New clients see this the first time they open Kinra."
              : "A little about your training and interests"
          }
          className={cn(field, "h-auto")}
        />
        {coach && (
          <span className="mt-1.5 block text-caption text-faint">
            Shown on a new client's first screen, next to your photo.
          </span>
        )}
      </label>
      {error && (
        <p role="alert" className="text-label text-destructive">
          {error}
        </p>
      )}
      <Button
        type="submit"
        variant="volt"
        disabled={!name.trim() || save.isPending || photo.isPending}
        className="h-14 w-full text-body"
      >
        {save.isPending ? <Loader2 className="animate-spin" /> : <Save />}
        Save profile
      </Button>
    </form>
  );
}
