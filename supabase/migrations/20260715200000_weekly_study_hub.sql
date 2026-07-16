-- Weekly Study Hub: evolve pre_reads + study_materials
alter table public.pre_reads
  add column if not exists title text,
  add column if not exists week_start date;

-- Backfill from existing daily visibility windows
update public.pre_reads
set week_start = (date_trunc('week', visible_from at time zone 'UTC'))::date
where week_start is null;

update public.pre_reads
set title = trim(both from coalesce(book, '') || ' ' || coalesce(chapter::text, ''))
where title is null or length(trim(title)) = 0;

create index if not exists pre_reads_week_start_idx
  on public.pre_reads(week_start);

create table if not exists public.study_materials (
  id uuid primary key default gen_random_uuid(),
  pre_read_id uuid not null references public.pre_reads(id) on delete cascade,
  title text not null,
  kind text not null check (kind in ('link', 'file')),
  url text not null,
  storage_path text,
  mime_type text,
  byte_size int,
  sort_order int not null default 0,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists study_materials_pre_read_idx
  on public.study_materials(pre_read_id, sort_order);

alter table public.study_materials enable row level security;

-- Member select: parent study is published, not cancelled, and in the current week
-- (America/New_York) OR still within the legacy visible window.
drop policy if exists study_materials_auth_select on public.study_materials;
create policy study_materials_auth_select
on public.study_materials
for select
using (
  auth.uid() is not null
  and exists (
    select 1
    from public.pre_reads pr
    where pr.id = study_materials.pre_read_id
      and pr.published
      and not pr.is_cancelled
      and (
        (
          pr.week_start is not null
          and pr.week_start = (
            date_trunc(
              'week',
              timezone('America/New_York', now())
            )
          )::date
        )
        or timezone('utc', now()) between pr.visible_from and pr.visible_until
      )
  )
);

drop policy if exists study_materials_admin_all on public.study_materials;
create policy study_materials_admin_all
on public.study_materials
for all
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

-- Broaden pre_reads member select to include week_start current week
drop policy if exists pre_reads_auth_select on public.pre_reads;
create policy pre_reads_auth_select
on public.pre_reads
for select
using (
  auth.uid() is not null
  and published
  and not is_cancelled
  and (
    (
      week_start is not null
      and week_start = (
        date_trunc('week', timezone('America/New_York', now()))
      )::date
    )
    or timezone('utc', now()) between visible_from and visible_until
  )
);

-- Storage bucket must be created in Supabase dashboard (or via storage API):
--   name: study-materials (or NEXT_PUBLIC_SUPABASE_STUDY_BUCKET)
--   public: true (V1) OR private + signed URLs later
-- Policies: authenticated upload/delete under {pre_read_id}/*; public read if public bucket
