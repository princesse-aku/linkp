"use client";

import Link from "next/link";
import { useState } from "react";
import { api, errorMessage } from "@/lib/api";
import type { AiKeyStatus } from "@/lib/types";

const btnPrimary = "rounded-lg bg-accent px-5 py-2.5 text-base font-semibold text-white hover:bg-accent-dark disabled:opacity-60";
const btnGhost = "rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-base font-medium hover:bg-stone-50 disabled:opacity-50";

// Formulaire de la clé RodiumAI : utilisé à l'inscription (onboarding) et dans le profil.
export default function AiKeyForm({
  status,
  onChange,
  onSaved,
}: {
  status: AiKeyStatus;
  onChange: (s: AiKeyStatus) => void;
  onSaved?: () => void;
}) {
  const [value, setValue] = useState("");
  const [editing, setEditing] = useState(!status.configured);
  const [busy, setBusy] = useState<"" | "save" | "delete">("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaved(false);
    setBusy("save");
    try {
      const next = await api<AiKeyStatus>("/ai/key", { method: "PUT", body: JSON.stringify({ api_key: value.trim() }) });
      onChange(next);
      setValue("");
      setEditing(false);
      setSaved(true);
      onSaved?.();
    } catch (err) {
      setError(errorMessage(err));
    }
    setBusy("");
  }

  async function remove() {
    if (!window.confirm("Supprimer ta clé RodiumAI ? Les fonctions IA seront désactivées jusqu'à ce que tu en ajoutes une nouvelle.")) return;
    setError("");
    setBusy("delete");
    try {
      await api("/ai/key", { method: "DELETE" });
      onChange({ configured: false, last4: null });
      setEditing(true);
      setSaved(false);
    } catch (err) {
      setError(errorMessage(err));
    }
    setBusy("");
  }

  return (
    <div className="space-y-4">
      {status.configured && !editing ? (
        <>
          <p className="text-base text-stone-800">
            {saved ? "Clé vérifiée et enregistrée : " : "Clé enregistrée : "}
            <span className="rounded bg-cream px-2 py-0.5 font-mono text-sm">rd_sk_••••••••{status.last4}</span>
          </p>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => setEditing(true)} className={btnGhost}>
              Remplacer
            </button>
            <button type="button" onClick={remove} disabled={busy !== ""} className="px-2 text-base font-medium text-red-600">
              {busy === "delete" ? "Suppression…" : "Supprimer"}
            </button>
          </div>
        </>
      ) : (
        <form onSubmit={save} className="space-y-3">
          <label className="block text-base font-medium" htmlFor="rodium-key">
            Ta clé API RodiumAI
          </label>
          <input
            id="rodium-key"
            type="password"
            required
            autoComplete="off"
            spellCheck={false}
            placeholder="rd_sk_..."
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-full rounded-xl border border-line bg-paper px-4 py-3.5 font-mono text-base shadow-sm focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/15"
          />
          {error && (
            <p role="alert" className="text-base text-red-600">
              {error}
            </p>
          )}
          <div className="flex flex-wrap gap-3">
            <button disabled={busy !== "" || value.trim().length < 10} className={btnPrimary}>
              {busy === "save" ? "Vérification…" : "Vérifier et enregistrer"}
            </button>
            {status.configured && (
              <button type="button" onClick={() => (setEditing(false), setValue(""), setError(""))} className={btnGhost}>
                Annuler
              </button>
            )}
          </div>
        </form>
      )}
      <p className="text-sm leading-relaxed text-stone-500">
        Ta clé est chiffrée avant d&apos;être enregistrée et ne s&apos;affiche plus jamais en entier. Tu peux la supprimer à tout moment.{" "}
        <Link href="/confidentialite#securite" target="_blank" className="font-medium text-accent underline underline-offset-4">
          Comment elle est protégée et comment la révoquer
        </Link>
      </p>
      {status.configured && !editing && error && (
        <p role="alert" className="text-base text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
