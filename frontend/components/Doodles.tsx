type P = { className?: string };

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

// Flèche courbe dessinée à la main (se trace à l'apparition).
export const DoodleArrow = ({ className = "h-16 w-16" }: P) => (
  <svg viewBox="0 0 80 80" className={className} aria-hidden>
    <path d="M6 10C40 4 72 28 62 66" pathLength={1} className="draw" {...stroke} />
    <path d="M62 66L53 57M62 66L73 60" pathLength={1} className="draw" {...stroke} />
  </svg>
);

export const DoodleSpark = ({ className = "h-6 w-6" }: P) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden>
    <path d="M12 1L14.6 9.4L23 12L14.6 14.6L12 23L9.4 14.6L1 12L9.4 9.4Z" fill="currentColor" />
  </svg>
);

export const DoodlePlane = ({ className = "h-14 w-14" }: P) => (
  <svg viewBox="0 0 64 48" className={className} aria-hidden>
    <path d="M22 20L60 4L46 44L34 30Z" {...stroke} strokeWidth={2.2} />
    <path d="M22 20L34 30L60 4" {...stroke} strokeWidth={2.2} />
    <path d="M2 40C8 40 12 34 16 36" {...stroke} strokeWidth={2} strokeDasharray="1 6" />
  </svg>
);

export const DoodleSquiggle = ({ className = "h-4 w-24" }: P) => (
  <svg viewBox="0 0 96 16" className={className} aria-hidden>
    <path d="M2 8C10 0 18 16 26 8S42 0 50 8 66 16 74 8 90 0 94 8" {...stroke} />
  </svg>
);

export const DoodlePin = ({ className = "h-7 w-7" }: P) => (
  <svg viewBox="0 0 28 28" className={className} aria-hidden>
    <circle cx="14" cy="10" r="7" fill="#C8502D" />
    <circle cx="11.5" cy="7.5" r="2" fill="#fff" opacity="0.5" />
    <path d="M14 17V27" stroke="#8a8a8a" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

// Boule de papier froissé.
export const DoodleCrumple = ({ className = "h-14 w-14" }: P) => (
  <svg viewBox="0 0 64 64" className={className} aria-hidden>
    <path d="M12 30L18 14L34 8L50 16L56 34L46 52L28 56L14 46Z" fill="#FFFDF8" stroke="#D9CBB4" strokeWidth="2" strokeLinejoin="round" />
    <path d="M18 14L28 30L34 8M28 30L14 46M28 30L46 52M28 30L56 34M28 30L50 16" fill="none" stroke="#D9CBB4" strokeWidth="1.6" strokeLinejoin="round" />
  </svg>
);
