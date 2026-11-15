-- SpendWise AI — recurring income
--
-- Run once in the Supabase SQL editor, after 0002_goals.sql. Purely additive:
-- existing recurring rows become `expense`, which is what they already were.
--
-- Why: Phase 26.4 turns simple recurring expenses into recurring plans that
-- can post either an expense or an income transaction when they run.

begin;

alter table public.recurring_expenses
  add column if not exists type text not null default 'expense';

alter table public.recurring_expenses
  drop constraint if exists recurring_expenses_type_check;

alter table public.recurring_expenses
  add constraint recurring_expenses_type_check
  check (type in ('expense', 'income'));

create index if not exists recurring_expenses_user_type_idx
  on public.recurring_expenses (user_id, type);

commit;

-- Verification (run separately):
--   select type, count(*) from public.recurring_expenses group by type;
--   select conname from pg_constraint where conname = 'recurring_expenses_type_check';
