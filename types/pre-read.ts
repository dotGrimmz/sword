export type HostProfile = {
  id: string;
  username: string | null;
  avatar_url: string | null;
  stream_tagline: string | null;
  stream_url: string | null;
  is_host_active: boolean;
  role: "admin" | "host" | "user" | (string & {});
};

export type PreRead = {
  id: string;
  parent_id: string | null;
  book: string;
  chapter: number;
  verses_range: string | null;
  summary: string;
  memory_verse: string | null;
  reflection_questions: string[] | null;
  poll_question: string | null;
  poll_options: string[] | null;
  host_profile_id: string | null;
  host_profile?: HostProfile | null;
  stream_start_time: string | null;
  is_cancelled: boolean;
  visible_from: string;
  visible_until: string;
  published: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type PreReadPayload = {
  book: string;
  chapter: number;
  verses_range: string | null;
  summary: string;
  memory_verse: string | null;
  reflection_questions: string[];
  poll_question: string | null;
  poll_options: string[] | null;
  host_profile_id: string | null;
  stream_start_time: string | null;
  is_cancelled: boolean;
  visible_from: string;
  visible_until: string;
  published: boolean;
};
