"use client";

import { useEffect, useRef, useState } from "react";

// Écrit le texte lettre par lettre quand il entre dans l'écran.
// Le texte complet est rendu par défaut (rendu serveur, sans JS, mouvement réduit) :
// l'effet ne démarre que s'il est sous la ligne de flottaison.
export default function TypeWriter({ paragraphs, className = "" }: { paragraphs: string[]; className?: string }) {
  const full = paragraphs.join("\n");
  const ref = useRef<HTMLDivElement>(null);
  const [count, setCount] = useState(full.length);
  const [typing, setTyping] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (el.getBoundingClientRect().top < window.innerHeight * 0.9) return;
    setCount(0);
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          io.disconnect();
          setTyping(true);
        }
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!typing) return;
    const id = setInterval(() => {
      setCount((c) => {
        if (c >= full.length) {
          clearInterval(id);
          return c;
        }
        return c + 1;
      });
    }, 22);
    return () => clearInterval(id);
  }, [typing, full]);

  const parts = full.slice(0, count).split("\n");
  const done = count >= full.length;

  return (
    <div ref={ref} className={`relative ${className}`}>
      {/* Réserve la hauteur finale pour éviter les sauts de mise en page. */}
      <div aria-hidden className="invisible space-y-4">
        {paragraphs.map((p) => (
          <p key={p}>{p}</p>
        ))}
      </div>
      <div className="absolute inset-0 space-y-4" aria-label={full}>
        {parts.map((p, i) => (
          <p key={i}>
            {p}
            {!done && i === parts.length - 1 && <span className="caret" />}
          </p>
        ))}
      </div>
    </div>
  );
}
