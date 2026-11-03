"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import Logo from "./Logo";

export default function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);
  const signup = mode === "signup";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setInfo("");
    setBusy(true);
    const { data, error } = signup
      ? await supabase().auth.signUp({ email, password })
      : await supabase().auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) return setError(error.message);
    if (data.session) router.push("/dashboard");
    else setInfo("Compte créé. Vérifie ta boîte mail pour confirmer ton adresse, puis connecte-toi.");
  }

  async function google() {
    const { error } = await supabase().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${location.origin}/dashboard` },
    });
    if (error) setError(error.message);
  }

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm rounded-2xl border border-stone-200 bg-white p-8 shadow-sm">
        <Logo />
        <h1 className="mt-4 font-serif text-3xl font-medium">{signup ? "Créer un compte" : "Connexion"}</h1>

        {process.env.NEXT_PUBLIC_ENABLE_GOOGLE === "true" ? (
          <>
            <button
              onClick={google}
              className="mt-6 w-full rounded-lg border border-stone-300 py-2.5 text-base font-medium hover:bg-stone-50"
            >
              Continuer avec Google
            </button>
            <div className="my-5 text-center text-sm text-stone-400">ou</div>
          </>
        ) : (
          <div className="mt-6" />
        )}

        <form onSubmit={submit} className="space-y-4">
          <input
            type="email"
            required
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-stone-300 px-3 py-2.5 text-base"
          />
          <input
            type="password"
            required
            minLength={6}
            placeholder="Mot de passe"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-stone-300 px-3 py-2.5 text-base"
          />
          {error && <p className="text-base text-red-600">{error}</p>}
          {info && <p className="text-base text-green-700">{info}</p>}
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
