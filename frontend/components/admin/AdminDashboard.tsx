"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { IconCheck, IconChevronRight, IconClose } from "@/components/Icons";
import Logo from "@/components/Logo";
import { signOut } from "firebase/auth";
import { ApiError, errorMessage } from "@/lib/api";
import { firebaseAuth } from "@/lib/firebase";
import { useAuth } from "@/lib/useAuth";
import AdminCodeGate from "./AdminCodeGate";
import AdminLogin from "./AdminLogin";
import AdminsPanel from "./AdminsPanel";
import { ADMIN_SESSION_EXPIRED, adminApi, forgetAdminSession } from "./adminApi";
import {
  type AdminAccount,
  type AdminEvent,
  type AdminMe,
  type AdminOverview,
  type AdminUserDetail,
  EVENT_LABELS,
  describe,
  errorLabel,
  labelOf,
} from "./adminTypes";

type Tab = "overview" | "users" | "activity" | "admins";
const TABS: { id: Tab; label: string; superOnly?: boolean }[] = [
  { id: "overview", label: "Aperçu" },
  { id: "users", label: "Utilisateurs" },
  { id: "activity", label: "Activité" },
  { id: "admins", label: "Administrateurs", superOnly: true },
];

const dateFmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric" });
const dateTimeFmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const timeFmt = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" });
const dayFmt = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" });
const shortDayFmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" });

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

const daysSince = (iso: string | null) => (iso ? (Date.now() - new Date(iso).getTime()) / 86400000 : Infinity);
const initials = (email: string | null) => (email ?? "?").slice(0, 2).toUpperCase();
const providerName = (p: string) => (p === "google.com" ? "Google" : p === "password" ? "Email" : p);
const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);

const card = "rounded-2xl border border-line bg-paper p-5 shadow-[0_1px_0_rgba(60,40,20,0.03)] sm:p-6";

// --- Petits éléments ------------------------------------------------------------

