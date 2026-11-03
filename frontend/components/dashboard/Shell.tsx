"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  IconCalendar,
  IconClose,
  IconImage,
  IconKanban,
  IconList,
  IconLogout,
  IconMenu,
  IconPen,
  IconSettings,
  IconSpark,
} from "@/components/Icons";
import Logo from "@/components/Logo";
import { api, errorMessage } from "@/lib/api";
import { useDashboard } from "./DashboardProvider";
import PostDrawer from "./PostDrawer";

const NAV = [
  { href: "/dashboard", label: "Tableau de bord", icon: IconKanban, exact: true },
  { href: "/dashboard/posts", label: "Mes posts", icon: IconList },
  { href: "/dashboard/style", label: "Mon style", icon: IconPen },
  { href: "/dashboard/media", label: "Médiathèque", icon: IconImage },
  { href: "/dashboard/agenda", label: "Agenda", icon: IconCalendar },
  { href: "/dashboard/settings", label: "Paramètres", icon: IconSettings },
] as const;

const TITLES: Record<string, string> = {
  "/dashboard": "Tableau de bord",
  "/dashboard/posts": "Mes posts",
  "/dashboard/style": "Mon style d'écriture",
  "/dashboard/media": "Médiathèque",
  "/dashboard/agenda": "Agenda",
  "/dashboard/settings": "Paramètres",
};

