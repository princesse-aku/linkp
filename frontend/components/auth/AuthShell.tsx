import Link from "next/link";
import { DoodleArrow, DoodlePlane, DoodlePin, DoodleSpark } from "@/components/Doodles";
import { IconCheck } from "@/components/Icons";
import { Floater, PlanningWidget, ThemesWidget, ToolTiles } from "@/components/landing/Widgets";
import Logo, { LogoMark } from "@/components/Logo";

export type AuthArt = "login" | "signup" | "recover" | "onboarding";

const ART: Record<AuthArt, { headline: React.ReactNode; points: string[] }> = {
  login: {
    headline: (
      <>
        Tes idées t&apos;attendent, <em className="text-accent">prêtes à publier</em>.
      </>
    ),
    points: ["Tous tes posts au même endroit", "Un style qui te ressemble", "Des rappels dans ton agenda"],
  },
  signup: {
    headline: (
      <>
        Ton prochain post est déjà à <em className="text-accent">moitié écrit</em>.
      </>
    ),
    points: ["Des idées de sujets à la demande", "Des posts écrits dans ta voix", "Un calendrier déjà rempli"],
  },
  recover: {
    headline: (
      <>
        Pas de panique, on <em className="text-accent">retrouve</em> ton accès.
      </>
    ),
    points: ["Un lien sécurisé par email", "Choisis un nouveau mot de passe", "Reprends là où tu t'es arrêté"],
  },
  onboarding: {
    headline: (
      <>
        Branche ton IA, et <em className="text-accent">c&apos;est parti</em>.
      </>
    ),
    points: ["Ta clé est vérifiée puis chiffrée", "Tu gardes la main sur ta consommation", "Modifiable à tout moment"],
  },
};

// Panneau illustré (grand écran) : le même univers que le hero de la page d'accueil.
function Art({ variant }: { variant: AuthArt }) {
  const { headline, points } = ART[variant];
  return (
    <div className="relative flex h-full min-h-[720px] flex-col items-center justify-center overflow-hidden rounded-[2.5rem] border border-line bg-paper bg-[radial-gradient(#dccfba_1px,transparent_1px)] [background-size:22px_22px]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,253,248,0.94)_25%,transparent_72%)]" />

      <div className="relative z-10 mx-auto max-w-sm px-6 text-center">
        <div className="pop mx-auto mb-7 flex h-20 w-20 items-center justify-center rounded-3xl border border-line bg-paper shadow-xl">
          <LogoMark className="h-12 w-12" />
        </div>
        <h2 className="fade-up font-serif text-4xl font-medium leading-[1.08] tracking-tight text-ink xl:text-[2.75rem] [&_em]:italic">{headline}</h2>
        <ul className="fade-up mt-7 space-y-3 text-left text-base text-stone-700 [animation-delay:200ms]">
          {points.map((p) => (
            <li key={p} className="flex items-center gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent-dark">
                <IconCheck className="h-3.5 w-3.5" />
              </span>
              {p}
            </li>
          ))}
        </ul>
      </div>

      <Floater className="left-[5%] top-[4%]" delay={200} duration={7}>
        <div className="relative w-44 rotate-[-6deg] bg-[#F5E3A3] p-4 pt-6 font-serif text-base italic leading-snug text-ink shadow-xl">
          <DoodlePin className="absolute -top-3 left-1/2 h-6 w-6 -translate-x-1/2" />
          Idée : et si je parlais de mon pire moment de manager ?
        </div>
      </Floater>
      <Floater className="right-[4%] top-[5%]" delay={450} duration={8}>
        <PlanningWidget />
      </Floater>
      <Floater className="bottom-[5%] left-[4%]" delay={650} duration={9}>
        <ThemesWidget />
      </Floater>
      <Floater className="bottom-[6%] right-[7%]" delay={850} duration={7}>
        <ToolTiles />
      </Floater>
      <Floater className="left-[30%] top-[22%] text-accent" delay={1100} duration={9}>
        <DoodleArrow className="h-14 w-14 rotate-[20deg]" />
      </Floater>
      <Floater className="right-[26%] bottom-[24%] text-forest" delay={1300} duration={10}>
        <DoodlePlane className="wiggle h-12 w-12" />
      </Floater>
      <Floater className="right-[34%] top-[8%] text-accent" delay={1500} duration={6}>
        <DoodleSpark className="h-4 w-4" />
      </Floater>
    </div>
  );
}

export default function AuthShell({
  art,
  eyebrow,
  title,
  subtitle,
  children,
  footer,
  wide = false,
}: {
  art: AuthArt;
  eyebrow?: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      {/* Colonne du formulaire */}
      <div className="flex min-h-screen flex-col px-6 py-6 sm:px-10 lg:min-h-0">
        <div className="flex items-center justify-between gap-4">
          <Logo compact />
          <Link href="/" className="rounded-full px-4 py-2 text-base font-medium text-stone-600 hover:bg-white hover:text-ink">
            Retour au site
          </Link>
        </div>

        <div className={`mx-auto flex w-full flex-1 flex-col justify-center py-10 ${wide ? "max-w-lg" : "max-w-md"}`}>
          {eyebrow && (
            <p className="flex items-center gap-3 text-sm font-semibold uppercase tracking-[0.18em] text-accent">
              <span className="h-px w-8 bg-accent" />
              {eyebrow}
            </p>
          )}
          <h1 className="mt-4 font-serif text-4xl font-medium leading-[1.08] tracking-tight sm:text-5xl [&_em]:italic [&_em]:text-accent">{title}</h1>
          {subtitle && <p className="mt-4 text-lg leading-relaxed text-stone-600">{subtitle}</p>}
          <div className="mt-8">{children}</div>
          {footer && <div className="mt-8 text-center text-base text-stone-600">{footer}</div>}
        </div>

        <p className="text-center text-sm text-stone-500">LinkP, tes idées, ta voix.</p>
      </div>

      {/* Panneau illustré (grand écran uniquement) */}
      <aside className="hidden p-4 lg:block" aria-hidden>
        <div className="sticky top-4 h-[calc(100vh-2rem)] min-h-[720px]">
          <Art variant={art} />
        </div>
      </aside>
    </div>
  );
}
