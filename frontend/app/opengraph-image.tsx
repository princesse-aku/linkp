import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { SITE } from "@/lib/site";

// Image affichée quand le lien est partagé (LinkedIn, WhatsApp, X, Slack, iMessage…).
export const alt = SITE.ogAlt;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const fontDir = join(process.cwd(), "node_modules", "@fontsource", "fraunces", "files");
const [medium, semiBold, italic] = await Promise.all([
  readFile(join(fontDir, "fraunces-latin-500-normal.woff")),
  readFile(join(fontDir, "fraunces-latin-600-normal.woff")),
  readFile(join(fontDir, "fraunces-latin-600-italic.woff")),
]);

const INK = "#1D1A16";
const ACCENT = "#C8502D";
const LINE = "#E4D9C8";

export default function Image() {
  const host = SITE.url.replace(/^https?:\/\//, "");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          padding: 28,
          background: "#FAF5EC",
          backgroundImage: "radial-gradient(#DCCFBA 1.6px, transparent 1.6px)",
          backgroundSize: "30px 30px",
          fontFamily: "Fraunces",
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            borderRadius: 48,
            border: `2px solid ${LINE}`,
            background: "rgba(255,253,248,0.94)",
            overflow: "hidden",
          }}
        >
          {/* Texte */}
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: 740, padding: "52px 0 48px 64px" }}>
            <div style={{ display: "flex", alignItems: "center" }}>
              <svg width="64" height="64" viewBox="0 0 64 64">
                <path d="M16 4H48A12 12 0 0 1 60 16V40A12 12 0 0 1 48 52H30L18 61V52H16A12 12 0 0 1 4 40V16A12 12 0 0 1 16 4Z" fill={ACCENT} />
                <path d="M24 16V36H40" stroke="#fff" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                <path d="M45 11L46.7 16.3L52 18L46.7 19.7L45 25L43.3 19.7L38 18L43.3 16.3Z" fill="#FDE7C8" />
              </svg>
              <div style={{ display: "flex", marginLeft: 16, fontSize: 44, fontWeight: 600, color: INK }}>
                Link<span style={{ color: ACCENT }}>P</span>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", fontSize: 76, fontWeight: 500, lineHeight: 1.04, color: INK, letterSpacing: -2 }}>
              <div style={{ display: "flex" }}>Ne reste plus</div>
              <div style={{ display: "flex" }}>jamais devant une</div>
              <div style={{ display: "flex", fontStyle: "italic", fontWeight: 600, color: ACCENT }}>page blanche.</div>
            </div>

            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", fontSize: 31, lineHeight: 1.3, color: "#57534E", maxWidth: 640, fontWeight: 500 }}>
                Tes idées, tes mots et ton calendrier : LinkP rédige tes posts LinkedIn dans ta voix.
              </div>
              <div style={{ display: "flex", marginTop: 18, fontSize: 24, color: "#A8A29E" }}>{host}</div>
            </div>
          </div>

          {/* Décor : post-it et feuille de post, comme sur la page d'accueil */}
          <div style={{ display: "flex", position: "relative", flex: 1 }}>
            <div
              style={{
                position: "absolute",
                top: 236,
                left: 10,
                width: 340,
                display: "flex",
                flexDirection: "column",
                padding: 26,
                borderRadius: 6,
                background: "#FFFDF8",
                border: `2px solid ${LINE}`,
                boxShadow: "0 30px 60px -25px rgba(60,40,20,0.45)",
                transform: "rotate(-3deg)",
              }}
            >
              <div style={{ display: "flex", alignSelf: "flex-start", padding: "6px 16px", borderRadius: 999, background: "#F6DFD1", color: "#A63F20", fontSize: 20, fontWeight: 600 }}>
                Thème : leadership
              </div>
              <div style={{ display: "flex", marginTop: 22, width: 288, height: 16, borderRadius: 8, background: LINE }} />
              <div style={{ display: "flex", marginTop: 14, width: 250, height: 16, borderRadius: 8, background: LINE }} />
              <div style={{ display: "flex", marginTop: 14, width: 270, height: 16, borderRadius: 8, background: LINE }} />
              <div style={{ display: "flex", marginTop: 14, width: 170, height: 16, borderRadius: 8, background: LINE }} />
              <div style={{ display: "flex", marginTop: 26, alignItems: "center", color: ACCENT, fontSize: 21, fontWeight: 600 }}>Dans ta voix</div>
            </div>

            <div
              style={{
                position: "absolute",
                top: 40,
                left: 150,
                width: 230,
                display: "flex",
                padding: "22px 20px",
                background: "#F5E3A3",
                color: INK,
                fontSize: 25,
                lineHeight: 1.2,
                fontStyle: "italic",
                fontWeight: 600,
                boxShadow: "0 14px 30px -12px rgba(60,40,20,0.4)",
                transform: "rotate(6deg)",
              }}
            >
              Idée : et si je parlais de mon pire moment de manager ?
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Fraunces", data: medium, weight: 500, style: "normal" },
        { name: "Fraunces", data: semiBold, weight: 600, style: "normal" },
        { name: "Fraunces", data: italic, weight: 600, style: "italic" },
      ],
    },
  );
}
