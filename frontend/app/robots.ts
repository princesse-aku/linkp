import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

// Les pages privées (espace connecté, étape d'inscription, récupération de mot de passe) ne doivent pas être indexées.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/dashboard", "/onboarding", "/forgot-password", "/api/"] }],
    sitemap: `${SITE.url}/sitemap.xml`,
    host: SITE.url,
  };
}
