-- Run AFTER `npx prisma db push` (Prisma creates the tables).
-- Paste into Supabase Dashboard > SQL Editor, or run with the Supabase CLI.
--
-- NOTE: Prisma connects as the database owner, which bypasses RLS. These policies
-- protect the data when it is reached through Supabase's client API (anon/authenticated
-- keys). Keep the service role key server-side only.

-- Helpers (SECURITY DEFINER avoids recursive policy checks) --------------------
create or replace function public.current_app_user_id()
returns text language sql stable security definer set search_path = public as $$
  select id from "User" where "authId" = auth.uid()::text
$$;

create or replace function public.owns_envelope(eid text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from "Envelope" where id = eid and "userId" = public.current_app_user_id())
$$;

create or replace function public.is_group_member(gid text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from "GroupMember" where "groupId" = gid and "userId" = public.current_app_user_id())
$$;

-- Enable RLS on every table ---------------------------------------------------
alter table "User"          enable row level security;
alter table "Envelope"      enable row level security;
alter table "Schedule"      enable row level security;
alter table "Release"       enable row level security;
alter table "HeartbeatLog"  enable row level security;
alter table "Notification"  enable row level security;
alter table "Group"         enable row level security;
alter table "GroupMember"   enable row level security;
alter table "Approval"      enable row level security;
alter table "Contribution"  enable row level security;

-- User: own row ---------------------------------------------------------------
drop policy if exists user_select_own on "User";
create policy user_select_own on "User" for select using ("authId" = auth.uid()::text);
drop policy if exists user_update_own on "User";
create policy user_update_own on "User" for update
  using ("authId" = auth.uid()::text) with check ("authId" = auth.uid()::text);

-- Envelope: own rows (select/update) ---------------------------------------------
drop policy if exists envelope_select_own on "Envelope";
create policy envelope_select_own on "Envelope" for select using ("userId" = public.current_app_user_id());
drop policy if exists envelope_update_own on "Envelope";
create policy envelope_update_own on "Envelope" for update
  using ("userId" = public.current_app_user_id()) with check ("userId" = public.current_app_user_id());

-- Schedule: via owned envelope ----------------------------------------------------
drop policy if exists schedule_select_own on "Schedule";
create policy schedule_select_own on "Schedule" for select using (public.owns_envelope("envelopeId"));
drop policy if exists schedule_update_own on "Schedule";
create policy schedule_update_own on "Schedule" for update
  using (public.owns_envelope("envelopeId")) with check (public.owns_envelope("envelopeId"));

-- Release history: read-only via owned envelope ---------------------------------
drop policy if exists release_select_own on "Release";
create policy release_select_own on "Release" for select using (public.owns_envelope("envelopeId"));

-- HeartbeatLog: own rows --------------------------------------------------------
drop policy if exists heartbeat_select_own on "HeartbeatLog";
create policy heartbeat_select_own on "HeartbeatLog" for select using ("userId" = public.current_app_user_id());
drop policy if exists heartbeat_update_own on "HeartbeatLog";
create policy heartbeat_update_own on "HeartbeatLog" for update
  using ("userId" = public.current_app_user_id()) with check ("userId" = public.current_app_user_id());

-- Notification: own rows --------------------------------------------------------
drop policy if exists notification_select_own on "Notification";
create policy notification_select_own on "Notification" for select using ("userId" = public.current_app_user_id());

-- Group data: members only --------------------------------------------------------
drop policy if exists group_select_members on "Group";
create policy group_select_members on "Group" for select using (public.is_group_member(id));
drop policy if exists groupmember_select_members on "GroupMember";
create policy groupmember_select_members on "GroupMember" for select using (public.is_group_member("groupId"));
drop policy if exists approval_select_members on "Approval";
create policy approval_select_members on "Approval" for select using (public.is_group_member("groupId"));
drop policy if exists contribution_select_members on "Contribution";
create policy contribution_select_members on "Contribution" for select using (public.is_group_member("groupId"));

-- No insert/delete policies on purpose: all writes go through the server (Prisma / service role).
