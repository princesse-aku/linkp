"use client";

import { useState } from "react";
import { IconCalendar, IconClock, IconCopy, IconImage } from "@/components/Icons";
import { isPdf } from "@/components/ImageViewer";
import { dayParts, longDate, timeLabel } from "@/lib/dates";
import type { Post, PostStatus } from "@/lib/types";
import { useDashboard } from "./DashboardProvider";
import type { Slot } from "./useGeneration";

const COLUMNS: { status: PostStatus; title: string; hint: string; dot: string }[] = [
  { status: "draft", title: "Brouillons", hint: "À relire et ajuster", dot: "bg-stone-400" },
  { status: "scheduled", title: "Programmés", hint: "Prêts à publier", dot: "bg-accent" },
  { status: "published", title: "Publiés", hint: "C'est en ligne", dot: "bg-forest" },
];

const STATUS_LABEL: Record<PostStatus, string> = { draft: "Brouillon", scheduled: "Programmé", published: "Publié" };

function DateBadge({ iso }: { iso: string | null }) {
  if (!iso) return <span className="shrink-0 rounded-md bg-stone-100 px-2 py-1 text-sm text-stone-500">Sans date</span>;
  const d = dayParts(iso);
  return (
    <span className="shrink-0 rounded-md bg-accent-soft px-2 py-1 text-sm font-semibold capitalize text-accent-dark" title={longDate(iso)}>
      {d.day} {d.month}
    </span>
  );
}

function KanbanCard({
  post,
  dragging,
  onDragStart,
  onDragEnd,
}: {
  post: Post;
  dragging: boolean;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
}) {
  const { openPost, movePost, notify } = useDashboard();
  const cover = post.media_urls.find((u) => !isPdf(u));
  const images = post.media_urls.filter((u) => !isPdf(u)).length;

  async function copy() {
    try {
      await navigator.clipboard.writeText(post.content);
      notify("ok", "Texte copié : colle-le dans LinkedIn.");
    } catch {
      notify("error", "Copie impossible : sélectionne le texte manuellement.");
    }
  }

  return (
    <article
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", post.id);
        e.dataTransfer.effectAllowed = "move";
        onDragStart(post.id);
      }}
      onDragEnd={onDragEnd}
      className={`group cursor-grab rounded-xl border border-line bg-white p-3.5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md active:cursor-grabbing ${
        dragging ? "scale-[0.98] opacity-40" : ""
      }`}
    >
      {cover && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={cover} alt="" loading="lazy" draggable={false} className="mb-3 h-28 w-full rounded-lg object-cover" />
      )}
      <div className="flex items-start justify-between gap-2">
        <button type="button" onClick={() => openPost(post.id)} className="min-w-0 text-left font-serif text-lg font-medium leading-snug hover:text-accent">
          {post.theme || "Sans thème"}
        </button>
        <DateBadge iso={post.scheduled_for} />
      </div>
      <p className="mt-1.5 line-clamp-3 text-sm leading-relaxed text-stone-600">{post.content}</p>

      <div className="mt-3 flex items-center justify-between text-sm text-stone-600">
        <span className="inline-flex items-center gap-1.5 font-semibold text-ink">
          <IconClock className="h-4 w-4 text-accent" />
          {post.scheduled_for ? timeLabel(post.scheduled_for) : "--:--"}
        </span>
        <span className="flex items-center gap-2 text-stone-400">
          {images > 0 && (
            <span className="inline-flex items-center gap-1" title={`${images} image(s)`}>
              <IconImage className="h-4 w-4" /> {images}
            </span>
          )}
          {post.calendar_event_id && (
            <span title="Rappel dans Google Agenda">
              <IconCalendar className="h-4 w-4" />
            </span>
          )}
        </span>
      </div>

      <div className="mt-3 flex items-center gap-2 border-t border-line pt-3">
        <button
          type="button"
          onClick={copy}
          aria-label="Copier le texte"
          title="Copier le texte"
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-stone-300 text-stone-700 hover:bg-stone-50"
        >
          <IconCopy className="h-4 w-4" />
        </button>
        <button type="button" onClick={() => openPost(post.id)} className="h-9 rounded-lg border border-stone-300 px-3 text-sm font-medium hover:bg-stone-50">
          Ouvrir
        </button>
        {/* Alternative accessible (clavier, tactile) au glisser-déposer */}
        <select
          value={post.status}
          onChange={(e) => movePost(post.id, e.target.value as PostStatus)}
          aria-label="Changer le statut"
          title="Changer le statut"
          className="ml-auto h-9 rounded-lg border border-stone-300 bg-white py-1 pl-2 pr-6 text-sm"
        >
          {(Object.keys(STATUS_LABEL) as PostStatus[]).map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </select>
      </div>
    </article>
  );
}

