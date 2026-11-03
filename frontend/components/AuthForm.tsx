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
import Logo from "./Logo";

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
      } else {
        await signInWithEmailAndPassword(firebaseAuth(), email, password);
      }
      router.push("/dashboard");
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
      if (getAdditionalUserInfo(result)?.isNewUser) await welcome();
      router.push("/dashboard");
    } catch (err) {
      setError(readable(err));
      setBusy(false);
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm rounded-2xl border border-stone-200 bg-white p-8 shadow-sm">
        <Logo />
        <h1 className="mt-4 font-serif text-3xl font-medium">{signup ? "Créer un compte" : "Connexion"}</h1>

        <button
          type="button"
          onClick={google}
          disabled={busy}
          className="mt-6 w-full rounded-lg border border-stone-300 py-2.5 text-base font-medium hover:bg-stone-50 disabled:opacity-60"
        >
          Continuer avec Google
        </button>
        <div className="my-5 text-center text-sm text-stone-400">ou</div>

        <form onSubmit={submit} className="space-y-4">
          <input
            type="email"
            required
            autoComplete="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-stone-300 px-3 py-2.5 text-base"
          />
          <input
            type="password"
            required
            minLength={6}
            autoComplete={signup ? "new-password" : "current-password"}
            placeholder="Mot de passe"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-stone-300 px-3 py-2.5 text-base"
          />
          {!signup && (
            <p className="text-right text-sm">
              <Link href="/forgot-password" className="font-medium text-accent hover:underline">
                Mot de passe oublié ?
              </Link>
            </p>
          )}
          {error && (
            <p role="alert" className="text-base text-red-600">
              {error}
            </p>
          )}
          <button
            disabled={busy}
            className="w-full rounded-lg bg-accent py-2.5 text-base font-semibold text-white hover:bg-accent-dark disabled:opacity-60"
          >
            {busy ? "..." : signup ? "Créer mon compte" : "Se connecter"}
          </button>
        </form>

        <p className="mt-6 text-center text-base text-stone-600">
          {signup ? "Déjà inscrit ?" : "Pas encore de compte ?"}{" "}
          <Link href={signup ? "/login" : "/signup"} className="font-medium text-accent">
            {signup ? "Connexion" : "Créer un compte"}
          </Link>
        </p>
      </div>
    </main>
  );
}
