"use client";

import { type Dispatch, type SetStateAction, useEffect, useRef, useState } from "react";
import { api, errorMessage } from "@/lib/api";
import { streamGenerate } from "@/lib/stream";
import type { GenSlot, GenerateDone, Post, Profile } from "@/lib/types";
import type { Notify } from "./ui";

// Emplacement dont le post n'est pas encore là (en cours) ou a échoué.
export type Slot = GenSlot & { status: "pending" | "error"; message?: string; retrying?: boolean };

export type Generation = {
  busy: boolean;
  slots: Slot[];
  progress: { done: number; total: number } | null;
  canGenerate: boolean;
  generate: () => Promise<void>;
  retry: (slot: Slot) => Promise<void>;
};

// Génération des posts en flux : les posts arrivent un par un pendant que les autres se rédigent.
// Placée au niveau du tableau de bord pour que le Kanban, la liste et le bouton du haut la partagent.
export function useGeneration({
  posts,
  setPosts,
  profile,
  aiReady,
  notify,
}: {
  posts: Post[];
  setPosts: Dispatch<SetStateAction<Post[]>>;
  profile: Profile;
  aiReady: boolean;
  notify: Notify;
}): Generation {
  const [busy, setBusy] = useState(false);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const ready = profile.themes.length > 0 && !!profile.start_date && !!profile.end_date;
  const canGenerate = ready && aiReady && !busy;

  // Si l'onglet est quitté pendant la rédaction, on coupe la connexion (le serveur arrête les rédactions restantes).
  useEffect(() => () => abortRef.current?.abort(), []);

  const reload = () => api<Post[]>("/posts").then(setPosts).catch(() => undefined);

  async function generate() {
    if (busy) return;
    const hasEditable = posts.some((p) => p.status !== "published");
    if (hasEditable && !window.confirm("Générer de nouveaux posts remplace les brouillons et posts programmés non publiés. Continuer ?")) return;
    setBusy(true);
    setSlots([]);
    try {
      // On enregistre d'abord les informations affichées pour que la génération parte de ce que tu vois.
      await api<Profile>("/profile", { method: "PUT", body: JSON.stringify(profile) });
    } catch (err) {
      notify("error", errorMessage(err));
      setBusy(false);
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    let total = 0;
    let received = 0;
    let fatal: string | null = null;
    let firstFailure: string | null = null;
    let summary: GenerateDone | null = null;

    try {
      await streamGenerate((event) => {
        if (event.type === "start") {
          total = event.total;
          setProgress({ done: 0, total });
          setSlots(event.slots.map((s) => ({ ...s, status: "pending" })));
          // Les anciens brouillons disparaissent de l'écran ; le serveur ne les supprime qu'au premier post réussi.
          setPosts((prev) => prev.filter((p) => p.status === "published"));
        } else if (event.type === "post") {
          received += 1;
          setPosts((prev) => [...prev, event.post]);
          setSlots((prev) => prev.filter((s) => s.index !== event.index));
          setProgress({ done: received, total });
        } else if (event.type === "post_error") {
          firstFailure ??= event.message;
          setSlots((prev) => prev.map((s) => (s.index === event.index ? { ...s, status: "error", message: event.message } : s)));
        } else if (event.type === "fatal") {
          fatal = event.message;
        } else if (event.type === "done") {
          summary = event;
        }
      }, controller.signal);
    } catch (err) {
      if (!controller.signal.aborted) fatal = errorMessage(err);
    }

    if (controller.signal.aborted) return; // page quittée : rien à afficher

    const done = summary as GenerateDone | null;
    if (fatal) {
      setSlots([]);
      if (received === 0) await reload(); // rien de nouveau : on réaffiche les anciens posts
      notify("error", fatal);
    } else if (!done) {
      setSlots([]);
      await reload();
      notify("error", "La génération a été interrompue. Les posts déjà rédigés ont été conservés.");
    } else if (done.created === 0) {
      setSlots([]);
      await reload();
      // La raison réelle (crédit épuisé, limite de requêtes…) vaut mieux qu'un message générique.
      const reason = firstFailure as string | null;
      notify(
        "error",
        reason
          ? `Aucun post n'a pu être rédigé : ${reason} Tes posts précédents sont conservés.`
          : "Aucun post n'a pu être rédigé. Tes posts précédents sont conservés, réessaie dans un instant.",
      );
    } else if (done.failed > 0) {
      notify("error", `${done.created} post(s) rédigé(s), ${done.failed} en échec : utilise « Réessayer » sur les cartes concernées.`);
    } else if (done.calendar.error) {
      notify("error", `${done.created} posts générés, mais le rappel agenda a échoué : ${done.calendar.error}`);
    } else if (done.calendar.connected) {
      notify("ok", `${done.created} posts générés, ${done.calendar.synced} rappel(s) ajouté(s) à Google Agenda.`);
    } else {
      notify("ok", `${done.created} posts générés.`);
    }
    setProgress(null);
    setBusy(false);
  }

  async function retry(slot: Slot) {
    setSlots((prev) => prev.map((s) => (s.index === slot.index ? { ...s, retrying: true } : s)));
    try {
      const created = await api<Post>("/posts/generate/one", {
        method: "POST",
        body: JSON.stringify({ theme: slot.theme, scheduled_for: slot.scheduled_for }),
      });
      setPosts((prev) => [...prev, created]);
      setSlots((prev) => prev.filter((s) => s.index !== slot.index));
    } catch (err) {
      setSlots((prev) => prev.map((s) => (s.index === slot.index ? { ...s, retrying: false, message: errorMessage(err) } : s)));
    }
  }

  return { busy, slots, progress, canGenerate, generate, retry };
}
