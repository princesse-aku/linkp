import AuthForm from "@/components/AuthForm";
import { pageMeta } from "@/lib/site";

export const metadata = pageMeta({
  title: "Connexion",
  description: "Connecte-toi à LinkP pour retrouver tes posts LinkedIn, ton style d'écriture et ton calendrier de publication.",
  path: "/login",
});

export default function LoginPage() {
  return <AuthForm mode="login" />;
}