export const firstName = (fullName: string, email: string | null) => (fullName.trim().split(/\s+/)[0] || (email ?? "").split("@")[0] || "").trim();

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { user, posts, aiKey, profile, logout } = useDashboard();
  const name = firstName(profile.full_name, user.email);

  return (
    <div className="flex h-full flex-col">
      <div className="px-5 pb-4 pt-5">
        <Logo compact href="/dashboard" onClick={onNavigate} />
      </div>

      <nav aria-label="Menu principal" className="flex-1 space-y-1 px-3 py-2">
        {NAV.map((item) => {
          const active = "exact" in item && item.exact ? pathname === item.href : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-3 rounded-xl px-3.5 py-3 text-base font-medium transition ${
                active ? "bg-accent-soft text-accent-dark" : "text-stone-600 hover:bg-cream hover:text-ink"
              }`}
            >
              <Icon className={`h-5 w-5 ${active ? "text-accent" : ""}`} />
              <span className="flex-1">{item.label}</span>
              {item.href === "/dashboard/posts" && posts.length > 0 && (
                <span className={`rounded-full px-2 py-0.5 text-sm ${active ? "bg-white text-accent-dark" : "bg-stone-100 text-stone-600"}`}>{posts.length}</span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="space-y-3 border-t border-line p-4">
        <Link
          href="/dashboard/settings#ia"
          onClick={onNavigate}
          className="flex items-center gap-2.5 rounded-xl bg-cream px-3.5 py-2.5 text-base text-stone-700 hover:bg-accent-soft/60"
        >
          <span className={`h-2.5 w-2.5 rounded-full ${aiKey.configured ? "bg-green-600" : "bg-amber-500"}`} aria-hidden />
          {aiKey.configured ? "IA connectée" : "IA désactivée"}
        </Link>
        <div className="flex items-center gap-3 px-1">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent to-[#E07B39] font-serif text-lg font-semibold uppercase text-white" aria-hidden>
            {(name || "?").charAt(0)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-semibold">{name || "Mon compte"}</p>
            <p className="truncate text-sm text-stone-500">{user.email}</p>
          </div>
          <button
            type="button"
            onClick={logout}
            aria-label="Se déconnecter"
            title="Se déconnecter"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-stone-500 hover:bg-cream hover:text-ink"
          >
            <IconLogout />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, aiKey, gen, flash, clearFlash, notify } = useDashboard();
  const [menu, setMenu] = useState(false);
  const [verifyBusy, setVerifyBusy] = useState(false);
  const title = TITLES[pathname] ?? "Tableau de bord";

  // Menu mobile : Échap le ferme, et le défilement de la page est bloqué tant qu'il est ouvert.
  useEffect(() => {
    if (!menu) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenu(false);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [menu]);

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

  const generateLabel = gen.busy ? (gen.progress ? `Rédaction ${gen.progress.done}/${gen.progress.total}…` : "Préparation…") : "Générer des posts";
  const generateHint = !aiKey.configured
    ? "Ajoute ta clé RodiumAI dans les paramètres pour activer l'IA"
    : gen.busy
      ? "Rédaction en cours"
      : !gen.canGenerate
        ? "Ajoute au moins un thème et une période dans les paramètres"
        : "Générer des posts sur ta période";

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[272px_1fr]">
      {/* Menu latéral (grand écran) */}
      <aside className="sticky top-0 hidden h-screen border-r border-line bg-paper lg:block">
        <Sidebar />
      </aside>

      {/* Menu latéral (mobile) */}
      {menu && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button type="button" aria-label="Fermer le menu" className="absolute inset-0 bg-ink/50" onClick={() => setMenu(false)} />
          <div className="relative h-full w-72 max-w-[85%] bg-paper shadow-2xl">
            <button type="button" onClick={() => setMenu(false)} aria-label="Fermer le menu" className="absolute right-3 top-4 inline-flex h-10 w-10 items-center justify-center rounded-lg text-stone-600 hover:bg-cream">
              <IconClose />
            </button>
            <Sidebar onNavigate={() => setMenu(false)} />
          </div>
        </div>
      )}

      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-line bg-cream/90 px-4 py-3 backdrop-blur sm:px-8">
          <button type="button" onClick={() => setMenu(true)} aria-label="Ouvrir le menu" className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-stone-700 hover:bg-white lg:hidden">
            <IconMenu />
          </button>
          <h1 className="min-w-0 flex-1 truncate font-serif text-2xl font-medium sm:text-3xl">{title}</h1>
          <button
            type="button"
            onClick={gen.generate}
            disabled={!gen.canGenerate}
            title={generateHint}
            className="inline-flex h-11 items-center gap-2 rounded-full bg-accent px-5 text-base font-semibold text-white shadow-sm transition hover:bg-accent-dark disabled:cursor-not-allowed disabled:opacity-60"
          >
            <IconSpark className={`h-5 w-5 ${gen.busy ? "animate-pulse" : ""}`} />
            <span className="hidden sm:inline">{generateLabel}</span>
            <span className="sm:hidden">{gen.busy ? `${gen.progress?.done ?? 0}/${gen.progress?.total ?? "…"}` : "Générer"}</span>
          </button>
        </header>

        <main className="mx-auto w-full max-w-[1400px] space-y-5 px-4 py-6 sm:px-8 sm:py-8">
          {user.email && !user.emailVerified && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-accent/30 bg-accent-soft p-4 text-base">
              <p>Confirme ton adresse email pour sécuriser ton compte.</p>
              <button type="button" onClick={resendVerification} disabled={verifyBusy} className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-base font-medium hover:bg-stone-50 disabled:opacity-50">
                {verifyBusy ? "Envoi…" : "Renvoyer l'email"}
              </button>
            </div>
          )}
          {!aiKey.configured && pathname !== "/dashboard/settings" && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-accent/30 bg-accent-soft p-4 text-base">
              <p>
                <span className="font-semibold">L&apos;IA est désactivée.</span> Ajoute ta clé RodiumAI pour générer des idées, analyser ton style et rédiger tes posts.
              </p>
              <Link href="/dashboard/settings#ia" className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-base font-medium hover:bg-stone-50">
                Ajouter ma clé
              </Link>
            </div>
          )}
          {children}
        </main>
      </div>

      <PostDrawer />

      {/* Notification fixe : toujours visible, où que l'on soit sur la page */}
      {flash && (
        <div
          role={flash.type === "error" ? "alert" : "status"}
          className={`fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-md items-start gap-3 rounded-xl border p-4 text-base shadow-xl sm:left-auto sm:right-6 sm:mx-0 ${
            flash.type === "error" ? "border-red-200 bg-red-50 text-red-800" : "border-green-200 bg-green-50 text-green-900"
          }`}
        >
          <span className="flex-1">{flash.text}</span>
          <button type="button" onClick={clearFlash} aria-label="Fermer la notification" className="text-xl leading-none opacity-60 hover:opacity-100">
            ×
          </button>
        </div>
      )}
    </div>
  );
}
