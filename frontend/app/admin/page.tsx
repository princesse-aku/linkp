import AdminDashboard from "@/components/admin/AdminDashboard";
import { pageMeta } from "@/lib/site";

export const metadata = pageMeta({
  title: "Administration",
  description: "Espace d'administration de LinkP.",
  path: "/admin",
  noindex: true,
});

export default function AdminPage() {
  return <AdminDashboard />;
}
