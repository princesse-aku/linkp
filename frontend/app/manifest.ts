import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

// Manifeste d'application web : permet d'« installer » LinkP sur l'écran d'accueil du téléphone.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE.title,
    short_name: SITE.name,
    description: SITE.description,
    lang: "fr",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: SITE.themeColor,
    theme_color: SITE.brandColor,
    categories: ["productivity", "business"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Mes posts", url: "/dashboard/posts", icons: [{ src: "/icon-192.png", sizes: "192x192" }] },
      { name: "Générer des posts", url: "/dashboard", icons: [{ src: "/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
