"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, type Example, type Post, type Profile } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import Logo from "@/components/Logo";

const TONES = ["Professionnel", "Inspirant", "Humoristique", "Storytelling", "Pédagogue", "Direct", "Bienveillant", "Provocateur"];

const EMPTY: Profile = {
  full_name: "",
  job_title: "",
  industry: "",
  bio: "",
  language: "fr",
  tones: [],
  themes: [],
  start_date: null,
  end_date: null,
  posts_per_week: 3,
  publish_time: null,
};

const input = "w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-base";

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-6">
      <h2 className="font-serif text-2xl font-medium">{title}</h2>
      {hint && <p className="mt-1 text-base text-stone-500">{hint}</p>}
      <div className="mt-5 space-y-4">{children}</div>
    </section>
  );
}

export default function Dashboard() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState<Profile>(EMPTY);
  const [examples, setExamples] = useState<Example[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [themeInput, setThemeInput] = useState("");
  const [exampleInput, setExampleInput] = useState("");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase().auth.getSession();
      if (!data.session) return router.replace("/login");
      try {
        const [p, e, g] = await Promise.all([
          api<Profile>("/profile"),
          api<Example[]>("/examples"),
          api<Post[]>("/posts"),
        ]);
        setProfile(p);
        setExamples(e);
        setPosts(g);
      } catch (err) {
        setError((err as Error).message);
      }
      setReady(true);
    })();
  }, [router]);

  const set = <K extends keyof Profile>(k: K, v: Profile[K]) => setProfile((p) => ({ ...p, [k]: v }));

  async function run(name: string, fn: () => Promise<void>) {
    setBusy(name);
    setMsg("");
    setError("");
    try {
      await fn();
    } catch (err) {
      setError((err as Error).message);
    }
    setBusy("");
  }

  const save = () =>
    run("save", async () => {
      const p = await api<Profile>("/profile", { method: "PUT", body: JSON.stringify(profile) });
      setProfile(p);
      setMsg("Informations enregistrées.");
    });

  const generate = () =>
    run("gen", async () => {
      await api<Profile>("/profile", { method: "PUT", body: JSON.stringify(profile) });
      setPosts(await api<Post[]>("/posts/generate", { method: "POST" }));
      setMsg("Posts générés.");
    });

  const addExample = () =>
    run("ex", async () => {
      const ex = await api<Example>("/examples", { method: "POST", body: JSON.stringify({ content: exampleInput }) });
      setExamples((l) => [ex, ...l]);
      setExampleInput("");
    });

  const removeExample = (id: number) =>
    run("ex", async () => {
      await api(`/examples/${id}`, { method: "DELETE" });
      setExamples((l) => l.filter((e) => e.id !== id));
    });

  function addTheme() {
    const t = themeInput.trim();
    if (t && !profile.themes.includes(t)) set("themes", [...profile.themes, t]);
    setThemeInput("");
  }

  async function logout() {
    await supabase().auth.signOut();
    router.push("/");
  }

  if (!ready) return <p className="p-10 text-center text-stone-500">Chargement…</p>;

  return (
    <>
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Logo />
          <button onClick={logout} className="text-base font-medium text-stone-600 hover:text-stone-900">
            Déconnexion
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-6 py-10">
        <h1 className="font-serif text-4xl font-medium">Ton espace</h1>

        <Section title="Tes informations" hint="Ces infos aident à personnaliser tes posts.">
          <div className="grid gap-4 sm:grid-cols-2">
            <input className={input} placeholder="Nom complet" value={profile.full_name} onChange={(e) => set("full_name", e.target.value)} />
            <input className={input} placeholder="Poste / métier" value={profile.job_title} onChange={(e) => set("job_title", e.target.value)} />
            <input className={input} placeholder="Secteur d'activité" value={profile.industry} onChange={(e) => set("industry", e.target.value)} />
            <select className={input} value={profile.language} onChange={(e) => set("language", e.target.value)}>
              <option value="fr">Français</option>
              <option value="en">Anglais</option>
            </select>
          </div>
          <textarea className={input} rows={3} placeholder="Quelques mots sur toi et ton audience" value={profile.bio} onChange={(e) => set("bio", e.target.value)} />
        </Section>

        <Section title="Tons de rédaction" hint="Choisis-en un ou plusieurs.">
          <div className="flex flex-wrap gap-2">
            {TONES.map((t) => {
              const on = profile.tones.includes(t);
              return (
                <button
                  key={t}
                  onClick={() => set("tones", on ? profile.tones.filter((x) => x !== t) : [...profile.tones, t])}
                  className={`rounded-full border px-4 py-1.5 text-base ${on ? "border-accent bg-accent text-white" : "border-stone-300 hover:bg-stone-50"}`}
                >
                  {t}
                </button>
              );
            })}
          </div>
        </Section>

        <Section title="Thèmes" hint="Les sujets sur lesquels tu veux écrire.">
          <div className="flex gap-2">
            <input
              className={input}
              placeholder="Ex : leadership, IA, recrutement…"
              value={themeInput}
              onChange={(e) => setThemeInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTheme())}
            />
            <button onClick={addTheme} className="rounded-lg bg-stone-900 px-4 text-base font-medium text-white">
              Ajouter
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {profile.themes.map((t) => (
              <span key={t} className="inline-flex items-center gap-2 rounded-full bg-accent-soft px-3 py-1 text-base text-accent-dark">
                {t}
                <button aria-label={`Retirer ${t}`} onClick={() => set("themes", profile.themes.filter((x) => x !== t))}>
                  ×
                </button>
              </span>
            ))}
          </div>
        </Section>

        <Section title="Période de programmation" hint="Quand veux-tu publier, et à quelle fréquence ?">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-base">
              Du
              <input type="date" className={`${input} mt-1`} value={profile.start_date ?? ""} onChange={(e) => set("start_date", e.target.value || null)} />
            </label>
            <label className="text-base">
              Au
              <input type="date" className={`${input} mt-1`} value={profile.end_date ?? ""} onChange={(e) => set("end_date", e.target.value || null)} />
            </label>
            <label className="text-base">
              Posts par semaine
              <input type="number" min={1} max={14} className={`${input} mt-1`} value={profile.posts_per_week} onChange={(e) => set("posts_per_week", Number(e.target.value))} />
            </label>
            <label className="text-base">
              Heure de publication
              <input type="time" className={`${input} mt-1`} value={profile.publish_time?.slice(0, 5) ?? ""} onChange={(e) => set("publish_time", e.target.value || null)} />
            </label>
          </div>
        </Section>

        <Section title="Tes posts passés" hint="Colle des posts que tu as déjà écrits : ils servent de référence pour ton style.">
          <textarea className={input} rows={5} placeholder="Colle un post ici (20 caractères minimum)…" value={exampleInput} onChange={(e) => setExampleInput(e.target.value)} />
          <button
            onClick={addExample}
            disabled={exampleInput.trim().length < 20 || busy === "ex"}
            className="rounded-lg bg-stone-900 px-4 py-2 text-base font-medium text-white disabled:opacity-50"
          >
            Ajouter cet exemple
          </button>
          <ul className="space-y-3">
            {examples.map((e) => (
              <li key={e.id} className="rounded-lg border border-stone-200 p-4 text-base">
                <p className="line-clamp-4 whitespace-pre-wrap">{e.content}</p>
                <button onClick={() => removeExample(e.id)} className="mt-2 text-sm font-medium text-red-600">
                  Supprimer
                </button>
              </li>
            ))}
          </ul>
        </Section>

        {error && <p className="rounded-lg bg-red-50 p-3 text-base text-red-700">{error}</p>}
        {msg && <p className="rounded-lg bg-green-50 p-3 text-base text-green-700">{msg}</p>}

        <div className="flex flex-wrap gap-3">
          <button onClick={save} disabled={!!busy} className="rounded-lg border border-stone-300 bg-white px-6 py-3 font-semibold hover:bg-stone-50 disabled:opacity-60">
            {busy === "save" ? "Enregistrement…" : "Enregistrer"}
          </button>
          <button onClick={generate} disabled={!!busy} className="rounded-lg bg-accent px-6 py-3 font-semibold text-white hover:bg-accent-dark disabled:opacity-60">
            {busy === "gen" ? "Génération…" : "Générer mes posts"}
          </button>
        </div>

        {posts.length > 0 && (
          <Section title="Tes posts programmés">
            <ul className="space-y-3">
              {posts.map((p) => (
                <li key={p.id} className="rounded-lg border border-stone-200 p-4 text-base">
                  <div className="mb-2 flex justify-between text-sm text-stone-500">
                    <span>{p.theme}</span>
                    <span>{p.scheduled_for && new Date(p.scheduled_for).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" })}</span>
                  </div>
                  <p className="whitespace-pre-wrap">{p.content}</p>
                </li>
              ))}
            </ul>
          </Section>
        )}
      </main>
    </>
  );
}