function KanbanSkeleton({ slot }: { slot: Slot }) {
  return (
    <article aria-busy="true" className="rounded-xl border border-line bg-white p-3.5 shadow-sm">
      <span className="sr-only">Rédaction du post « {slot.theme} » en cours</span>
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-serif text-lg font-medium leading-snug">{slot.theme}</h3>
        <DateBadge iso={slot.scheduled_for} />
      </div>
      <p className="mt-1 inline-flex items-center gap-2 text-sm text-stone-500">
        <span className="h-2 w-2 animate-pulse rounded-full bg-accent" aria-hidden />
        Rédaction en cours
      </p>
      <div className="mt-3 space-y-2.5" aria-hidden>
        <div className="skeleton h-3.5 w-full" />
        <div className="skeleton h-3.5 w-11/12" />
        <div className="skeleton h-3.5 w-8/12" />
      </div>
      <div className="mt-4 flex items-center gap-2 border-t border-line pt-3" aria-hidden>
        <div className="skeleton h-9 w-9 rounded-lg" />
        <div className="skeleton h-9 w-20 rounded-lg" />
      </div>
    </article>
  );
}

function KanbanFailed({ slot, onRetry }: { slot: Slot; onRetry: () => void }) {
  return (
    <article className="rounded-xl border border-red-200 bg-red-50 p-3.5">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-serif text-lg font-medium leading-snug">{slot.theme}</h3>
        <DateBadge iso={slot.scheduled_for} />
      </div>
      <p role="alert" className="mt-2 text-sm text-red-800">
        Ce post n&apos;a pas pu être rédigé{slot.message ? ` : ${slot.message}` : "."}
      </p>
      <button
        type="button"
        onClick={onRetry}
        disabled={slot.retrying}
        className="mt-3 h-9 rounded-lg border border-stone-300 bg-white px-3 text-sm font-medium hover:bg-stone-50 disabled:opacity-50"
      >
        {slot.retrying ? "Nouvel essai…" : "Réessayer"}
      </button>
    </article>
  );
}

export default function KanbanBoard() {
  const { posts, gen, movePost } = useDashboard();
  const [dragging, setDragging] = useState<string | null>(null);
  const [over, setOver] = useState<PostStatus | null>(null);

  return (
    <div className="flex gap-4 overflow-x-auto pb-3 lg:grid lg:grid-cols-3 lg:overflow-visible">
      {COLUMNS.map((col) => {
        const cards = posts.filter((p) => p.status === col.status).sort((a, b) => (a.scheduled_for ?? "9999").localeCompare(b.scheduled_for ?? "9999"));
        const slots = col.status === "draft" ? gen.slots : []; // les posts en cours de rédaction arrivent en brouillons
        const empty = cards.length === 0 && slots.length === 0;
        const highlight = over === col.status && dragging !== null;

        return (
          <section
            key={col.status}
            aria-label={`${col.title} : ${cards.length} post(s)`}
            onDragOver={(e) => {
              if (!dragging) return;
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
              setOver(col.status);
            }}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node)) setOver(null);
            }}
            onDrop={(e) => {
              e.preventDefault();
              const id = e.dataTransfer.getData("text/plain");
              setOver(null);
              setDragging(null);
              if (id) void movePost(id, col.status);
            }}
            className={`flex min-h-[320px] w-[300px] shrink-0 flex-col rounded-2xl border p-3 transition-colors lg:w-auto ${
              highlight ? "border-accent bg-accent-soft/40" : "border-line bg-stone-100/70"
            }`}
          >
            <header className="mb-3 flex items-center gap-2 px-1">
              <span className={`h-2.5 w-2.5 rounded-full ${col.dot}`} aria-hidden />
              <h3 className="font-serif text-xl font-medium">{col.title}</h3>
              <span className="rounded-full bg-white px-2.5 py-0.5 text-sm font-semibold text-stone-600 ring-1 ring-line">{cards.length + slots.length}</span>
              <span className="ml-auto hidden text-sm text-stone-500 xl:inline">{col.hint}</span>
            </header>

            <div className="flex flex-1 flex-col gap-3">
              {cards.map((post) => (
                <KanbanCard key={post.id} post={post} dragging={dragging === post.id} onDragStart={setDragging} onDragEnd={() => (setDragging(null), setOver(null))} />
              ))}
              {slots.map((slot) =>
                slot.status === "error" ? (
                  <KanbanFailed key={`slot-${slot.index}`} slot={slot} onRetry={() => gen.retry(slot)} />
                ) : (
                  <KanbanSkeleton key={`slot-${slot.index}`} slot={slot} />
                ),
              )}
              {empty && (
                <div className="flex flex-1 items-center justify-center rounded-xl border-2 border-dashed border-stone-300/80 p-6 text-center text-sm text-stone-500">
                  {dragging ? "Dépose le post ici" : "Aucun post pour le moment"}
                </div>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
