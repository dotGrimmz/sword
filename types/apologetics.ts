export interface Evidence {
  id: string;
  topic_id: string;
  summary: string | null;
  kind: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface CounterSourceLink {
  id: string;
  counter_id: string;
  source_id: string;
  created_at?: string | null;
  sources?: Source | null;
}

export interface Counter {
  id: string;
  topic_id: string;
  objection: string | null;
  rebuttal: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  counter_sources?: CounterSourceLink[] | null;
}

export interface Source {
  id: string;
  type: string | null;
  author: string | null;
  work: string | null;
  year_or_era?: string | null;
  location?: string | null;
  url?: string | null;
  notes?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface TopicSourceLink {
  id: string;
  topic_id: string;
  source_id: string;
  created_at?: string | null;
  sources?: Source | null;
}

export interface Topic {
  id: string;
  title: string;
  objection?: string | null;
  claim?: string | null;
  summary?: string | null;
  difficulty?: string | null;
  est_minutes?: number | null;
  tags?: string[] | string | null;
  created_at?: string | null;
  updated_at?: string | null;
  evidence?: Evidence[] | null;
  counters?: Counter[] | null;
  topic_sources?: TopicSourceLink[] | null;
}

export interface PathTopicLink {
  id: string;
  path_id: string;
  topic_id: string;
  order?: number | null;
  order_index?: number | null;
  position?: number | null;
  sort_order?: number | null;
  rank?: number | null;
  created_at?: string | null;
  topics?: Topic | null;
}

export interface Path {
  id: string;
  title: string;
  subtitle?: string | null;
  description?: string | null;
  difficulty?: string | null;
  est_minutes?: number | null;
  tags?: string[] | string | null;
  created_at?: string | null;
  updated_at?: string | null;
  path_topics?: PathTopicLink[] | null;
}
