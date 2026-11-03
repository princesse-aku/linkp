import { pageMeta } from "@/lib/site";

// La page est un composant client : ses métadonnées vivent donc dans ce layout. Page privée, non indexée.
export const metadata = pageMeta({
  title: "Mot de passe oublié",
  description: "Réinitialise le mot de passe de ton compte LinkP.",
  path: "/forgot-password",
  noindex: true,
});

export default function ForgotPasswordLayout({ children }: { children: React.ReactNode }) {
  return children;
}
