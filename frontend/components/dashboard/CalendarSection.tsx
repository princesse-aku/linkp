"use client";

import { useState } from "react";
import { api, errorMessage } from "@/lib/api";
import type { CalendarStatus, CalendarSync } from "@/lib/types";
import { Notify, Section, btnGhost, btnPrimary } from "./ui";

export default function CalendarSection({
  status,
  setStatus,
  onSynced,
  notify,
}: {
  status: CalendarStatus | null;
  setStatus: (s: CalendarStatus) => void;
  onSynced: () => void;
  notify: Notify;
}) {
  const [busy, setBusy] = useState<"" | "connect" | "sync" | "disconnect">("");

  async function connect() {
    setBusy("connect");
    try {
      const { url } = await api<{ url: string }>("/calendar/connect");
      window.location.href = url; // page de consentement Google
    } catch (err) {
      notify("error", errorMessage(err));
      setBusy("");
    }
  }

  async function sync() {
    setBusy("sync");
    try {
      const r = await api<CalendarSync>("/calendar/sync", { method: "POST" });
      onSynced();
      if (r.error) notify("error", `${r.synced} rappel(s) créé(s), mais : ${r.error}`);
      else notify("ok", `${r.synced} rappel(s) à jour dans Google Agenda.`);
    } catch (err) {
      notify("error", errorMessage(err));
    }
    setBusy("");
  }

  async function disconnect() {
    if (!window.confirm("Déconnecter Google Agenda ? Les rappels déjà créés seront supprimés.")) return;
    setBusy("disconnect");
    try {
      await api("/calendar", { method: "DELETE" });
      setStatus({ configured: true, connected: false, email: null });
      onSynced();
      notify("ok", "Google Agenda déconnecté.");
    } catch (err) {
      notify("error", errorMessage(err));
    }
    setBusy("");
  }

  return (
    <Section id="agenda" title="Rappels Google Agenda" hint="Reçois un rappel avant chaque publication, directement dans ton agenda.">
      {!status ? (
        <p className="text-base text-stone-500">Chargement…</p>
      ) : !status.configured ? (
        <p className="text-base text-stone-600">L&apos;intégration Google Agenda n&apos;est pas encore activée sur ce serveur.</p>
      ) : status.connected ? (
        <>
          <p className="text-base text-stone-700">
            Connecté{status.email ? ` avec ${status.email}` : ""}. Chaque post programmé crée un événement avec un rappel 30 minutes avant (et un
            email 1 heure avant).
          </p>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={sync} disabled={busy !== ""} className={btnPrimary}>
              {busy === "sync" ? "Synchronisation…" : "Synchroniser mes posts"}
            </button>
            <button type="button" onClick={disconnect} disabled={busy !== ""} className={btnGhost}>
              Déconnecter
            </button>
          </div>
        </>
      ) : (
        <button type="button" onClick={connect} disabled={busy !== ""} className={btnPrimary}>
          {busy === "connect" ? "Redirection…" : "Connecter Google Agenda"}
        </button>
      )}
    </Section>
  );
}
