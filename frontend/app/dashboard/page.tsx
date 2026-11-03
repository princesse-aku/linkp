"use client";

import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import CalendarSection from "@/components/dashboard/CalendarSection";
import MediaSection from "@/components/dashboard/MediaSection";
import PostsSection from "@/components/dashboard/PostsSection";
import ProfileSection from "@/components/dashboard/ProfileSection";
import StyleSection from "@/components/dashboard/StyleSection";
import { Notify, btnGhost } from "@/components/dashboard/ui";
import Logo from "@/components/Logo";
import { AI_KEY_PROBLEM, api, errorMessage } from "@/lib/api";
import { firebaseAuth } from "@/lib/firebase";
import { AiKeyStatus, CalendarStatus, EMPTY_PROFILE, Example, GenerateResult, Media, Post, Profile } from "@/lib/types";
import { useAuth } from "@/lib/useAuth";

const NAV = [
  ["#profil", "Profil"],
  ["#style", "Style"],
  ["#posts", "Posts"],
  ["#mediatheque", "Médiathèque"],
  ["#agenda", "Agenda"],
];

export default function Dashboard() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState<Profile>(EMPTY_PROFILE);
  const [examples, setExamples] = useState<Example[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [media, setMedia] = useState<Media[]>([]);
  const [calendar, setCalendar] = useState<CalendarStatus | null>(null);
  const [aiKey, setAiKey] = useState<AiKeyStatus>({ configured: false, last4: null });
  const [flash, setFlash] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [verifyBusy, setVerifyBusy] = useState(false);

  const notify: Notify = useCallback((type, text) => {
    setFlash({ type, text });
    if (type === "ok") setTimeout(() => setFlash((f) => (f?.text === text ? null : f)), 5000);
  }, []);

  const reloadPosts = useCallback(() => api<Post[]>("/posts").then(setPosts), []);

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
        notify("error", errorMessage(err));
      }
      setReady(true);

      // Retour de la page de consentement Google Agenda
      const result = new URLSearchParams(window.location.search).get("calendar");
      if (result) {
        window.history.replaceState(null, "", "/dashboard");
        if (result === "connected") notify("ok", "Google Agenda est connecté.");
        else notify("error", "La connexion à Google Agenda n'a pas abouti. Réessaie.");
      }
    })();
  }, [user, loading, router, notify]);

  useEffect(() => {
    const refresh = () => api<AiKeyStatus>("/ai/key").then(setAiKey).catch(() => undefined);
    window.addEventListener(AI_KEY_PROBLEM, refresh);
    return () => window.removeEventListener(AI_KEY_PROBLEM, refresh);
  }, []);

  async function resendVerification() {
    setVerifyBusy(true);
    try {
      await api("/auth/resend-verification", { method: "POST" });
      notify("ok", "Email de confirmation envoyé.");
    } catch (err) {
      notify("error", errorMessage(err));
    }
    setVerifyBusy(false);
  }

  function onGenerated({ posts: created, calendar: sync }: GenerateResult) {
    setPosts(created);
    if (sync.error) notify("error", `Posts générés, mais le rappel agenda a échoué : ${sync.error}`);
    else if (sync.connected) notify("ok", `${created.length} posts générés, ${sync.synced} rappel(s) ajouté(s) à Google Agenda.`);
    else notify("ok", `${created.length} posts générés.`);
  }

  async function logout() {
    await signOut(firebaseAuth());
    router.push("/");
  }

  if (loading || !user || !ready) return <p className="p-10 text-center text-stone-500">Chargement…</p>;

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-line bg-cream/90 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-6 py-3">
          <Logo />
          <nav className="hidden items-center gap-5 text-base font-medium text-stone-600 md:flex" aria-label="Sections">
            {NAV.map(([href, label]) => (
              <a key={href} href={href} className="hover:text-ink">
                {label}
              </a>
            ))}
          </nav>
          <button onClick={logout} className="text-base font-medium text-stone-600 hover:text-ink">
            Déconnexion
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 space-y-6 px-6 py-10">
        <div>
          <h1 className="font-serif text-4xl font-medium">Ton espace</h1>
          <p className="mt-1 text-base text-stone-500">{user.email}</p>
        </div>

        {user.email && !user.emailVerified && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-accent/30 bg-accent-soft p-4 text-base">
            <p>Confirme ton adresse email pour sécuriser ton compte.</p>
            <button type="button" onClick={resendVerification} disabled={verifyBusy} className={btnGhost}>
              {verifyBusy ? "Envoi…" : "Renvoyer l'email"}
            </button>
          </div>
        )}

        {!aiKey.configured && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-accent/30 bg-accent-soft p-4 text-base">
            <p>
              <span className="font-semibold">L&apos;IA est désactivée.</span> Ajoute ta clé RodiumAI pour générer des idées, analyser ton style et
              rédiger tes posts.
            </p>
            <a href="#ia" className={btnGhost}>
              Ajouter ma clé
            </a>
          </div>
        )}

        {flash && (
          <div
            role={flash.type === "error" ? "alert" : "status"}
            className={`rounded-xl p-4 text-base ${flash.type === "error" ? "bg-red-50 text-red-700" : "bg-green-50 text-green-800"}`}
          >
            {flash.text}
          </div>
        )}

        <ProfileSection profile={profile} onChange={setProfile} aiKey={aiKey} onAiKey={setAiKey} notify={notify} />
        <StyleSection examples={examples} setExamples={setExamples} profile={profile} onProfile={setProfile} aiReady={aiKey.configured} notify={notify} />
        <PostsSection posts={posts} setPosts={setPosts} media={media} profile={profile} aiReady={aiKey.configured} onGenerated={onGenerated} notify={notify} />
        <MediaSection media={media} setMedia={setMedia} notify={notify} />
        <CalendarSection status={calendar} setStatus={setCalendar} onSynced={() => reloadPosts().catch(() => undefined)} notify={notify} />
      </main>
    </>
  );
}
