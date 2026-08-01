-- Member quiz reads go through Next.js APIs (service role) that strip answers.
-- Drop public select so published rows (including correctAnswer) are not
-- readable directly via the Supabase client. Admin policy unchanged.
-- quiz_assignments remain unused / future.

drop policy if exists quizzes_public_select on public.quizzes;

comment on table public.quizzes is
  'Admin-authored scripture quizzes. Member take/list via API only (no public select).';
