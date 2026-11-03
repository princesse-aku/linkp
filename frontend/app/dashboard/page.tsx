"use client";

import Link from "next/link";
import { useState } from "react";
import { IconCalendar, IconCheck, IconClock, IconList, IconPen } from "@/components/Icons";
import { useDashboard } from "@/components/dashboard/DashboardProvider";
import KanbanBoard from "@/components/dashboard/KanbanBoard";
import { firstName } from "@/components/dashboard/Shell";
import { longDate, timeLabel } from "@/lib/dates";

function Stat({ label, value, icon, tint }: { label: string; value: number; icon: React.ReactNode; tint: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-white p-5 shadow-sm">
      <div>
        <p className="font-serif text-4xl font-medium leading-none">{value}</p>
        <p className="mt-2 text-base text-stone-600">{label}</p>
      </div>
      <span className={`flex h-12 w-12 items-center justify-center rounded-xl ${tint}`}>{icon}</span>
    </div>
  );
}

export default function DashboardHome() {
  const { user, profile, posts, examples, aiKey, calendar, gen } = useDashboard();
  const name = firstName(profile.full_name, user.email);
  const [now] = useState(() => Date.now()); // « prochain post » : l'instant d'ouverture de la page suffit

  const count = (s: string) => posts.filter((p) => p.status === s).length;
  const upcoming = posts
    .filter((p) => p.status !== "published" && p.scheduled_for && new Date(p.scheduled_for).getTime() >= now - 60 * 60 * 1000)
    .sort((a, b) => (a.scheduled_for as string).localeCompare(b.scheduled_for as string))[0];

  const profileReady = profile.themes.length > 0 && !!profile.start_date && !!profile.end_date;
  const steps = [
    { done: aiKey.configured, label: "Ajouter ta clé RodiumAI", hint: "Elle active la rédaction par l'IA.", href: "/dashboard/settings#ia" },
    { done: profileReady, label: "Choisir tes thèmes et ta période", hint: "Sur quoi écrire, et quand publier.", href: "/dashboard/settings" },
    { done: examples.length > 0, label: "Coller quelques posts passés", hint: "Pour que les posts te ressemblent (facultatif).", href: "/dashboard/style" },
    { done: !!calendar?.connected, label: "Connecter Google Agenda", hint: "Des rappels avant chaque publication (facultatif).", href: "/dashboard/agenda" },
  ];
  const showChecklist = posts.length === 0 && !gen.busy;

  return (
    <div className="space-y-6">
      {/* Bannière de bienvenue */}
      <section className="flex flex-wrap items-center gap-4 rounded-2xl border border-line bg-gradient-to-r from-[#F7EDD5] via-[#F8F0DD] to-accent-soft/70 p-5 sm:p-6">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent to-[#E07B39] font-serif text-2xl font-semibold uppercase text-white shadow-md" aria-hidden>
          {(name || "?").charAt(0)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-serif text-2xl font-medium sm:text-3xl">Bonjour{name ? ` ${name}` : ""}</p>
          <p className="mt-1 text-base text-stone-700">
            {upcoming ? (
              <>
                Ton prochain post : <span className="font-semibold">{upcoming.theme || "sans thème"}</span>, {longDate(upcoming.scheduled_for as string).toLowerCase()} à {timeLabel(upcoming.scheduled_for as string)}.
              </>
            ) : posts.length > 0 ? (
              "Tous tes posts sont publiés : génères-en de nouveaux pour continuer."
            ) : (
              "Voici où en sont tes posts LinkedIn. Commence par générer ta première série."
            )}
          </p>
        </div>
        <Link href="/dashboard/posts" className="inline-flex h-11 w-full items-center justify-center rounded-full border border-stone-300 bg-white px-5 text-base font-semibold hover:bg-stone-50 sm:w-auto">
          Voir en liste
        </Link>
      </section>

      {/* Statistiques */}
      <section aria-label="Statistiques" className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Stat label="Posts au total" value={posts.length} icon={<IconList className="h-6 w-6 text-stone-700" />} tint="bg-stone-100" />
        <Stat label="Brouillons" value={count("draft")} icon={<IconPen className="h-6 w-6 text-stone-700" />} tint="bg-stone-100" />
        <Stat label="Programmés" value={count("scheduled")} icon={<IconCalendar className="h-6 w-6 text-accent" />} tint="bg-accent-soft" />
        <Stat label="Publiés" value={count("published")} icon={<IconCheck className="h-6 w-6 text-forest" />} tint="bg-forest/10" />
      </section>

      {/* Premiers pas */}
      {showChecklist && (
        <section className="rounded-2xl border border-line bg-white p-5 shadow-sm sm:p-6">
          <h2 className="font-serif text-2xl font-medium">Premiers pas</h2>
          <p className="mt-1 text-base text-stone-600">Quelques minutes suffisent pour avoir tes premiers posts prêts.</p>
          <ol className="mt-5 grid gap-3 md:grid-cols-2">
            {steps.map((s, i) => (
              <li key={s.label}>
                <Link href={s.href} className="flex items-start gap-3 rounded-xl border border-line p-4 transition hover:border-accent/50 hover:bg-cream">
                  <span
                    className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${s.done ? "bg-forest text-white" : "bg-accent-soft text-accent-dark"}`}
                    aria-label={s.done ? "Étape terminée" : `Étape ${i + 1}`}
                  >
                    {s.done ? <IconCheck className="h-4 w-4" /> : i + 1}
                  </span>
                  <span>
                    <span className={`block text-base font-semibold ${s.done ? "text-stone-500 line-through" : ""}`}>{s.label}</span>
                    <span className="block text-sm text-stone-600">{s.hint}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ol>
          <button
            type="button"
            onClick={gen.generate}
            disabled={!gen.canGenerate}
            className="mt-5 inline-flex h-11 items-center gap-2 rounded-full bg-accent px-6 text-base font-semibold text-white hover:bg-accent-dark disabled:cursor-not-allowed disabled:opacity-60"
          >
            Générer mes premiers posts
          </button>
          {!gen.canGenerate && <p className="mt-2 text-sm text-stone-500">Les étapes 1 et 2 sont nécessaires pour générer.</p>}
        </section>
      )}

      {/* Kanban */}
      <section aria-labelledby="kanban-title" className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="kanban-title" className="font-serif text-2xl font-medium">
              Tes posts
            </h2>
            <p className="text-base text-stone-600">Glisse une carte d&apos;une colonne à l&apos;autre pour changer son statut.</p>
          </div>
          {gen.progress && (
            <p role="status" aria-live="polite" className="inline-flex items-center gap-2 rounded-full bg-accent-soft px-4 py-2 text-base font-medium text-accent-dark">
              <IconClock className="h-4 w-4 animate-pulse" />
              {gen.progress.done} sur {gen.progress.total} posts prêts
            </p>
          )}
        </div>
        <KanbanBoard />
      </section>
    </div>
  );
}
