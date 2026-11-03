import Link from "next/link";

export function LogoMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" className={className} aria-hidden>
      <defs>
        <linearGradient id="lp-g" x1="6" y1="4" x2="58" y2="62" gradientUnits="userSpaceOnUse">
          <stop stopColor="#C8502D" />
          <stop offset="1" stopColor="#E07B39" />
        </linearGradient>
      </defs>
      <path
        d="M16 4H48A12 12 0 0 1 60 16V40A12 12 0 0 1 48 52H30L18 61V52H16A12 12 0 0 1 4 40V16A12 12 0 0 1 16 4Z"
        fill="url(#lp-g)"
      />
      <path d="M24 16V36H40" stroke="#fff" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M45 11L46.7 16.3L52 18L46.7 19.7L45 25L43.3 19.7L38 18L43.3 16.3Z" fill="#FDE7C8" />
    </svg>
  );
}

export default function Logo({ onClick, compact = false, href = "/" }: { onClick?: () => void; compact?: boolean; href?: string }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`flex items-center font-serif font-semibold tracking-tight ${compact ? "gap-2.5 text-2xl" : "gap-3 text-3xl"}`}
      aria-label="LinkP, accueil"
    >
      <LogoMark className={compact ? "h-10 w-10" : "h-12 w-12 sm:h-14 sm:w-14"} />
      <span>
        Link<span className="text-accent">P</span>
      </span>
    </Link>
  );
}