function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "ok" | "warn" | "off" }) {
  const styles = {
    neutral: "bg-stone-100 text-stone-700",
    ok: "bg-forest/10 text-forest",
    warn: "bg-accent-soft text-accent-dark",
    off: "bg-stone-100 text-stone-400",
  };
  return <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${styles[tone]}`}>{children}</span>;
}

function Avatar({ email, size = "md" }: { email: string | null; size?: "md" | "lg" }) {
  return (
    <span
      aria-hidden
      className={`flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent to-[#E07B39] font-semibold text-white ${
        size === "lg" ? "h-14 w-14 text-lg" : "h-10 w-10 text-sm"
      }`}
    >
      {initials(email)}
    </span>
  );
}

function Sparkline({ values, className = "" }: { values: number[]; className?: string }) {
  const w = 120;
  const h = 36;
  const max = Math.max(1, ...values);
  const step = w / Math.max(1, values.length - 1);
  const pts = values.map((v, i) => `${(i * step).toFixed(1)},${(h - 3 - (v / max) * (h - 8)).toFixed(1)}`);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={className} preserveAspectRatio="none" aria-hidden>
      <polygon points={`0,${h} ${pts.join(" ")} ${w},${h}`} className="fill-accent/10" />
      <polyline points={pts.join(" ")} fill="none" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" className="stroke-accent" />
    </svg>
  );
}

function Stat({ label, value, hint, trend }: { label: string; value: number | string; hint?: string; trend?: number[] }) {
  return (
    <div className={`${card} flex flex-col justify-between`}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-stone-500">{label}</p>
        {trend && <Sparkline values={trend} className="h-9 w-24 shrink-0" />}
      </div>
      <div>
        <p className="mt-3 font-serif text-5xl font-medium leading-none tracking-tight">{value}</p>
        {hint && <p className="mt-2 text-sm text-stone-500">{hint}</p>}
      </div>
    </div>
  );
}

function Loading() {
  return (
    <div className="space-y-4" aria-busy>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="skeleton h-36 rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="skeleton h-72 rounded-2xl" />
        <div className="skeleton h-72 rounded-2xl" />
      </div>
    </div>
  );
}

function ErrorBox({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="rounded-2xl border border-accent/30 bg-accent-soft/60 p-5 text-base text-accent-dark">
      {message}{" "}
      <button onClick={onRetry} className="font-semibold underline underline-offset-4">
        Réessayer
      </button>
    </div>
  );
}

function SectionTitle({ title, hint, right }: { title: string; hint?: string; right?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="font-serif text-2xl font-medium tracking-tight">{title}</h2>
        {hint && <p className="mt-1 text-sm text-stone-500">{hint}</p>}
      </div>
      {right}
    </div>
  );
}

// --- Aperçu --------------------------------------------------------------------

function SignupsChart({ data }: { data: AdminOverview["signups_by_day"] }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(3, ...data.map((d) => d.count));
  const w = 600;
  const h = 150;
  const left = 22;
  const bar = (w - left) / data.length;
  const ticks = [0, Math.round(max / 2), max];
  const active = hover !== null ? data[hover] : null;

  return (
    <div className="relative">
      <div className="mb-2 h-5 text-sm text-stone-600" aria-live="polite">
        {active ? (
          <>
            <strong className="text-ink">{active.count}</strong> inscription{active.count > 1 ? "s" : ""} le {shortDayFmt.format(new Date(active.day))}
          </>
        ) : (
          <span className="text-stone-400">Survole une barre pour voir le détail.</span>
        )}
      </div>
      <svg viewBox={`0 0 ${w} ${h + 22}`} className="w-full" role="img" aria-label="Inscriptions par jour sur 30 jours">
        {ticks.map((t) => {
          const y = h - (t / max) * h;
          return (
            <g key={t}>
              <line x1={left} x2={w} y1={y} y2={y} className="stroke-line" strokeDasharray={t ? "3 4" : undefined} />
              <text x={0} y={y + 4} className="fill-stone-400 text-[10px]">
                {t}
              </text>
            </g>
          );
        })}
        {data.map((d, i) => {
          const bh = (d.count / max) * h;
          const isToday = i === data.length - 1;
          return (
            <g key={d.day} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} onFocus={() => setHover(i)} onBlur={() => setHover(null)} tabIndex={0}>
              <rect x={left + i * bar} y={0} width={bar} height={h} fill="transparent" />
              <rect
                x={left + i * bar + 2.5}
                y={h - Math.max(bh, 2)}
                width={bar - 5}
                height={Math.max(bh, 2)}
                rx={3}
                className={d.count ? (hover === i || isToday ? "fill-accent-dark" : "fill-accent") : "fill-line"}
              />
            </g>
          );
        })}
        <text x={left} y={h + 16} className="fill-stone-500 text-[11px]">
          {data[0] && shortDayFmt.format(new Date(data[0].day))}
        </text>
        <text x={w} y={h + 16} textAnchor="end" className="fill-stone-500 text-[11px]">
          Aujourd&apos;hui
        </text>
      </svg>
    </div>
  );
}

function Donut({ ok, failed }: { ok: number; failed: number }) {
  const total = ok + failed;
  const r = 42;
  const c = 2 * Math.PI * r;
  const share = total ? ok / total : 0;
  return (
    <div className="relative h-32 w-32 shrink-0">
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" role="img" aria-label={`${pct(ok, total)} % de posts rédigés avec succès`}>
        <circle cx="50" cy="50" r={r} fill="none" strokeWidth="11" className="stroke-line" />
        {total > 0 && (
          <circle cx="50" cy="50" r={r} fill="none" strokeWidth="11" strokeLinecap="round" strokeDasharray={`${c * share} ${c}`} className="stroke-forest" />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-serif text-3xl font-medium leading-none">{total ? `${pct(ok, total)}%` : "-"}</span>
        <span className="mt-1 text-xs text-stone-500">réussite</span>
      </div>
    </div>
  );
}

function Overview({ onGoUsers }: { onGoUsers: () => void }) {
  const [data, setData] = useState<AdminOverview | null>(null);
  const [error, setError] = useState("");
  const load = useCallback(() => {
    adminApi<AdminOverview>("/overview")
      .then((r) => (setError(""), setData(r)))
      .catch((e) => setError(errorMessage(e)));
  }, []);
  useEffect(load, [load]);

  if (error) return <ErrorBox message={error} onRetry={load} />;
  if (!data) return <Loading />;

  const { users, funnel, generation_30d: gen } = data;
  const trend = data.signups_by_day.map((d) => d.count);
  const signups30 = trend.reduce((a, b) => a + b, 0);
  const steps = [
    { label: "Inscrits", value: funnel.signed_up },
    { label: "Clé IA ajoutée", value: funnel.with_key },
    { label: "Posts générés", value: funnel.generated },
    { label: "Agenda connecté", value: funnel.with_calendar },
  ];
  const errors = Object.entries(gen.errors).sort((a, b) => b[1] - a[1]);
  const maxError = Math.max(1, ...errors.map(([, n]) => n));

  // Points d'attention déduits des chiffres
  const alerts: { tone: "warn" | "info"; text: string; action?: () => void }[] = [];
  const noKey = funnel.signed_up - funnel.with_key;
  if (noKey > 0) alerts.push({ tone: "info", text: `${noKey} inscrit${noKey > 1 ? "s" : ""} sur ${funnel.signed_up} n'ont pas encore ajouté leur clé IA.`, action: onGoUsers });
  if (gen.errors.credit) alerts.push({ tone: "warn", text: `${gen.errors.credit} rédaction${gen.errors.credit > 1 ? "s" : ""} bloquée${gen.errors.credit > 1 ? "s" : ""} par un crédit RodiumAI épuisé sur 30 jours.` });
  if (gen.errors.key_rejected) alerts.push({ tone: "warn", text: `${gen.errors.key_rejected} clé${gen.errors.key_rejected > 1 ? "s" : ""} refusée${gen.errors.key_rejected > 1 ? "s" : ""} par RodiumAI sur 30 jours.` });
  if (users.total - users.verified > 0) alerts.push({ tone: "info", text: `${users.total - users.verified} adresse${users.total - users.verified > 1 ? "s" : ""} email non vérifiée${users.total - users.verified > 1 ? "s" : ""}.` });

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Utilisateurs" value={users.total} hint={`${users.new_7d} nouveau${users.new_7d > 1 ? "x" : ""} cette semaine`} trend={trend} />
        <Stat label="Actifs sur 7 jours" value={users.active_7d} hint={`${pct(users.active_7d, users.total)} % des comptes, ${users.active_30d} sur 30 jours`} />
        <Stat label="Générations sur 7 jours" value={gen.runs_7d} hint={`${gen.runs} sur 30 jours`} />
        <Stat label="Posts créés" value={data.posts_total} hint="Au total, tous comptes confondus" />
      </div>

      {alerts.length > 0 && (
        <section className={card} aria-label="Points d'attention">
          <SectionTitle title="À surveiller" />
          <ul className="mt-3 space-y-2">
            {alerts.map((a) => (
              <li key={a.text} className={`flex items-center gap-3 rounded-xl px-4 py-3 text-base ${a.tone === "warn" ? "bg-accent-soft/70 text-accent-dark" : "bg-cream text-stone-700"}`}>
                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${a.tone === "warn" ? "bg-accent" : "bg-stone-400"}`} aria-hidden />
                <span className="flex-1">{a.text}</span>
                {a.action && (
                  <button onClick={a.action} className="shrink-0 font-semibold text-accent underline underline-offset-4">
                    Voir
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className={card}>
          <SectionTitle title="Parcours" hint="Où s'arrêtent les nouveaux utilisateurs." />
          <ol className="mt-5 space-y-5">
            {steps.map((s, i) => {
              const share = pct(s.value, funnel.signed_up);
              const prev = i > 0 ? steps[i - 1].value : null;
              return (
                <li key={s.label}>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="flex items-center gap-3 text-base">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-cream text-xs font-semibold text-stone-600">{i + 1}</span>
                      {s.label}
                    </span>
                    <span className="text-base font-semibold">
                      {s.value} <span className="font-normal text-stone-500">({share} %)</span>
                    </span>
                  </div>
                  <div className="mt-2 h-3 overflow-hidden rounded-full bg-line/70">
                    <div className="h-full rounded-full bg-gradient-to-r from-accent to-[#E07B39] transition-[width] duration-700" style={{ width: `${Math.max(share, s.value ? 2 : 0)}%` }} />
                  </div>
                  {prev !== null && prev > 0 && (
                    <p className="mt-1.5 text-sm text-stone-500">{pct(s.value, prev)} % de l&apos;étape précédente</p>
                  )}
                </li>
              );
            })}
          </ol>
        </section>

        <section className={card}>
          <SectionTitle title="Inscriptions" hint="Par jour, sur les 30 derniers jours." right={<Badge tone="ok">{signups30} au total</Badge>} />
          <div className="mt-4">
            <SignupsChart data={data.signups_by_day} />
          </div>
        </section>
      </div>

      <section className={card}>
        <SectionTitle title="Génération sur 30 jours" hint="Posts rédigés par l'IA et raisons des échecs." />
        <div className="mt-5 grid items-center gap-8 md:grid-cols-[auto_1fr_1.2fr]">
          <div className="flex justify-center md:justify-start">
            <Donut ok={gen.posts_created} failed={gen.posts_failed} />
          </div>
          <dl className="grid grid-cols-3 gap-4 md:grid-cols-1">
            <div>
              <dt className="text-sm text-stone-500">Lancées</dt>
              <dd className="font-serif text-3xl font-medium">{gen.runs}</dd>
            </div>
            <div>
              <dt className="text-sm text-stone-500">Posts rédigés</dt>
              <dd className="font-serif text-3xl font-medium text-forest">{gen.posts_created}</dd>
            </div>
            <div>
              <dt className="text-sm text-stone-500">Posts en échec</dt>
              <dd className={`font-serif text-3xl font-medium ${gen.posts_failed ? "text-accent" : ""}`}>{gen.posts_failed}</dd>
            </div>
          </dl>
          <div>
            <p className="text-base font-medium">Causes d&apos;échec</p>
            {errors.length === 0 ? (
              <p className="mt-2 text-base text-stone-500">Aucune erreur sur la période.</p>
            ) : (
              <ul className="mt-3 space-y-3">
                {errors.map(([kind, n]) => (
                  <li key={kind}>
                    <div className="flex justify-between text-sm">
                      <span>{errorLabel(kind)}</span>
                      <span className="font-semibold">{n}</span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-line/70">
                      <div className="h-full rounded-full bg-accent" style={{ width: `${(n / maxError) * 100}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>
      <p className="text-sm text-stone-500">Données calculées à {fmtDateTime(data.generated_at)}.</p>
    </div>
  );
}

// --- Utilisateurs --------------------------------------------------------------

type Filter = "all" | "no_key" | "inactive" | "unverified";
const FILTERS: { id: Filter; label: string; test: (u: AdminAccount) => boolean }[] = [
  { id: "all", label: "Tous", test: () => true },
  { id: "no_key", label: "Sans clé IA", test: (u) => !u.has_key },
  { id: "inactive", label: "Inactifs 7 j et plus", test: (u) => daysSince(u.last_active_at) >= 7 },
  { id: "unverified", label: "Non vérifiés", test: (u) => !u.verified },
];

function UserBadges({ u }: { u: AdminAccount }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {u.providers.map((p) => (
        <Badge key={p}>{providerName(p)}</Badge>
      ))}
      {!u.verified && <Badge tone="warn">Non vérifié</Badge>}
      {u.disabled && <Badge tone="warn">Désactivé</Badge>}
    </div>
  );
}

function ActiveDot({ iso }: { iso: string | null }) {
  const d = daysSince(iso);
  const tone = d < 2 ? "bg-forest" : d < 7 ? "bg-[#E9B58F]" : "bg-stone-300";
  return <span className={`inline-block h-2 w-2 rounded-full ${tone}`} aria-hidden />;
}

function Users({ onOpen }: { onOpen: (uid: string) => void }) {
  const [users, setUsers] = useState<AdminAccount[] | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [applied, setApplied] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const load = useCallback((q: string, pageToken?: string | null) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (pageToken) params.set("page_token", pageToken);
    adminApi<{ users: AdminAccount[]; next_page_token: string | null }>(`/users?${params}`)
      .then((r) => {
        setError("");
        setUsers((prev) => (pageToken && prev ? [...prev, ...r.users] : r.users));
        setToken(r.next_page_token);
      })
      .catch((e) => setError(errorMessage(e)))
      .finally(() => setBusy(false));
  }, []);
  useEffect(() => load(applied), [load, applied]);

  const active = FILTERS.find((f) => f.id === filter) ?? FILTERS[0];
  const shown = useMemo(
    () => (users ?? []).filter((u) => active.test(u) && (!query || (u.email ?? "").toLowerCase().includes(query.toLowerCase()))),
    [users, active, query],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <form
          className="min-w-[14rem] flex-1"
          onSubmit={(e) => {
            e.preventDefault();
            setApplied(query.includes("@") ? query.trim() : "");
          }}
        >
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (!e.target.value) setApplied("");
            }}
            placeholder="Filtrer par adresse (Entrée pour chercher une adresse exacte)"
            aria-label="Rechercher un utilisateur"
            className="w-full rounded-xl border border-line bg-paper px-4 py-3 text-base shadow-sm focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/15"
          />
        </form>
        <p className="text-sm text-stone-500" aria-live="polite">
          {users ? `${shown.length} affiché${shown.length > 1 ? "s" : ""} sur ${users.length} chargé${users.length > 1 ? "s" : ""}` : ""}
        </p>
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Filtres">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            aria-pressed={filter === f.id}
            className={`min-h-10 rounded-full border px-4 text-sm font-medium transition ${
              filter === f.id ? "border-ink bg-ink text-cream" : "border-line bg-paper text-stone-600 hover:border-stone-300 hover:text-ink"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error && <ErrorBox message={error} onRetry={() => load(applied)} />}
      {users === null && !error && <div className="skeleton h-64 rounded-2xl" />}

      {users && (
        <>
          {/* Mobile : une carte par utilisateur */}
          <ul className="space-y-3 md:hidden">
            {shown.map((u) => (
              <li key={u.uid}>
                <button onClick={() => onOpen(u.uid)} className={`${card} flex w-full items-center gap-4 !p-4 text-left transition hover:border-stone-300`}>
                  <Avatar email={u.email} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-ink">{u.email ?? u.uid}</span>
                    <span className="mt-0.5 flex items-center gap-2 text-sm text-stone-500">
                      <ActiveDot iso={u.last_active_at} />
                      {ago(u.last_active_at)}
                    </span>
                    <span className="mt-2 flex flex-wrap gap-1.5">
                      <Badge tone={u.has_key ? "ok" : "off"}>{u.has_key ? "Clé IA" : "Sans clé"}</Badge>
                      {u.has_calendar && <Badge tone="ok">Agenda</Badge>}
                      <Badge>{u.posts} post{u.posts > 1 ? "s" : ""}</Badge>
                    </span>
                  </span>
                  <IconChevronRight className="h-4 w-4 shrink-0 text-stone-400" />
                </button>
              </li>
            ))}
          </ul>

          {/* Bureau : tableau */}
          <div className="hidden overflow-hidden rounded-2xl border border-line bg-paper md:block">
            <table className="w-full text-left text-base">
              <thead className="border-b border-line bg-cream/60 text-xs uppercase tracking-wider text-stone-500">
                <tr>
                  {["Utilisateur", "Inscrit le", "Dernière activité", "Clé IA", "Agenda", "Posts"].map((h) => (
                    <th key={h} className="px-4 py-3 font-semibold">
                      {h}
                    </th>
                  ))}
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {shown.map((u) => (
                  <tr key={u.uid} onClick={() => onOpen(u.uid)} className="group cursor-pointer border-b border-line/70 transition last:border-0 hover:bg-cream/70">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar email={u.email} />
                        <div className="min-w-0">
                          <button onClick={() => onOpen(u.uid)} className="block max-w-[18rem] truncate text-left font-medium text-ink group-hover:text-accent">
                            {u.email ?? u.uid}
                          </button>
                          <UserBadges u={u} />
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-stone-600">{fmtDate(u.created_at)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-stone-600">
                      <span className="inline-flex items-center gap-2">
                        <ActiveDot iso={u.last_active_at} />
                        {ago(u.last_active_at)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={u.has_key ? "ok" : "off"}>{u.has_key ? "Oui" : "Non"}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={u.has_calendar ? "ok" : "off"}>{u.has_calendar ? "Oui" : "Non"}</Badge>
                    </td>
                    <td className="px-4 py-3 text-lg font-semibold">{u.posts}</td>
                    <td className="pr-4 text-stone-400 transition group-hover:translate-x-0.5 group-hover:text-accent">
                      <IconChevronRight className="h-4 w-4" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {shown.length === 0 && <p className="rounded-2xl border border-dashed border-line py-10 text-center text-stone-500">Aucun utilisateur ne correspond.</p>}
        </>
      )}

      {token && !applied && (
        <button
          onClick={() => (setBusy(true), load(applied, token))}
          disabled={busy}
          className="min-h-11 rounded-full border border-stone-300 bg-white px-6 text-base font-medium hover:bg-stone-50 disabled:opacity-60"
        >
          {busy ? "Chargement..." : "Charger plus d'utilisateurs"}
        </button>
      )}
    </div>
  );
}

// --- Activité ------------------------------------------------------------------

const EVENT_TONE: Record<string, string> = {
  signup: "bg-forest",
  generation: "bg-accent",
  key_saved: "bg-[#E9B58F]",
  key_removed: "bg-stone-400",
  calendar_connected: "bg-forest",
  calendar_disconnected: "bg-stone-400",
};

function EventRow({ e, showUser, onOpen }: { e: AdminEvent; showUser?: boolean; onOpen?: (uid: string) => void }) {
  const { text, bad } = describe(e);
  return (
    <li className={`flex gap-4 px-4 py-3.5 ${bad ? "bg-accent-soft/40" : ""}`}>
      <span className="flex w-12 shrink-0 flex-col items-end pt-0.5 text-sm tabular-nums text-stone-500">{e.at ? timeFmt.format(new Date(e.at)) : ""}</span>
      <span className="relative mt-2 flex shrink-0 flex-col items-center" aria-hidden>
        <span className={`h-2.5 w-2.5 rounded-full ${bad ? "bg-accent" : (EVENT_TONE[e.type] ?? "bg-stone-300")}`} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-base">
          <span className="font-medium">{labelOf(e.type)}</span>
          {bad && <Badge tone="warn">Erreur</Badge>}
        </p>
        {text && <p className={`mt-0.5 text-sm ${bad ? "text-accent-dark" : "text-stone-600"}`}>{text}</p>}
        {showUser && e.uid && (
          <button onClick={() => onOpen?.(e.uid as string)} className="mt-1 inline-flex min-h-7 max-w-full items-center truncate text-sm font-medium text-stone-700 underline-offset-4 hover:text-accent hover:underline">
            {e.email ?? e.uid}
          </button>
        )}
      </div>
    </li>
  );
}

function groupByDay(events: AdminEvent[]): { day: string; label: string; items: AdminEvent[] }[] {
  const groups: { day: string; label: string; items: AdminEvent[] }[] = [];
  for (const e of events) {
    if (!e.at) continue;
    const d = new Date(e.at);
    const key = d.toLocaleDateString("fr-CA");
    const last = groups[groups.length - 1];
    if (last && last.day === key) last.items.push(e);
    else groups.push({ day: key, label: dayFmt.format(d), items: [e] });
  }
  return groups;
}

function EventList({ events, showUser, onOpen }: { events: AdminEvent[]; showUser?: boolean; onOpen?: (uid: string) => void }) {
  return (
    <div className="space-y-5">
      {groupByDay(events).map((g) => (
        <section key={g.day}>
          <h3 className="mb-2 px-1 text-sm font-semibold capitalize text-stone-500">{g.label}</h3>
          <ul className="divide-y divide-line/70 overflow-hidden rounded-2xl border border-line bg-paper">
            {g.items.map((e) => (
              <EventRow key={e.id} e={e} showUser={showUser} onOpen={onOpen} />
            ))}
          </ul>
        </section>
      ))}
    </div>
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
    adminApi<{ events: AdminEvent[] }>(`/events?${params}`)
      .then((r) => (setError(""), setEvents(r.events)))
      .catch((e) => setError(errorMessage(e)));
  }, [type, errorsOnly]);
  useEffect(load, [load]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          aria-label="Type d'événement"
          className="min-h-11 rounded-xl border border-line bg-paper px-4 text-base shadow-sm focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/15"
        >
          <option value="">Tous les événements</option>
          {Object.entries(EVENT_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <button
          onClick={() => setErrorsOnly((v) => !v)}
          aria-pressed={errorsOnly}
          className={`min-h-11 rounded-full border px-5 text-sm font-medium transition ${
            errorsOnly ? "border-accent bg-accent text-white" : "border-line bg-paper text-stone-600 hover:border-stone-300 hover:text-ink"
          }`}
        >
          Erreurs seulement
        </button>
        <button onClick={load} className="min-h-11 rounded-full px-4 text-base font-medium text-accent hover:bg-white">
          Actualiser
        </button>
      </div>
      {error && <ErrorBox message={error} onRetry={load} />}
      {events === null && !error && <div className="skeleton h-48 rounded-2xl" />}
      {events && events.length === 0 && <p className="rounded-2xl border border-dashed border-line py-10 text-center text-stone-500">Aucun événement pour ce filtre.</p>}
      {events && events.length > 0 && <EventList events={events} showUser onOpen={onOpen} />}
    </div>
  );
}

// --- Détail d'un utilisateur ---------------------------------------------------

function Tile({ label, value, tone }: { label: string; value: number; tone?: "ok" | "accent" }) {
  return (
    <div className="rounded-xl bg-cream px-3 py-3 text-center">
      <p className={`font-serif text-3xl font-medium leading-none ${tone === "ok" ? "text-forest" : tone === "accent" ? "text-accent" : ""}`}>{value}</p>
      <p className="mt-1.5 text-xs text-stone-500">{label}</p>
    </div>
  );
}

function CheckRow({ label, on }: { label: string; on: boolean }) {
  return (
    <li className="flex items-center gap-3 text-base">
      <span className={`flex h-6 w-6 items-center justify-center rounded-full ${on ? "bg-forest text-white" : "border border-line bg-paper text-transparent"}`}>
        <IconCheck className="h-3.5 w-3.5" />
      </span>
      <span className={on ? "text-ink" : "text-stone-500"}>{label}</span>
    </li>
  );
}

function UserDrawer({ uid, onClose }: { uid: string; onClose: () => void }) {
  const [u, setU] = useState<AdminUserDetail | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    adminApi<AdminUserDetail>(`/users/${encodeURIComponent(uid)}`).then(setU).catch((e) => setError(errorMessage(e)));
  }, [uid]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const steps = u
    ? ([
        ["Profil renseigné", u.setup.profile_filled],
        ["Thèmes choisis", u.setup.themes],
        ["Période définie", u.setup.period],
        ["Style analysé", u.setup.style_analyzed],
        ["Clé IA enregistrée", u.has_key],
        ["Agenda connecté", u.has_calendar],
      ] as [string, boolean][])
    : [];
  const done = steps.filter(([, on]) => on).length;

  return (
    <div className="fixed inset-0 z-40" role="dialog" aria-modal aria-label="Détail de l'utilisateur">
      <button className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]" onClick={onClose} aria-label="Fermer" />
      <aside className="slide-in-right absolute inset-y-0 right-0 flex w-full max-w-xl flex-col overflow-y-auto bg-cream shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center gap-4 border-b border-line bg-cream/95 px-6 py-5 backdrop-blur">
          <Avatar email={u?.email ?? null} size="lg" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">Utilisateur</p>
            <h2 className="truncate font-serif text-2xl font-medium">{u?.email ?? (error ? "Erreur" : "Chargement...")}</h2>
            {u && (
              <div className="mt-1.5">
                <UserBadges u={{ ...u, posts: u.posts.total }} />
              </div>
            )}
          </div>
          <button onClick={onClose} aria-label="Fermer" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full hover:bg-white">
            <IconClose className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 px-6 py-6">
          {error && <ErrorBox message={error} onRetry={() => location.reload()} />}
          {!u && !error && <div className="skeleton h-56 rounded-2xl" />}
          {u && (
            <>
              <dl className="grid grid-cols-2 gap-4 rounded-2xl border border-line bg-paper p-5 text-base">
                <div>
                  <dt className="text-sm text-stone-500">Inscrit le</dt>
                  <dd className="font-medium">{fmtDate(u.created_at)}</dd>
                </div>
                <div>
                  <dt className="text-sm text-stone-500">Dernière activité</dt>
                  <dd className="flex items-center gap-2 font-medium">
                    <ActiveDot iso={u.last_active_at} />
                    {ago(u.last_active_at)}
                  </dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-sm text-stone-500">Identifiant</dt>
                  <dd className="break-all font-mono text-xs text-stone-600">{u.uid}</dd>
                </div>
              </dl>

              <section className={card}>
                <SectionTitle title="Posts" hint={`${u.examples} exemple${u.examples > 1 ? "s" : ""} enregistré${u.examples > 1 ? "s" : ""}`} />
                <div className="mt-4 grid grid-cols-4 gap-2">
                  <Tile label="Total" value={u.posts.total} />
                  <Tile label="Brouillons" value={u.posts.draft ?? 0} />
                  <Tile label="Programmés" value={u.posts.scheduled ?? 0} tone="accent" />
                  <Tile label="Publiés" value={u.posts.published ?? 0} tone="ok" />
                </div>
              </section>

              <section className={card}>
                <SectionTitle title="Étapes franchies" right={<Badge tone={done === steps.length ? "ok" : "neutral"}>{done} sur {steps.length}</Badge>} />
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-line/70">
                  <div className="h-full rounded-full bg-forest transition-[width] duration-700" style={{ width: `${pct(done, steps.length)}%` }} />
                </div>
                <ul className="mt-4 grid gap-y-3 sm:grid-cols-2">
                  {steps.map(([label, on]) => (
                    <CheckRow key={label} label={label} on={on} />
                  ))}
                </ul>
                <p className="mt-4 text-xs leading-relaxed text-stone-500">Oui ou non seulement : jamais le contenu du profil, des posts ou des clés.</p>
              </section>

              <section>
                <h3 className="mb-3 font-serif text-xl font-medium">Traces d&apos;activité</h3>
                {u.events.length === 0 ? (
                  <p className="rounded-2xl border border-dashed border-line py-8 text-center text-stone-500">Aucune activité enregistrée.</p>
                ) : (
                  <EventList events={u.events} />
                )}
              </section>
            </>
          )}
        </div>
      </aside>
    </div>
  );
}

// --- Page ----------------------------------------------------------------------

function Splash() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="skeleton h-10 w-48" />
    </main>
  );
}

function Notice({ title, children, actions }: { title: string; children: React.ReactNode; actions: React.ReactNode }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Logo compact href="/" />
        </div>
        <div className="rounded-3xl border border-line bg-paper p-8 text-center shadow-xl shadow-ink/5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">Espace admin</p>
          <h1 className="mt-3 font-serif text-3xl font-medium leading-tight tracking-tight">{title}</h1>
          <div className="mt-3 text-base leading-relaxed text-stone-600">{children}</div>
          <div className="mt-6 flex flex-col items-center gap-1">{actions}</div>
        </div>
      </div>
    </main>
  );
}

const logOut = () => (forgetAdminSession(), signOut(firebaseAuth()));
const linkBtn = "inline-flex min-h-11 items-center rounded-full px-5 text-base font-medium text-stone-600 hover:bg-cream hover:text-ink";

function AdminApp({ email }: { email: string }) {
  const router = useRouter();
  const [state, setState] = useState<"checking" | "denied" | "error" | "code" | "ok">("checking");
  const [me, setMe] = useState<AdminMe | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [openUid, setOpenUid] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const check = useCallback(() => {
    adminApi<AdminMe>("/me")
      .then((r) => (setMe(r), setState(r.session ? "ok" : "code")))
      .catch((e) => setState(e instanceof ApiError && e.status === 404 ? "denied" : "error")); // 404 : compte non autorisé
  }, []);
  useEffect(check, [check]);

  // Le serveur a refusé la session (nouvelle connexion, expiration) : retour à l'écran du code.
  useEffect(() => {
    const back = () => setState("code");
    window.addEventListener(ADMIN_SESSION_EXPIRED, back);
    return () => window.removeEventListener(ADMIN_SESSION_EXPIRED, back);
  }, []);

  if (state === "denied") {
    return (
      <Notice
        title="Accès non autorisé"
        actions={
          <>
            <button onClick={logOut} className="min-h-11 rounded-full bg-ink px-6 text-base font-semibold text-cream hover:bg-accent">
              Changer de compte
            </button>
            <Link href="/dashboard" className={linkBtn}>
              Retour à mon espace
            </Link>
          </>
        }
      >
        Le compte <strong className="break-all text-ink">{email}</strong> n&apos;a pas accès à l&apos;espace admin. Si c&apos;est le bon compte, vérifie que son adresse email est
        confirmée, puis reconnecte-toi.
      </Notice>
    );
  }
  if (state === "error") {
    return (
      <Notice
        title="Connexion impossible"
        actions={
          <>
            <button onClick={() => (setState("checking"), check())} className="min-h-11 rounded-full bg-ink px-6 text-base font-semibold text-cream hover:bg-accent">
              Réessayer
            </button>
            <button onClick={logOut} className={linkBtn}>
              Changer de compte
            </button>
          </>
        }
      >
        Le serveur n&apos;a pas répondu. Réessaie dans un instant.
      </Notice>
    );
  }
  if (state === "code" && me) {
    return <AdminCodeGate email={me.email} onVerified={(role) => (setMe({ ...me, role, session: true }), setState("ok"))} />;
  }
  if (state === "checking" || !me) return <Splash />;

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-line bg-cream/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-1 px-6 py-3">
          <div className="flex items-center gap-3">
            <Logo compact href="/dashboard" />
            <span className="rounded-full bg-ink px-3 py-1 text-xs font-semibold uppercase tracking-wider text-cream">{me.role === "superadmin" ? "Super admin" : "Admin"}</span>
          </div>
          <div className="flex items-center gap-1 text-base">
            <span className="hidden truncate pr-3 text-sm text-stone-500 md:block">{me.email}</span>
            <button onClick={() => setRefreshKey((k) => k + 1)} className="min-h-11 rounded-full px-4 font-medium text-accent hover:bg-white">
              Actualiser
            </button>
            <Link href="/dashboard" className="inline-flex min-h-11 items-center rounded-full px-4 font-medium text-stone-600 hover:bg-white hover:text-ink">
              Mon espace
            </Link>
            <button
              onClick={() => (forgetAdminSession(), router.push("/dashboard"))}
              className="min-h-11 rounded-full px-4 font-medium text-stone-600 hover:bg-white hover:text-ink"
              title="Efface la session admin : un nouveau code sera demandé"
            >
              Verrouiller
            </button>
            <button onClick={logOut} className="min-h-11 rounded-full px-4 font-medium text-stone-600 hover:bg-white hover:text-ink">
              Déconnexion
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 pb-16 pt-8">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <h1 className="font-serif text-4xl font-medium tracking-tight sm:text-5xl">
              Vue d&apos;ensemble <em className="text-accent">de LinkP</em>
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-relaxed text-stone-600">
              Comptes, activité et erreurs. Aucun contenu d&apos;utilisateur (posts, profil, clés) n&apos;est accessible ici.
            </p>
          </div>
        </div>

        <div role="tablist" className="mt-7 flex gap-1 rounded-full border border-line bg-paper p-1 shadow-sm sm:w-fit">
          {TABS.filter((t) => !t.superOnly || me.role === "superadmin").map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`min-h-11 flex-1 rounded-full px-6 text-base font-medium transition sm:flex-none ${
                tab === t.id ? "bg-accent text-white shadow-md shadow-accent/25" : "text-stone-600 hover:text-ink"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="mt-6" key={`${tab}-${refreshKey}`}>
          {tab === "overview" && <Overview onGoUsers={() => setTab("users")} />}
          {tab === "users" && <Users onOpen={setOpenUid} />}
          {tab === "activity" && <Activity onOpen={setOpenUid} />}
          {tab === "admins" && me.role === "superadmin" && <AdminsPanel currentEmail={me.email} />}
        </div>
      </main>

      {openUid && <UserDrawer uid={openUid} onClose={() => setOpenUid(null)} />}
    </div>
  );
}

export default function AdminDashboard() {
  const { user, loading } = useAuth();
  if (loading) return <Splash />;
  if (!user) return <AdminLogin />;
  return <AdminApp key={user.uid} email={user.email ?? ""} />;
}
