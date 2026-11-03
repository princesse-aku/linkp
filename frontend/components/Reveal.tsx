"use client";

import { useEffect, useRef, useState } from "react";

type State = "visible" | "hidden" | "shown";

// Fait apparaître le contenu en fondu quand il entre dans l'écran.
// Le contenu est visible par défaut (rendu serveur, sans JS) : il n'est masqué
// qu'une fois la page chargée, et seulement s'il se trouve sous la ligne de flottaison.
export default function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<State>("visible");

  useEffect(() => {
    const el = ref.current;
    if (!el || el.getBoundingClientRect().top < window.innerHeight * 0.9) return;
    setState("hidden");
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setState("shown");
          io.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{ transitionDelay: state === "visible" ? undefined : `${delay}ms` }}
      className={`${state === "hidden" ? "reveal" : state === "shown" ? "reveal reveal-in" : ""} ${className}`}
    >
      {children}
    </div>
  );
}
