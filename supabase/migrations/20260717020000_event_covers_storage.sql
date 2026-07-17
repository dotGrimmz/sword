-- Public bucket for event banner / cover images (admin upload, public read).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'event-covers',
  'event-covers',
  true,
  5242880, -- 5 MB
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "event_covers_admin_insert" on storage.objects;
create policy "event_covers_admin_insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'event-covers'
  and public.is_admin(auth.uid())
);

drop policy if exists "event_covers_admin_update" on storage.objects;
create policy "event_covers_admin_update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'event-covers'
  and public.is_admin(auth.uid())
)
with check (
  bucket_id = 'event-covers'
  and public.is_admin(auth.uid())
);

drop policy if exists "event_covers_admin_delete" on storage.objects;
create policy "event_covers_admin_delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'event-covers'
  and public.is_admin(auth.uid())
);
