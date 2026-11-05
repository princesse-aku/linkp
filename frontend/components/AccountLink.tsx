"use client";

import Link from "next/link";
import { useAuth } from "@/lib/useAuth";

// Lien d'accès au compte : pour un visiteur il mène à l'inscription ou à la connexion,
// pour quelqu'un déjà connecté il mène directement au tableau de bord.
export default function AccountLink({
  guestHref,
  memberLabel = "Tableau de bord",
  className,
  onClick,
  children,
}: {
  guestHref: "/login" | "/signup";
  memberLabel?: string;
  className?: string;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  return (
    <Link href={user ? "/dashboard" : guestHref} onClick={onClick} className={className}>
      {user ? memberLabel : children}
    </Link>
  );
}
