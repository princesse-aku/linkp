import AuthForm from "@/components/AuthForm";
import { pageMeta } from "@/lib/site";

export const metadata = pageMeta({
  title: "Créer un compte",
  description: "Crée ton compte LinkP en quelques secondes : idées de posts, rédaction dans ton style et planification de tes publications LinkedIn.",
  path: "/signup",
});

export default function SignupPage() {
  return <AuthForm mode="signup" />;
}
