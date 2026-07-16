-- Ensure study-materials bucket is public (V1 uses getPublicUrl)
insert into storage.buckets (id, name, public)
values ('study-materials', 'study-materials', true)
on conflict (id) do update set public = excluded.public;

-- Admin write policies (is_admin gate)
drop policy if exists "study_materials_admin_insert" on storage.objects;
create policy "study_materials_admin_insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'study-materials'
  and public.is_admin(auth.uid())
);

drop policy if exists "study_materials_admin_update" on storage.objects;
create policy "study_materials_admin_update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'study-materials'
  and public.is_admin(auth.uid())
)
with check (
  bucket_id = 'study-materials'
  and public.is_admin(auth.uid())
);

drop policy if exists "study_materials_admin_delete" on storage.objects;
create policy "study_materials_admin_delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'study-materials'
  and public.is_admin(auth.uid())
);
