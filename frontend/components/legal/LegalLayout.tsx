import Link from "next/link";
import Footer from "@/components/Footer";
import Logo from "@/components/Logo";

export const CONTACT_EMAIL = "hello@alaprincesse.com";

export type LegalSection = { id: string; title: string; body: React.ReactNode };

// Mise en page commune des pages juridiques : sommaire cliquable, sections numérotées, lecture confortable.
export default function LegalLayout({
  eyebrow,
  title,
  intro,
  updated,
  sections,
  children,
}: {
  eyebrow: string;
  title: React.ReactNode;
  intro: React.ReactNode;
  updated: string;
  sections: LegalSection[];
  children?: React.ReactNode;
}) {
  return (
    <>
      <header className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-6">
        <Logo compact />
        <Link href="/" className="inline-flex min-h-11 items-center rounded-full px-4 text-base font-medium text-stone-600 hover:bg-white hover:text-ink">
          Retour au site
        </Link>
      </header>

      <main className="mx-auto max-w-5xl px-6 pb-24 pt-8 lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-14">
        <div className="lg:col-span-2">
          <p className="flex items-center gap-3 text-sm font-semibold uppercase tracking-[0.18em] text-accent">
            {eyebrow}
          </p>
          <h1 className="mt-4 max-w-3xl font-serif text-4xl font-medium leading-[1.08] tracking-tight sm:text-5xl [&_em]:italic [&_em]:text-accent">{title}</h1>
          <p className="mt-5 max-w-3xl text-lg leading-relaxed text-stone-600">{intro}</p>
          <p className="mt-3 text-sm text-stone-500">Dernière mise à jour : {updated}</p>
        </div>

        <nav aria-label="Sommaire" className="mt-10 lg:mt-12">
          <div className="lg:sticky lg:top-8">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-stone-500">Sommaire</p>
            <ol className="mt-3 space-y-0.5 text-base">
              {sections.map((s, i) => (
                <li key={s.id}>
                  <a href={`#${s.id}`} className="flex min-h-11 items-center gap-3 rounded-lg px-2 text-stone-700 hover:bg-white hover:text-accent lg:min-h-9">
                    <span className="font-serif italic text-accent">{String(i + 1).padStart(2, "0")}</span>
                    {s.title}
                  </a>
                </li>
              ))}
            </ol>
          </div>
        </nav>

        <div className="mt-10 min-w-0 lg:mt-12">
          {children}
          {sections.map((s, i) => (
            <section key={s.id} id={s.id} className="border-t border-line py-9 first:border-t-0 first:pt-0">
              <h2 className="flex items-baseline gap-4 font-serif text-2xl font-medium tracking-tight sm:text-3xl">
                <span className="text-xl italic text-accent">{String(i + 1).padStart(2, "0")}</span>
                {s.title}
              </h2>
              <div className="mt-4 space-y-4 text-base leading-relaxed text-stone-700 [&_a]:font-semibold [&_a]:text-accent [&_a]:underline [&_a]:underline-offset-4 [&_li]:pl-1 [&_ol]:list-decimal [&_ol]:space-y-2 [&_ol]:pl-6 [&_strong]:text-ink [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-6">
                {s.body}
              </div>
            </section>
          ))}
        </div>
      </main>

      <Footer />
    </>
  );
}

// Encadré mis en avant (point de sécurité, procédure d'urgence).
export function Callout({ title, children, tone = "info" }: { title: string; children: React.ReactNode; tone?: "info" | "alert" }) {
  return (
    <div
      className={`rounded-2xl border p-5 text-base leading-relaxed sm:p-6 ${
        tone === "alert" ? "border-accent/40 bg-accent-soft/60" : "border-line bg-paper"
      }`}
    >
      <p className="font-serif text-xl font-medium text-ink">{title}</p>
      <div className="mt-2 space-y-3 text-stone-700">{children}</div>
    </div>
  );
}
