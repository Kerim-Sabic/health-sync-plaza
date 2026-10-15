import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  buildDemoStore,
  demoPeople,
  demoTrainer,
  DEMO_CLIENT_ID,
  DEMO_TRAINER_ID,
  type DemoStore,
} from "./demo-data";
import type {
  Assignment,
  CheckIn,
  CheckInAnswers,
  LogTable,
  LogTables,
  Me,
  Person,
  Program,
  ProgressPhoto,
  ProgressReport,
  ReportSummary,
  Role,
  TrainerNote,
} from "./types";
import demoBefore from "@/assets/demo-before.jpg";
import demoAfter from "@/assets/demo-after.jpg";
import { buildSummary } from "./report";
import { lookupFoodBarcode } from "./barcode.functions";
import type { BarcodeFood } from "./barcode";

export type Mode = "live" | "demo-client" | "demo-trainer";

export interface Api {
  mode: Mode;
  me(): Promise<Me>;
  setRole(role: Role): Promise<void>;
  updateProfile(p: { display_name?: string; goal?: string; bio?: string }): Promise<void>;
  setAvatar(file: File | null): Promise<void>;
  lookupBarcode(barcode: string): Promise<BarcodeFood | null>;
  list<T extends LogTable>(table: T, userId: string): Promise<LogTables[T][]>;
  insert<T extends LogTable>(table: T, row: Partial<LogTables[T]>): Promise<void>;
  remove(table: LogTable, id: string): Promise<void>;
  clients(): Promise<Person[]>;
  person(id: string): Promise<Person | null>;
  myTrainer(): Promise<Person | null>;
  joinTrainer(code: string): Promise<string>;
  programs(): Promise<Program[]>;
  saveProgram(p: Omit<Program, "id" | "trainer_id">): Promise<string>;
  updateProgram(id: string, p: Omit<Program, "id" | "trainer_id">): Promise<void>;
  assign(programId: string, clientId: string): Promise<void>;
  assignments(clientId: string): Promise<Assignment[]>;
  notes(clientId: string): Promise<TrainerNote[]>;
  addNote(clientId: string, body: string): Promise<void>;
  photos(userId: string): Promise<ProgressPhoto[]>;
  uploadPhoto(v: { file: File; pose: string; note?: string; taken_on?: string }): Promise<void>;
  removePhoto(p: ProgressPhoto): Promise<void>;
  reports(clientId: string): Promise<ProgressReport[]>;
  saveReport(v: {
    clientId: string;
    periodDays: number;
    summary: ReportSummary;
    comment: string;
  }): Promise<void>;
  /** Client replies to their coach on the shared notes thread. */
  reply(body: string): Promise<void>;
  /** Live updates for a client's notes thread; returns an unsubscribe. */
  subscribeNotes(clientId: string, onChange: () => void): () => void;
  checkIns(clientId: string): Promise<CheckIn[]>;
  submitCheckIn(v: CheckInAnswers & { week_start: string }): Promise<void>;
  replyCheckIn(id: string, reply: string): Promise<void>;
}

/** Features that need the 0003 migration degrade gently until it is applied. */
const MIGRATION_NEEDED =
  "This needs the latest database update. Apply migration 0003 to switch it on.";
const missingTable = (e: { message: string; code?: string } | null) =>
  !!e &&
  (e.code === "42P01" ||
    e.code === "PGRST205" ||
    e.code === "42703" ||
    /does not exist|schema cache/i.test(e.message));

const sortKey: Record<LogTable, string> = {
  workouts: "performed_at",
  sleep_logs: "log_date",
  nutrition_logs: "log_date",
  journal_entries: "created_at",
  body_metrics: "log_date",
};

function must<T>(r: { data: T | null; error: { message: string } | null }): T {
  if (r.error) throw new Error(r.error.message);
  return r.data as T;
}

async function uid() {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Not signed in");
  return data.user.id;
}

async function withAvatar<T extends Person>(person: T): Promise<T> {
  if (!person.avatar_path) return person;
  const { data } = await supabase.storage
    .from("profile-avatars")
    .createSignedUrl(person.avatar_path, 3600);
  return { ...person, avatar_url: data?.signedUrl };
}

