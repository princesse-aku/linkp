"use client";

import { FirebaseError } from "firebase/app";
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
import { firebaseAuth } from "@/lib/firebase";
import AuthShell from "@/components/auth/AuthShell";
import Field, { FormError, PasswordStrength, SubmitButton } from "@/components/auth/Field";

const MESSAGES: Record<string, string> = {
  "auth/invalid-credential": "Email ou mot de passe incorrect.",
  "auth/user-not-found": "Email ou mot de passe incorrect.",
  "auth/wrong-password": "Email ou mot de passe incorrect.",
  "auth/email-already-in-use": "Un compte existe déjà avec cet email. Connecte-toi.",
  "auth/weak-password": "Le mot de passe doit contenir au moins 6 caractères.",
  "auth/invalid-email": "Cette adresse email n'est pas valide.",
  "auth/too-many-requests": "Trop de tentatives. Réessaie dans quelques minutes.",
  "auth/network-request-failed": "Connexion impossible. Vérifie ta connexion internet.",
  "auth/popup-closed-by-user": "La fenêtre Google a été fermée avant la fin.",
  "auth/popup-blocked": "Le navigateur a bloqué la fenêtre Google. Autorise les popups.",
};

const readable = (err: unknown) =>
  err instanceof FirebaseError ? (MESSAGES[err.code] ?? "Connexion impossible. Réessaie.") : "Une erreur est survenue.";

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
        <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
          <path fill="#4285F4" d="M22.6 12.2c0-.8-.1-1.5-.2-2.2H12v4.3h5.9a5 5 0 0 1-2.2 3.3v2.7h3.5c2.1-1.9 3.4-4.700 3.4-8.100z" />
          <path fill="#34A853" d="M12 23c3 0 5.500-1 7.300-2.700l-3.500-2.700c-1 .7-2.300 1.100-3.800 1.100-2.900 0-5.400-2-6.300-4.600H2.100v2.800A11 11 0 0 0 12 23z" />
          <path fill="#FBBC05" d="M5.700 14.100a6.600 6.600 0 0 1 0-4.200V7.100H2.100a11 11 0 0 0 0 9.800z" />
          <path fill="#EA4335" d="M12 5.400c1.600 0 3.100.6 4.200 1.600l3.100-3.100A10.600 10.600 0 0 0 12 1 11 11 0 0 0 2.100 7.100l3.600 2.800C6.600 7.400 9.100 5.400 12 5.400z" />
        </svg>
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
              <Link href="/forgot-password" className="text-sm font-medium text-accent hover:underline">
                Mot de passe oublié ?
              </Link>
            )
          }
          hint={signup ? <PasswordStrength value={password} /> : undefined}
        />
        {error && <FormError>{error}</FormError>}
        <SubmitButton busy={busy}>{signup ? "Créer mon compte" : "Se connecter"}</SubmitButton>
      </form>
    </AuthShell>
  );
}
