"use client";

import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  getAdditionalUserInfo,
  signInWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api";
import { readableAuthError as readable } from "@/lib/authErrors";
import { firebaseAuth } from "@/lib/firebase";
import AuthShell from "@/components/auth/AuthShell";
import Field, { FormError, PasswordStrength, SubmitButton } from "@/components/auth/Field";
import GoogleLogo from "@/components/auth/GoogleLogo";

export default function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const signup = mode === "signup";

  // L'email de bienvenue ne doit jamais bloquer l'accès au compte.
  const welcome = () => api("/auth/welcome", { method: "POST" }).catch(() => undefined);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (signup) {
        await createUserWithEmailAndPassword(firebaseAuth(), email, password);
        await welcome();
        router.push("/onboarding");
      } else {
        await signInWithEmailAndPassword(firebaseAuth(), email, password);
        router.push("/dashboard");
      }
    } catch (err) {
      setError(readable(err));
      setBusy(false);
    }
  }

  async function google() {
    setError("");
    setBusy(true);
    try {
      const result = await signInWithPopup(firebaseAuth(), new GoogleAuthProvider());
      const isNew = getAdditionalUserInfo(result)?.isNewUser;
      if (isNew) await welcome();
      router.push(isNew ? "/onboarding" : "/dashboard");
    } catch (err) {
      setError(readable(err));
      setBusy(false);
    }
  }

  return (
    <AuthShell
      art={mode}
      eyebrow={signup ? "Inscription gratuite" : "Content de te revoir"}
      title={
        signup ? (
          <>
            Crée ton compte, <em>écris mieux</em>.
          </>
        ) : (
          <>
            Reprends <em>ta plume</em>.
          </>
        )
      }
      subtitle={signup ? "Quelques secondes pour commencer, aucune carte bancaire demandée." : "Connecte-toi pour retrouver tes idées et tes posts."}
      footer={
        <>
          {signup ? "Déjà inscrit ?" : "Pas encore de compte ?"}{" "}
          <Link href={signup ? "/login" : "/signup"} className="font-semibold text-accent hover:underline">
            {signup ? "Connexion" : "Créer un compte"}
          </Link>
        </>
      }
    >
      <button
        type="button"
        onClick={google}
        disabled={busy}
        className="flex w-full items-center justify-center gap-3 rounded-full border border-line bg-paper px-7 py-3.5 text-base font-semibold shadow-sm transition hover:bg-white disabled:opacity-60"
      >
        <GoogleLogo />
        Continuer avec Google
      </button>

      <div className="my-6 flex items-center gap-4 text-sm text-stone-500">
        <span className="h-px flex-1 bg-line" />
        ou avec ton email
        <span className="h-px flex-1 bg-line" />
      </div>

      <form onSubmit={submit} className="space-y-5">
        <Field label="Email" type="email" required autoComplete="email" placeholder="toi@exemple.com" value={email} onChange={setEmail} />
        <Field
          label="Mot de passe"
          type="password"
          required
          minLength={6}
          autoComplete={signup ? "new-password" : "current-password"}
          placeholder={signup ? "6 caractères minimum" : "Ton mot de passe"}
          value={password}
          onChange={setPassword}
          aside={
            !signup && (
              <Link href="/forgot-password" className="-my-3 inline-flex min-h-11 items-center text-sm font-medium text-accent hover:underline">
                Mot de passe oublié ?
              </Link>
            )
          }
          hint={signup ? <PasswordStrength value={password} /> : undefined}
        />
        {error && <FormError>{error}</FormError>}
        <SubmitButton busy={busy}>{signup ? "Créer mon compte" : "Se connecter"}</SubmitButton>
        {signup && (
          <p className="text-center text-sm leading-relaxed text-stone-500">
            En créant ton compte, tu acceptes les{" "}
            <Link href="/conditions" className="font-medium text-stone-700 underline underline-offset-4 hover:text-accent">
              conditions d&apos;utilisation
            </Link>{" "}
            et la{" "}
            <Link href="/confidentialite" className="font-medium text-stone-700 underline underline-offset-4 hover:text-accent">
              politique de confidentialité
            </Link>
            .
          </p>
        )}
      </form>
    </AuthShell>
  );
}
