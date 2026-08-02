-- Owner/dev role: master is a superset of admin for RLS.
-- Assign manually in DB only (no Users UI assigner):
--   update public.profiles set role = 'master' where id = '<uuid>';

-- profiles.role uses enum public.user_role — add master before referencing it.
alter type public.user_role add value if not exists 'master';

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
        -- Compare as text so this works in the same transaction as ADD VALUE.
        and p.role::text in ('admin', 'master')
    ),
    false
  );
$$;

comment on function public.is_admin(uuid) is
  'True when profile role is admin or master (owner/dev).';

-- Replace hardcoded admin-only check with is_admin() so master can delete too.
drop policy if exists pre_read_comments_delete_policy on public.pre_read_comments;
create policy pre_read_comments_delete_policy
on public.pre_read_comments
for delete
using (
  auth.uid() = user_id
  or public.is_admin(auth.uid())
);
