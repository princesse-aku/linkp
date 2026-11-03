import { existsSync } from "node:fs";
import path from "node:path";
import Link from "next/link";
import { DoodleArrow, DoodleCrumple, DoodlePin, DoodlePlane, DoodleSpark, DoodleSquiggle } from "@/components/Doodles";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { IconArrowDown, IconArrowRight, IconCalendar, IconCheck, IconSpark } from "@/components/Icons";
import { Floater, PlanningWidget, ThemesWidget, ToolTiles } from "@/components/landing/Widgets";
import { LogoMark } from "@/components/Logo";
import Reveal from "@/components/Reveal";
import TypeWriter from "@/components/TypeWriter";
import { SITE, pageMeta } from "@/lib/site";

export const metadata = pageMeta({ title: SITE.title, absoluteTitle: true, description: SITE.description, path: "/" });

// La capture réelle du dashboard : dépose-la dans frontend/public/dashboard-preview.png
const hasDashboardShot = existsSync(path.join(process.cwd(), "public", "dashboard-preview.png"));

const topics = ["Leadership", "Recrutement", "Intelligence artificielle", "Storytelling", "Carrière", "Entrepreneuriat", "Management", "Marque personnelle", "Reconversion", "Productivité"];

const pains = [
  ["La page blanche", "Tu ouvres LinkedIn, le curseur clignote… et rien ne vient."],
  ["Pas de thèmes clairs", "Tu as de l'expertise, mais tu ne sais pas quel angle choisir."],
  ["Les mots qui coincent", "Tu écris, tu effaces, et le post finit en brouillon oublié."],
];

const steps = [
  ["Tu te présentes", "Métier, secteur, public visé : LinkP comprend qui tu es."],
  ["Tu choisis ton ton et tes thèmes", "Inspirant, direct, storytelling… et les sujets qui comptent pour toi."],
  ["Tu montres ton style", "Tu colles quelques posts passés. LinkP s'en inspire pour écrire comme toi."],
  ["Tu fixes la période", "Du 1er au 30, 3 posts par semaine à 9h ? C'est planifié."],
];

const audiences = ["Indépendants", "Dirigeants", "Consultants", "Recruteurs", "Commerciaux", "Étudiants"];

const strengths = [
  ["Ton style comme point de départ", "Colle tes anciens posts : LinkP repère tes tournures, ta longueur et ton rythme, et s'en sert pour chaque nouvelle rédaction."],
  ["Tes tons", "Professionnel, humoristique, inspirant… combine-les comme tu veux."],
  ["Tes thèmes", "Donne tes sujets, LinkP les décline en angles variés."],
  ["Un calendrier déjà rempli", "Indique la période, la fréquence et l'heure : tes posts sont répartis automatiquement, sans trou dans ton planning."],
];

const faq = [
  ["Les posts vont-ils ressembler à du texte d'IA ?", "LinkP s'appuie sur tes propres posts pour imiter ton vocabulaire, ton rythme et ton ton. Plus tu donnes d'exemples, plus le résultat te ressemble."],
  ["Dois-je déjà avoir écrit des posts ?", "Non. Les exemples sont un plus, pas une obligation. Sans eux, LinkP se base sur ton profil et les tons que tu as choisis."],
  ["Puis-je modifier les posts générés ?", "Oui. Tu restes l'auteur : tu relis, tu ajustes, tu publies quand tu veux."],
  ["Est-ce que LinkP publie à ma place ?", "Pour l'instant, LinkP prépare et planifie tes posts sur la période choisie. Tu gardes la main sur la publication."],
];

const sampleParagraphs = [
  "Mon pire moment de manager ? Avoir cru qu'un bon chef a toujours la réponse.",
  "Le jour où j'ai dit « je ne sais pas, qu'en pensez-vous ? », mon équipe a avancé deux fois plus vite.",
  "Voici 3 questions que je pose désormais avant de décider :",
];

