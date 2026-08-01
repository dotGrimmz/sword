-- Reusable places for church events (park, study house, etc.).

create table if not exists public.event_locations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text not null,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists event_locations_name_idx
  on public.event_locations (name);

alter table public.event_series
  add column if not exists location_id uuid
    references public.event_locations (id) on delete set null;

create index if not exists event_series_location_id_idx
  on public.event_series (location_id);

alter table public.event_locations enable row level security;

-- Admin-only reads/writes. Public event pages use denormalized venue/address on series.
drop policy if exists event_locations_admin_all on public.event_locations;
create policy event_locations_admin_all
on public.event_locations
for all
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

comment on table public.event_locations is
  'Reusable event places; series.location_id links live, venue/address cached on series.';
