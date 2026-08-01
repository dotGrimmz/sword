-- Quizzes: generated/edited quiz content + future assignment/attempt tables.

create table if not exists public.quizzes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  status text not null default 'draft'
    check (status in ('draft', 'published', 'archived')),
  translation_code text not null default 'WEB',
  book text not null,
  start_chapter integer not null check (start_chapter > 0),
  start_verse integer not null check (start_verse > 0),
  end_chapter integer not null check (end_chapter > 0),
  end_verse integer not null check (end_verse > 0),
  generation_config jsonb not null default '{}'::jsonb,
  questions jsonb not null default '[]'::jsonb,
  question_count integer not null default 0 check (question_count >= 0),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (
    end_chapter > start_chapter
    or (end_chapter = start_chapter and end_verse >= start_verse)
  )
);

create index if not exists quizzes_status_idx
  on public.quizzes (status);

create index if not exists quizzes_book_range_idx
  on public.quizzes (book, start_chapter, start_verse);

create index if not exists quizzes_created_at_idx
  on public.quizzes (created_at desc);

-- Future: assign a quiz to a member.
create table if not exists public.quiz_assignments (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes (id) on delete cascade,
  assignee_id uuid not null references public.profiles (id) on delete cascade,
  assigned_by uuid references auth.users (id) on delete set null,
  status text not null default 'assigned'
    check (status in ('assigned', 'completed', 'cancelled')),
  due_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists quiz_assignments_quiz_idx
  on public.quiz_assignments (quiz_id);

create index if not exists quiz_assignments_assignee_idx
  on public.quiz_assignments (assignee_id, status);

-- Future: scored attempts for leaderboards.
create table if not exists public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  assignment_id uuid references public.quiz_assignments (id) on delete set null,
  score integer check (score is null or score >= 0),
  max_score integer check (max_score is null or max_score >= 0),
  answers jsonb not null default '[]'::jsonb,
  started_at timestamptz not null default timezone('utc', now()),
  completed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists quiz_attempts_quiz_idx
  on public.quiz_attempts (quiz_id);

create index if not exists quiz_attempts_user_idx
  on public.quiz_attempts (user_id, completed_at desc);

create index if not exists quiz_attempts_assignment_idx
  on public.quiz_attempts (assignment_id);

alter table public.quizzes enable row level security;
alter table public.quiz_assignments enable row level security;
alter table public.quiz_attempts enable row level security;

drop policy if exists quizzes_public_select on public.quizzes;
create policy quizzes_public_select
on public.quizzes
for select
using (status = 'published');

drop policy if exists quizzes_admin_all on public.quizzes;
create policy quizzes_admin_all
on public.quizzes
for all
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

drop policy if exists quiz_assignments_own_select on public.quiz_assignments;
create policy quiz_assignments_own_select
on public.quiz_assignments
for select
using (assignee_id = auth.uid());

drop policy if exists quiz_assignments_admin_all on public.quiz_assignments;
create policy quiz_assignments_admin_all
on public.quiz_assignments
for all
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

drop policy if exists quiz_attempts_own_select on public.quiz_attempts;
create policy quiz_attempts_own_select
on public.quiz_attempts
for select
using (user_id = auth.uid());

drop policy if exists quiz_attempts_admin_all on public.quiz_attempts;
create policy quiz_attempts_admin_all
on public.quiz_attempts
for all
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

comment on table public.quizzes is
  'Admin-authored scripture quizzes (AI-generated drafts, editable).';
comment on table public.quiz_assignments is
  'Future: assign a quiz to a member for scoring.';
comment on table public.quiz_attempts is
  'Future: member attempts + scores for leaderboards.';
