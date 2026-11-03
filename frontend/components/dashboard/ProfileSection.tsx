"use client";

import { useState } from "react";
import AiKeyForm from "@/components/AiKeyForm";
import { IconCheck } from "@/components/Icons";
import { api, errorMessage } from "@/lib/api";
import type { AiKeyStatus, Profile } from "@/lib/types";
import { AiHint, Notify, Section, btnDark, btnGhost, btnPrimary, input } from "./ui";

const TONES = ["Professionnel", "Inspirant", "Humoristique", "Storytelling", "Pédagogue", "Direct", "Bienveillant", "Provocateur"];

const TIMEZONES = [
  "Europe/Paris",
  "Europe/Brussels",
  "Europe/Zurich",
  "Europe/London",
  "America/Montreal",
  "America/New_York",
  "Africa/Abidjan",
  "Africa/Dakar",
  "Africa/Lagos",
  "Africa/Casablanca",
];

export default function ProfileSection({
  profile,
  onChange,
  aiKey,
  onAiKey,
  notify,
}: {
  profile: Profile;
  onChange: (p: Profile) => void;
  aiKey: AiKeyStatus;
  onAiKey: (s: AiKeyStatus) => void;
  notify: Notify;
}) {
  const [themeInput, setThemeInput] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [busy, setBusy] = useState<"" | "save" | "suggest">("");
  const [saved, setSaved] = useState(false);

  const set = <K extends keyof Profile>(key: K, value: Profile[K]) => onChange({ ...profile, [key]: value });

  const addTheme = (raw: string) => {
    const t = raw.trim();
    if (t && !profile.themes.some((x) => x.toLowerCase() === t.toLowerCase())) set("themes", [...profile.themes, t]);
    setSuggestions((s) => s.filter((x) => x !== t));
    setThemeInput("");
  };

  async function save() {
    setBusy("save");
    setSaved(false);
    try {
      onChange(await api<Profile>("/profile", { method: "PUT", body: JSON.stringify(profile) }));
      notify("ok", "Informations enregistrées.");
      setSaved(true);
      setTimeout(() => setSaved(false), 3500);
    } catch (err) {
      notify("error", errorMessage(err));
    }
    setBusy("");
  }

  async function suggest() {
    setBusy("suggest");
    try {
      // Les idées se basent sur les infos enregistrées : on enregistre d'abord.
      onChange(await api<Profile>("/profile", { method: "PUT", body: JSON.stringify(profile) }));
      const { themes } = await api<{ themes: string[] }>("/ai/suggest-themes", { method: "POST" });
      setSuggestions(themes);
    } catch (err) {
      notify("error", errorMessage(err));
    }
    setBusy("");
  }

  const timezones = TIMEZONES.includes(profile.timezone) ? TIMEZONES : [profile.timezone, ...TIMEZONES];

  return (
    <>
      <Section
        id="ia"
        title="Ta clé RodiumAI"
        hint="LinkP écrit avec RodiumAI. Utilise ta propre clé : elle est vérifiée, chiffrée, et tu gères ta consommation chez RodiumAI."
      >
        <AiKeyForm status={aiKey} onChange={onAiKey} />
        {!aiKey.configured && (
          <p className="text-base text-stone-500">
            Pas encore de clé ?{" "}
            <a href="https://www.rodiumai.io/docs" target="_blank" rel="noopener noreferrer" className="font-medium text-accent underline">
              Consulte la documentation RodiumAI
            </a>
            .
          </p>
        )}
      </Section>

      <Section id="profil" title="Tes informations" hint="Ces infos aident à personnaliser tes posts.">
        <div className="grid gap-4 sm:grid-cols-2">
          <input className={input} placeholder="Nom complet" value={profile.full_name} onChange={(e) => set("full_name", e.target.value)} />
          <input className={input} placeholder="Poste / métier" value={profile.job_title} onChange={(e) => set("job_title", e.target.value)} />
          <input className={input} placeholder="Secteur d'activité" value={profile.industry} onChange={(e) => set("industry", e.target.value)} />
          <select className={input} value={profile.language} onChange={(e) => set("language", e.target.value as Profile["language"])}>
            <option value="fr">Rédiger en français</option>
            <option value="en">Rédiger en anglais</option>
          </select>
        </div>
        <textarea
          className={input}
          rows={3}
          maxLength={1500}
          placeholder="Quelques mots sur toi et ton audience"
          value={profile.bio}
          onChange={(e) => set("bio", e.target.value)}
        />
      </Section>

      <Section title="Tons de rédaction" hint="Choisis-en un ou plusieurs.">
        <div className="flex flex-wrap gap-2">
          {TONES.map((t) => {
            const on = profile.tones.includes(t);
            return (
              <button
                key={t}
                type="button"
                aria-pressed={on}
                onClick={() => set("tones", on ? profile.tones.filter((x) => x !== t) : [...profile.tones, t])}
                className={`rounded-full border px-4 py-1.5 text-base ${on ? "border-accent bg-accent text-white" : "border-stone-300 hover:bg-stone-50"}`}
              >
                {t}
              </button>
            );
          })}
        </div>
      </Section>

      <Section title="Thèmes" hint="Les sujets sur lesquels tu veux écrire. Pas d'idée ? Laisse l'IA t'en proposer.">
        <div className="flex gap-2">
          <input
            className={input}
            placeholder="Ex : leadership, IA, recrutement…"
            value={themeInput}
            onChange={(e) => setThemeInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTheme(themeInput))}
          />
          <button type="button" onClick={() => addTheme(themeInput)} className={btnDark}>
            Ajouter
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {profile.themes.map((t) => (
            <span key={t} className="inline-flex items-center gap-2 rounded-full bg-accent-soft px-3 py-1 text-base text-accent-dark">
              {t}
              <button type="button" aria-label={`Retirer ${t}`} onClick={() => set("themes", profile.themes.filter((x) => x !== t))}>
                ×
              </button>
            </span>
          ))}
        </div>
        <button type="button" onClick={suggest} disabled={busy !== "" || !aiKey.configured} className={btnGhost}>
          {busy === "suggest" ? "Recherche d'idées…" : "Me proposer des thèmes avec l'IA"}
        </button>
        {!aiKey.configured && <AiHint />}
        {suggestions.length > 0 && (
          <div>
            <p className="text-base text-stone-500">Clique pour ajouter :</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => addTheme(s)}
                  className="rounded-full border border-dashed border-accent px-3 py-1 text-base text-accent-dark hover:bg-accent-soft"
                >
                  + {s}
                </button>
              ))}
            </div>
          </div>
        )}
      </Section>

      <Section title="Période de programmation" hint="Quand veux-tu publier, et à quelle fréquence ?">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-base">
            Du
            <input type="date" className={`${input} mt-1`} value={profile.start_date ?? ""} onChange={(e) => set("start_date", e.target.value || null)} />
          </label>
          <label className="text-base">
            Au
            <input type="date" className={`${input} mt-1`} value={profile.end_date ?? ""} onChange={(e) => set("end_date", e.target.value || null)} />
          </label>
          <label className="text-base">
            Posts par semaine
            <input
              type="number"
              min={1}
              max={7}
              className={`${input} mt-1`}
              value={profile.posts_per_week}
              onChange={(e) => set("posts_per_week", Math.min(7, Math.max(1, Number(e.target.value) || 1)))}
            />
          </label>
          <label className="text-base">
            Heure de publication
            <input type="time" className={`${input} mt-1`} value={profile.publish_time?.slice(0, 5) ?? ""} onChange={(e) => set("publish_time", e.target.value || null)} />
          </label>
          <label className="text-base sm:col-span-2">
            Fuseau horaire
            <select className={`${input} mt-1`} value={profile.timezone} onChange={(e) => set("timezone", e.target.value)}>
              {timezones.map((tz) => (
                <option key={tz} value={tz}>
                  {tz.replace("_", " ")}
                </option>
              ))}
            </select>
          </label>
        </div>
        <button type="button" onClick={save} disabled={busy !== ""} className={btnPrimary}>
          {busy === "save" ? (
            "Enregistrement…"
          ) : saved ? (
            <span className="inline-flex items-center gap-2">
              <IconCheck className="h-4 w-4" /> Enregistré
            </span>
          ) : (
            "Enregistrer mes informations"
          )}
        </button>
      </Section>
    </>
  );
}
