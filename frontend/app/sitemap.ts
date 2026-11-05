import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

// Date de dernière mise à jour du contenu des pages publiques (à actualiser quand elles changent).
const LAST_UPDATED = "2026-11-03";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${SITE.url}/`, lastModified: LAST_UPDATED, changeFrequency: "monthly", priority: 1 },
    { url: `${SITE.url}/signup`, lastModified: LAST_UPDATED, changeFrequency: "yearly", priority: 0.8 },
    { url: `${SITE.url}/login`, lastModified: LAST_UPDATED, changeFrequency: "yearly", priority: 0.4 },
    { url: `${SITE.url}/confidentialite`, lastModified: "2026-11-05", changeFrequency: "yearly", priority: 0.5 },
    { url: `${SITE.url}/conditions`, lastModified: "2026-11-05", changeFrequency: "yearly", priority: 0.3 },
  ];
}
