"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { IconChevronLeft, IconChevronRight, IconClose, IconDownload, IconExternal } from "./Icons";

export type ViewerImage = { url: string; name: string };

export const isPdf = (url: string) => url.toLowerCase().endsWith(".pdf");

/** « Mon thème : IA ! » -> « mon-theme-ia » (nom de fichier sûr) */
export function slug(text: string, fallback = "image") {
  const s = text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
  return s || fallback;
}

/**
 * Lien qui TÉLÉCHARGE le fichier au lieu de l'ouvrir.
 * L'attribut HTML `download` est ignoré pour un autre domaine (Cloudinary) : on utilise donc l'option
 * `fl_attachment` de Cloudinary, qui fait répondre le serveur avec « Content-Disposition: attachment ».
 */
export function downloadUrl(url: string, name?: string) {
  const marker = "/upload/";
  const at = url.indexOf(marker);
  if (!url.includes("res.cloudinary.com") || at === -1) return url;
  const safe = name ? slug(name, "") : "";
  const flag = safe ? `fl_attachment:${safe}` : "fl_attachment";
  return `${url.slice(0, at + marker.length)}${flag}/${url.slice(at + marker.length)}`;
}

// ---------- Miniature cliquable avec bouton de téléchargement ----------

export function ImageThumb({
  url,
  name,
  className,
  wrapperClass = "inline-block",
  onOpen,
}: {
  url: string;
  name: string;
  className: string;
  wrapperClass?: string;
  onOpen: () => void;
}) {
  const pdf = isPdf(url);
  return (
    <div className={`group relative overflow-hidden rounded-[inherit] ${wrapperClass}`}>
      {pdf ? (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Ouvrir le PDF ${name}`}
          className={`flex items-center justify-center bg-cream font-serif text-lg text-accent ${className}`}
        >
          PDF
        </a>
      ) : (
        <button type="button" onClick={onOpen} aria-label={`Agrandir l'image ${name}`} className="block w-full cursor-zoom-in">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt={`Image du post : ${name}`} loading="lazy" className={`object-cover transition-transform duration-300 group-hover:scale-[1.03] ${className}`} />
        </button>
      )}
      <a
        href={downloadUrl(url, name)}
        download
        aria-label={`Télécharger ${name}`}
        title="Télécharger"
        className="absolute right-1.5 top-1.5 inline-flex h-8 w-8 items-center justify-center rounded-md bg-white/90 text-ink opacity-0 shadow transition hover:bg-white focus:opacity-100 group-hover:opacity-100"
      >
        <IconDownload className="h-4 w-4" />
      </a>
    </div>
  );
}

// ---------- Visionneuse plein écran ----------

function Viewer({
  images,
  index,
  onIndex,
  onClose,
}: {
  images: ViewerImage[];
  index: number;
  onIndex: (i: number) => void;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const many = images.length > 1;
  const current = images[index];

  const go = useCallback(
    (delta: number) => onIndex((index + delta + images.length) % images.length),
    [index, images.length, onIndex],
  );

  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = overflow;
      before?.focus?.();
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight" && many) go(1);
      else if (e.key === "ArrowLeft" && many) go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, many, onClose]);

  const pill = "inline-flex h-10 items-center gap-2 rounded-lg px-4 text-base font-medium transition";

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label="Aperçu de l'image" className="fixed inset-0 z-[60] flex flex-col bg-ink/90 backdrop-blur-sm" onClick={onClose}>
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 text-cream" onClick={(e) => e.stopPropagation()}>
        <p className="min-w-0 truncate text-base">
          {current.name}
          {many && <span className="ml-2 text-cream/60">{index + 1} / {images.length}</span>}
        </p>
        <div className="flex items-center gap-2">
          <a href={downloadUrl(current.url, current.name)} download className={`${pill} bg-white font-semibold text-ink hover:bg-cream`}>
            <IconDownload className="h-5 w-5" /> Télécharger
          </a>
          <a href={current.url} target="_blank" rel="noopener noreferrer" className={`${pill} border border-white/30 text-cream hover:bg-white/10`}>
            <IconExternal className="h-5 w-5" />
            <span className="hidden sm:inline">Ouvrir</span>
          </a>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="Fermer l'aperçu" className={`${pill} border border-white/30 px-3 text-cream hover:bg-white/10`}>
            <IconClose className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="relative flex min-h-0 flex-1 items-center justify-center px-4 pb-6 sm:px-16">
        {many && (
          <button
            type="button"
            onClick={(e) => (e.stopPropagation(), go(-1))}
            aria-label="Image précédente"
            className="absolute left-2 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-cream hover:bg-white/25 sm:left-4"
          >
            <IconChevronLeft />
          </button>
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={current.url} alt={current.name} onClick={(e) => e.stopPropagation()} className="max-h-full max-w-full rounded-lg object-contain shadow-2xl" />
        {many && (
          <button
            type="button"
            onClick={(e) => (e.stopPropagation(), go(1))}
            aria-label="Image suivante"
            className="absolute right-2 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-cream hover:bg-white/25 sm:right-4"
          >
            <IconChevronRight />
          </button>
        )}
      </div>
    </div>,
    document.body,
  );
}

/** Usage : const viewer = useImageViewer();  viewer.open(images, index);  et afficher {viewer.node} */
export function useImageViewer() {
  const [state, setState] = useState<{ images: ViewerImage[]; index: number } | null>(null);
  const open = useCallback((images: ViewerImage[], index = 0) => setState({ images, index }), []);
  const close = useCallback(() => setState(null), []);
  const node = state ? (
    <Viewer images={state.images} index={state.index} onIndex={(i) => setState((s) => (s ? { ...s, index: i } : s))} onClose={close} />
  ) : null;
  return { open, node };
}
