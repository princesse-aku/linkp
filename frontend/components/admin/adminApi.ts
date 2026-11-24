import { api, ApiError } from "@/lib/api";

// Session admin : remise par le serveur après saisie du code reçu par email, liée à la connexion en cours.
// Gardée dans sessionStorage (propre à l'onglet) : elle disparaît à la fermeture de l'onglet.
const KEY = "linkp:admin-session";
export const ADMIN_SESSION_EXPIRED = "linkp:admin-session-expired";

export const getAdminSession = (): string | null => {
  try {
    return sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
};

export const setAdminSession = (token: string) => {
  try {
    sessionStorage.setItem(KEY, token);
  } catch {
    /* navigation privée : la session ne survivra pas à un rechargement */
  }
};

export const clearAdminSession = () => {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* rien à effacer */
  }
};

let memoryToken: string | null = null;
export const rememberAdminSession = (token: string) => ((memoryToken = token), setAdminSession(token));
export const forgetAdminSession = () => ((memoryToken = null), clearAdminSession());

// Appel de l'API admin : ajoute la session et prévient l'interface quand le serveur la refuse.
export async function adminApi<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = memoryToken ?? getAdminSession();
  try {
    return await api<T>(`/admin${path}`, { ...init, headers: { ...(token ? { "X-Admin-Session": token } : {}), ...init.headers } });
  } catch (err) {
    if (err instanceof ApiError && err.status === 401 && err.message === "admin_session_required") {
      forgetAdminSession();
      window.dispatchEvent(new Event(ADMIN_SESSION_EXPIRED));
    }
    throw err;
  }
}