const liveApi: Api = {
  mode: "live",
  async me() {
    const id = await uid();
    const [p, r] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, display_name, goal, trainer_code, bio, avatar_path")
        .eq("id", id)
        .maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", id).maybeSingle(),
    ]);
    const prof = must(p) ?? { id, display_name: null, goal: null, trainer_code: null };
    return withAvatar({ ...prof, role: (must(r)?.role as Role) ?? null });
  },
  async setRole(role) {
    const id = await uid();
    must(await supabase.from("user_roles").insert({ user_id: id, role }));
  },
  async updateProfile(p) {
    const id = await uid();
    must(await supabase.from("profiles").update(p).eq("id", id));
  },
  lookupBarcode: (barcode) => lookupFoodBarcode({ data: { barcode } }),
  async setAvatar(file) {
    const id = await uid();
    const current = must(
      await supabase.from("profiles").select("avatar_path").eq("id", id).maybeSingle(),
    ) as { avatar_path: string | null } | null;
    let path: string | null = null;
    if (file) {
      if (
        !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
        file.size > 5 * 1024 * 1024
      )
        throw new Error("Choose a JPG, PNG or WebP photo under 5 MB.");
      path = `${id}/${crypto.randomUUID()}.${file.type.split("/")[1]}`;
      const upload = await supabase.storage
        .from("profile-avatars")
        .upload(path, file, { contentType: file.type });
      if (upload.error) throw new Error(upload.error.message);
    }
    const result = await supabase
      .from("profiles")
      .update({ avatar_path: path })
      .eq("id", id)
      .select("id");
    if (result.error || !result.data?.length) {
      if (path) await supabase.storage.from("profile-avatars").remove([path]);
      throw new Error("Couldn't update your photo. Try again.");
    }
    if (current?.avatar_path)
      await supabase.storage.from("profile-avatars").remove([current.avatar_path]);
  },
  async list(table, userId) {
    const r = await supabase
      .from(table as "workouts")
      .select("*")
      .eq("user_id", userId)
      .order(sortKey[table], { ascending: false })
      .limit(500);
    return must(r) as never;
  },
  async insert(table, row) {
    must(await supabase.from(table).insert(row as never));
  },
  async remove(table, id) {
    must(await supabase.from(table).delete().eq("id", id));
  },
  async clients() {
    const id = await uid();
    const links = must(
      await supabase.from("trainer_clients").select("client_id").eq("trainer_id", id),
    );
    if (!links.length) return [];
    const people = must(
      await supabase
        .from("profiles")
        .select("id, display_name, goal, bio, avatar_path")
        .in(
          "id",
          links.map((l) => l.client_id),
        ),
    );
    return Promise.all(people.map(withAvatar));
  },
  async person(id) {
    const person = must(
      await supabase
        .from("profiles")
        .select("id, display_name, goal, bio, avatar_path")
        .eq("id", id)
        .maybeSingle(),
    );
    return person ? withAvatar(person) : null;
  },
  async myTrainer() {
    const id = await uid();
    const link = must(
      await supabase
        .from("trainer_clients")
        .select("trainer_id")
        .eq("client_id", id)
        .limit(1)
        .maybeSingle(),
    );
    if (!link) return null;
    const person = must(
      await supabase
        .from("profiles")
        .select("id, display_name, goal, bio, avatar_path")
        .eq("id", (link as { trainer_id: string }).trainer_id)
        .maybeSingle(),
    );
    return person ? withAvatar(person) : null;
  },
  async joinTrainer(code) {
    const id = await uid();
    const found = must(await supabase.rpc("find_trainer_by_code", { _code: code.trim() }));
    const t = found?.[0];
    if (!t) throw new Error("No coach found with that code");
    must(await supabase.from("trainer_clients").insert({ trainer_id: t.id, client_id: id }));
    return t.display_name ?? "your coach";
  },
  async programs() {
    return must(
      await supabase.from("programs").select("*").order("created_at", { ascending: false }),
    ) as unknown as Program[];
  },
  async saveProgram(p) {
    const id = crypto.randomUUID();
    must(await supabase.from("programs").insert({ ...p, id, days: p.days as never }));
    return id;
  },
  async updateProgram(id, p) {
    const rows = must(
      await supabase
        .from("programs")
        .update({ ...p, days: p.days as never })
        .eq("id", id)
        .select("id"),
    );
    if (!rows.length)
      throw new Error("This program couldn't be updated. Your saved plan is unchanged.");
  },
  async assign(programId, clientId) {
    must(
      await supabase
        .from("program_assignments")
        .insert({ program_id: programId, client_id: clientId }),
    );
  },
  async assignments(clientId) {
    return must(
      await supabase
        .from("program_assignments")
        .select("*")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false }),
    );
  },
  async notes(clientId) {
    return must(
      await supabase
        .from("trainer_notes")
        .select("*")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false }),
    );
  },
  async addNote(clientId, body) {
    must(await supabase.from("trainer_notes").insert({ client_id: clientId, body }));
  },
  async photos(userId) {
    const rows = must(
      await supabase
        .from("progress_photos")
        .select("*")
        .eq("user_id", userId)
        .order("taken_on", { ascending: false }),
    );
    if (!rows.length) return [];
    const { data: signed, error } = await supabase.storage.from("progress-photos").createSignedUrls(
      rows.map((r) => r.storage_path),
      3600,
    );
    if (error) throw new Error(error.message);
    return rows.map((r, i) => ({ ...r, url: signed?.[i]?.signedUrl ?? "" }));
  },
  async uploadPhoto({ file, pose, note, taken_on }) {
    const id = await uid();
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const path = `${id}/${crypto.randomUUID()}.${ext}`;
    const up = await supabase.storage
      .from("progress-photos")
      .upload(path, file, { contentType: file.type });
    if (up.error) throw new Error(up.error.message);
    must(
      await supabase.from("progress_photos").insert({
        storage_path: path,
        pose,
        note: note || null,
        ...(taken_on ? { taken_on } : {}),
      }),
    );
  },
  async removePhoto(p) {
    await supabase.storage.from("progress-photos").remove([p.storage_path]);
    must(await supabase.from("progress_photos").delete().eq("id", p.id));
  },
  async reports(clientId) {
    return must(
      await supabase
        .from("progress_reports")
        .select("*")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false }),
    ) as unknown as ProgressReport[];
  },
  async saveReport({ clientId, periodDays, summary, comment }) {
    must(
      await supabase.from("progress_reports").insert({
        client_id: clientId,
        period_days: periodDays,
        summary: summary as never,
        comment: comment || null,
      }),
    );
  },
  async reply(body) {
    const id = await uid();
    const link = must(
      await supabase
        .from("trainer_clients")
        .select("trainer_id")
        .eq("client_id", id)
        .limit(1)
        .maybeSingle(),
    ) as { trainer_id: string } | null;
    if (!link) throw new Error("Connect with your coach first.");
    const r = await supabase.from("trainer_notes").insert({
      trainer_id: link.trainer_id,
      client_id: id,
      body,
      from_client: true,
      shared: true,
    });
    if (missingTable(r.error)) throw new Error(MIGRATION_NEEDED);
    must(r);
  },
  subscribeNotes(clientId, onChange) {
    const ch = supabase
      .channel(`notes:${clientId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "trainer_notes",
          filter: `client_id=eq.${clientId}`,
        },
        () => onChange(),
      )
      .subscribe();
    return () => void supabase.removeChannel(ch);
  },
  async checkIns(clientId) {
    const r = await supabase
      .from("check_ins")
      .select("*")
      .eq("client_id", clientId)
      .order("week_start", { ascending: false });
    if (missingTable(r.error)) return [];
    return must(r) as CheckIn[];
  },
  async submitCheckIn(v) {
    const r = await supabase.from("check_ins").insert(v);
    if (missingTable(r.error)) throw new Error(MIGRATION_NEEDED);
    if (r.error?.code === "23505") throw new Error("You've already checked in this week.");
    must(r);
  },
  async replyCheckIn(id, reply) {
    const r = await supabase
      .from("check_ins")
      .update({ coach_reply: reply })
      .eq("id", id)
      .select("id");
    if (missingTable(r.error)) throw new Error(MIGRATION_NEEDED);
    if (!must(r).length) throw new Error("This check-in couldn't be updated.");
  },
};

const dAgo = (n: number) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
const demoPhotos: ProgressPhoto[] = [
  {
    id: "ph-2",
    user_id: DEMO_CLIENT_ID,
    taken_on: dAgo(2),
    pose: "Front",
    storage_path: "",
    note: "Week 5 check-in",
    url: demoAfter,
  },
  {
    id: "ph-1",
    user_id: DEMO_CLIENT_ID,
    taken_on: dAgo(34),
    pose: "Front",
    storage_path: "",
    note: "Day 1",
    url: demoBefore,
  },
];
const demoReports: ProgressReport[] = [];
const demoProfiles = new Map<string, Partial<Person>>();
const demoProfile = (p: Person): Person => ({ ...p, ...demoProfiles.get(p.id) });

let store: DemoStore | null = null;
const db = () => (store ??= buildDemoStore());
const rid = () => Math.random().toString(36).slice(2, 11);
const demoListeners = new Map<string, Set<() => void>>();
const demoReplies = [
  "Got it. I'll adjust Thursday's session around that.",
  "Love that. Keep the same bracing on deadlifts too.",
  "Thanks for flagging it. Let's keep tomorrow easy and reassess.",
];

function demoApi(mode: "demo-client" | "demo-trainer"): Api {
  const isTrainer = mode === "demo-trainer";
  const meId = isTrainer ? DEMO_TRAINER_ID : DEMO_CLIENT_ID;
  return {
    mode,
    async me() {
      const base = isTrainer ? demoTrainer : demoPeople[0];
      if (!base) throw new Error("Demo profile unavailable");
      const p = demoProfile(base);
      return {
        ...p,
        trainer_code: isTrainer ? "RIO42X" : null,
        role: isTrainer ? "trainer" : "client",
      };
    },
    async setRole() {},
    async updateProfile(p) {
      demoProfiles.set(meId, { ...demoProfiles.get(meId), ...p });
    },
    lookupBarcode: (barcode) => lookupFoodBarcode({ data: { barcode } }),
    async setAvatar(file) {
      const previous = demoProfiles.get(meId)?.avatar_url;
      if (previous) URL.revokeObjectURL(previous);
      demoProfiles.set(meId, {
        ...demoProfiles.get(meId),
        avatar_url: file ? URL.createObjectURL(file) : undefined,
      });
    },
    async list(table, userId) {
      const k = sortKey[table] as never;
      return (db()[table] as never[])
        .filter((r: { user_id: string }) => r.user_id === userId)
        .sort((a, b) => String(b[k]).localeCompare(String(a[k]))) as never;
    },
    async insert(table, row) {
      const now = new Date().toISOString();
      (db()[table] as unknown[]).push({
        id: rid(),
        user_id: meId,
        log_date: now.slice(0, 10),
        created_at: now,
        performed_at: now,
        ...row,
      });
    },
    async remove(table, id) {
      const arr = db()[table] as { id: string }[];
      const i = arr.findIndex((r) => r.id === id);
      if (i >= 0) arr.splice(i, 1);
    },
    async clients() {
      return isTrainer ? demoPeople.map(demoProfile) : [];
    },
    async person(id) {
      const p = [...demoPeople, demoTrainer].find((x) => x.id === id);
      return p ? demoProfile(p) : null;
    },
    async myTrainer() {
      return isTrainer ? null : demoProfile(demoTrainer);
    },
    async joinTrainer() {
      return demoTrainer.display_name!;
    },
    async programs() {
      if (isTrainer) return db().programs;
      const ids = db()
        .assignments.filter((a) => a.client_id === meId)
        .map((a) => a.program_id);
      return db().programs.filter((p) => ids.includes(p.id));
    },
    async saveProgram(p) {
      const id = rid();
      db().programs.unshift({ ...structuredClone(p), id, trainer_id: meId });
      return id;
    },
    async updateProgram(id, p) {
      const index = db().programs.findIndex(
        (program) => program.id === id && program.trainer_id === meId,
      );
      const current = db().programs[index];
      if (!current) throw new Error("This program couldn't be updated.");
      db().programs[index] = { ...current, ...structuredClone(p) };
    },
    async assign(programId, clientId) {
      db().assignments.unshift({
        id: rid(),
        program_id: programId,
        client_id: clientId,
        trainer_id: meId,
        start_date: new Date().toISOString().slice(0, 10),
      });
    },
    async assignments(clientId) {
      return db().assignments.filter((a) => a.client_id === clientId);
    },
    async notes(clientId) {
      return db()
        .notes.filter((n) => n.client_id === clientId)
        .sort((a, b) => b.created_at.localeCompare(a.created_at));
    },
    async addNote(clientId, body) {
      db().notes.unshift({
        id: rid(),
        trainer_id: meId,
        client_id: clientId,
        body,
        shared: true,
        created_at: new Date().toISOString(),
      });
    },
    async photos(userId) {
      return demoPhotos
        .filter((p) => p.user_id === userId)
        .sort((a, b) => b.taken_on.localeCompare(a.taken_on));
    },
    async uploadPhoto({ file, pose, note, taken_on }) {
      demoPhotos.unshift({
        id: rid(),
        user_id: meId,
        taken_on: taken_on ?? dAgo(0),
        pose,
        storage_path: "",
        note: note ?? null,
        url: URL.createObjectURL(file),
      });
    },
    async removePhoto(p) {
      const i = demoPhotos.findIndex((x) => x.id === p.id);
      if (i >= 0) demoPhotos.splice(i, 1);
    },
    async reports(clientId) {
      if (!demoReports.length) {
        const d = db();
        const mine = <T extends { user_id: string }>(a: T[]) =>
          a.filter((x) => x.user_id === DEMO_CLIENT_ID);
        demoReports.push({
          id: "rep-1",
          trainer_id: DEMO_TRAINER_ID,
          client_id: DEMO_CLIENT_ID,
          period_days: 30,
          created_at: new Date(Date.now() - 86400000).toISOString(),
          summary: buildSummary(
            {
              workouts: mine(d.workouts),
              sleep: mine(d.sleep_logs),
              food: mine(d.nutrition_logs),
              journal: mine(d.journal_entries),
              metrics: mine(d.body_metrics),
            },
            30,
          ),
          comment:
            "Huge month, Maya. Squat and deadlift both moving up, and your photos show it. Next block: prioritise sleep on Sundays and we push for the pull-up.",
        });
      }
      return demoReports.filter((r) => r.client_id === clientId);
    },
    async saveReport({ clientId, periodDays, summary, comment }) {
      demoReports.unshift({
        id: rid(),
        trainer_id: DEMO_TRAINER_ID,
        client_id: clientId,
        period_days: periodDays,
        summary,
        comment,
        created_at: new Date().toISOString(),
      });
    },
    async reply(body) {
      db().notes.unshift({
        id: rid(),
        trainer_id: DEMO_TRAINER_ID,
        client_id: meId,
        body,
        shared: true,
        from_client: true,
        created_at: new Date().toISOString(),
      });
      // The demo coach answers a moment later, so prospects can feel the thread come alive.
      setTimeout(() => {
        db().notes.unshift({
          id: rid(),
          trainer_id: DEMO_TRAINER_ID,
          client_id: meId,
          body: demoReplies[db().notes.length % demoReplies.length]!,
          shared: true,
          created_at: new Date().toISOString(),
        });
        demoListeners.get(meId)?.forEach((f) => f());
      }, 2600);
    },
    subscribeNotes(clientId, onChange) {
      const set = demoListeners.get(clientId) ?? new Set<() => void>();
      set.add(onChange);
      demoListeners.set(clientId, set);
      return () => void set.delete(onChange);
    },
    async checkIns(clientId) {
      return db()
        .check_ins.filter((c) => c.client_id === clientId)
        .sort((a, b) => b.week_start.localeCompare(a.week_start));
    },
    async submitCheckIn(v) {
      if (db().check_ins.some((c) => c.client_id === meId && c.week_start === v.week_start))
        throw new Error("You've already checked in this week.");
      db().check_ins.unshift({
        id: rid(),
        client_id: meId,
        coach_reply: null,
        replied_at: null,
        created_at: new Date().toISOString(),
        ...v,
      });
    },
    async replyCheckIn(id, reply) {
      const c = db().check_ins.find((x) => x.id === id);
      if (!c) throw new Error("This check-in couldn't be updated.");
      c.coach_reply = reply;
      c.replied_at = new Date().toISOString();
    },
  };
}

const ApiCtx = createContext<Api>(liveApi);

export function ApiProvider({ mode, children }: { mode: Mode; children: ReactNode }) {
  const api = useMemo(() => (mode === "live" ? liveApi : demoApi(mode)), [mode]);
  return <ApiCtx.Provider value={api}>{children}</ApiCtx.Provider>;
}
export const useApi = () => useContext(ApiCtx);

export function useMe() {
  const api = useApi();
  return useQuery({ queryKey: [api.mode, "me"], queryFn: () => api.me() });
}
export function useLog<T extends LogTable>(table: T, userId: string | undefined) {
  const api = useApi();
  return useQuery({
    queryKey: [api.mode, table, userId],
    queryFn: () => api.list(table, userId!),
    enabled: !!userId,
  });
}
export function useQ<T>(key: unknown[], fn: (api: Api) => Promise<T>, enabled = true) {
  const api = useApi();
  return useQuery({ queryKey: [api.mode, ...key], queryFn: () => fn(api), enabled });
}
export function useAct<V>(fn: (api: Api, v: V) => Promise<unknown>) {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: V) => fn(api, v),
    onSuccess: () => qc.invalidateQueries({ queryKey: [api.mode] }),
  });
}
