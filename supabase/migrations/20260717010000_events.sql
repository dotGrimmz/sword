-- Church events: series templates + concrete occurrences (public read when published).

create table if not exists public.event_series (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  location_type text not null default 'in_person'
    check (location_type in ('in_person', 'online', 'hybrid')),
  venue text,
  address text,
  join_url text,
  cover_url text,
  timezone text not null default 'America/New_York',
  status text not null default 'draft'
    check (status in ('draft', 'published', 'cancelled')),
  pre_read_id uuid references public.pre_reads (id) on delete set null,
  starts_at timestamptz not null,
  ends_at timestamptz,
  recurrence_frequency text not null default 'none'
    check (recurrence_frequency in ('none', 'weekly', 'monthly')),
  recurrence_interval integer not null default 1
    check (recurrence_interval >= 1),
  recurrence_weekdays integer[] default null,
  recurrence_end_type text not null default 'never'
    check (recurrence_end_type in ('never', 'until', 'count')),
  recurrence_until date,
  recurrence_count integer
    check (recurrence_count is null or recurrence_count >= 1),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists event_series_status_idx
  on public.event_series (status);

create index if not exists event_series_starts_at_idx
  on public.event_series (starts_at);

create table if not exists public.event_occurrences (
  id uuid primary key default gen_random_uuid(),
  series_id uuid not null references public.event_series (id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz,
  status text not null default 'scheduled'
    check (status in ('scheduled', 'cancelled')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (series_id, starts_at)
);

create index if not exists event_occurrences_starts_at_idx
  on public.event_occurrences (starts_at);

create index if not exists event_occurrences_series_starts_idx
  on public.event_occurrences (series_id, starts_at);

alter table public.event_series enable row level security;
alter table public.event_occurrences enable row level security;

-- Public + authenticated: published series that are not cancelled.
drop policy if exists event_series_public_select on public.event_series;
create policy event_series_public_select
on public.event_series
for select
using (status = 'published');

drop policy if exists event_series_admin_all on public.event_series;
create policy event_series_admin_all
on public.event_series
for all
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

-- Public: scheduled occurrences belonging to a published series.
drop policy if exists event_occurrences_public_select on public.event_occurrences;
create policy event_occurrences_public_select
on public.event_occurrences
for select
using (
  status = 'scheduled'
  and exists (
    select 1
    from public.event_series s
    where s.id = series_id
      and s.status = 'published'
  )
);

-- Admin: all occurrence rows (including cancelled) for management.
drop policy if exists event_occurrences_admin_all on public.event_occurrences;
create policy event_occurrences_admin_all
on public.event_occurrences
for all
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

comment on table public.event_series is
  'Event templates (single or recurring). RSVP deferred to v2.';
comment on table public.event_occurrences is
  'Concrete event dates; cancel one without killing the series.';
