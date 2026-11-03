import DashboardProvider from "@/components/dashboard/DashboardProvider";
import Shell from "@/components/dashboard/Shell";

// Toutes les pages du tableau de bord partagent les mêmes données, le menu et la génération en cours.
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardProvider>
      <Shell>{children}</Shell>
    </DashboardProvider>
  );
}
