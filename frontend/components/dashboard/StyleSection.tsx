"use client";

import { useState } from "react";
import { api, errorMessage } from "@/lib/api";
import type { Example, Profile, StyleAnalysis } from "@/lib/types";
import { AiHint, Chip, Notify, Section, btnDark, btnGhost, btnPrimary, input } from "./ui";

export default function StyleSection({
  examples,
  setExamples,
  profile,
  onProfile,
  aiReady,
  notify,
}: {
  examples: Example[];
  setExamples: (e: Example[]) => void;
  profile: Profile;
  onProfile: (p: Profile) => void;
  aiReady: boolean;
  notify: Notify;
}) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState<"" | "add" | "analyze">("");
  const analysis = profile.style_analysis;
  const outdated = analysis && analysis.examples_count !== examples.length;

  async function add() {
    setBusy("add");
    try {
      const ex = await api<Example>("/examples", { method: "POST", body: JSON.stringify({ content: text }) });
      setExamples([ex, ...examples]);
      setText("");
    } catch (err) {
      notify("error", errorMessage(err));
    }
    setBusy("");
  }

  async function remove(id: string) {
    try {
      await api(`/examples/${id}`, { method: "DELETE" });
      setExamples(examples.filter((e) => e.id !== id));
    } catch (err) {
      notify("error", errorMessage(err));
    }
  }

  async function analyze() {
    setBusy("analyze");
    try {
      const result = await api<StyleAnalysis>("/ai/analyze-style", { method: "POST" });
      onProfile({ ...profile, style_analysis: result });
      notify("ok", "Style analysé : il sera utilisé pour tes prochains posts.");
    } catch (err) {
      notify("error", errorMessage(err));
    }
    setBusy("");
  }

  return (
    <Section id="style" title="Tes posts passés" hint="Colle des posts que tu as déjà écrits : ils servent de référence pour ton style.">
      <textarea
        className={input}
        rows={5}
        maxLength={5000}
        placeholder="Colle un post ici (20 caractères minimum)…"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <button type="button" onClick={add} disabled={text.trim().length < 20 || busy !== ""} className={btnDark}>
        {busy === "add" ? "Ajout…" : "Ajouter cet exemple"}
      </button>

      <ul className="space-y-3">
        {examples.map((e) => (
          <li key={e.id} className="rounded-lg border border-stone-200 p-4 text-base">
            <p className="line-clamp-4 whitespace-pre-wrap">{e.content}</p>
            <button type="button" onClick={() => remove(e.id)} className="mt-2 text-sm font-medium text-red-600">
              Supprimer
            </button>
          </li>
        ))}
      </ul>

      {examples.length > 0 && (
        <div className="rounded-xl bg-cream p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="font-serif text-xl font-medium">Analyse de ton style</p>
            <button type="button" onClick={analyze} disabled={busy !== "" || !aiReady} className={analysis ? btnGhost : btnPrimary}>
              {busy === "analyze" ? "Analyse en cours…" : analysis ? "Relancer l'analyse" : "Analyser mon style"}
            </button>
          </div>
          {!aiReady && <div className="mt-3"><AiHint /></div>}
          {outdated && <p className="mt-3 text-base text-accent-dark">Tes exemples ont changé depuis la dernière analyse.</p>}
          {analysis && (
            <dl className="mt-4 space-y-3 text-base">
              <p className="text-stone-800">{analysis.summary}</p>
              <div className="flex flex-wrap gap-2">
                {analysis.tone_keywords.map((k) => (
                  <Chip key={k}>{k}</Chip>
                ))}
              </div>
              <p>
                <span className="font-medium">Longueur :</span> {analysis.typical_length}
              </p>
              <p>
                <span className="font-medium">Structure :</span> {analysis.structure}
              </p>
              {analysis.vocabulary.length > 0 && (
                <p>
                  <span className="font-medium">Tournures récurrentes :</span> {analysis.vocabulary.join(", ")}
                </p>
              )}
              {analysis.avoid.length > 0 && (
                <p>
                  <span className="font-medium">Tu évites :</span> {analysis.avoid.join(", ")}
                </p>
              )}
            </dl>
          )}
        </div>
      )}
    </Section>
  );
}
