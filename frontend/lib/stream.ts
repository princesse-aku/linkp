import { AI_KEY_PROBLEM, ApiError, detailOf } from "./api";
import { firebaseAuth } from "./firebase";
import type { GenerateEvent } from "./types";

// Lance la génération des posts et appelle onEvent pour chaque événement reçu, au fur et à mesure.
// Le serveur envoie une ligne JSON par événement (voir POST /api/posts/generate/stream).
export async function streamGenerate(onEvent: (e: GenerateEvent) => void, signal?: AbortSignal): Promise<void> {
  const token = await firebaseAuth().currentUser?.getIdToken();
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/posts/generate/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ replace_drafts: true }),
    signal,
  });

  // Vérifications refusées avant le flux (clé absente, pas de thème…) : erreur HTTP classique.
  if (!res.ok) {
    if (res.status === 428 || res.status === 424) window.dispatchEvent(new Event(AI_KEY_PROBLEM));
    throw new ApiError(detailOf(await res.json().catch(() => null), res.status), res.status);
  }
  if (!res.body) throw new Error("Le navigateur ne permet pas de lire la réponse en continu.");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  const flush = (final: boolean) => {
    const lines = buffer.split("\n");
    buffer = final ? "" : (lines.pop() ?? "");
    for (const line of lines) if (line.trim()) onEvent(JSON.parse(line) as GenerateEvent);
  };

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    flush(false);
  }
  buffer += decoder.decode();
  flush(true);
}
