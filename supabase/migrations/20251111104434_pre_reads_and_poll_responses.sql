-- Migration: Create Pre-Read core tables
create extension if not exists "pgcrypto";

create table if not exists public.pre_reads (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.pre_reads(id) on delete set null,
  book text not null,
  chapter int not null check (chapter > 0),
  verses_range text,
  summary text not null,
  memory_verse text,
  reflection_questions jsonb not null default '[]'::jsonb,
  poll_question text,
  poll_options jsonb,
  host_profile_id uuid references public.profiles(id) on delete set null,
  stream_start_time timestamptz,
  is_cancelled boolean not null default false,
  visible_from timestamptz not null,
  visible_until timestamptz not null,
  published boolean not null default false,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.pre_read_poll_responses (
  id uuid primary key default gen_random_uuid(),
  pre_read_id uuid not null references public.pre_reads(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  option_index int not null check (option_index >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  unique (pre_read_id, user_id)
);

create index if not exists pre_reads_host_profile_id_idx
  on public.pre_reads(host_profile_id);

create index if not exists pre_read_poll_responses_pre_read_idx
  on public.pre_read_poll_responses(pre_read_id);

create index if not exists pre_read_poll_responses_user_idx
  on public.pre_read_poll_responses(user_id);
