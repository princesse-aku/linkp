import { supabase } from "./supabase";

export type Profile = {
  full_name: string;
  job_title: string;
  industry: string;
  bio: string;
  language: string;
  tones: string[];
  themes: string[];
  start_date: string | null;
  end_date: string | null;
  posts_per_week: number;
  publish_time: string | null;
};

export type Example = { id: number; content: string; created_at: string };

export type Post = {
  id: number;
  theme: string;
  content: string;
  scheduled_for: string | null;
  status: string;
};

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { data } = await supabase().auth.getSession();
  const token = data.session?.access_token;
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...init.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.detail ?? `Erreur ${res.status}`);
  }
  return res.status === 204 ? (undefined as T) : res.json();
}
