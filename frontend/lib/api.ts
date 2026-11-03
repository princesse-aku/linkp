import { firebaseAuth } from "./firebase";

export const AI_KEY_PROBLEM = "linkp:ai-key-problem";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export function detailOf(body: unknown, status: number): string {
  const detail = (body as { detail?: unknown } | null)?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail) && detail[0]?.msg) return String(detail[0].msg); // erreur de validation FastAPI
  return `Erreur ${status}`;
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await firebaseAuth().currentUser?.getIdToken();
  const isForm = init.body instanceof FormData;
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api${path}`, {
    ...init,
    headers: {
      // Pour un FormData, le navigateur fixe lui-même le Content-Type (avec la frontière).
      ...(isForm || !init.body ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    // 428 : pas de clé RodiumAI, 424 : clé refusée. Le dashboard se met à jour.
    if (res.status === 428 || res.status === 424) window.dispatchEvent(new Event(AI_KEY_PROBLEM));
    throw new ApiError(detailOf(body, res.status), res.status);
  }
  return res.status === 204 ? (undefined as T) : res.json();
}

// Appel public (sans jeton) : mot de passe oublié.
export async function apiPublic<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new ApiError(detailOf(await res.json().catch(() => null), res.status), res.status);
  return res.json();
}

export const errorMessage = (err: unknown) => (err instanceof Error ? err.message : "Une erreur est survenue.");
