import type { Metadata } from "next";

// Source unique pour le SEO : titres, descriptions, adresse du site…
// L'adresse publique vient de NEXT_PUBLIC_SITE_URL (en production : https://ton-domaine.com).
export const SITE = {
  name: "LinkP",
  url: (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/+$/, ""),
  title: "LinkP | Rédige tes posts LinkedIn dans ta voix",
  tagline: "Tes posts LinkedIn, dans ta voix",
  description:
    "Fini la page blanche : LinkP trouve tes idées de posts LinkedIn, apprend ton style d'écriture, rédige tes publications et les planifie avec des rappels dans ton agenda.",
  keywords: [
    "post LinkedIn",
    "idées de posts LinkedIn",
    "générateur de posts LinkedIn",
    "rédaction LinkedIn IA",
    "planifier ses posts LinkedIn",
    "calendrier éditorial LinkedIn",
    "marque personnelle",
    "personal branding",
    "ghostwriting LinkedIn",
    "page blanche",
  ],
  locale: "fr_FR",
  ogAlt: "LinkP : tes posts LinkedIn, dans ta voix. Fini la page blanche.",
  themeColor: "#FAF5EC",
  brandColor: "#C8502D",
  author: { name: "Princesse ALAGNON", url: "https://www.linkedin.com/in/princess-alagnon/" },
} as const;

type PageMeta = { title: string; description: string; path: string; noindex?: boolean; absoluteTitle?: boolean };

/**
 * Métadonnées d'une page, cohérentes avec le reste du site.
 * Next.js remplace (et ne fusionne pas) openGraph et twitter : on les redéfinit donc en entier à chaque page.
 * L'image de partage (app/opengraph-image.tsx) est rappelée ici : sans cela, une page qui définit ses balises la perdrait.
 */
export function pageMeta({ title, description, path, noindex = false, absoluteTitle = false }: PageMeta): Metadata {
  const shown = absoluteTitle ? title : `${title} | ${SITE.name}`;
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: { canonical: path },
    robots: noindex ? { index: false, follow: false } : undefined,
    openGraph: {
      type: "website",
      siteName: SITE.name,
      locale: SITE.locale,
      url: path,
      title: shown,
      description,
      images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: SITE.ogAlt }],
    },
    twitter: { card: "summary_large_image", title: shown, description, images: [{ url: "/twitter-image", alt: SITE.ogAlt }] },
  };
}

// Pages publiques indexables (utilisé par le plan du site).
export const PUBLIC_PATHS = ["/", "/signup", "/login"] as const;
