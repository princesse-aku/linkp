"use client";

import { useAuth } from "@/lib/useAuth";
import AccountLink from "./AccountLink";

const linkClass = "inline-flex min-h-11 items-center text-cream/75 transition hover:text-white md:min-h-9";

// Colonne « Mon espace » du pied de page : connectée, elle ne propose plus que le tableau de bord.
export default function FooterAccount() {
  const { user } = useAuth();
  return (
    <nav aria-label="Mon espace">
      <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-[#E9B58F]">Mon espace</h2>
      <ul className="mt-3 text-base">
        <li>
          <AccountLink guestHref="/login" memberLabel="Tableau de bord" className={linkClass}>
            Connexion
          </AccountLink>
        </li>
        {!user && (
          <li>
            <AccountLink guestHref="/signup" className={linkClass}>
              Créer un compte
            </AccountLink>
          </li>
        )}
      </ul>
    </nav>
  );
}
