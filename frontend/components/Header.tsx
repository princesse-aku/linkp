"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { IconClose, IconMenu } from "./Icons";
import Logo from "./Logo";

const links = [
  ["#probleme", "Le problème"],
  ["#fonctionnement", "Fonctionnement"],
  ["#faq", "FAQ"],
];

export default function Header() {
  const [open, setOpen] = useState(false);

  // Échap ferme le menu ; le menu se referme aussi si l'écran devient large.
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
    <header className="sticky top-0 z-20 border-b border-line bg-cream/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Logo onClick={() => setOpen(false)} />

        <nav className="hidden items-center gap-8 whitespace-nowrap text-base font-medium text-stone-600 lg:flex">
          {links.map(([href, label]) => (
            <a key={href} href={href} className="hover:text-stone-900">
              {label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-2 whitespace-nowrap text-base font-medium lg:flex">
          <Link href="/login" className="rounded-full px-4 py-2 text-stone-700 hover:bg-stone-100">
            Connexion
          </Link>
          <Link href="/signup" className="rounded-full bg-accent px-4 py-2 text-white shadow-sm hover:bg-accent-dark">
            Créer un compte
          </Link>
        </div>

        <button
          type="button"
          className="rounded-full p-2 text-stone-700 hover:bg-stone-100 lg:hidden"
          aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
          aria-expanded={open}
          aria-controls="mobile-menu"
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <IconClose className="h-6 w-6" /> : <IconMenu className="h-6 w-6" />}
        </button>
      </div>

      {open && (
        <div id="mobile-menu" className="border-t border-stone-200 bg-white px-6 pb-6 pt-2 lg:hidden">
          <nav className="flex flex-col">
            {links.map(([href, label]) => (
              <a
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className="border-b border-stone-100 py-3.5 font-medium text-stone-700"
              >
                {label}
              </a>
            ))}
          </nav>
          <div className="mt-5 grid gap-3">
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="rounded-full border border-stone-300 py-3 text-center font-semibold"
            >
              Connexion
            </Link>
            <Link
              href="/signup"
              onClick={() => setOpen(false)}
              className="rounded-full bg-accent py-3 text-center font-semibold text-white"
            >
              Créer un compte
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