const cardShadow = "shadow-[0_24px_50px_-22px_rgba(60,40,20,0.4)]";

function Eyebrow({ children, center = false }: { children: React.ReactNode; center?: boolean }) {
  return (
    <p className={`flex items-center gap-3 text-sm font-semibold uppercase tracking-[0.18em] text-accent ${center ? "justify-center" : ""}`}>
      <span className="h-px w-8 bg-accent" />
      {children}
    </p>
  );
}

// Élément flottant du hero : apparaît en fondu puis flotte doucement.
function PostPaper() {
  return (
    <div className={`mx-auto w-full max-w-md rotate-[-1.5deg] rounded-sm border border-line bg-paper p-6 text-left ${cardShadow}`}>
      <div className="flex items-center justify-between text-sm text-stone-500">
        <span className="rounded-full bg-accent-soft px-3 py-1 font-medium text-accent-dark">Thème : leadership</span>
        <span className="inline-flex items-center gap-1.5">
          <IconCalendar className="h-3.5 w-3.5" /> Mar. 9h00
        </span>
      </div>
      <div className="mt-5 space-y-4 text-base leading-relaxed text-stone-700">
        {sampleParagraphs.map((p) => (
          <p key={p}>{p}</p>
        ))}
      </div>
      <div className="mt-6 flex items-center gap-2 border-t border-line pt-4 text-sm">
        <span className="rounded-full bg-cream px-3 py-1">Storytelling</span>
        <span className="ml-auto inline-flex items-center gap-1 font-medium text-accent">
          <IconSpark className="h-3.5 w-3.5" /> Dans ta voix
        </span>
      </div>
    </div>
  );
}

function BlankPageArt() {
  return (
    <div className="relative mt-12 max-w-sm">
      <div className={`rotate-[-3deg] rounded-sm border border-line bg-paper p-6 ${cardShadow}`}>
        <div className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-line" />
          <span className="h-2.5 w-2.5 rounded-full bg-line" />
          <span className="h-2.5 w-2.5 rounded-full bg-line" />
        </div>
        <div className="mt-6 h-2.5 w-28 rounded bg-line" />
        <div className="mt-8 flex h-24 items-start font-serif text-2xl text-ink">
          <span className="caret" />
        </div>
      </div>
      <span className="float absolute -right-2 -top-8 font-serif text-6xl italic text-accent">?</span>
      <span className="float absolute -left-6 top-6 font-serif text-4xl italic text-forest" style={{ animationDelay: "-2s" }}>
        ?
      </span>
      <DoodleCrumple className="float absolute -bottom-6 right-6 h-16 w-16" />
    </div>
  );
}

function StepArt({ index }: { index: number }) {
  const box = "flex h-32 items-center justify-center rounded-xl border border-line bg-paper transition group-hover:-translate-y-1";
  if (index === 0)
    return (
      <div className={box}>
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-gradient-to-br from-accent to-[#E07B39]" />
          <div className="space-y-2">
            <div className="h-3 w-24 rounded bg-ink" />
            <div className="h-2.5 w-16 rounded bg-line" />
          </div>
        </div>
      </div>
    );
  if (index === 1)
    return (
      <div className={box}>
        <div className="flex max-w-[11rem] flex-wrap justify-center gap-2 text-sm">
          <span className="rounded-full bg-accent px-3 py-1 text-white">Inspirant</span>
          <span className="rounded-full bg-forest px-3 py-1 text-cream">IA</span>
          <span className="rounded-full bg-accent-soft px-3 py-1 text-accent-dark">Direct</span>
          <span className="rounded-full bg-cream px-3 py-1 ring-1 ring-line">Carrière</span>
        </div>
      </div>
    );
  if (index === 2)
    return (
      <div className={`${box} relative overflow-hidden`}>
        <div className="relative h-20 w-28">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="absolute h-16 w-24 rounded-sm border border-line bg-cream p-2 shadow-sm"
              style={{ left: i * 8, top: i * 6, transform: `rotate(${(i - 1) * 4}deg)` }}
            >
              <div className="h-1.5 w-14 rounded bg-line" />
              <div className="mt-1.5 h-1.5 w-16 rounded bg-line" />
              <div className="mt-1.5 h-1.5 w-10 rounded bg-line" />
            </div>
          ))}
        </div>
      </div>
    );
  const filled = new Set([1, 3, 5, 8, 10, 12]);
  return (
    <div className={box}>
      <div className="grid grid-cols-7 gap-1.5">
        {Array.from({ length: 14 }, (_, i) => (
          <span key={i} className={`h-4 w-4 rounded-md ${filled.has(i) ? "bg-accent" : "bg-line"}`} />
        ))}
      </div>
    </div>
  );
}

