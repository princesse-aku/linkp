"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/useAuth";
import AccountLink from "./AccountLink";
import { IconArrowRight, IconClose, IconMenu } from "./Icons";
import Logo from "./Logo";

const links = [
  { id: "probleme", label: "Le constat" },
  { id: "fonctionnement", label: "Fonctionnement" },
  { id: "faq", label: "FAQ" },
] as const;

// Barre de navigation « pastille flottante » : détachée du bord, elle se resserre au défilement,
// met en valeur la section lue (indicateur qui glisse) et affiche la progression de lecture.
export default function Header() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [progress, setProgress] = useState(0);
  const [active, setActive] = useState<string | null>(null);
  const [pill, setPill] = useState<{ left: number; width: number } | null>(null);
  const linksRef = useRef<HTMLDivElement>(null);

  // Défilement : état « resserré » + progression de lecture (0 à 100)
  useEffect(() => {
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setScrolled(window.scrollY > 12);
      setProgress(max > 0 ? Math.min(100, Math.round((window.scrollY / max) * 200) / 2) : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  // Section actuellement lue : la bande du milieu de l'écran sert de repère.
  useEffect(() => {
    const seen = new Set<string>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) seen.add(e.target.id);
          else seen.delete(e.target.id);
        }
        setActive(links.find((l) => seen.has(l.id))?.id ?? null);
      },
      { rootMargin: "-40% 0px -55% 0px" },
    );
    for (const l of links) {
      const el = document.getElementById(l.id);
      if (el) io.observe(el);
    }
    return () => io.disconnect();
  }, []);

  // Position de l'indicateur glissant sous le lien actif
  useEffect(() => {
    const place = () => {
      const el = active ? linksRef.current?.querySelector<HTMLElement>(`[data-id="${active}"]`) : null;
      setPill(el ? { left: el.offsetLeft, width: el.offsetWidth } : null);
    };
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [active, scrolled]);

  // Menu mobile : Échap le ferme, et il se referme si l'écran devient large.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onResize = () => window.innerWidth >= 1024 && setOpen(false);
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <header className="sticky top-0 z-30 px-3 pt-3 sm:px-6">
      <div className={`relative mx-auto transition-[max-width] duration-500 ease-out ${scrolled ? "max-w-4xl" : "max-w-6xl"}`}>
        <div
          className={`relative flex items-center justify-between gap-3 overflow-hidden rounded-full border bg-paper/85 py-2 pl-3 pr-2 backdrop-blur-md transition-shadow duration-300 ${
            scrolled ? "border-line shadow-lg shadow-ink/10" : "border-line/80 shadow-sm"
          }`}
        >
          <Logo compact onClick={() => setOpen(false)} />

          {/* Liens (grand écran) avec indicateur qui glisse */}
          <nav aria-label="Sections de la page" className="relative hidden lg:block">
            <div ref={linksRef} className="relative flex items-center rounded-full bg-cream/80 p-1 ring-1 ring-line/70">
              <span
                aria-hidden
                className="absolute inset-y-1 rounded-full bg-accent shadow-md shadow-accent/30 transition-all duration-500 ease-out"
                style={pill ? { left: pill.left, width: pill.width, opacity: 1 } : { left: 0, width: 0, opacity: 0 }}
              />
              {links.map((l) => (
                <a
                  key={l.id}
                  data-id={l.id}
                  href={`#${l.id}`}
                  aria-current={active === l.id ? "true" : undefined}
                  className={`relative z-10 whitespace-nowrap rounded-full px-4 py-2 text-base font-medium transition-colors duration-300 ${
                    active === l.id ? "text-white" : "text-stone-600 hover:text-ink"
                  }`}
                >
                  {l.label}
                </a>
              ))}
            </div>
          </nav>

          <div className="hidden items-center gap-1 whitespace-nowrap lg:flex">
            {!user && (
              <Link href="/login" className="rounded-full px-4 py-2.5 text-base font-medium text-stone-700 hover:bg-cream">
                Connexion
              </Link>
            )}
            <AccountLink
              guestHref="/signup"
              className="group inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-base font-semibold text-cream transition hover:bg-accent"
            >
              Créer un compte
              <IconArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </AccountLink>
          </div>

          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-cream text-ink ring-1 ring-line lg:hidden"
            aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
            aria-expanded={open}
            aria-controls="mobile-menu"
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <IconClose className="h-5 w-5" /> : <IconMenu className="h-5 w-5" />}
          </button>

          {/* Ligne de progression de lecture */}
          <span aria-hidden className="absolute bottom-0 left-0 h-[3px] bg-gradient-to-r from-accent to-[#E07B39] transition-[width] duration-150" style={{ width: `${progress}%` }} />
        </div>

        {/* Menu mobile : une carte arrondie qui se déplie sous la pastille */}
        {open && (
          <div id="mobile-menu" className="fade-up absolute inset-x-0 top-full mt-2 rounded-3xl border border-line bg-paper p-3 shadow-2xl lg:hidden">
            <nav aria-label="Sections de la page" className="flex flex-col">
              {links.map((l) => (
                <a
                  key={l.id}
                  href={`#${l.id}`}
                  onClick={() => setOpen(false)}
                  className={`flex items-center justify-between rounded-2xl px-4 py-3.5 font-serif text-xl ${
                    active === l.id ? "bg-accent-soft text-accent-dark" : "text-ink hover:bg-cream"
                  }`}
                >
                  {l.label}
                  <IconArrowRight className="h-4 w-4 text-stone-400" />
                </a>
              ))}
            </nav>
            <div className={`mt-2 grid gap-2 border-t border-line pt-3 ${user ? "grid-cols-1" : "grid-cols-2"}`}>
              {!user && (
                <Link href="/login" onClick={() => setOpen(false)} className="rounded-full border border-stone-300 py-3 text-center text-base font-semibold">
                  Connexion
                </Link>
              )}
              <AccountLink
                guestHref="/signup"
                onClick={() => setOpen(false)}
                className="rounded-full bg-accent py-3 text-center text-base font-semibold text-white"
              >
                Créer un compte
              </AccountLink>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
