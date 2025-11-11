-- Migration: Pre-Read comments table + RLS
create table if not exists public.pre_read_comments (
  id uuid primary key default gen_random_uuid(),
  pre_read_id uuid not null references public.pre_reads(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  parent_id uuid references public.pre_read_comments(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists pre_read_comments_pre_read_id_idx
  on public.pre_read_comments(pre_read_id);

create index if not exists pre_read_comments_parent_id_idx
  on public.pre_read_comments(parent_id);

alter table public.pre_read_comments enable row level security;

drop policy if exists pre_read_comments_auth_select on public.pre_read_comments;
create policy pre_read_comments_auth_select
on public.pre_read_comments
for select
using (auth.uid() is not null);

drop policy if exists pre_read_comments_insert_self on public.pre_read_comments;
create policy pre_read_comments_insert_self
on public.pre_read_comments
for insert
with check (auth.uid() = user_id);

drop policy if exists pre_read_comments_delete_policy on public.pre_read_comments;
create policy pre_read_comments_delete_policy
on public.pre_read_comments
for delete
using (
  auth.uid() = user_id
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
);
