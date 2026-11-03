"use client";

import { signOut, type User } from "firebase/auth";
import { useRouter } from "next/navigation";
import {
  type Dispatch,
  type SetStateAction,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { AI_KEY_PROBLEM, ApiError, api, errorMessage } from "@/lib/api";
import { firebaseAuth } from "@/lib/firebase";
import { type AiKeyStatus, type CalendarStatus, EMPTY_PROFILE, type Example, type Media, type Post, type PostStatus, type Profile } from "@/lib/types";
import { useAuth } from "@/lib/useAuth";
import { type Generation, useGeneration } from "./useGeneration";
import type { Notify } from "./ui";

export type Flash = { type: "ok" | "error"; text: string };

export type Dashboard = {
  user: User;
  profile: Profile;
  setProfile: Dispatch<SetStateAction<Profile>>;
  examples: Example[];
  setExamples: Dispatch<SetStateAction<Example[]>>;
  posts: Post[];
  setPosts: Dispatch<SetStateAction<Post[]>>;
  media: Media[];
  setMedia: Dispatch<SetStateAction<Media[]>>;
  calendar: CalendarStatus | null;
  setCalendar: Dispatch<SetStateAction<CalendarStatus | null>>;
  aiKey: AiKeyStatus;
  setAiKey: Dispatch<SetStateAction<AiKeyStatus>>;
  notify: Notify;
  flash: Flash | null;
  clearFlash: () => void;
  reloadPosts: () => Promise<void>;
  updatePost: (post: Post) => void;
  removePost: (id: string) => void;
  movePost: (id: string, status: PostStatus) => Promise<void>;
  openPostId: string | null;
  openPost: (id: string | null) => void;
  gen: Generation;
  logout: () => Promise<void>;
};

const Ctx = createContext<Dashboard | null>(null);

export function useDashboard(): Dashboard {
  const value = useContext(Ctx);
  if (!value) throw new Error("useDashboard doit être utilisé dans <DashboardProvider>");
  return value;
}

export default function DashboardProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState<Profile>(EMPTY_PROFILE);
  const [examples, setExamples] = useState<Example[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [media, setMedia] = useState<Media[]>([]);
  const [calendar, setCalendar] = useState<CalendarStatus | null>(null);
  const [aiKey, setAiKey] = useState<AiKeyStatus>({ configured: false, last4: null });
  const [flash, setFlash] = useState<Flash | null>(null);
  const [openPostId, openPost] = useState<string | null>(null);

  const notify: Notify = useCallback((type, text) => {
    setFlash({ type, text });
    if (type === "ok") setTimeout(() => setFlash((f) => (f?.text === text ? null : f)), 5000);
  }, []);
  const clearFlash = useCallback(() => setFlash(null), []);

  const reloadPosts = useCallback(() => api<Post[]>("/posts").then(setPosts).catch(() => undefined), []);
  const updatePost = useCallback((post: Post) => setPosts((prev) => prev.map((p) => (p.id === post.id ? post : p))), []);
  const removePost = useCallback((id: string) => setPosts((prev) => prev.filter((p) => p.id !== id)), []);

  // Changement de statut (glisser-déposer du Kanban) : mise à jour immédiate, annulée si le serveur refuse.
  const movePost = useCallback(
    async (id: string, status: PostStatus) => {
      const before = posts.find((p) => p.id === id);
      if (!before || before.status === status) return;
      setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, status } : p)));
      try {
        const saved = await api<Post>(`/posts/${id}`, { method: "PATCH", body: JSON.stringify({ status }) });
        setPosts((prev) => prev.map((p) => (p.id === id ? saved : p)));
      } catch (err) {
        setPosts((prev) => prev.map((p) => (p.id === id ? before : p)));
        notify("error", errorMessage(err));
      }
    },
    [posts, notify],
  );

  const gen = useGeneration({ posts, setPosts, profile, aiReady: aiKey.configured, notify });

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    (async () => {
      try {
        const [p, e, g, m, c, k] = await Promise.all([
          api<Profile>("/profile"),
          api<Example[]>("/examples"),
          api<Post[]>("/posts"),
          api<Media[]>("/media"),
          api<CalendarStatus>("/calendar/status"),
          api<AiKeyStatus>("/ai/key"),
        ]);
        setProfile(p);
        setExamples(e);
        setPosts(g);
        setMedia(m);
        setCalendar(c);
        setAiKey(k);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          // Compte supprimé ou session expirée : on repart de la page de connexion.
          await signOut(firebaseAuth());
          router.replace("/login");
          return;
        }
        notify("error", errorMessage(err));
      }
      setReady(true);

      // Retour de la page de consentement Google Agenda
      const result = new URLSearchParams(window.location.search).get("calendar");
      if (result) {
        window.history.replaceState(null, "", window.location.pathname);
        if (result === "connected") notify("ok", "Google Agenda est connecté.");
        else notify("error", "La connexion à Google Agenda n'a pas abouti. Réessaie.");
      }
    })();
  }, [user, loading, router, notify]);

  // L'API signale une clé RodiumAI absente (428) ou refusée (424) : on met le statut à jour.
  useEffect(() => {
    const refresh = () => api<AiKeyStatus>("/ai/key").then(setAiKey).catch(() => undefined);
    window.addEventListener(AI_KEY_PROBLEM, refresh);
    return () => window.removeEventListener(AI_KEY_PROBLEM, refresh);
  }, []);

  const logout = useCallback(async () => {
    await signOut(firebaseAuth());
    router.push("/");
  }, [router]);

  const value = useMemo<Dashboard | null>(
    () =>
      user
        ? {
            user,
            profile,
            setProfile,
            examples,
            setExamples,
            posts,
            setPosts,
            media,
            setMedia,
            calendar,
            setCalendar,
            aiKey,
            setAiKey,
            notify,
            flash,
            clearFlash,
            reloadPosts,
            updatePost,
            removePost,
            movePost,
            openPostId,
            openPost,
            gen,
            logout,
          }
        : null,
    [user, profile, examples, posts, media, calendar, aiKey, notify, flash, clearFlash, reloadPosts, updatePost, removePost, movePost, openPostId, gen, logout],
  );

  if (loading || !user || !ready || !value) {
    return <p className="p-10 text-center text-stone-500">Chargement…</p>;
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
