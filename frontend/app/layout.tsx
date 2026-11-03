import type { Metadata } from "next";
import { Fraunces, Geist } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const description =
  "Fini la page blanche : LinkP te propose des idées et rédige tes posts LinkedIn dans ton style, programmés sur la période de ton choix.";

export const metadata: Metadata = {
  title: "LinkP — Tes posts LinkedIn, dans ta voix",
  description,
  openGraph: {
    title: "LinkP — Tes posts LinkedIn, dans ta voix",
    description,
    type: "website",
    locale: "fr_FR",
    siteName: "LinkP",
  },
  twitter: { card: "summary_large_image", title: "LinkP — Tes posts LinkedIn, dans ta voix", description },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" data-scroll-behavior="smooth" className={`${geistSans.variable} ${fraunces.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
