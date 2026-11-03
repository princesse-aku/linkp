"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import AiKeyForm from "@/components/AiKeyForm";
import AuthShell from "@/components/auth/AuthShell";
import { IconCheck } from "@/components/Icons";
import { api } from "@/lib/api";
import type { AiKeyStatus } from "@/lib/types";
import { useAuth } from "@/lib/useAuth";

// Étape après l'inscription : brancher sa clé RodiumAI (facultatif, modifiable plus tard dans le profil).
export default function OnboardingPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [status, setStatus] = useState<AiKeyStatus | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    api<AiKeyStatus>("/ai/key")
      .then((s) => (s.configured ? router.replace("/dashboard") : setStatus(s)))
      .catch(() => setStatus({ configured: false, last4: null }));
  }, [user, loading, router]);

  if (loading || !user || !status) return <p className="p-10 text-center text-stone-500">Chargement…</p>;

  return (
    <AuthShell
      art="onboarding"
      wide
      eyebrow="Dernière étape"
      title={
        <>
          Branche ton IA pour <em>écrire tes posts</em>
        </>
      }
      subtitle="LinkP rédige tes posts avec RodiumAI. Tu utilises ta propre clé API : tu gardes la main sur ta consommation, directement sur ton compte RodiumAI."
      footer={
        <>
          <Link href="/dashboard" className="font-semibold text-stone-700 hover:text-ink">
            Ignorer pour l&apos;instant
          </Link>
          <p className="mt-1 text-sm text-stone-500">Tu pourras l&apos;ajouter plus tard depuis ton profil.</p>
        </>
      }
    >
      <ul className="mb-7 space-y-2.5 text-base text-stone-700">
        {["Ta clé est vérifiée, puis chiffrée sur nos serveurs.", "Elle n'est jamais affichée en entier ni partagée.", "Tu peux la remplacer ou la supprimer à tout moment."].map((t) => (
          <li key={t} className="flex items-start gap-3">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent-dark">
              <IconCheck className="h-3.5 w-3.5" />
            </span>
            {t}
          </li>
        ))}
      </ul>

      <AiKeyForm status={status} onChange={setStatus} onSaved={() => router.push("/dashboard")} />

      <p className="mt-4 text-base text-stone-500">
        Pas encore de clé ?{" "}
        <a href="https://www.rodiumai.io/docs" target="_blank" rel="noopener noreferrer" className="font-medium text-accent underline">
          Consulte la documentation RodiumAI
        </a>
        .
      </p>
    </AuthShell>
  );
}
