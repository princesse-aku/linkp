"use client";

import { useState } from "react";
import { api, errorMessage } from "@/lib/api";
import type { GenerateResult, Media, Post, PostStatus, Profile } from "@/lib/types";
import { AiHint, Chip, Notify, Section, btnDark, btnGhost, btnPrimary, input } from "./ui";

const STATUS: Record<PostStatus, string> = { draft: "Brouillon", scheduled: "Programmé", published: "Publié" };

function formatDate(iso: string | null) {
  if (!iso) return "Sans date";
  return new Date(iso).toLocaleString("fr-FR", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function PostCard({
  post,
  media,
  aiReady,
  onUpdate,
  onDelete,
  notify,
}: {
  post: Post;
  media: Media[];
  aiReady: boolean;
  onUpdate: (p: Post) => void;
  onDelete: (id: string) => void;
  notify: Notify;
}) {
  const [editing, setEditing] = useState(false);
  const [rewriting, setRewriting] = useState(false);
  const [instruction, setInstruction] = useState("");
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState({
    content: post.content,
    theme: post.theme,
    scheduled_for: post.scheduled_for?.slice(0, 16) ?? "",
    status: post.status,
    media_urls: post.media_urls,
  });

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    try {
      await fn();
    } catch (err) {
      notify("error", errorMessage(err));
    }
    setBusy(false);
  }

  const patch = (body: Partial<Post>) =>
    api<Post>(`/posts/${post.id}`, { method: "PATCH", body: JSON.stringify(body) }).then(onUpdate);

  const save = () =>
    run(async () => {
      await patch({
        content: draft.content,
        theme: draft.theme,
        status: draft.status,
        media_urls: draft.media_urls,
        ...(draft.scheduled_for ? { scheduled_for: `${draft.scheduled_for}:00` } : {}),
      });
      setEditing(false);
    });

  const rewrite = () =>
    run(async () => {
      const updated = await api<Post>(`/posts/${post.id}/regenerate`, {
        method: "POST",
        body: JSON.stringify({ instruction }),
      });
      onUpdate(updated);
      setDraft((d) => ({ ...d, content: updated.content }));
      setInstruction("");
      setRewriting(false);
    });

  const remove = () => {
    if (!window.confirm("Supprimer ce post ?")) return;
    return run(async () => {
      await api(`/posts/${post.id}`, { method: "DELETE" });
      onDelete(post.id);
    });
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(post.content);
      notify("ok", "Texte copié : colle-le dans LinkedIn.");
    } catch {
      notify("error", "Copie impossible.");
    }
  };

  const toggleMedia = (url: string) =>
    setDraft((d) => ({
      ...d,
      media_urls: d.media_urls.includes(url) ? d.media_urls.filter((u) => u !== url) : [...d.media_urls, url],
    }));

  return (
    <li className="rounded-xl border border-stone-200 p-5">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Chip>{post.theme || "Sans thème"}</Chip>
        <Chip tone={post.status === "published" ? "forest" : "neutral"}>{STATUS[post.status]}</Chip>
        {post.calendar_event_id && <Chip tone="neutral">Rappel agenda</Chip>}
        <span className="ml-auto text-stone-500">{formatDate(post.scheduled_for)}</span>
      </div>

      {editing ? (
        <div className="mt-4 space-y-3">
          <textarea className={input} rows={10} maxLength={5000} value={draft.content} onChange={(e) => setDraft({ ...draft, content: e.target.value })} />
          <div className="grid gap-3 sm:grid-cols-3">
            <input className={input} value={draft.theme} placeholder="Thème" onChange={(e) => setDraft({ ...draft, theme: e.target.value })} />
            <input type="datetime-local" className={input} value={draft.scheduled_for} onChange={(e) => setDraft({ ...draft, scheduled_for: e.target.value })} />
            <select className={input} value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value as PostStatus })}>
              {Object.entries(STATUS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          {media.length > 0 && (
            <div>
              <p className="text-base font-medium">Fichiers joints</p>
              <div className="mt-2 flex flex-wrap gap-3">
                {media.map((m) => (
                  <label key={m.id} className={`cursor-pointer overflow-hidden rounded-lg border-2 ${draft.media_urls.includes(m.url) ? "border-accent" : "border-transparent"}`}>
                    <input type="checkbox" className="sr-only" checked={draft.media_urls.includes(m.url)} onChange={() => toggleMedia(m.url)} />
                    {m.url.toLowerCase().endsWith(".pdf") ? (
                      <span className="flex h-16 w-16 items-center justify-center bg-cream text-sm text-accent">PDF</span>
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.url} alt={m.filename || "Fichier"} className="h-16 w-16 object-cover" />
                    )}
                  </label>
                ))}
              </div>
            </div>
          )}
          <div className="flex gap-3">
            <button type="button" onClick={save} disabled={busy || !draft.content.trim()} className={btnPrimary}>
              {busy ? "Enregistrement…" : "Enregistrer"}
            </button>
            <button type="button" onClick={() => setEditing(false)} className={btnGhost}>
              Annuler
            </button>
          </div>
        </div>
      ) : (
        <>
          <p className="mt-4 whitespace-pre-wrap text-base leading-relaxed">{post.content}</p>
          {post.media_urls.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {post.media_urls.map((u) => (
                <a key={u} href={u} target="_blank" rel="noopener noreferrer">
                  {u.toLowerCase().endsWith(".pdf") ? (
                    <span className="flex h-16 w-16 items-center justify-center rounded bg-cream text-sm text-accent">PDF</span>
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={u} alt="Fichier joint" className="h-16 w-16 rounded object-cover" />
                  )}
                </a>
              ))}
            </div>
          )}
          <div className="mt-4 flex flex-wrap gap-2 text-base">
            <button type="button" onClick={() => setEditing(true)} className={btnGhost}>
              Modifier
            </button>
            <button type="button" onClick={() => setRewriting((r) => !r)} disabled={!aiReady} title={aiReady ? undefined : "Ajoute ta clé RodiumAI pour activer l'IA"} className={btnGhost}>
              Réécrire avec l&apos;IA
            </button>
            <button type="button" onClick={copy} className={btnGhost}>
              Copier le texte
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => run(() => patch({ status: post.status === "published" ? "draft" : "published" }))}
              className={btnGhost}
            >
              {post.status === "published" ? "Remettre en brouillon" : "Marquer comme publié"}
            </button>
            <button type="button" disabled={busy} onClick={remove} className="px-2 text-base font-medium text-red-600">
              Supprimer
            </button>
          </div>
          {rewriting && (
            <div className="mt-4 flex flex-col gap-3 rounded-lg bg-cream p-4 sm:flex-row">
              <input
                className={input}
                maxLength={500}
                placeholder="Consigne (facultatif) : plus court, plus personnel, ajoute une question…"
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
              />
              <button type="button" onClick={rewrite} disabled={busy} className={`${btnDark} shrink-0`}>
                {busy ? "Réécriture…" : "Réécrire"}
              </button>
            </div>
          )}
        </>
      )}
    </li>
  );
}

