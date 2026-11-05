import Link from "next/link";
import FooterAccount from "./FooterAccount";
import { IconHeart } from "./Icons";
import { LogoMark } from "./Logo";

const columns = [
  {
    title: "Produit",
    links: [
      ["/#probleme", "Le constat"],
      ["/#fonctionnement", "Fonctionnement"],
      ["/#faq", "Questions fréquentes"],
    ],
  },
]

export default function Footer() {
  return (
    <footer className="bg-ink text-cream">
      <div className="mx-auto grid max-w-6xl gap-12 px-6 py-16 md:grid-cols-[1.5fr_1fr_1fr]">
        <div>
          <Link href="/" className="inline-flex items-center gap-3" aria-label="LinkP, accueil">
            <LogoMark className="h-11 w-11" />
            <span className="font-serif text-3xl font-semibold tracking-tight">
              Link<span className="text-[#E9B58F]">P</span>
            </span>
          </Link>
          <p className="mt-5 max-w-sm text-base leading-relaxed text-cream/70">
            Des idées, les bons mots et un calendrier prêt à l&apos;emploi pour écrire tes posts LinkedIn dans ta voix.
          </p>
        </div>

        {columns.map((c) => (
          <nav key={c.title} aria-label={c.title}>
            <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-[#E9B58F]">{c.title}</h2>
            <ul className="mt-3 text-base">
              {c.links.map(([href, label]) => (
                <li key={href}>
                  <Link href={href} className="inline-flex min-h-11 items-center text-cream/75 transition hover:text-white md:min-h-9">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}

        <FooterAccount />
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-6 text-sm text-cream/60 sm:flex-row">
          <div className="flex flex-wrap items-center justify-center gap-x-5">
            <p>© LinkP. Tous droits réservés.</p>
            <Link href="/confidentialite" className="inline-flex min-h-11 items-center underline-offset-4 hover:text-white hover:underline">
              Confidentialité et sécurité
            </Link>
            <Link href="/conditions" className="inline-flex min-h-11 items-center underline-offset-4 hover:text-white hover:underline">
              Conditions d&apos;utilisation
            </Link>
          </div>
          <p className="inline-flex flex-wrap items-center justify-center gap-1.5">
            Créé avec
            <span className="heartbeat text-accent" role="img" aria-label="amour">
              <IconHeart className="h-4 w-4" />
            </span>
            par
            <a
              href="https://www.linkedin.com/in/princess-alagnon/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center font-semibold text-cream underline decoration-accent decoration-2 underline-offset-4 transition hover:text-[#E9B58F]"
            >
              Princesse ALAGNON
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
