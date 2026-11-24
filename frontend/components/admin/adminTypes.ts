// Formes renvoyées par /api/admin. Aucune ne contient de contenu utilisateur : seulement des comptes, des compteurs et des événements.
export type AdminAccount = {
  uid: string;
  email: string | null;
  verified: boolean;
  disabled: boolean;
  providers: string[];
  created_at: string | null;
  last_active_at: string | null;
  has_key: boolean;
  has_calendar: boolean;
  posts: number;
};

export type AdminEvent = {
  id: string;
  uid: string | null;
  email?: string | null;
  type: string;
  at: string | null;
  meta: Record<string, unknown>;
};

export type AdminUserDetail = Omit<AdminAccount, "posts"> & {
  posts: { total: number; draft?: number; scheduled?: number; published?: number };
  examples: number;
  setup: { profile_filled: boolean; themes: boolean; period: boolean; style_analyzed: boolean };
  events: AdminEvent[];
};

export type AdminOverview = {
  generated_at: string;
  users: { total: number; verified: number; active_7d: number; active_30d: number; new_7d: number };
  funnel: { signed_up: number; with_key: number; generated: number; with_calendar: number };
  signups_by_day: { day: string; count: number }[];
  posts_total: number;
  generation_30d: { runs: number; runs_7d: number; posts_created: number; posts_failed: number; errors: Record<string, number> };
};

export type AdminRole = "admin" | "superadmin";
export type AdminMe = { email: string; role: AdminRole; session: boolean };
export type AdminMember = {
  email: string;
  role: AdminRole;
  removable: boolean;
  source: "config" | "database";
  added_by?: string | null;
  added_at?: string | null;
};

export const EVENT_LABELS: Record<string, string> = {
  admin_login: "Connexion admin",
  admin_login_failed: "Code admin refusé",
  admin_added: "Admin ajouté",
  admin_removed: "Admin retiré",
  signup: "Inscription",
  key_saved: "Clé IA enregistrée",
  key_removed: "Clé IA supprimée",
  style_analyzed: "Style analysé",
  themes_suggested: "Idées de thèmes",
  generation: "Génération de posts",
  post_retry: "Nouvel essai d'un post",
  post_regenerated: "Post réécrit",
  image_generated: "Image générée",
  calendar_connected: "Agenda connecté",
  calendar_disconnected: "Agenda déconnecté",
};

export const ERROR_LABELS: Record<string, string> = {
  credit: "Crédit épuisé",
  rate_limit: "Limite de requêtes",
  key_rejected: "Clé refusée",
  unreachable: "IA injoignable",
  bad_output: "Réponse inexploitable",
  other: "Autre erreur",
};

export const labelOf = (type: string) => EVENT_LABELS[type] ?? type;
export const errorLabel = (kind: string) => ERROR_LABELS[kind] ?? kind;

// Résumé court d'un événement, construit uniquement à partir de compteurs et de catégories d'erreur.
export function describe(e: AdminEvent): { text: string; bad: boolean } {
  const m = e.meta;
  const errors = (m.errors ?? {}) as Record<string, number>;
  const kinds = Object.entries(errors).map(([k, n]) => `${errorLabel(k)}${n > 1 ? ` x${n}` : ""}`);
  if (e.type === "generation") {
    const base = `${m.created ?? 0} sur ${m.total ?? 0} posts rédigés`;
    const fails = kinds.length ? ` (${kinds.join(", ")})` : "";
    return { text: base + fails + (m.fatal ? ", arrêtée" : ""), bad: Boolean(m.failed) || kinds.length > 0 };
  }
  if (e.type === "admin_login") return { text: m.role === "superadmin" ? "Superadmin" : "Admin", bad: false };
  if (e.type === "admin_login_failed") {
    const reasons: Record<string, string> = { wrong: "code incorrect", locked: "trop d'essais", expired: "code expiré", none: "aucun code en cours", format: "format invalide" };
    return { text: reasons[String(m.reason)] ?? "code refusé", bad: true };
  }
  if (e.type === "admin_added" || e.type === "admin_removed") return { text: String(m.target ?? ""), bad: false };
  if (m.ok === false) return { text: `Échec${m.error ? ` : ${errorLabel(String(m.error))}` : ""}`, bad: true };
  if (e.type === "style_analyzed") return { text: `${m.examples ?? 0} exemple(s) analysé(s)`, bad: false };
  if (e.type === "themes_suggested") return { text: `${m.count ?? 0} idée(s) proposée(s)`, bad: false };
  if (e.type === "signup") return { text: m.verified ? "Adresse déjà vérifiée" : "Adresse à vérifier", bad: false };
  return { text: "", bad: false };
}
