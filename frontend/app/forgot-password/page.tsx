"use client";

import Link from "next/link";
import { useState } from "react";
import AuthShell from "@/components/auth/AuthShell";
import Field, { FormError, SubmitButton } from "@/components/auth/Field";
import { IconCheck } from "@/components/Icons";
import { apiPublic, errorMessage } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await apiPublic("/auth/password-reset", { email });
      setSent(true);
    } catch (err) {
      setError(errorMessage(err));
    }
    setBusy(false);
  }

  return (
    <AuthShell
      art="recover"
      eyebrow="Mot de passe oublié"
      title={
        sent ? (
          <>
            Regarde ta <em>boîte mail</em>.
          </>
        ) : (
          <>
            On te renvoie <em>la clé</em>.
          </>
        )
      }
      subtitle={sent ? undefined : "Indique ton email : on t'envoie un lien pour choisir un nouveau mot de passe."}
      footer={
        <Link href="/login" className="font-semibold text-accent hover:underline">
          Retour à la connexion
        </Link>
      }
    >
      {sent ? (
        <div className="rounded-2xl border border-line bg-paper p-6 shadow-sm">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-accent-soft text-accent-dark">
            <IconCheck className="h-5 w-5" />
          </span>
          <p className="mt-4 text-lg leading-relaxed text-stone-700">
            Si un compte existe avec cette adresse, tu vas recevoir un email avec un lien pour choisir un nouveau mot de passe.
          </p>
          <p className="mt-3 text-base text-stone-500">Rien reçu ? Pense à regarder tes courriers indésirables.</p>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-5">
          <Field label="Email" type="email" required autoComplete="email" placeholder="toi@exemple.com" value={email} onChange={setEmail} />
          {error && <FormError>{error}</FormError>}
          <SubmitButton busy={busy}>Envoyer le lien</SubmitButton>
        </form>
      )}
    </AuthShell>
  );
}