export default function PostsSection({
  posts,
  setPosts,
  media,
  profile,
  aiReady,
  onGenerated,
  notify,
}: {
  posts: Post[];
  setPosts: (p: Post[]) => void;
  media: Media[];
  profile: Profile;
  aiReady: boolean;
  onGenerated: (r: GenerateResult) => void;
  notify: Notify;
}) {
  const [busy, setBusy] = useState(false);
  const ready = profile.themes.length > 0 && profile.start_date && profile.end_date;
  const hasEditable = posts.some((p) => p.status !== "published");

  async function generate() {
    if (hasEditable && !window.confirm("Générer de nouveaux posts remplace les brouillons et posts programmés non publiés. Continuer ?")) return;
    setBusy(true);
    try {
      // On enregistre d'abord les informations affichées pour que la génération parte de ce que tu vois.
      await api<Profile>("/profile", { method: "PUT", body: JSON.stringify(profile) });
      onGenerated(await api<GenerateResult>("/posts/generate", { method: "POST", body: JSON.stringify({ replace_drafts: true }) }));
    } catch (err) {
      notify("error", errorMessage(err));
    }
    setBusy(false);
  }

  return (
    <Section id="posts" title="Tes posts programmés" hint="Génère tes posts sur la période choisie, puis relis, ajuste et publie.">
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={generate} disabled={busy || !ready || !aiReady} className={btnPrimary}>
          {busy ? "Rédaction en cours (cela peut prendre une minute)…" : posts.length ? "Générer de nouveaux posts" : "Générer mes posts"}
        </button>
        {aiReady && !ready && <p className="text-base text-stone-500">Ajoute au moins un thème et une période pour générer.</p>}
      </div>
      {!aiReady && <AiHint />}

      {posts.length === 0 ? (
        <p className="text-base text-stone-500">Aucun post pour le moment.</p>
      ) : (
        <ul className="space-y-4">
          {posts.map((p) => (
            <PostCard
              key={p.id}
              post={p}
              media={media}
              aiReady={aiReady}
              notify={notify}
              onUpdate={(u) => setPosts(posts.map((x) => (x.id === u.id ? u : x)))}
              onDelete={(id) => setPosts(posts.filter((x) => x.id !== id))}
            />
          ))}
        </ul>
      )}
    </Section>
  );
}
