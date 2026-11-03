"use client";

import { useState } from "react";
import {
  IconCalendar,
  IconCheck,
  IconChevronDown,
  IconClock,
  IconCopy,
  IconGrid,
  IconImage,
  IconList,
  IconPen,
  IconSpark,
  IconTrash,
} from "@/components/Icons";
import { ImageThumb, type ViewerImage, isPdf, slug, useImageViewer } from "@/components/ImageViewer";
import { api, errorMessage } from "@/lib/api";
import { dayParts, longDate, timeLabel } from "@/lib/dates";
import type { Media, Post, PostImageResult, PostStatus } from "@/lib/types";
import { useDashboard } from "./DashboardProvider";
import type { Slot } from "./useGeneration";
import { AiHint, Chip, Notify, Section, btnDark, btnGhost, btnPrimary, input } from "./ui";

type View = "list" | "grid";
type Filter = "all" | PostStatus;

const STATUS: Record<PostStatus, string> = { draft: "Brouillon", scheduled: "Programmé", published: "Publié" };
const VIEW_KEY = "linkp:posts-view";

// ---------- Petits éléments ----------

function DateTile({ iso }: { iso: string | null }) {
  if (!iso) {
    return <div className="rounded-xl border border-line bg-cream px-4 py-3 text-center text-sm text-stone-500 md:w-24">Sans date</div>;
  }
  const d = dayParts(iso);
  return (
    <div
      className="flex shrink-0 items-center gap-3 rounded-xl border border-line bg-cream px-4 py-3 md:w-24 md:flex-col md:gap-0 md:px-2 md:text-center"
      title={`${longDate(iso)} à ${timeLabel(iso)}`}
    >
      <span className="text-sm font-semibold uppercase tracking-wide text-accent">{d.weekday}</span>
      <span className="font-serif text-4xl leading-none text-ink md:mt-1">{d.day}</span>
      <span className="text-sm text-stone-500">{d.month}</span>
      <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-sm font-semibold text-ink ring-1 ring-line md:ml-0 md:mt-2">
        <IconClock className="h-3.5 w-3.5 text-accent" />
        {timeLabel(iso)}
      </span>
    </div>
  );
}

function DateInline({ iso }: { iso: string | null }) {
  if (!iso) return <span className="text-sm text-stone-500">Sans date</span>;
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-base text-stone-700">
      <span className="inline-flex items-center gap-1.5 font-medium">
        <IconCalendar className="h-4 w-4 text-accent" />
        {longDate(iso)}
      </span>
      <span className="inline-flex items-center gap-1.5 font-semibold text-ink">
        <IconClock className="h-4 w-4 text-accent" />
        {timeLabel(iso)}
      </span>
    </div>
  );
}

function IconButton({
  label,
  onClick,
  children,
  danger = false,
  disabled = false,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`inline-flex h-10 w-10 items-center justify-center rounded-lg border bg-white transition hover:-translate-y-px disabled:pointer-events-none disabled:opacity-50 ${
        danger ? "border-red-200 text-red-600 hover:bg-red-50" : "border-stone-300 text-stone-700 hover:bg-stone-50"
      }`}
    >
      {children}
    </button>
  );
}

// ---------- Carte d'un post ----------

