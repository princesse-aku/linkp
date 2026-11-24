"use client";

import { useEffect, useRef, useState } from "react";
import Field, { FormError, SubmitButton } from "@/components/auth/Field";
import Logo from "@/components/Logo";
import { apiPublic, errorMessage } from "@/lib/api";
import { rememberAdminSession } from "./adminApi";
import type { AdminRole } from "./adminTypes";

type Verified = { token: string; role: AdminRole; email: string };

// Connexion à l'espace admin sans mot de passe : on saisit son adresse, un code à 6 chiffres arrive par email, on le saisit.
export default function AdminLogin({ onVerified }: { onVerified: (me: { email: string; role: AdminRole }) => void }) {
  const [email, setEmail] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);

  // Compte à rebours avant de pouvoir redemander un code.
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function requestCode() {
    setError("");
    setBusy(true);
    try {
      const r = await apiPublic<{ retry_after: number }>("/admin/login/code", { email: email.trim() });
      setCooldown(r.retry_after);
      setCode("");
      setStep("code");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function verify(value: string) {
    setBusy(true);
    setError("");
    try {
      const r = await apiPublic<Verified>("/admin/login/verify", { email: email.trim(), code: value });
      rememberAdminSession(r.token);
      onVerified({ email: r.email, role: r.role });
    } catch (err) {
      setError(errorMessage(err));
      setCode("");
      setBusy(false);
      input.current?.focus();
    }
  }

  function change(raw: string) {
    const digits = raw.replace(/\D/g, "").slice(0, 6);
    setCode(digits);
    if (digits.length === 6 && !busy) void verify(digits);
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Logo compact href="/" />
        </div>
        <div className="rounded-3xl border border-line bg-paper p-8 shadow-xl shadow-ink/5">
          <p className="text-center text-xs font-semibold uppercase tracking-[0.18em] text-accent">Espace admin</p>

          {step === "email" ? (
            <>
              <h1 className="mt-3 text-center font-serif text-3xl font-medium leading-tight tracking-tight">Connexion</h1>
              <p className="mt-3 text-center text-base leading-relaxed text-stone-600">
                Réservé aux administrateurs de LinkP.
              </p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void requestCode();
                }}
                className="mt-7 space-y-5"
              >
                <Field label="Email" type="email" required autoFocus autoComplete="email" placeholder="toi@exemple.com" value={email} onChange={setEmail} />
                {error && <FormError>{error}</FormError>}
                <SubmitButton busy={busy}>Recevoir le code</SubmitButton>
              </form>
            </>
          ) : (
            <>
              <h1 className="mt-3 text-center font-serif text-3xl font-medium leading-tight tracking-tight">Saisis le code</h1>
              <p className="mt-3 text-center text-base leading-relaxed text-stone-600" aria-live="polite">
                Si <strong className="break-all text-ink">{email.trim()}</strong> est une adresse administrateur, un code à 6 chiffres vient d&apos;y être envoyé. Il expire dans 10 minutes.
              </p>

              <label htmlFor="admin-code" className="sr-only">
                Code de connexion
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
                disabled={busy}
                className="mt-7 w-full rounded-2xl border border-line bg-white px-4 py-4 text-center font-mono text-4xl tracking-[0.5em] shadow-sm placeholder:text-stone-300 focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/15 disabled:opacity-60"
              />

              {error && (
                <p role="alert" className="mt-4 rounded-xl bg-accent-soft/70 px-4 py-3 text-center text-base text-accent-dark">
                  {error}
                </p>
              )}
              {busy && <p className="mt-4 text-center text-base text-stone-600">Vérification...</p>}

              <div className="mt-6 flex flex-col items-center gap-1">
                <button
                  onClick={() => void requestCode()}
                  disabled={busy || cooldown > 0}
                  className="min-h-11 rounded-full px-5 text-base font-semibold text-accent hover:bg-cream disabled:text-stone-400 disabled:hover:bg-transparent"
                >
                  {cooldown > 0 ? `Renvoyer un code dans ${cooldown} s` : "Renvoyer un code"}
                </button>
                <button
                  onClick={() => (setStep("email"), setError(""), setCode(""))}
                  className="min-h-11 rounded-full px-5 text-base font-medium text-stone-600 hover:bg-cream hover:text-ink"
                >
                  Changer d&apos;adresse
                </button>
              </div>
            </>
          )}
        </div>
        <p className="mt-6 text-center text-sm leading-relaxed text-stone-500">
          {step === "code" ? "Tu ne le reçois pas ? Vérifie tes courriers indésirables." : "Un nouveau code est demandé à chaque connexion."}
        </p>
      </div>
    </main>
  );
}
