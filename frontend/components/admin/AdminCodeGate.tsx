"use client";

import { signOut } from "firebase/auth";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import Logo from "@/components/Logo";
import { api, ApiError, errorMessage } from "@/lib/api";
import { firebaseAuth } from "@/lib/firebase";
import { adminApi, forgetAdminSession, rememberAdminSession } from "./adminApi";
import type { AdminRole } from "./adminTypes";

// Étape de confirmation : un code à 6 chiffres est envoyé par email à chaque nouvelle connexion à l'admin.
export default function AdminCodeGate({ email, onVerified }: { email: string; onVerified: (role: AdminRole) => void }) {
  const [code, setCode] = useState("");
  const [sending, setSending] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [sent, setSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState("");
  const started = useRef(false);
  const input = useRef<HTMLInputElement>(null);

  const requestCode = useCallback(() => {
    setSending(true);
    setError("");
    adminApi<{ retry_after: number }>("/session/code", { method: "POST" })
      .then((r) => (setSent(true), setCooldown(r.retry_after)))
      .catch((e) => {
        // 429 : un code vient déjà d'être envoyé (rechargement de la page, double clic) : ce n'est pas une erreur pour l'utilisateur.
        if (e instanceof ApiError && e.status === 429) {
          const wait = Number(/(\d+) s/.exec(e.message)?.[1] ?? 60);
          setSent(true);
          setCooldown(wait);
        } else {
          setError(errorMessage(e));
        }
      })
      .finally(() => setSending(false));
  }, []);

  // Envoi automatique à l'arrivée sur l'écran (une seule fois, même en mode développement strict).
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    requestCode();
  }, [requestCode]);

  // Compte à rebours avant de pouvoir demander un nouveau code.
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function verify(value: string) {
    setVerifying(true);
    setError("");
    try {
      const r = await api<{ token: string; role: AdminRole }>("/admin/session/verify", { method: "POST", body: JSON.stringify({ code: value }) });
      rememberAdminSession(r.token);
      onVerified(r.role);
    } catch (e) {
      setError(errorMessage(e));
      setCode("");
      setVerifying(false);
      input.current?.focus();
    }
  }

  function change(raw: string) {
    const digits = raw.replace(/\D/g, "").slice(0, 6);
    setCode(digits);
    if (digits.length === 6 && !verifying) void verify(digits);
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Logo compact href="/" />
        </div>
        <div className="rounded-3xl border border-line bg-paper p-8 shadow-xl shadow-ink/5">
          <p className="text-center text-xs font-semibold uppercase tracking-[0.18em] text-accent">Espace admin</p>
          <h1 className="mt-3 text-center font-serif text-3xl font-medium leading-tight tracking-tight">Confirme ta connexion</h1>
          <p className="mt-3 text-center text-base leading-relaxed text-stone-600" aria-live="polite">
            {sending && !sent ? (
              "Envoi du code en cours..."
            ) : sent ? (
              <>
                Un code à 6 chiffres vient d&apos;être envoyé à <strong className="break-all text-ink">{email}</strong>. Il expire dans 10 minutes.
              </>
            ) : (
              "Le code n'a pas pu être envoyé."
            )}
          </p>

          <label htmlFor="admin-code" className="sr-only">
            Code de confirmation
          </label>
          <input
            id="admin-code"
            ref={input}
            value={code}
            onChange={(e) => change(e.target.value)}
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            maxLength={9}
            placeholder="000000"
            disabled={verifying}
            className="mt-7 w-full rounded-2xl border border-line bg-white px-4 py-4 text-center font-mono text-4xl tracking-[0.5em] shadow-sm placeholder:text-stone-300 focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/15 disabled:opacity-60"
          />

          {error && (
            <p role="alert" className="mt-4 rounded-xl bg-accent-soft/70 px-4 py-3 text-center text-base text-accent-dark">
              {error}
            </p>
          )}
          {verifying && <p className="mt-4 text-center text-base text-stone-600">Vérification...</p>}

          <div className="mt-6 flex flex-col items-center gap-1">
            <button
              onClick={requestCode}
              disabled={sending || cooldown > 0}
              className="min-h-11 rounded-full px-5 text-base font-semibold text-accent hover:bg-cream disabled:text-stone-400 disabled:hover:bg-transparent"
            >
              {cooldown > 0 ? `Renvoyer un code dans ${cooldown} s` : "Renvoyer un code"}
            </button>
            <button
              onClick={() => (forgetAdminSession(), signOut(firebaseAuth()))}
              className="min-h-11 rounded-full px-5 text-base font-medium text-stone-600 hover:bg-cream hover:text-ink"
            >
              Utiliser un autre compte
            </button>
            <Link href="/dashboard" className="inline-flex min-h-11 items-center rounded-full px-5 text-base font-medium text-stone-600 hover:bg-cream hover:text-ink">
              Retour à mon espace
            </Link>
          </div>
        </div>
        <p className="mt-6 text-center text-sm leading-relaxed text-stone-500">
          Un nouveau code est demandé à chaque connexion. Tu ne le reçois pas ? Vérifie tes courriers indésirables.
        </p>
      </div>
    </main>
  );
}
