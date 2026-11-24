"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { IconChevronRight, IconClose } from "@/components/Icons";
import Logo from "@/components/Logo";
import { api, errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/useAuth";
import {
  type AdminAccount,
  type AdminEvent,
  type AdminOverview,
  type AdminUserDetail,
  EVENT_LABELS,
  describe,
  errorLabel,
  labelOf,
} from "./adminTypes";

type Tab = "overview" | "users" | "activity";
const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Aperçu" },
  { id: "users", label: "Utilisateurs" },
  { id: "activity", label: "Activité" },
];

const dateFmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric" });
const dateTimeFmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

const fmtDate = (iso: string | null) => (iso ? dateFmt.format(new Date(iso)) : "Jamais");
const fmtDateTime = (iso: string | null) => (iso ? dateTimeFmt.format(new Date(iso)) : "");

function ago(iso: string | null): string {
  if (!iso) return "Jamais";
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 90) return "à l'instant";
  if (s < 3600) return `il y a ${Math.round(s / 60)} min`;
  if (s < 86400) return `il y a ${Math.round(s / 3600)} h`;
  if (s < 86400 * 30) return `il y a ${Math.round(s / 86400)} j`;
  return fmtDate(iso);
}

const card = "rounded-2xl border border-line bg-paper p-5";

