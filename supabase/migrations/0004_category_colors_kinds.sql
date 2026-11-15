-- SpendWise AI — category colours + kinds
--
-- Run once in the Supabase SQL editor, after 0003_recurring_income.sql.
-- Purely additive: every existing category becomes `kind = 'expense'`, which is
-- what the app assumed until now, and `color = null` means "derive a stable
-- colour from the name" so nothing looks broken before you pick one.
--
-- Why: Phase 26.1 gives categories icons *and* colours, and splits them into
-- expense / income / both so pickers stop offering "Rent" for a salary and
-- "Salary" for a coffee.

begin;

alter table public.categories
  add column if not exists color text;

alter table public.categories
  add column if not exists kind text not null default 'expense';

alter table public.categories
  drop constraint if exists categories_kind_check;

alter table public.categories
  add constraint categories_kind_check
  check (kind in ('expense', 'income', 'both'));

alter table public.categories
  drop constraint if exists categories_color_check;

alter table public.categories
  add constraint categories_color_check
  check (color is null or color ~ '^#[0-9a-fA-F]{6}$');

create index if not exists categories_user_kind_idx
  on public.categories (user_id, kind);

commit;

-- Verification (run separately):
--   select column_name, data_type, column_default, is_nullable
--   from information_schema.columns
--   where table_schema = 'public' and table_name = 'categories';
--
--   select kind, count(*) from public.categories group by kind;
