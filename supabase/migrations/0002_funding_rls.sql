-- Run after `npx prisma db push` (adds the WalletFunding table).
alter table "WalletFunding" enable row level security;
drop policy if exists funding_select_own on "WalletFunding";
create policy funding_select_own on "WalletFunding" for select
  using ("userId" = public.current_app_user_id());
