import Link from "next/link";
import Logo from "@/components/Logo";
import type { Metadata } from "next";

// Une page 404 n'a pas d'adresse canonique et ne doit jamais être indexée.
export const metadata: Metadata = {
  title: "Page introuvable",
  description: "Cette page n'existe pas ou a été déplacée.",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <main className="relative flex flex-1 flex-col items-center justify-center overflow-hidden bg-[radial-gradient(#dccfba_1px,transparent_1px)] px-6 py-16 text-center [background-size:22px_22px]">
      <Logo />
      <p className="mt-12 text-sm font-semibold uppercase tracking-[0.18em] text-accent">Erreur 404</p>
      <h1 className="mt-4 max-w-2xl font-serif text-5xl font-medium leading-[1.05] tracking-tight sm:text-6xl">
        Cette page est restée une <span className="italic text-accent">page blanche</span>.
      </h1>
      <p className="mt-6 max-w-md text-lg text-stone-600">Le lien est peut-être erroné, ou la page a été déplacée. Reviens à l&apos;accueil, on t&apos;aide à trouver ton prochain sujet.</p>
      <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
        <Link href="/" className="rounded-full bg-accent px-7 py-3.5 text-base font-semibold text-white shadow-lg shadow-accent/25 hover:bg-accent-dark">
          Retour à l&apos;accueil
        </Link>
        <Link href="/dashboard" className="rounded-full border border-stone-300 bg-white px-7 py-3.5 text-base font-semibold hover:bg-stone-50">
          Mon espace
        </Link>
      </div>
    </main>
  );
}
