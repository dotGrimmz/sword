-- Migration: Enable RLS + policies for Pre-Read tables
create or replace function public.is_admin(uid uuid)
returns boolean
language sql
stable
as $$
  select coalesce(
    exists (
      select 1
      from public.profiles p
      where p.id = uid
        and p.role = 'admin'
    ),
    false
  );
$$;

alter table public.pre_reads enable row level security;
alter table public.pre_read_poll_responses enable row level security;

drop policy if exists pre_reads_auth_select on public.pre_reads;
create policy pre_reads_auth_select
on public.pre_reads
for select
using (
  auth.uid() is not null
  and published
  and not is_cancelled
  and timezone('utc', now()) between visible_from and visible_until
);

drop policy if exists pre_reads_admin_select on public.pre_reads;
create policy pre_reads_admin_select
on public.pre_reads
for select
using (is_admin(auth.uid()));

drop policy if exists pre_reads_admin_write on public.pre_reads;
create policy pre_reads_admin_write
on public.pre_reads
for all
using (is_admin(auth.uid()))
with check (is_admin(auth.uid()));

drop policy if exists pre_read_poll_responses_insert_self on public.pre_read_poll_responses;
create policy pre_read_poll_responses_insert_self
on public.pre_read_poll_responses
for insert
with check (
  auth.uid() = user_id
);

drop policy if exists pre_read_poll_responses_owner_select on public.pre_read_poll_responses;
create policy pre_read_poll_responses_owner_select
on public.pre_read_poll_responses
for select
using (auth.uid() = user_id);

drop policy if exists pre_read_poll_responses_admin_select on public.pre_read_poll_responses;
create policy pre_read_poll_responses_admin_select
on public.pre_read_poll_responses
for select
using (is_admin(auth.uid()));

drop policy if exists pre_read_poll_responses_admin_delete on public.pre_read_poll_responses;
create policy pre_read_poll_responses_admin_delete
on public.pre_read_poll_responses
for delete
using (is_admin(auth.uid()));
