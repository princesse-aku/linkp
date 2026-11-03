"use client";

import Link from "next/link";
import { useState } from "react";
import Logo from "@/components/Logo";
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
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm rounded-2xl border border-stone-200 bg-white p-8 shadow-sm">
        <Logo />
        <h1 className="mt-4 font-serif text-3xl font-medium">Mot de passe oublié</h1>

        {sent ? (
          <p className="mt-6 text-base text-stone-700">
            Si un compte existe avec cette adresse, tu vas recevoir un email avec un lien pour choisir un nouveau mot de passe.
          </p>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-4">
            <p className="text-base text-stone-600">Indique ton email : on t&apos;envoie un lien pour le réinitialiser.</p>
            <input
              type="email"
              required
              autoComplete="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-stone-300 px-3 py-2.5 text-base"
            />
            {error && (
              <p role="alert" className="text-base text-red-600">
                {error}
              </p>
            )}
            <button
              disabled={busy}
              className="w-full rounded-lg bg-accent py-2.5 text-base font-semibold text-white hover:bg-accent-dark disabled:opacity-60"
            >
              {busy ? "..." : "Envoyer le lien"}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-base text-stone-600">
          <Link href="/login" className="font-medium text-accent">
            Retour à la connexion
          </Link>
        </p>
      </div>
    </main>
  );
}
