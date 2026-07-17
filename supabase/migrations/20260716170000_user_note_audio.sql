-- Ad-hoc voice notes: store audio blobs first, attach reference/text later.

-- 1) user_notes columns
alter table public.user_notes
  add column if not exists audio_storage_path text,
  add column if not exists audio_mime_type text,
  add column if not exists audio_byte_size int,
  add column if not exists audio_duration_ms int;

-- Allow text-empty drafts that only have audio (and vice versa later).
alter table public.user_notes
  alter column body drop not null;

-- A note must have either text body or audio (or both).
alter table public.user_notes
  drop constraint if exists user_notes_body_or_audio_check;

alter table public.user_notes
  add constraint user_notes_body_or_audio_check
  check (
    (
      body is not null
      and length(trim(body)) > 0
    )
    or audio_storage_path is not null
  );

create index if not exists user_notes_audio_path_idx
  on public.user_notes (audio_storage_path)
  where audio_storage_path is not null;

-- 2) Private storage bucket for member voice notes
-- Object paths MUST be: {auth.uid()}/<filename>
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'user-note-audio',
  'user-note-audio',
  false,
  26214400, -- 25MB
  array[
    'audio/webm',
    'audio/mp4',
    'audio/mpeg',
    'audio/ogg',
    'audio/wav',
    'audio/x-wav',
    'audio/aac',
    'audio/flac'
  ]::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Owner-only object policies (folder[1] = user id)
drop policy if exists "user_note_audio_select_own" on storage.objects;
create policy "user_note_audio_select_own"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'user-note-audio'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "user_note_audio_insert_own" on storage.objects;
create policy "user_note_audio_insert_own"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'user-note-audio'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "user_note_audio_update_own" on storage.objects;
create policy "user_note_audio_update_own"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'user-note-audio'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'user-note-audio'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "user_note_audio_delete_own" on storage.objects;
create policy "user_note_audio_delete_own"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'user-note-audio'
  and (storage.foldername(name))[1] = auth.uid()::text
);
