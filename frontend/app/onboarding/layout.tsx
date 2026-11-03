import { pageMeta } from "@/lib/site";

export const metadata = pageMeta({
  title: "Bienvenue",
  description: "Dernière étape : connecte ton IA pour que LinkP rédige tes posts LinkedIn.",
  path: "/onboarding",
  noindex: true,
});

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
