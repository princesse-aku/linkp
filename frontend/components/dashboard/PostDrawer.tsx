"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { IconClose } from "@/components/Icons";
import { useDashboard } from "./DashboardProvider";
import { PostCard } from "./PostsSection";

// Volet latéral : détail complet d'un post (modifier, réécrire, image, copier, statut…).
export default function PostDrawer() {
  const { openPostId, openPost, posts, media, setMedia, aiKey, notify, updatePost, removePost } = useDashboard();
  const post = posts.find((p) => p.id === openPostId) ?? null;

  useEffect(() => {
    if (!post) return;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && openPost(null);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [post, openPost]);

  if (!post) return null;

  return createPortal(
    <div className="fixed inset-0 z-50">
      <button type="button" aria-label="Fermer le détail" className="absolute inset-0 bg-ink/50 backdrop-blur-[1px]" onClick={() => openPost(null)} />
      <aside role="dialog" aria-modal="true" aria-label="Détail du post" className="slide-in-right absolute right-0 top-0 flex h-full w-full max-w-xl flex-col bg-cream shadow-2xl">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="font-serif text-2xl font-medium">Détail du post</h2>
          <button type="button" onClick={() => openPost(null)} aria-label="Fermer" className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-stone-600 hover:bg-white">
            <IconClose />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          <ul>
            <PostCard
              key={post.id}
              post={post}
              media={media}
              aiReady={aiKey.configured}
              view="grid"
              defaultOpen
              notify={notify}
              onMedia={(m) => setMedia((prev) => [m, ...prev])}
              onUpdate={updatePost}
              onDelete={(id) => {
                removePost(id);
                openPost(null);
              }}
            />
          </ul>
        </div>
      </aside>
    </div>,
    document.body,
  );
}
