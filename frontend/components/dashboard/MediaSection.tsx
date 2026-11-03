"use client";

import { useRef, useState } from "react";
import { api, errorMessage } from "@/lib/api";
import type { Media } from "@/lib/types";
import { Notify, Section, btnDark } from "./ui";

const ACCEPT = "image/jpeg,image/png,image/webp,image/gif,application/pdf";

export default function MediaSection({
  media,
  setMedia,
  notify,
}: {
  media: Media[];
  setMedia: (m: Media[]) => void;
  notify: Notify;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    let list = media;
    for (const file of Array.from(files)) {
      try {
        const form = new FormData();
        form.append("file", file);
        const created = await api<Media>("/media", { method: "POST", body: form });
        list = [created, ...list];
        setMedia(list);
      } catch (err) {
        notify("error", `${file.name} : ${errorMessage(err)}`);
      }
    }
    if (fileRef.current) fileRef.current.value = "";
    setBusy(false);
  }

  async function remove(id: string) {
    try {
      await api(`/media/${id}`, { method: "DELETE" });
      setMedia(media.filter((m) => m.id !== id));
    } catch (err) {
      notify("error", errorMessage(err));
    }
  }

  async function copy(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      notify("ok", "Lien copié.");
    } catch {
      notify("error", "Copie impossible : sélectionne le lien manuellement.");
    }
  }

  return (
    <Section id="mediatheque" title="Médiathèque" hint="Images et PDF à joindre à tes posts (10 Mo maximum par fichier).">
      <input ref={fileRef} type="file" multiple accept={ACCEPT} hidden onChange={(e) => upload(e.target.files)} />
      <button type="button" onClick={() => fileRef.current?.click()} disabled={busy} className={btnDark}>
        {busy ? "Envoi en cours…" : "Ajouter des fichiers"}
      </button>

      {media.length === 0 ? (
        <p className="text-base text-stone-500">Aucun fichier pour le moment.</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-3">
          {media.map((m) => (
            <li key={m.id} className="overflow-hidden rounded-lg border border-stone-200">
              <a href={m.url} target="_blank" rel="noopener noreferrer" className="block">
                {m.url.toLowerCase().endsWith(".pdf") ? (
                  <div className="flex h-28 items-center justify-center bg-cream font-serif text-2xl text-accent">PDF</div>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.url} alt={m.filename || "Fichier"} className="h-28 w-full object-cover" />
                )}
              </a>
              <div className="space-y-1 p-3 text-sm">
                <p className="truncate font-medium" title={m.filename}>
                  {m.filename || "Fichier"}
                </p>
                <div className="flex gap-3">
                  <button type="button" onClick={() => copy(m.url)} className="font-medium text-accent">
                    Copier le lien
                  </button>
                  <button type="button" onClick={() => remove(m.id)} className="font-medium text-red-600">
                    Supprimer
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}
