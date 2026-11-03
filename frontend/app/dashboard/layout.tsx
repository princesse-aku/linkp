import type { Metadata } from "next";
import DashboardProvider from "@/components/dashboard/DashboardProvider";
import Shell from "@/components/dashboard/Shell";

// Espace privé : jamais indexé par les moteurs de recherche.
export const metadata: Metadata = {
  title: "Mon espace",
  robots: { index: false, follow: false, nocache: true },
};

// Toutes les pages du tableau de bord partagent les mêmes données, le menu et la génération en cours.
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardProvider>
      <Shell>{children}</Shell>
    </DashboardProvider>
  );
}
