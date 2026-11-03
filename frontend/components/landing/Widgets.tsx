import { IconCalendar, IconPen, IconSpark } from "@/components/Icons";

// Objets « posés » du hero de la page d'accueil, réutilisés sur les pages de connexion et d'inscription.
const cardShadow = "shadow-[0_24px_50px_-22px_rgba(60,40,20,0.4)]";

export function Floater({ className, delay, duration, children }: { className: string; delay: number; duration: number; children: React.ReactNode }) {
  return (
    <div className={`fade-up absolute hidden lg:block ${className}`} style={{ animationDelay: `${delay}ms` }}>
      <div className="float" style={{ animationDuration: `${duration}s`, animationDelay: `-${delay / 100}s` }}>
        {children}
      </div>
    </div>
  );
}

export function PlanningWidget() {
  const rows = [
    ["Mar", "9h00", "Leadership"],
    ["Jeu", "9h00", "Storytelling"],
    ["Sam", "10h00", "Recrutement"],
  ];
  return (
    <div className={`w-56 rotate-[2deg] rounded-2xl border border-line bg-paper p-4 text-left ${cardShadow}`}>
      <div className="flex items-center justify-between font-serif text-lg font-medium">
        Planning
        <IconCalendar className="h-4 w-4 text-accent" />
      </div>
      <ul className="mt-3 space-y-2.5">
        {rows.map(([d, h, t]) => (
          <li key={d} className="flex items-center gap-3 rounded-xl bg-cream px-3 py-2 text-sm">
            <span className="w-9 rounded-md bg-accent-soft py-1 text-center font-semibold text-accent-dark">{d}</span>
            <span className="flex-1">
              <span className="block font-medium text-ink">{t}</span>
              <span className="block text-stone-500">{h}</span>
            </span>
            <span className="h-2.5 w-2.5 rounded-full bg-forest" />
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ThemesWidget() {
  return (
    <div className={`w-56 rotate-[-2deg] rounded-2xl border border-line bg-paper p-4 text-left ${cardShadow}`}>
      <p className="font-serif text-lg font-medium">Tes thèmes</p>
      <div className="mt-3 flex flex-wrap gap-2 text-sm">
        {["Leadership", "IA", "Recrutement"].map((t, i) => (
          <span key={t} className={`rounded-full px-3 py-1 ${i === 0 ? "bg-accent text-white" : "bg-cream text-ink ring-1 ring-line"}`}>
            {t}
          </span>
        ))}
      </div>
      <p className="mt-4 text-sm font-medium text-stone-500">Tons</p>
      <div className="mt-2 flex flex-wrap gap-2 text-sm">
        {["Storytelling", "Bienveillant"].map((t) => (
          <span key={t} className="rounded-full bg-forest px-3 py-1 text-cream">
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

export function ToolTiles() {
  const tile = "flex h-16 w-16 items-center justify-center rounded-2xl border border-line bg-paper shadow-lg";
  return (
    <div className="relative h-36 w-44">
      <div className={`${tile} absolute left-0 top-10 rotate-[-10deg] text-accent`}>
        <IconSpark className="h-7 w-7" />
      </div>
      <div className={`${tile} absolute left-14 top-0 rotate-[6deg] text-forest`}>
        <IconPen className="h-7 w-7" />
      </div>
      <div className={`${tile} absolute left-24 top-16 rotate-[-4deg] text-ink`}>
        <IconCalendar className="h-7 w-7" />
      </div>
    </div>
  );
}
