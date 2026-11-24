"use client";

import { signInWithEmailAndPassword } from "firebase/auth";
import Link from "next/link";
import { useState } from "react";
import Field, { FormError, SubmitButton } from "@/components/auth/Field";
import Logo from "@/components/Logo";
import { readableAuthError } from "@/lib/authErrors";
import { firebaseAuth } from "@/lib/firebase";

// Première étape de l'espace admin : connexion au compte LinkP. Le code de confirmation vient ensuite.
// Une fois connecté, l'état d'authentification change et la page passe d'elle-même à l'étape suivante.
export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await signInWithEmailAndPassword(firebaseAuth(), email, password);
    } catch (err) {
      setError(readableAuthError(err));
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Logo compact href="/" />
        </div>
        <div className="rounded-3xl border border-line bg-paper p-8 shadow-xl shadow-ink/5">
          <p className="text-center text-xs font-semibold uppercase tracking-[0.18em] text-accent">Espace admin</p>
          <h1 className="mt-3 text-center font-serif text-3xl font-medium leading-tight tracking-tight">Connexion</h1>
          <p className="mt-3 text-center text-base leading-relaxed text-stone-600">
            Réservé aux administrateurs de LinkP. Un code de confirmation te sera envoyé par email après la connexion.
          </p>

          <form onSubmit={submit} className="mt-7 space-y-5">
            <Field label="Email" type="email" required autoComplete="email" placeholder="toi@exemple.com" value={email} onChange={setEmail} />
            <Field
              label="Mot de passe"
              type="password"
              required
              autoComplete="current-password"
              placeholder="Ton mot de passe"
              value={password}
              onChange={setPassword}
              aside={
                <Link href="/forgot-password" className="-my-3 inline-flex min-h-11 items-center text-sm font-medium text-accent hover:underline">
                  Mot de passe oublié ?
                </Link>
              }
            />
            {error && <FormError>{error}</FormError>}
            <SubmitButton busy={busy}>Se connecter</SubmitButton>
          </form>
        </div>

        <p className="mt-6 text-center text-sm leading-relaxed text-stone-500">
          Pas encore de compte avec ton adresse admin ?{" "}
          <Link href="/signup" className="inline-flex min-h-11 items-center font-semibold text-accent underline underline-offset-4">
            Créer le compte
          </Link>
        </p>
      </div>
    </main>
  );
}
