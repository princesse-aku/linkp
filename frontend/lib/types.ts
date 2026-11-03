export type StyleAnalysis = {
  summary: string;
  tone_keywords: string[];
  typical_length: string;
  structure: string;
  vocabulary: string[];
  avoid: string[];
  examples_count: number;
  analyzed_at: string | null;
};

export type Profile = {
  full_name: string;
  job_title: string;
  industry: string;
  bio: string;
  language: "fr" | "en";
  timezone: string;
  tones: string[];
  themes: string[];
  start_date: string | null;
  end_date: string | null;
  posts_per_week: number;
  publish_time: string | null;
  email: string | null;
  style_analysis: StyleAnalysis | null;
};

export type Example = { id: string; content: string };

export type PostStatus = "draft" | "scheduled" | "published";

export type Post = {
  id: string;
  theme: string;
  content: string;
  scheduled_for: string | null;
  status: PostStatus;
  media_urls: string[];
  calendar_event_id: string | null;
};

export type Media = {
  id: string;
  url: string;
  filename: string;
  resource_type: string;
  bytes: number;
};

export type PostImageResult = { post: Post; media: Media };

export type AiKeyStatus = { configured: boolean; last4: string | null };

export type CalendarStatus = { configured: boolean; connected: boolean; email: string | null };

export type CalendarSync = { connected: boolean; synced: number; error: string | null };

export type GenerateResult = { posts: Post[]; calendar: CalendarSync };

// Événements envoyés par POST /posts/generate/stream
export type GenSlot = { index: number; theme: string; scheduled_for: string };
export type GenerateDone = { type: "done"; created: number; failed: number; calendar: CalendarSync };
export type GenerateEvent =
  | { type: "start"; total: number; slots: GenSlot[] }
  | { type: "post"; index: number; post: Post }
  | { type: "post_error"; index: number; message: string }
  | { type: "fatal"; status: number; message: string }
  | GenerateDone;

export const EMPTY_PROFILE: Profile = {
  full_name: "",
  job_title: "",
  industry: "",
  bio: "",
  language: "fr",
  timezone: "Europe/Paris",
  tones: [],
  themes: [],
  start_date: null,
  end_date: null,
  posts_per_week: 3,
  publish_time: null,
  email: null,
  style_analysis: null,
};
