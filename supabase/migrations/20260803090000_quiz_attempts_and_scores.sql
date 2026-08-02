-- Attempt limits on quizzes + denormalized official scores for leaderboards.

alter table public.quizzes
  add column if not exists max_attempts integer not null default 3;

alter table public.quizzes
  drop constraint if exists quizzes_max_attempts_check;

alter table public.quizzes
  add constraint quizzes_max_attempts_check
  check (max_attempts >= 1 and max_attempts <= 20);

comment on column public.quizzes.max_attempts is
  'Max completed attempts per member for this quiz (default 3).';

create table if not exists public.quiz_scores (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  best_score integer not null check (best_score >= 0),
  max_score integer not null check (max_score > 0),
  best_percent numeric(5,2) not null check (best_percent >= 0 and best_percent <= 100),
  attempt_count integer not null default 1 check (attempt_count >= 1),
  best_attempt_id uuid references public.quiz_attempts (id) on delete set null,
  first_completed_at timestamptz not null,
  best_achieved_at timestamptz not null,
  finalized_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (quiz_id, user_id)
);

create index if not exists quiz_scores_leaderboard_idx
  on public.quiz_scores (quiz_id, best_score desc, best_achieved_at asc);

create index if not exists quiz_scores_user_idx
  on public.quiz_scores (user_id, updated_at desc);

alter table public.quiz_scores enable row level security;

drop policy if exists quiz_scores_own_select on public.quiz_scores;
create policy quiz_scores_own_select
on public.quiz_scores
for select
using (user_id = auth.uid());

drop policy if exists quiz_scores_admin_all on public.quiz_scores;
create policy quiz_scores_admin_all
on public.quiz_scores
for all
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

comment on table public.quiz_scores is
  'Official best score per member per quiz. Leaderboard source of truth; attempts remain history.';