export function PostCard({
  post,
  media,
  aiReady,
  view,
  defaultOpen = false,
  onUpdate,
  onDelete,
  onMedia,
  notify,
}: {
  post: Post;
  media: Media[];
  aiReady: boolean;
  view: View;
  defaultOpen?: boolean;
  onUpdate: (p: Post) => void;
  onDelete: (id: string) => void;
  onMedia: (m: Media) => void;
  notify: Notify;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [editing, setEditing] = useState(false);
  const [rewriting, setRewriting] = useState(false);
  const [instruction, setInstruction] = useState("");
  const [busy, setBusy] = useState(false);
  const [imageBusy, setImageBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [draft, setDraft] = useState({
    content: post.content,
    theme: post.theme,
    scheduled_for: post.scheduled_for?.slice(0, 16) ?? "",
    status: post.status,
    media_urls: post.media_urls,
  });

  const grid = view === "grid";
  const long = post.content.length > 200 || post.content.split("\n").filter((l) => l.trim()).length > 3;
  const images = post.media_urls.filter((u) => !isPdf(u));

  // Visionneuse plein écran : clic sur une image pour l'agrandir, la parcourir et la télécharger.
  const viewer = useImageViewer();
  const baseName = `linkp-${slug(post.theme, "post")}`;
  const viewerImages: ViewerImage[] = images.map((url, i) => ({ url, name: images.length > 1 ? `${baseName}-${i + 1}` : baseName }));

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    try {
      await fn();
    } catch (err) {
      notify("error", errorMessage(err));
    }
    setBusy(false);
  }

  const patch = (body: Partial<Post>) => api<Post>(`/posts/${post.id}`, { method: "PATCH", body: JSON.stringify(body) }).then(onUpdate);

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
      const updated = await api<Post>(`/posts/${post.id}/regenerate`, { method: "POST", body: JSON.stringify({ instruction }) });
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

  async function copy() {
    try {
      await navigator.clipboard.writeText(post.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      notify("ok", "Texte copié : colle-le dans LinkedIn.");
    } catch {
      notify("error", "Copie impossible : sélectionne le texte manuellement.");
    }
  }

  async function generateImage() {
    setImageBusy(true);
    try {
      const result = await api<PostImageResult>(`/posts/${post.id}/image`, { method: "POST", body: JSON.stringify({}) });
      onUpdate(result.post);
      onMedia(result.media);
      setDraft((d) => ({ ...d, media_urls: result.post.media_urls }));
      notify("ok", "Image créée et enregistrée sur Cloudinary.");
    } catch (err) {
      notify("error", errorMessage(err));
    }
    setImageBusy(false);
  }

  const toggleMedia = (url: string) =>
    setDraft((d) => ({
      ...d,
      media_urls: d.media_urls.includes(url) ? d.media_urls.filter((u) => u !== url) : [...d.media_urls, url],
    }));

  // ----- blocs communs -----
  const chips = (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <Chip>{post.theme || "Sans thème"}</Chip>
      <Chip tone={post.status === "published" ? "forest" : "neutral"}>{STATUS[post.status]}</Chip>
      {post.calendar_event_id && (
        <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-3 py-1 text-sm text-stone-700">
          <IconCalendar className="h-3.5 w-3.5" /> Rappel agenda
        </span>
      )}
    </div>
  );

  const text = (
    <div>
      <p className={`whitespace-pre-wrap text-base leading-relaxed text-stone-800 ${open ? "" : "line-clamp-3"}`}>{post.content}</p>
      {long && (
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className="mt-2 inline-flex items-center gap-1 text-base font-medium text-accent hover:underline"
        >
          {open ? "Voir moins" : "Voir plus"}
          <IconChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
      )}
    </div>
  );

  const imageSkeleton = (cls: string) => (
    <div className={`skeleton flex items-center justify-center ${cls}`} role="status" aria-label="Création de l'image en cours">
      <span className="relative z-10 inline-flex items-center gap-2 text-sm font-medium text-stone-600">
        <IconImage className="h-5 w-5 animate-pulse text-accent" />
        Création de l&apos;image…
      </span>
    </div>
  );

  const actions = (
    <div className="mt-4 flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={generateImage}
        disabled={imageBusy || !aiReady}
        title={aiReady ? "Créer une image professionnelle pour ce post" : "Ajoute ta clé RodiumAI pour activer l'IA"}
        className="inline-flex h-10 items-center gap-2 rounded-lg border border-accent/40 bg-accent-soft/50 px-4 text-base font-medium text-accent-dark transition hover:bg-accent-soft disabled:pointer-events-none disabled:opacity-50"
      >
        <IconImage className="h-5 w-5" />
        {imageBusy ? "Création…" : "Générer une image"}
      </button>
      <IconButton label={copied ? "Copié" : "Copier le texte"} onClick={copy}>
        {copied ? <IconCheck className="h-5 w-5 text-forest" /> : <IconCopy />}
      </IconButton>
      <IconButton
        label="Modifier"
        onClick={() => {
          setEditing(true);
          setOpen(true);
        }}
      >
        <IconPen />
      </IconButton>
      <IconButton label="Réécrire avec l'IA" onClick={() => setRewriting((r) => !r)} disabled={!aiReady}>
        <IconSpark />
      </IconButton>
      <span className="ml-auto flex items-center gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => run(() => patch({ status: post.status === "published" ? "draft" : "published" }))}
          className="inline-flex h-10 items-center gap-1.5 rounded-lg px-3 text-base font-medium text-forest hover:bg-forest/10 disabled:opacity-50"
        >
          <IconCheck className="h-4 w-4" />
          {post.status === "published" ? "Remettre en brouillon" : "Marquer publié"}
        </button>
        <IconButton label="Supprimer" onClick={remove} danger disabled={busy}>
          <IconTrash />
        </IconButton>
      </span>
    </div>
  );

  const rewritePanel = rewriting && (
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
  );

  const editor = (
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
                {isPdf(m.url) ? (
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
  );

  const offset = grid ? 1 : 0; // en grille, la première image est la bannière
  const rest = images.slice(offset);
  const gallery = (rest.length > 0 || (imageBusy && !grid)) && (
    <div className="mt-3 flex flex-wrap gap-2">
      {rest.map((u, i) => (
        <ImageThumb
          key={u}
          url={u}
          name={viewerImages[i + offset].name}
          className="h-16 w-24 rounded-lg"
          onOpen={() => viewer.open(viewerImages, i + offset)}
        />
      ))}
      {imageBusy && !grid && imageSkeleton("h-16 w-40 rounded-lg")}
    </div>
  );

  const cardBase = "fade-up rounded-2xl border border-line bg-white shadow-sm transition-shadow hover:shadow-md";

  // ----- Vue grille : image en haut, puis date, texte, actions -----
  if (grid) {
    return (
      <li className={`${cardBase} flex flex-col overflow-hidden ${editing || rewriting ? "md:col-span-2" : ""}`}>
        {imageBusy ? (
          imageSkeleton("aspect-[3/2] w-full rounded-none")
        ) : images[0] ? (
          <ImageThumb
            url={images[0]}
            name={viewerImages[0].name}
            className="aspect-[3/2] w-full"
            wrapperClass="block"
            onOpen={() => viewer.open(viewerImages, 0)}
          />
        ) : (
          <div className="flex aspect-[3/2] w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-accent-soft/70 to-cream text-stone-500">
            <IconImage className="h-8 w-8 text-accent/60" />
            <span className="text-sm">Pas encore d&apos;image</span>
          </div>
        )}
        <div className="flex flex-1 flex-col p-5">
          <DateInline iso={post.scheduled_for} />
          <div className="mt-3">{chips}</div>
          <div className="mt-3 flex-1">{editing ? editor : text}</div>
          {!editing && gallery}
          {!editing && actions}
          {rewritePanel}
        </div>
        {viewer.node}
      </li>
    );
  }

  // ----- Vue liste : pastille de date à gauche, contenu à droite -----
  return (
    <li className={`${cardBase} p-4 sm:p-5 md:flex md:gap-5`}>
      <DateTile iso={post.scheduled_for} />
      <div className="mt-4 min-w-0 flex-1 md:mt-0">
        {chips}
        <div className="mt-3">{editing ? editor : text}</div>
        {!editing && gallery}
        {!editing && actions}
        {rewritePanel}
      </div>
      {viewer.node}
    </li>
  );
}

// ---------- Emplacements en attente / en échec (génération en cours) ----------

function PostSkeleton({ slot, position, total, view }: { slot: Slot; position: number; total: number; view: View }) {
  const label = (
    <>
      <span className="sr-only">
        Rédaction du post {position} sur {total} en cours
      </span>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Chip>{slot.theme}</Chip>
        <span className="inline-flex items-center gap-2 text-stone-500">
          <span className="h-2 w-2 animate-pulse rounded-full bg-accent" aria-hidden />
          Rédaction en cours
        </span>
      </div>
    </>
  );
  const lines = (
    <div className="mt-4 space-y-3" aria-hidden>
      <div className="skeleton h-4 w-11/12" />
      <div className="skeleton h-4 w-full" />
      <div className="skeleton h-4 w-9/12" />
      <div className="mt-5 flex gap-2">
        <div className="skeleton h-10 w-40 rounded-lg" />
        <div className="skeleton h-10 w-10 rounded-lg" />
        <div className="skeleton h-10 w-10 rounded-lg" />
        <div className="skeleton h-10 w-10 rounded-lg" />
      </div>
    </div>
  );

  if (view === "grid") {
    return (
      <li aria-busy="true" className="overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
        <div className="skeleton aspect-[3/2] w-full rounded-none" aria-hidden />
        <div className="p-5">
          <DateInline iso={slot.scheduled_for} />
          <div className="mt-3">{label}</div>
          {lines}
        </div>
      </li>
    );
  }
  return (
    <li aria-busy="true" className="rounded-2xl border border-line bg-white p-4 shadow-sm sm:p-5 md:flex md:gap-5">
      <DateTile iso={slot.scheduled_for} />
      <div className="mt-4 min-w-0 flex-1 md:mt-0">
        {label}
        {lines}
      </div>
    </li>
  );
}

function FailedSlot({ slot, onRetry }: { slot: Slot; onRetry: () => void }) {
  return (
    <li className="rounded-2xl border border-red-200 bg-red-50 p-5">
      <div className="flex flex-wrap items-center gap-3">
        <Chip>{slot.theme}</Chip>
        <DateInline iso={slot.scheduled_for} />
      </div>
      <p role="alert" className="mt-3 text-base text-red-800">
        Ce post n&apos;a pas pu être rédigé{slot.message ? ` : ${slot.message}` : "."}
      </p>
      <button type="button" onClick={onRetry} disabled={slot.retrying} className={`${btnGhost} mt-3`}>
        {slot.retrying ? "Nouvel essai…" : "Réessayer"}
      </button>
    </li>
  );
}

// ---------- Page « Mes posts » ----------

export default function PostsSection() {
  const { posts, profile, media, setMedia, aiKey, gen, notify, updatePost, removePost } = useDashboard();
  const aiReady = aiKey.configured;
  // La vue choisie (liste ou grille) est mémorisée dans le navigateur. Cette section n'est affichée qu'après
  // le chargement des données (côté navigateur uniquement) : on peut donc lire le stockage dès le départ.
  const [view, setView] = useState<View>(() => {
    try {
      const saved = localStorage.getItem(VIEW_KEY);
      if (saved === "grid" || saved === "list") return saved;
    } catch {
      /* stockage indisponible : on garde la vue par défaut */
    }
    return "list";
  });
  const [filter, setFilter] = useState<Filter>("all");
  const { busy, slots, progress } = gen;
  const ready = profile.themes.length > 0 && profile.start_date && profile.end_date;

  function changeView(next: View) {
    setView(next);
    try {
      localStorage.setItem(VIEW_KEY, next);
    } catch {
      /* sans conséquence */
    }
  }

  // Posts (filtrés) et emplacements en attente, mélangés par date : un post remplace son squelette à la même place.
  const counts: Record<Filter, number> = {
    all: posts.length,
    draft: posts.filter((p) => p.status === "draft").length,
    scheduled: posts.filter((p) => p.status === "scheduled").length,
    published: posts.filter((p) => p.status === "published").length,
  };
  const visible = filter === "all" ? posts : posts.filter((p) => p.status === filter);

  type Item = { key: string; at: string; post: Post | null; slot: Slot | null };
  const items: Item[] = [
    ...visible.map((p): Item => ({ key: p.id, at: p.scheduled_for ?? "9999", post: p, slot: null })),
    ...slots.map((s): Item => ({ key: `slot-${s.index}`, at: s.scheduled_for, post: null, slot: s })),
  ].sort((a, b) => a.at.localeCompare(b.at));

  const filters: [Filter, string][] = [
    ["all", "Tous"],
    ["draft", "Brouillons"],
    ["scheduled", "Programmés"],
    ["published", "Publiés"],
  ];

  return (
    <Section id="posts" title="Tes posts programmés" hint="Génère tes posts sur la période choisie, puis relis, ajuste et publie.">
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={gen.generate} disabled={!gen.canGenerate} className={btnPrimary}>
          {busy ? "Rédaction en cours…" : posts.length ? "Générer de nouveaux posts" : "Générer mes posts"}
        </button>
        {aiReady && !ready && <p className="text-base text-stone-500">Ajoute au moins un thème et une période pour générer.</p>}
      </div>
      {!aiReady && <AiHint />}

      {progress && (
        <div role="status" aria-live="polite" className="space-y-2">
          <p className="text-base text-stone-700">
            {progress.done} post{progress.done > 1 ? "s" : ""} prêt{progress.done > 1 ? "s" : ""} sur {progress.total}
          </p>
          <div
            role="progressbar"
            aria-label="Avancement de la rédaction"
            aria-valuemin={0}
            aria-valuemax={progress.total}
            aria-valuenow={progress.done}
            className="h-2 overflow-hidden rounded-full bg-stone-200"
          >
            <div
              className="h-full rounded-full bg-accent transition-all duration-500"
              style={{ width: `${(progress.done / Math.max(progress.total, 1)) * 100}%` }}
            />
          </div>
        </div>
      )}

      {(posts.length > 0 || slots.length > 0) && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrer par statut">
            {filters.map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={filter === value}
                onClick={() => setFilter(value)}
                className={`rounded-full border px-3.5 py-1.5 text-base transition ${
                  filter === value ? "border-ink bg-ink text-white" : "border-stone-300 text-stone-700 hover:bg-stone-50"
                }`}
              >
                {label} <span className={filter === value ? "text-white/70" : "text-stone-400"}>{counts[value]}</span>
              </button>
            ))}
          </div>
          <div role="group" aria-label="Mode d'affichage" className="inline-flex rounded-lg border border-stone-300 bg-white p-1">
            {(
              [
                ["list", "Liste", <IconList key="l" className="h-5 w-5" />],
                ["grid", "Grille", <IconGrid key="g" className="h-5 w-5" />],
              ] as const
            ).map(([value, label, icon]) => (
              <button
                key={value}
                type="button"
                aria-pressed={view === value}
                aria-label={`Vue ${label.toLowerCase()}`}
                title={`Vue ${label.toLowerCase()}`}
                onClick={() => changeView(value)}
                className={`inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-base font-medium transition ${
                  view === value ? "bg-ink text-white" : "text-stone-600 hover:bg-stone-100"
                }`}
              >
                {icon}
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <p className="text-base text-stone-500">{posts.length > 0 ? "Aucun post dans cette catégorie." : "Aucun post pour le moment."}</p>
      ) : (
        <ul className={view === "grid" ? "grid items-start gap-5 md:grid-cols-2" : "space-y-4"}>
          {items.map((item) => {
            if (item.post) {
              return (
                <PostCard
                  key={item.key}
                  post={item.post}
                  media={media}
                  aiReady={aiReady}
                  view={view}
                  notify={notify}
                  onMedia={(m) => setMedia((prev) => [m, ...prev])}
                  onUpdate={updatePost}
                  onDelete={removePost}
                />
              );
            }
            const slot = item.slot as Slot;
            return slot.status === "error" ? (
              <FailedSlot key={item.key} slot={slot} onRetry={() => gen.retry(slot)} />
            ) : (
              <PostSkeleton key={item.key} slot={slot} position={slot.index + 1} total={progress?.total ?? slots.length} view={view} />
            );
          })}
        </ul>
      )}
    </Section>
  );
}