// Données structurées (schema.org) : aident Google à comprendre le site et à afficher la FAQ dans les résultats.
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${SITE.url}/#website`,
      url: SITE.url,
      name: SITE.name,
      description: SITE.description,
      inLanguage: "fr-FR",
    },
    {
      "@type": "SoftwareApplication",
      "@id": `${SITE.url}/#app`,
      name: SITE.name,
      url: SITE.url,
      description: SITE.description,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      inLanguage: "fr-FR",
      image: `${SITE.url}/opengraph-image`,
      author: { "@type": "Person", name: SITE.author.name, url: SITE.author.url },
    },
    {
      "@type": "FAQPage",
      "@id": `${SITE.url}/#faq`,
      mainEntity: faq.map(([question, answer]) => ({
        "@type": "Question",
        name: question,
        acceptedAnswer: { "@type": "Answer", text: answer },
      })),
    },
  ],
};

export default function Home() {
  return (
    <>
      {/* « < » échappé pour qu'aucun contenu ne puisse refermer la balise script */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <Header />

      <main className="flex-1">
        {/* Hero */}
        <section className="px-4 pt-4 sm:px-6">
          <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[2.5rem] border border-line bg-paper bg-[radial-gradient(#dccfba_1px,transparent_1px)] [background-size:22px_22px]">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,253,248,0.92)_20%,transparent_70%)]" />

            <div className="relative flex flex-col items-center px-6 pb-16 pt-16 text-center lg:min-h-[720px] lg:justify-center lg:pb-20 lg:pt-20">
              <div className="pop mb-8 flex h-20 w-20 items-center justify-center rounded-3xl border border-line bg-paper shadow-xl">
                <LogoMark className="h-12 w-12" />
              </div>

              <h1 className="fade-up max-w-3xl font-serif text-5xl font-medium leading-[1.05] tracking-tight text-ink sm:text-6xl lg:max-w-2xl">
                Ne reste plus jamais devant{" "}
                <span className="text-stone-400">
                  une{" "}
                  <span className="italic text-accent underline decoration-accent/40 decoration-[3px] underline-offset-[10px]">page blanche</span>
                  {"⁠."}
                </span>
              </h1>

              <p className="fade-up mt-8 max-w-xl text-lg leading-relaxed text-stone-600 [animation-delay:150ms]">
                LinkP trouve tes idées, choisit les bons mots et rédige tes posts LinkedIn <strong className="text-ink">dans ta voix</strong>. Tu
                choisis la période, on planifie le reste.
              </p>

              <div className="fade-up mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-4 [animation-delay:300ms]">
                <Link
                  href="/signup"
                  className="inline-flex items-center gap-2 rounded-full bg-accent px-8 py-4 text-base font-semibold text-white shadow-lg shadow-accent/25 transition hover:-translate-y-0.5 hover:bg-accent-dark"
                >
                  Commencer gratuitement <IconArrowRight className="h-4 w-4" />
                </Link>
                <a href="#fonctionnement" className="inline-flex min-h-11 items-center text-base font-semibold text-ink underline decoration-accent decoration-2 underline-offset-8 hover:text-accent">
                  Voir comment ça marche
                </a>
              </div>

              <ul className="fade-up mt-8 flex flex-wrap justify-center gap-x-7 gap-y-2 text-base text-stone-600 [animation-delay:450ms]">
                {["Ton style, pas un texte générique", "Prêt en 5 minutes", "Tu gardes la main"].map((t) => (
                  <li key={t} className="inline-flex items-center gap-2">
                    <IconCheck className="h-4 w-4 text-accent" /> {t}
                  </li>
                ))}
              </ul>

              {/* Mobile : un seul visuel sous le texte */}
              <div className="fade-up mt-14 w-full lg:hidden">
                <PostPaper />
              </div>
            </div>

            {/* Objets flottants autour du titre (grand écran) */}
            <Floater className="left-[2%] top-[8%]" delay={300} duration={7}>
              <div className="relative w-48 rotate-[-6deg] bg-[#F5E3A3] p-5 pt-7 font-serif text-lg italic leading-snug text-ink shadow-xl">
                <DoodlePin className="absolute -top-3 left-1/2 h-7 w-7 -translate-x-1/2" />
                Idée : et si je parlais de mon pire moment de manager ?
              </div>
            </Floater>
            <Floater className="left-[10%] top-[31%] text-accent" delay={900} duration={9}>
              <DoodleArrow className="h-20 w-20 rotate-[10deg]" />
            </Floater>
            <Floater className="right-[2%] top-[7%]" delay={500} duration={8}>
              <PlanningWidget />
            </Floater>
            <Floater className="right-[11%] top-[47%] text-forest" delay={1100} duration={10}>
              <DoodlePlane className="wiggle h-14 w-14" />
            </Floater>
            <Floater className="bottom-[6%] left-[2%]" delay={700} duration={9}>
              <ThemesWidget />
            </Floater>
            <Floater className="bottom-[7%] right-[3%]" delay={900} duration={7}>
              <ToolTiles />
            </Floater>
            <Floater className="left-[30%] top-[7%] text-accent" delay={1300} duration={6}>
              <DoodleSpark className="h-5 w-5" />
            </Floater>
            <Floater className="right-[30%] bottom-[10%] text-accent" delay={1500} duration={6}>
              <DoodleSpark className="h-4 w-4" />
            </Floater>
          </div>
        </section>

        {/* Bandeau de thèmes */}
        <div className="mt-16 overflow-hidden border-y border-line py-5" aria-hidden>
          <div className="marquee flex w-max font-serif text-2xl italic text-stone-500">
            {[...topics, ...topics].map((t, i) => (
              <span key={i} className="flex items-center gap-10 pr-10">
                {t}
                <DoodleSpark className="h-3.5 w-3.5 text-accent" />
              </span>
            ))}
          </div>
        </div>

        {/* Problème */}
        <section id="probleme" className="py-24">
          <div className="mx-auto grid max-w-6xl gap-14 px-6 lg:grid-cols-[1fr_1.2fr]">
            <Reveal>
              <Eyebrow>Le constat</Eyebrow>
              <h2 className="mt-6 font-serif text-4xl font-medium leading-tight tracking-tight sm:text-5xl">
                Écrire sur LinkedIn ne devrait pas être un <span className="italic text-accent">calvaire</span>.
              </h2>
              <p className="mt-6 max-w-md text-lg leading-relaxed text-stone-600">
                LinkP est né d&apos;un problème très personnel : savoir de quoi parler, et trouver les mots, prend plus de temps que
                l&apos;écriture elle-même.
              </p>
              <BlankPageArt />
            </Reveal>
            <ol className="divide-y divide-line self-start border-y border-line">
              {pains.map(([t, d], i) => (
                <li key={t}>
                  <Reveal delay={i * 120} className="flex gap-6 py-8">
                    <span className="font-serif text-3xl italic text-accent">0{i + 1}</span>
                    <div>
                      <h3 className="font-serif text-2xl font-medium">{t}</h3>
                      <p className="mt-2 text-lg text-stone-600">{d}</p>
                    </div>
                  </Reveal>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Pour qui */}
        <section className="bg-paper py-20">
          <Reveal className="mx-auto max-w-5xl px-6 text-center">
            <Eyebrow center>Pour qui</Eyebrow>
            <h2 className="mt-6 font-serif text-3xl font-medium tracking-tight sm:text-4xl">
              Fait pour celles et ceux qui ont des choses à dire.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-stone-600">
              Tu as de l&apos;expertise, une expérience, un point de vue. Il te manque juste le temps et les mots.
            </p>
            <ul className="mt-10 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 font-serif text-2xl italic leading-relaxed text-stone-500 sm:text-3xl">
              {audiences.map((a, i) => (
                <li key={a} className="flex items-center gap-3">
                  <span className="text-ink">{a}</span>
                  {i < audiences.length - 1 && (
                    <span className="text-accent" aria-hidden>
                      /
                    </span>
                  )}
                </li>
              ))}
            </ul>
            <div className="mt-6 flex justify-center text-accent">
              <DoodleSquiggle />
            </div>
          </Reveal>
        </section>

        {/* Fonctionnement */}
        <section id="fonctionnement" className="py-24">
          <div className="mx-auto max-w-6xl px-6">
            <Reveal>
              <Eyebrow>Fonctionnement</Eyebrow>
              <h2 className="mt-6 max-w-2xl font-serif text-4xl font-medium leading-tight tracking-tight sm:text-5xl">
                Quatre étapes, et tes posts sont <span className="italic text-accent">prêts</span>.
              </h2>
            </Reveal>
            <div className="mt-16 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
              {steps.map(([t, d], i) => (
                <Reveal key={t} delay={i * 120}>
                  <div className="group">
                    <StepArt index={i} />
                    <div className="mt-6 border-t-2 border-ink pt-5">
                      <span className="font-serif text-5xl font-light italic text-accent">{i + 1}</span>
                      <h3 className="mt-3 font-serif text-xl font-medium leading-snug">{t}</h3>
                      <p className="mt-3 text-base text-stone-600">{d}</p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Avant / Après */}
        <section className="border-t border-line bg-paper py-24">
          <div className="mx-auto max-w-6xl px-6">
            <Reveal className="mx-auto max-w-2xl text-center">
              <Eyebrow center>Avant, après</Eyebrow>
              <h2 className="mt-6 font-serif text-4xl font-medium leading-tight tracking-tight sm:text-5xl">
                D&apos;une idée floue à un post <span className="italic text-accent">prêt à publier</span>.
              </h2>
              <p className="mt-5 text-lg text-stone-600">Tu donnes le point de départ, LinkP s&apos;occupe de la mise en forme et des mots.</p>
            </Reveal>
            <div className="mt-16 grid items-center gap-8 lg:grid-cols-[1fr_auto_1.3fr]">
              <Reveal>
                <div className="relative rotate-[-2deg] bg-[#F5E3A3] p-8 pt-10 font-serif text-xl leading-snug text-ink shadow-xl">
                  <DoodlePin className="absolute -top-3 left-8 h-7 w-7" />
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-stone-600">Avant, ton idée</p>
                  <p className="mt-4">
                    « Je voudrais parler de ce que j&apos;ai appris en managant mon équipe… mais je ne sais pas par où commencer. »
                  </p>
                  <div className="mt-5 flex flex-wrap gap-2 font-sans text-sm">
                    <span className="rounded-full bg-white/60 px-3 py-1">Thème : leadership</span>
                    <span className="rounded-full bg-white/60 px-3 py-1">Ton : bienveillant</span>
                  </div>
                </div>
              </Reveal>
              <Reveal delay={150} className="flex justify-center text-accent">
                <IconArrowRight className="hidden h-10 w-10 lg:block" />
                <IconArrowDown className="h-10 w-10 lg:hidden" />
              </Reveal>
              <Reveal delay={300}>
                <div className={`rounded-sm border border-line bg-cream p-8 ${cardShadow}`}>
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">Après, ton post</p>
                  <TypeWriter paragraphs={sampleParagraphs} className="mt-4 text-lg leading-relaxed text-ink" />
                </div>
              </Reveal>
            </div>
            <p className="mt-8 text-center text-sm text-stone-500">Exemple illustratif.</p>
          </div>
        </section>

        {/* Capture réelle du dashboard (affichée dès que le fichier existe) */}
        {hasDashboardShot && (
          <section className="py-24">
            <div className="mx-auto max-w-5xl px-6">
              <Reveal>
                <h2 className="text-center font-serif text-4xl font-medium tracking-tight sm:text-5xl">
                  Ton espace, <span className="italic text-accent">simple et clair</span>.
                </h2>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/dashboard-preview.png" alt="Aperçu du dashboard LinkP" className="mt-12 w-full rounded-lg border border-line shadow-2xl" />
              </Reveal>
            </div>
          </section>
        )}

        {/* Atouts */}
        <section className="bg-forest py-24 text-cream">
          <div className="mx-auto max-w-6xl px-6">
            <Reveal>
              <p className="flex items-center gap-3 text-sm font-semibold uppercase tracking-[0.18em] text-[#E9B58F]">
                <span className="h-px w-8 bg-[#E9B58F]" />
                Ce qui change tout
              </p>
              <h2 className="mt-6 max-w-2xl font-serif text-4xl font-medium leading-tight tracking-tight sm:text-5xl">
                Pensé pour que tes posts te <span className="italic text-[#E9B58F]">ressemblent</span>.
              </h2>
            </Reveal>
            <div className="mt-16 grid gap-x-16 gap-y-12 md:grid-cols-2">
              {strengths.map(([t, d], i) => (
                <Reveal key={t} delay={(i % 2) * 150}>
                  <div className="border-t border-white/20 pt-6">
                    <h3 className="font-serif text-2xl font-medium">{t}</h3>
                    <p className="mt-3 text-lg leading-relaxed text-cream/75">{d}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="py-24">
          <div className="mx-auto max-w-3xl px-6">
            <Reveal>
              <Eyebrow>FAQ</Eyebrow>
              <h2 className="mt-6 font-serif text-4xl font-medium tracking-tight sm:text-5xl">Questions fréquentes</h2>
            </Reveal>
            <Reveal className="mt-12 divide-y divide-line border-y border-line">
              {faq.map(([q, a]) => (
                <details key={q} className="group py-6">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-6 font-serif text-xl font-medium">
                    {q}
                    <span className="text-3xl font-light text-accent transition group-open:rotate-45">+</span>
                  </summary>
                  <p className="mt-4 max-w-2xl text-lg leading-relaxed text-stone-600">{a}</p>
                </details>
              ))}
            </Reveal>
          </div>
        </section>

        {/* CTA final */}
        <section className="px-6 pb-24">
          <div className="relative mx-auto max-w-5xl overflow-hidden bg-accent px-8 py-20 text-center text-white">
            <DoodleSpark className="float absolute left-[8%] top-[18%] h-6 w-6 text-white/70" />
            <DoodleSpark className="float absolute bottom-[20%] right-[10%] h-8 w-8 text-white/70" />
            <DoodlePlane className="wiggle absolute right-[8%] top-[14%] hidden h-16 w-16 text-white/80 sm:block" />
            <h2 className="mx-auto max-w-2xl font-serif text-4xl font-medium leading-tight tracking-tight sm:text-5xl">
              Ton prochain post est déjà à <span className="italic">moitié écrit</span>.
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-lg text-white/85">
              Crée ton compte, remplis ton profil, et laisse LinkP s&apos;occuper de la page blanche.
            </p>
            <Link
              href="/signup"
              className="mt-10 inline-flex items-center gap-2 rounded-full bg-cream px-8 py-4 text-base font-semibold text-ink transition hover:-translate-y-0.5 hover:bg-white"
            >
              Créer mon compte gratuitement <IconArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
