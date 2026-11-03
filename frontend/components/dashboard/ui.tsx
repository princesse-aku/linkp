import Link from "next/link";

export const input = "w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-base";
export const btnPrimary =
  "rounded-lg bg-accent px-5 py-2.5 text-base font-semibold text-white hover:bg-accent-dark disabled:opacity-60";
export const btnDark = "rounded-lg bg-ink px-4 py-2.5 text-base font-medium text-white hover:bg-stone-700 disabled:opacity-50";
export const btnGhost =
  "rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-base font-medium hover:bg-stone-50 disabled:opacity-50";

export type Notify = (type: "ok" | "error", text: string) => void;

export function Section({
  id,
  title,
  hint,
  children,
}: {
  id?: string;
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 rounded-2xl border border-stone-200 bg-white p-6">
      <h2 className="font-serif text-2xl font-medium">{title}</h2>
      {hint && <p className="mt-1 text-base text-stone-500">{hint}</p>}
      <div className="mt-5 space-y-4">{children}</div>
    </section>
  );
}

export function Chip({ children, tone = "accent" }: { children: React.ReactNode; tone?: "accent" | "neutral" | "forest" }) {
  const styles = {
    accent: "bg-accent-soft text-accent-dark",
    neutral: "bg-stone-100 text-stone-700",
    forest: "bg-forest text-cream",
  };
  return <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm ${styles[tone]}`}>{children}</span>;
}

export function AiHint() {
  return (
    <p className="text-base text-stone-500">
      Cette action utilise l&apos;IA.{" "}
      <Link href="/dashboard/settings#ia" className="font-medium text-accent underline">
        Ajoute ta clé RodiumAI
      </Link>{" "}
      pour l&apos;activer.
    </p>
  );
}