function Yes({ on }: { on: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-sm ${on ? "text-forest" : "text-stone-400"}`}>
      <span className={`h-2 w-2 rounded-full ${on ? "bg-forest" : "bg-stone-300"}`} />
      {on ? "Oui" : "Non"}
    </span>
  );
}

function Stat({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
  return (
    <div className={card}>
      <p className="text-sm text-stone-500">{label}</p>
      <p className="mt-1 font-serif text-4xl font-medium tracking-tight">{value}</p>
      {hint && <p className="mt-1 text-sm text-stone-500">{hint}</p>}
    </div>
  );
}

function Loading() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-busy>
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="skeleton h-28 rounded-2xl" />
      ))}
    </div>
  );
}

function ErrorBox({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-5 text-base text-red-700">
      {message}{" "}
      <button onClick={onRetry} className="font-semibold underline">
        Réessayer
      </button>
    </div>
  );
}

// --- Aperçu --------------------------------------------------------------------

function SignupsChart({ data }: { data: AdminOverview["signups_by_day"] }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  const w = 600;
  const h = 140;
  const bar = w / data.length;
  return (
    <div>
      <svg viewBox={`0 0 ${w} ${h + 22}`} className="w-full" role="img" aria-label="Inscriptions par jour sur 30 jours">
        {data.map((d, i) => {
          const bh = (d.count / max) * h;
          return (
            <g key={d.day}>
              <rect x={i * bar + 2} y={h - bh} width={bar - 4} height={Math.max(bh, d.count ? 2 : 1)} rx={2} className={d.count ? "fill-accent" : "fill-line"}>
                <title>{`${d.day} : ${d.count} inscription(s)`}</title>
              </rect>
            </g>
          );
        })}
        <text x={0} y={h + 16} className="fill-stone-500 text-[11px]">
          {data[0] && fmtDate(data[0].day)}
        </text>
        <text x={w} y={h + 16} textAnchor="end" className="fill-stone-500 text-[11px]">
          Aujourd&apos;hui
        </text>
      </svg>
    </div>
  );
}

function Overview() {
  const [data, setData] = useState<AdminOverview | null>(null);
  const [error, setError] = useState("");
  const load = useCallback(() => {
    api<AdminOverview>("/admin/overview")
      .then((r) => (setError(""), setData(r)))
      .catch((e) => setError(errorMessage(e)));
  }, []);
  useEffect(load, [load]);

  if (error) return <ErrorBox message={error} onRetry={load} />;
  if (!data) return <Loading />;

  const { users, funnel, generation_30d: gen } = data;
  const steps = [
    { label: "Inscrits", value: funnel.signed_up },
    { label: "Ont ajouté leur clé IA", value: funnel.with_key },
    { label: "Ont généré des posts", value: funnel.generated },
    { label: "Ont connecté l'agenda", value: funnel.with_calendar },
  ];
  const errors = Object.entries(gen.errors).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Utilisateurs" value={users.total} hint={`${users.verified} adresse(s) vérifiée(s)`} />
        <Stat label="Actifs sur 7 jours" value={users.active_7d} hint={`${users.active_30d} sur 30 jours`} />
        <Stat label="Nouveaux sur 7 jours" value={users.new_7d} />
        <Stat label="Posts créés (total)" value={data.posts_total} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className={card}>
          <h2 className="font-serif text-2xl font-medium">Parcours</h2>
          <p className="mt-1 text-base text-stone-500">Où s&apos;arrêtent les nouveaux utilisateurs.</p>
          <ul className="mt-5 space-y-4">
            {steps.map((s) => {
              const pct = funnel.signed_up ? Math.round((s.value / funnel.signed_up) * 100) : 0;
              return (
                <li key={s.label}>
                  <div className="flex items-baseline justify-between text-base">
                    <span>{s.label}</span>
                    <span className="font-semibold">
                      {s.value} <span className="font-normal text-stone-500">({pct} %)</span>
                    </span>
                  </div>
                  <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-line">
                    <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        <section className={card}>
          <h2 className="font-serif text-2xl font-medium">Inscriptions</h2>
          <p className="mt-1 text-base text-stone-500">Par jour, sur les 30 derniers jours.</p>
          <div className="mt-4">
            <SignupsChart data={data.signups_by_day} />
          </div>
        </section>
      </div>

      <section className={card}>
        <h2 className="font-serif text-2xl font-medium">Génération sur 30 jours</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <Stat label="Générations lancées" value={gen.runs} hint={`${gen.runs_7d} sur 7 jours`} />
          <Stat label="Posts rédigés" value={gen.posts_created} />
          <Stat label="Posts en échec" value={gen.posts_failed} />
        </div>
        <div className="mt-5">
          <p className="text-base font-medium">Causes d&apos;échec</p>
          {errors.length === 0 ? (
            <p className="mt-1 text-base text-stone-500">Aucune erreur sur la période.</p>
          ) : (
            <ul className="mt-2 flex flex-wrap gap-2">
              {errors.map(([kind, n]) => (
                <li key={kind} className="rounded-full bg-accent-soft px-3 py-1 text-sm text-accent-dark">
                  {errorLabel(kind)} : {n}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
      <p className="text-sm text-stone-500">Données calculées à {fmtDateTime(data.generated_at)}.</p>
    </div>
  );
}

// --- Utilisateurs --------------------------------------------------------------

function Users({ onOpen }: { onOpen: (uid: string) => void }) {
  const [users, setUsers] = useState<AdminAccount[] | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [applied, setApplied] = useState("");

  const load = useCallback((q: string, pageToken?: string | null) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (pageToken) params.set("page_token", pageToken);
    api<{ users: AdminAccount[]; next_page_token: string | null }>(`/admin/users?${params}`)
      .then((r) => {
        setError("");
        setUsers((prev) => (pageToken && prev ? [...prev, ...r.users] : r.users));
        setToken(r.next_page_token);
      })
      .catch((e) => setError(errorMessage(e)))
      .finally(() => setBusy(false));
  }, []);
  useEffect(() => load(applied), [load, applied]);

  const shown = (users ?? []).filter((u) => !query || (u.email ?? "").toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="space-y-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setApplied(query.includes("@") ? query.trim() : "");
        }}
        className="flex flex-wrap gap-3"
      >
        <input
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!e.target.value) setApplied("");
          }}
          placeholder="Filtrer par adresse, ou saisir une adresse complète puis Entrée"
          aria-label="Rechercher un utilisateur"
          className="min-w-0 flex-1 rounded-xl border border-line bg-paper px-4 py-3 text-base shadow-sm focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/15"
        />
      </form>

      {error && <ErrorBox message={error} onRetry={() => load(applied)} />}

      <div className="overflow-x-auto rounded-2xl border border-line bg-paper">
        <table className="w-full min-w-[760px] text-left text-base">
          <thead className="border-b border-line text-sm text-stone-500">
            <tr>
              {["Utilisateur", "Inscrit", "Dernière activité", "Clé IA", "Agenda", "Posts"].map((h) => (
                <th key={h} className="px-4 py-3 font-medium">
                  {h}
                </th>
              ))}
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {users === null && !error && (
              <tr>
                <td colSpan={7} className="px-4 py-6">
                  <div className="skeleton h-6 w-1/2" />
                </td>
              </tr>
            )}
            {shown.map((u) => (
              <tr key={u.uid} onClick={() => onOpen(u.uid)} className="cursor-pointer border-b border-line/70 last:border-0 hover:bg-cream/70">
                <td className="px-4 py-3">
                  <button onClick={() => onOpen(u.uid)} className="text-left font-medium text-ink hover:text-accent">
                    {u.email ?? u.uid}
                  </button>
                  <div className="text-sm text-stone-500">
                    {u.providers.map((p) => (p === "google.com" ? "Google" : p === "password" ? "Email" : p)).join(", ")}
                    {!u.verified && " · non vérifié"}
                    {u.disabled && " · désactivé"}
                  </div>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-stone-600">{fmtDate(u.created_at)}</td>
                <td className="whitespace-nowrap px-4 py-3 text-stone-600">{ago(u.last_active_at)}</td>
                <td className="px-4 py-3">
                  <Yes on={u.has_key} />
                </td>
                <td className="px-4 py-3">
                  <Yes on={u.has_calendar} />
                </td>
                <td className="px-4 py-3 font-semibold">{u.posts}</td>
                <td className="pr-3 text-stone-400">
                  <IconChevronRight className="h-4 w-4" />
                </td>
              </tr>
            ))}
            {users && shown.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-stone-500">
                  Aucun utilisateur trouvé.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {token && !applied && (
        <button
          onClick={() => (setBusy(true), load(applied, token))}
          disabled={busy}
          className="rounded-full border border-stone-300 bg-white px-5 py-2.5 text-base font-medium hover:bg-stone-50 disabled:opacity-60"
        >
          {busy ? "Chargement..." : "Charger plus"}
        </button>
      )}
    </div>
  );
}

// --- Activité ------------------------------------------------------------------

function EventRow({ e, showUser, onOpen }: { e: AdminEvent; showUser?: boolean; onOpen?: (uid: string) => void }) {
  const { text, bad } = describe(e);
  return (
    <li className="flex gap-3 py-3">
      <span className={`mt-2 h-2.5 w-2.5 shrink-0 rounded-full ${bad ? "bg-accent" : "bg-forest/60"}`} aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-base">
          <span className="font-medium">{labelOf(e.type)}</span>
          {text && <span className={bad ? "text-accent-dark" : "text-stone-600"}> : {text}</span>}
        </p>
        <p className="text-sm text-stone-500">
          {fmtDateTime(e.at)}
          {showUser && e.uid && (
            <>
              {" · "}
              <button onClick={() => onOpen?.(e.uid as string)} className="font-medium text-stone-700 underline-offset-4 hover:text-accent hover:underline">
                {e.email ?? e.uid}
              </button>
            </>
          )}
        </p>
      </div>
    </li>
  );
}

function Activity({ onOpen }: { onOpen: (uid: string) => void }) {
  const [events, setEvents] = useState<AdminEvent[] | null>(null);
  const [type, setType] = useState("");
  const [errorsOnly, setErrorsOnly] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    const params = new URLSearchParams({ limit: "150" });
    if (type) params.set("type", type);
    if (errorsOnly) params.set("errors_only", "true");
    api<{ events: AdminEvent[] }>(`/admin/events?${params}`)
      .then((r) => (setError(""), setEvents(r.events)))
      .catch((e) => setError(errorMessage(e)));
  }, [type, errorsOnly]);
  useEffect(load, [load]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4">
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          aria-label="Type d'événement"
          className="rounded-xl border border-line bg-paper px-4 py-3 text-base"
        >
          <option value="">Tous les événements</option>
          {Object.entries(EVENT_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <label className="flex min-h-11 items-center gap-2 text-base">
          <input type="checkbox" checked={errorsOnly} onChange={(e) => setErrorsOnly(e.target.checked)} className="h-4 w-4 accent-[#C8502D]" />
          Erreurs seulement
        </label>
        <button onClick={load} className="min-h-11 rounded-full px-4 text-base font-medium text-accent hover:bg-white">
          Actualiser
        </button>
      </div>
      {error && <ErrorBox message={error} onRetry={load} />}
      <div className="rounded-2xl border border-line bg-paper px-5">
        {events === null && !error && <div className="skeleton my-5 h-6 w-2/3" />}
        <ul className="divide-y divide-line/70">
          {events?.map((e) => (
            <EventRow key={e.id} e={e} showUser onOpen={onOpen} />
          ))}
        </ul>
        {events?.length === 0 && <p className="py-8 text-center text-stone-500">Aucun événement.</p>}
      </div>
    </div>
  );
}

// --- Détail d'un utilisateur ---------------------------------------------------

function UserDrawer({ uid, onClose }: { uid: string; onClose: () => void }) {
  const [u, setU] = useState<AdminUserDetail | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<AdminUserDetail>(`/admin/users/${encodeURIComponent(uid)}`).then(setU).catch((e) => setError(errorMessage(e)));
  }, [uid]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const setup = u
    ? [
        ["Profil renseigné", u.setup.profile_filled],
        ["Thèmes choisis", u.setup.themes],
        ["Période définie", u.setup.period],
        ["Style analysé", u.setup.style_analyzed],
        ["Clé IA enregistrée", u.has_key],
        ["Agenda connecté", u.has_calendar],
      ]
    : [];

  return (
    <div className="fixed inset-0 z-40" role="dialog" aria-modal aria-label="Détail de l'utilisateur">
      <button className="absolute inset-0 bg-ink/40" onClick={onClose} aria-label="Fermer" />
      <aside className="slide-in-right absolute inset-y-0 right-0 flex w-full max-w-lg flex-col overflow-y-auto bg-cream shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-5">
          <div className="min-w-0">
            <p className="text-sm uppercase tracking-[0.18em] text-accent">Utilisateur</p>
            <h2 className="mt-1 break-all font-serif text-2xl font-medium">{u?.email ?? (error ? "Erreur" : "Chargement...")}</h2>
          </div>
          <button onClick={onClose} aria-label="Fermer" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full hover:bg-white">
            <IconClose className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6 px-6 py-6">
          {error && <ErrorBox message={error} onRetry={() => location.reload()} />}
          {!u && !error && <div className="skeleton h-40 rounded-2xl" />}
          {u && (
            <>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-base">
                <div>
                  <dt className="text-sm text-stone-500">Inscrit le</dt>
                  <dd>{fmtDate(u.created_at)}</dd>
                </div>
                <div>
                  <dt className="text-sm text-stone-500">Dernière activité</dt>
                  <dd>{ago(u.last_active_at)}</dd>
                </div>
                <div>
                  <dt className="text-sm text-stone-500">Connexion</dt>
                  <dd>{u.providers.map((p) => (p === "google.com" ? "Google" : p === "password" ? "Email" : p)).join(", ") || "Inconnue"}</dd>
                </div>
                <div>
                  <dt className="text-sm text-stone-500">Adresse vérifiée</dt>
                  <dd>
                    <Yes on={u.verified} />
                  </dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-sm text-stone-500">Identifiant</dt>
                  <dd className="break-all font-mono text-sm">{u.uid}</dd>
                </div>
              </dl>

              <section className={card}>
                <h3 className="font-serif text-xl font-medium">Posts</h3>
                <p className="mt-2 text-base">
                  <strong>{u.posts.total}</strong> au total : {u.posts.draft ?? 0} brouillon(s), {u.posts.scheduled ?? 0} programmé(s), {u.posts.published ?? 0} publié(s).
                </p>
                <p className="mt-1 text-base text-stone-600">{u.examples} post(s) d&apos;exemple enregistré(s).</p>
              </section>

              <section className={card}>
                <h3 className="font-serif text-xl font-medium">Étapes franchies</h3>
                <ul className="mt-3 grid grid-cols-2 gap-y-2 text-base">
                  {setup.map(([label, on]) => (
                    <li key={label as string} className="flex items-center gap-2">
                      <Yes on={on as boolean} />
                      <span className="text-stone-700">{label as string}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-4 text-sm text-stone-500">Seules des informations oui ou non sont affichées : jamais le contenu du profil, des posts ou des clés.</p>
              </section>

              <section>
                <h3 className="font-serif text-xl font-medium">Traces d&apos;activité</h3>
                <ul className="mt-2 divide-y divide-line/70">
                  {u.events.map((e) => (
                    <EventRow key={e.id} e={e} />
                  ))}
                </ul>
                {u.events.length === 0 && <p className="mt-2 text-base text-stone-500">Aucune activité enregistrée.</p>}
              </section>
            </>
          )}
        </div>
      </aside>
    </div>
  );
}

// --- Page ----------------------------------------------------------------------

export default function AdminDashboard() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [state, setState] = useState<"checking" | "ok" | "denied">("checking");
  const [tab, setTab] = useState<Tab>("overview");
  const [openUid, setOpenUid] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    api("/admin/me")
      .then(() => setState("ok"))
      .catch(() => setState("denied")); // 404 : pas admin, la page se fait passer pour une page inexistante
  }, [user, loading, router]);

  if (state === "denied") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="font-serif text-6xl italic text-accent">404</p>
        <h1 className="font-serif text-3xl font-medium">Cette page n&apos;existe pas.</h1>
        <Link href="/" className="inline-flex min-h-11 items-center rounded-full bg-ink px-6 text-base font-semibold text-cream hover:bg-accent">
          Retour à l&apos;accueil
        </Link>
      </main>
    );
  }
  if (state === "checking") {
    return (
      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="skeleton h-10 w-48" />
      </main>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-line bg-paper/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-3">
          <div className="flex items-center gap-4">
            <Logo compact href="/dashboard" />
            <span className="rounded-full bg-ink px-3 py-1 text-sm font-semibold text-cream">Admin</span>
          </div>
          <div className="flex items-center gap-2 text-base">
            <button onClick={() => setRefreshKey((k) => k + 1)} className="min-h-11 rounded-full px-4 font-medium text-accent hover:bg-white">
              Actualiser
            </button>
            <Link href="/dashboard" className="inline-flex min-h-11 items-center rounded-full px-4 font-medium text-stone-600 hover:bg-white hover:text-ink">
              Mon tableau de bord
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        <h1 className="font-serif text-4xl font-medium tracking-tight">Vue d&apos;ensemble de LinkP</h1>
        <p className="mt-2 max-w-2xl text-base text-stone-600">
          Comptes, activité et erreurs. Aucun contenu d&apos;utilisateur (posts, profil, clés) n&apos;est accessible ici.
        </p>

        <div role="tablist" className="mt-6 flex gap-1 rounded-full border border-line bg-paper p-1 sm:w-fit">
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`min-h-11 flex-1 rounded-full px-5 text-base font-medium transition sm:flex-none ${
                tab === t.id ? "bg-accent text-white shadow" : "text-stone-600 hover:text-ink"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="mt-6" key={`${tab}-${refreshKey}`}>
          {tab === "overview" && <Overview />}
          {tab === "users" && <Users onOpen={setOpenUid} />}
          {tab === "activity" && <Activity onOpen={setOpenUid} />}
        </div>
      </main>

      {openUid && <UserDrawer uid={openUid} onClose={() => setOpenUid(null)} />}
    </div>
  );
}
