"use client";

import { useCallback, useEffect, useState } from "react";
import { errorMessage } from "@/lib/api";
import { adminApi } from "./adminApi";
import type { AdminMember } from "./adminTypes";

const dateFmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric" });
const card = "rounded-2xl border border-line bg-paper p-5 shadow-[0_1px_0_rgba(60,40,20,0.03)] sm:p-6";

// Gestion des administrateurs : réservée aux superadmins.
export default function AdminsPanel({ currentEmail }: { currentEmail: string }) {
  const [admins, setAdmins] = useState<AdminMember[] | null>(null);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(() => {
    adminApi<{ admins: AdminMember[] }>("/admins")
      .then((r) => (setError(""), setAdmins(r.admins)))
      .catch((e) => setError(errorMessage(e)));
  }, []);
  useEffect(load, [load]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setBusy("add");
    setError("");
    setNotice("");
    try {
      const created = await adminApi<AdminMember>("/admins", { method: "POST", body: JSON.stringify({ email }) });
      setNotice(`${created.email} peut maintenant se connecter à l'admin. Un code lui sera envoyé à chaque connexion.`);
      setEmail("");
      load();
    } catch (err) {
      setError(errorMessage(err));
    }
    setBusy("");
  }

  async function remove(member: AdminMember) {
    if (!window.confirm(`Retirer l'accès admin de ${member.email} ? Il ne pourra plus ouvrir cet espace.`)) return;
    setBusy(member.email);
    setError("");
    setNotice("");
    try {
      await adminApi(`/admins/${encodeURIComponent(member.email)}`, { method: "DELETE" });
      setNotice(`${member.email} n'a plus accès à l'admin.`);
      load();
    } catch (err) {
      setError(errorMessage(err));
    }
    setBusy("");
  }

  return (
    <div className="space-y-6">
      <section className={card}>
        <h2 className="font-serif text-2xl font-medium tracking-tight">Ajouter un administrateur</h2>
        <p className="mt-1 text-sm text-stone-500">Il verra les comptes, l&apos;activité et les erreurs, jamais le contenu des utilisateurs. Il ne peut pas gérer les admins.</p>
        <form onSubmit={add} className="mt-4 flex flex-wrap gap-3">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="adresse@exemple.com"
            aria-label="Adresse email du nouvel administrateur"
            className="min-w-[14rem] flex-1 rounded-xl border border-line bg-white px-4 py-3 text-base shadow-sm focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/15"
          />
          <button
            disabled={busy === "add" || !email.trim()}
            className="min-h-12 rounded-full bg-accent px-7 text-base font-semibold text-white shadow-lg shadow-accent/25 transition hover:bg-accent-dark disabled:opacity-60"
          >
            {busy === "add" ? "Ajout..." : "Ajouter"}
          </button>
        </form>
        <p className="mt-3 text-sm leading-relaxed text-stone-500">
          Pour entrer, cette personne doit avoir un compte LinkP avec cette adresse, vérifiée (connexion Google ou lien de confirmation reçu par email). À chaque
          connexion à l&apos;admin, un code à 6 chiffres lui est envoyé.
        </p>
        {notice && <p className="mt-4 rounded-xl bg-forest/10 px-4 py-3 text-base text-forest">{notice}</p>}
        {error && (
          <p role="alert" className="mt-4 rounded-xl bg-accent-soft/70 px-4 py-3 text-base text-accent-dark">
            {error}
          </p>
        )}
      </section>

      <section>
        <h2 className="mb-3 font-serif text-2xl font-medium tracking-tight">Administrateurs</h2>
        {admins === null && !error && <div className="skeleton h-32 rounded-2xl" />}
        {admins && (
          <ul className="divide-y divide-line/70 overflow-hidden rounded-2xl border border-line bg-paper">
            {admins.map((a) => (
              <li key={a.email} className="flex flex-wrap items-center gap-3 px-5 py-4">
                <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent to-[#E07B39] text-sm font-semibold text-white">
                  {a.email.slice(0, 2).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">
                    {a.email}
                    {a.email === currentEmail.toLowerCase() && <span className="ml-2 text-sm font-normal text-stone-500">(toi)</span>}
                  </p>
                  <p className="text-sm text-stone-500">
                    {a.source === "config"
                      ? "Défini dans la configuration du serveur"
                      : `Ajouté${a.added_by ? ` par ${a.added_by}` : ""}${a.added_at ? ` le ${dateFmt.format(new Date(a.added_at))}` : ""}`}
                  </p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${a.role === "superadmin" ? "bg-ink text-cream" : "bg-stone-100 text-stone-700"}`}>
                  {a.role === "superadmin" ? "Superadmin" : "Admin"}
                </span>
                {a.removable && (
                  <button
                    onClick={() => remove(a)}
                    disabled={busy === a.email}
                    className="min-h-11 rounded-full px-4 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    {busy === a.email ? "Retrait..." : "Retirer"}
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
