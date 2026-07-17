-- Optional display title on member profiles (e.g. Pastor, Elder, Deacon).
-- Not a permission role — roles remain user/host/admin.
alter table public.profiles
  add column if not exists title text;

comment on column public.profiles.title is
  'Optional display title (not a permission). Editable by admins.';
