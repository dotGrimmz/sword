-- Optional subset of the study passage used as the memory verse reference.
alter table public.pre_reads
  add column if not exists memory_verses_range text;
