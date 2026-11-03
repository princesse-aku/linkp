"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import AiKeyForm from "@/components/AiKeyForm";
import Logo from "@/components/Logo";
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
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-lg rounded-2xl border border-stone-200 bg-white p-8 shadow-sm">
        <Logo />
        <p className="mt-6 text-sm font-semibold uppercase tracking-[0.18em] text-accent">Dernière étape</p>
        <h1 className="mt-2 font-serif text-3xl font-medium leading-tight">Branche ton IA pour écrire tes posts</h1>
        <p className="mt-4 text-base leading-relaxed text-stone-600">
          LinkP rédige tes posts avec RodiumAI. Tu utilises ta propre clé API : tu gardes la main sur ta consommation, directement sur ton
          compte RodiumAI.
        </p>

        <ul className="mt-5 space-y-2 text-base text-stone-700">
          <li>Ta clé est vérifiée, puis chiffrée sur nos serveurs.</li>
          <li>Elle n&apos;est jamais affichée en entier ni partagée.</li>
          <li>Tu peux la remplacer ou la supprimer à tout moment.</li>
        </ul>

        <div className="mt-7">
          <AiKeyForm status={status} onChange={setStatus} onSaved={() => router.push("/dashboard")} />
        </div>

        <p className="mt-3 text-base text-stone-500">
          Pas encore de clé ?{" "}
          <a href="https://www.rodiumai.io/docs" target="_blank" rel="noopener noreferrer" className="font-medium text-accent underline">
            Consulte la documentation RodiumAI
          </a>
          .
        </p>

        <div className="mt-8 border-t border-stone-200 pt-5 text-center">
          <Link href="/dashboard" className="text-base font-medium text-stone-600 hover:text-ink">
            Ignorer pour l&apos;instant
          </Link>
          <p className="mt-1 text-sm text-stone-500">Tu pourras l&apos;ajouter plus tard depuis ton profil.</p>
        </div>
      </div>
    </main>
  );
}
