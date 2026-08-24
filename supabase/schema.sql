-- ============================================================================
--  NikkahPure — database schema
--  Run this once in Supabase → SQL Editor → New query → Run.
--  Safe to re-run.
--
--  Security model, in short:
--   * Nothing is readable except through an explicit policy.
--   * Users may write only the columns they are granted — verification,
--     suspension, gender and date of birth are never writable by the user.
--   * Anything that changes state across two people (accepting an interest,
--     approving a conversation, revoking a guardian) goes through a
--     security-definer function that re-checks permission itself.
--   * Guardian oversight is enforced against everyone except the ward. She is
--     an adult and can remove her own guardian; nobody else — including the
--     guardian himself — can switch her supervision off or write in her name.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
--  Enums — one block each, so a partial re-run cannot silently skip the rest
-- ---------------------------------------------------------------------------
do $$ begin create type gender_t as enum ('male','female');
exception when duplicate_object then null; end $$;

do $$ begin create type verification_t as enum ('unverified','pending','verified','rejected');
exception when duplicate_object then null; end $$;

do $$ begin create type interest_t as enum ('pending','accepted','declined','withdrawn');
exception when duplicate_object then null; end $$;

do $$ begin create type conversation_t as enum ('awaiting_wali','open','closed');
exception when duplicate_object then null; end $$;

do $$ begin create type wali_link_t as enum ('invited','active','revoked');
exception when duplicate_object then null; end $$;

do $$ begin create type report_t as enum ('open','reviewing','actioned','dismissed');
exception when duplicate_object then null; end $$;

do $$ begin create type photo_visibility_t as enum ('matches_only','wali_only');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
--  profiles
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id                uuid primary key references auth.users(id) on delete cascade,
  full_name         text not null check (char_length(full_name) between 2 and 80),
  gender            gender_t not null,
  date_of_birth     date not null,
  city              text,
  country           text,
  sect              text,
  madhab            text,
  prayer_level      text,
  ethnicity         text,
  languages         text[] default '{}',
  profession        text,
  education         text,
  marital_status    text,
  has_children      boolean default false,
  willing_to_relocate boolean default false,
  bio               text check (bio is null or char_length(bio) <= 1500),
  core_values       text[] default '{}',
  seeking_min_age   int  default 18 check (seeking_min_age >= 18),
  seeking_max_age   int  default 60 check (seeking_max_age <= 99),
  seeking_countries text[] default '{}',
  photo_path        text,
  photo_visibility  photo_visibility_t not null default 'matches_only',
  verification      verification_t not null default 'unverified',
  wali_required     boolean not null default false,
  onboarding_done   boolean not null default false,
  is_active         boolean not null default true,
  is_suspended      boolean not null default false,
  last_seen_at      timestamptz default now(),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  -- Hard 18+ gate. No profile can exist below this age.
  constraint adult_only check (date_of_birth <= (current_date - interval '18 years')),
  constraint sane_dob   check (date_of_birth >= (current_date - interval '100 years')),
  constraint age_range  check (seeking_min_age <= seeking_max_age)
);

-- Migration for databases created before photo visibility was reduced to two
-- meaningful settings. A no-op on a fresh install.
update public.profiles
   set photo_visibility = 'matches_only'
 where photo_visibility::text = 'on_request';

create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists trg_profiles_touch on public.profiles;
create trigger trg_profiles_touch
  before update on public.profiles
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
--  wali_links
-- ---------------------------------------------------------------------------
create table if not exists public.wali_links (
  id            uuid primary key default gen_random_uuid(),
  ward_id       uuid not null references public.profiles(id) on delete cascade,
  wali_user_id  uuid references auth.users(id) on delete set null,
  wali_name     text not null,
  wali_email    text not null,
  wali_phone    text,
  relationship  text not null,
  invite_code   text unique default encode(gen_random_bytes(9), 'hex'),
  status        wali_link_t not null default 'invited',
  must_approve_chat boolean not null default true,
  can_read_messages boolean not null default true,
  created_at    timestamptz not null default now(),
  accepted_at   timestamptz
);
create index if not exists wali_links_ward_idx on public.wali_links(ward_id);
create index if not exists wali_links_user_idx on public.wali_links(wali_user_id);

-- A ward may never rewrite who her guardian is, and a guardian may never
-- reassign himself to a different ward. Only the columns below can change.
create or replace function public.guard_wali_link() returns trigger
language plpgsql as $$
begin
  -- wali_user_id carries ON DELETE SET NULL from auth.users. When a guardian
  -- deletes his account that FK action must be allowed through, or no guardian
  -- could ever delete his account — which both app stores require. The link is
  -- revoked in the same step rather than left pointing at nobody.
  if old.wali_user_id is not null and new.wali_user_id is null
     and new.ward_id = old.ward_id
     and new.invite_code is not distinct from old.invite_code then
    new.status := 'revoked';
    return new;
  end if;

  -- A link can never be walked back to 'invited' — that would make the
  -- acceptance exemption below reusable.
  if old.status in ('active', 'revoked') and new.status = 'invited' then
    raise exception 'A guardian link cannot be reset to invited';
  end if;

  -- The one-time invited → active acceptance is allowed to attach the
  -- guardian's user id and consume the invite code. Nothing else may.
  if old.status = 'invited' and old.wali_user_id is null and new.status = 'active' then
    if new.ward_id <> old.ward_id then
      raise exception 'A guardian link cannot be reassigned';
    end if;
    return new;
  end if;

  if new.ward_id <> old.ward_id
     or new.wali_user_id is distinct from old.wali_user_id
     or new.invite_code is distinct from old.invite_code then
    raise exception 'A guardian link cannot be reassigned';
  end if;
  return new;
end $$;

drop trigger if exists trg_guard_wali_link on public.wali_links;
create trigger trg_guard_wali_link
  before update on public.wali_links
  for each row execute function public.guard_wali_link();

-- ---------------------------------------------------------------------------
--  blocks
-- ---------------------------------------------------------------------------
create table if not exists public.blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint no_self_block check (blocker_id <> blocked_id)
);
create index if not exists blocks_blocked_idx on public.blocks(blocked_id, blocker_id);

-- ---------------------------------------------------------------------------
--  interests
-- ---------------------------------------------------------------------------
create table if not exists public.interests (
  id          uuid primary key default gen_random_uuid(),
  sender_id   uuid not null references public.profiles(id) on delete cascade,
  receiver_id uuid not null references public.profiles(id) on delete cascade,
  note        text check (note is null or char_length(note) <= 400),
  status      interest_t not null default 'pending',
  created_at  timestamptz not null default now(),
  responded_at timestamptz,
  constraint no_self_interest check (sender_id <> receiver_id)
);

-- One live interest per direction. A withdrawn one may be sent again; a
-- declined one may not — a decline is final, by design.
create unique index if not exists interests_live_uidx
  on public.interests (sender_id, receiver_id)
  where status <> 'withdrawn';

create index if not exists interests_receiver_idx on public.interests(receiver_id, status);
create index if not exists interests_sender_idx   on public.interests(sender_id, status);

-- ---------------------------------------------------------------------------
--  conversations
-- ---------------------------------------------------------------------------
create table if not exists public.conversations (
  id           uuid primary key default gen_random_uuid(),
  interest_id  uuid unique references public.interests(id) on delete set null,
  user_a       uuid not null references public.profiles(id) on delete cascade,
  user_b       uuid not null references public.profiles(id) on delete cascade,
  status       conversation_t not null default 'awaiting_wali',
  -- Each side is held separately: if both people have guardians, both
  -- guardians must approve before a single message can be sent.
  needs_wali_a boolean not null default false,
  needs_wali_b boolean not null default false,
  wali_a_approved_at timestamptz,
  wali_b_approved_at timestamptz,
  wali_a_approved_by uuid references auth.users(id) on delete set null,
  wali_b_approved_by uuid references auth.users(id) on delete set null,
  closed_reason text,
  created_at   timestamptz not null default now(),
  last_message_at timestamptz,
  constraint distinct_participants check (user_a <> user_b)
);
create index if not exists conversations_a_idx on public.conversations(user_a);
create index if not exists conversations_b_idx on public.conversations(user_b);

-- Exactly one conversation per pair of people, whichever way round.
create unique index if not exists conversations_pair_uidx
  on public.conversations (least(user_a, user_b), greatest(user_a, user_b));

-- ---------------------------------------------------------------------------
--  messages
-- ---------------------------------------------------------------------------
create table if not exists public.messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id       uuid not null references public.profiles(id) on delete cascade,
  body            text not null check (char_length(body) between 1 and 4000),
  created_at      timestamptz not null default now(),
  read_at         timestamptz
);
create index if not exists messages_conv_idx on public.messages(conversation_id, created_at);

-- ---------------------------------------------------------------------------
--  reports  (required by both app stores)
-- ---------------------------------------------------------------------------
create table if not exists public.reports (
  id          uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reported_id uuid not null references public.profiles(id) on delete cascade,
  reason      text not null,
  details     text,
  status      report_t not null default 'open',
  created_at  timestamptz not null default now(),
  constraint no_self_report check (reporter_id <> reported_id)
);
create index if not exists reports_status_idx on public.reports(status, created_at);

-- ---------------------------------------------------------------------------
--  verification_requests
-- ---------------------------------------------------------------------------
create table if not exists public.verification_requests (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  document_path text not null,
  selfie_path   text,
  status       verification_t not null default 'pending',
  reviewer_note text,
  created_at   timestamptz not null default now(),
  reviewed_at  timestamptz
);
create index if not exists verification_user_idx on public.verification_requests(user_id);

-- ============================================================================
--  Helper functions
-- ============================================================================

create or replace function public.is_blocked(other uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.blocks
    where (blocker_id = auth.uid() and blocked_id = other)
       or (blocker_id = other and blocked_id = auth.uid())
  );
$$;

create or replace function public.my_gender()
returns gender_t language sql stable security definer set search_path = public as $$
  select gender from public.profiles where id = auth.uid();
$$;

create or replace function public.is_wali_of(ward uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and exists (
    select 1 from public.wali_links
    where ward_id = ward and wali_user_id = auth.uid() and status = 'active'
  );
$$;

create or replace function public.in_conversation(conv uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and exists (
    select 1 from public.conversations
    where id = conv and (user_a = auth.uid() or user_b = auth.uid())
  );
$$;

create or replace function public.wali_can_read_conversation(conv uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and exists (
    select 1
    from public.conversations c
    join public.wali_links w on w.ward_id in (c.user_a, c.user_b)
    where c.id = conv
      and w.wali_user_id = auth.uid()
      and w.status = 'active'
      and w.can_read_messages
  );
$$;

-- Does this person's side of a conversation have to be approved by a guardian?
-- True if they asked for a guardian, or a guardian is actively linked with
-- approval switched on.
create or replace function public.side_needs_wali(person uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(
    (select wali_required from public.profiles where id = person), false)
  or exists (
    select 1 from public.wali_links
    where ward_id = person
      and status = 'active'
      and wali_user_id is not null   -- a link whose guardian account is gone holds nothing
      and must_approve_chat
  );
$$;

create or replace function public.account_in_good_standing(person uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = person and is_active and not is_suspended and onboarding_done
  );
$$;

-- ============================================================================
--  Row Level Security
-- ============================================================================
alter table public.profiles              enable row level security;
alter table public.wali_links            enable row level security;
alter table public.blocks                enable row level security;
alter table public.interests             enable row level security;
alter table public.conversations         enable row level security;
alter table public.messages              enable row level security;
alter table public.reports               enable row level security;
alter table public.verification_requests enable row level security;

-- ---- profiles -------------------------------------------------------------
drop policy if exists "read own profile" on public.profiles;
create policy "read own profile" on public.profiles
  for select using (id = auth.uid());

drop policy if exists "browse opposite gender" on public.profiles;
create policy "browse opposite gender" on public.profiles
  for select using (
    id <> auth.uid()
    and onboarding_done
    and is_active
    and not is_suspended
    and gender <> public.my_gender()
    and not public.is_blocked(id)
  );

drop policy if exists "wali reads ward" on public.profiles;
create policy "wali reads ward" on public.profiles
  for select using (public.is_wali_of(id));

-- A guardian must also be able to see the person on the other side of his
-- ward's conversation — otherwise he is approving a name he cannot read.
drop policy if exists "wali reads ward counterparty" on public.profiles;
create policy "wali reads ward counterparty" on public.profiles
  for select using (
    exists (
      select 1
      from public.conversations c
      join public.wali_links w on w.ward_id in (c.user_a, c.user_b)
      where w.wali_user_id = auth.uid()
        and w.status = 'active'
        and c.status in ('awaiting_wali', 'open')
        and profiles.id in (c.user_a, c.user_b)
    )
  );

-- You can always see the people you have blocked, so you can unblock them.
drop policy if exists "read people i blocked" on public.profiles;
create policy "read people i blocked" on public.profiles
  for select using (
    exists (
      select 1 from public.blocks
      where blocker_id = auth.uid() and blocked_id = profiles.id
    )
  );

drop policy if exists "insert own profile" on public.profiles;
create policy "insert own profile" on public.profiles
  for insert with check (id = auth.uid());

drop policy if exists "update own profile" on public.profiles;
create policy "update own profile" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- Column-level grants are what stop a user awarding themselves a verified
-- badge, lifting their own suspension, or flipping gender to see the other
-- side of the platform. Row policies alone cannot do this.
revoke insert, update on public.profiles from authenticated;
grant insert (
  id, full_name, gender, date_of_birth, city, country, sect, madhab,
  prayer_level, ethnicity, languages, profession, education, marital_status,
  has_children, willing_to_relocate, bio, core_values, seeking_min_age,
  seeking_max_age, seeking_countries, photo_path, photo_visibility,
  wali_required, onboarding_done
) on public.profiles to authenticated;
grant update (
  full_name, city, country, sect, madhab, prayer_level, ethnicity, languages,
  profession, education, marital_status, has_children, willing_to_relocate,
  bio, core_values, seeking_min_age, seeking_max_age, seeking_countries,
  photo_path, photo_visibility, wali_required, onboarding_done, is_active,
  last_seen_at
) on public.profiles to authenticated;

-- ---- wali_links -----------------------------------------------------------
drop policy if exists "ward manages own wali" on public.wali_links;
drop policy if exists "wali updates own link" on public.wali_links;

drop policy if exists "ward reads own wali links" on public.wali_links;
create policy "ward reads own wali links" on public.wali_links
  for select using (ward_id = auth.uid());

drop policy if exists "ward invites wali" on public.wali_links;
create policy "ward invites wali" on public.wali_links
  for insert with check (
    ward_id = auth.uid()
    and wali_user_id is null
    and status = 'invited'
    -- Live links only, so a ward who changes guardian over the years is never
    -- locked out of appointing a new one.
    and (
      select count(*) from public.wali_links w
      where w.ward_id = auth.uid() and w.status in ('invited', 'active')
    ) < 5
  );

drop policy if exists "wali reads own links" on public.wali_links;
create policy "wali reads own links" on public.wali_links
  for select using (wali_user_id = auth.uid());

-- The guardian — and only the guardian — may adjust his own oversight level.
drop policy if exists "wali sets oversight" on public.wali_links;
create policy "wali sets oversight" on public.wali_links
  for update using (wali_user_id = auth.uid() and status = 'active')
  with check (wali_user_id = auth.uid() and status = 'active');

revoke update on public.wali_links from authenticated;
grant update (must_approve_chat, can_read_messages) on public.wali_links to authenticated;
-- Revoking a link goes through revoke_wali(); there is no delete policy.

-- ---- blocks ---------------------------------------------------------------
drop policy if exists "manage own blocks" on public.blocks;
create policy "manage own blocks" on public.blocks
  for all using (blocker_id = auth.uid()) with check (blocker_id = auth.uid());

-- ---- interests ------------------------------------------------------------
drop policy if exists "see own interests" on public.interests;
create policy "see own interests" on public.interests
  for select using (
    sender_id = auth.uid() or receiver_id = auth.uid()
    or public.is_wali_of(sender_id) or public.is_wali_of(receiver_id)
  );

drop policy if exists "send interest" on public.interests;
create policy "send interest" on public.interests
  for insert with check (
    sender_id = auth.uid()
    and status = 'pending'
    and public.account_in_good_standing(auth.uid())
    and not public.is_blocked(receiver_id)
    -- Simple flood limit: no more than 20 expressions of interest a day.
    and (
      select count(*) from public.interests i
      where i.sender_id = auth.uid() and i.created_at > now() - interval '1 day'
    ) < 20
    and exists (
      select 1 from public.profiles p
      where p.id = receiver_id
        and p.gender <> public.my_gender()
        and p.onboarding_done and p.is_active and not p.is_suspended
    )
  );

-- Only the recipient answers an interest, and only its status may move.
-- Withdrawal by the sender goes through withdraw_interest().
-- The only status a user may write directly is a decline. Accepting must go
-- through accept_interest(), which creates the conversation in the same
-- transaction — otherwise an interest could be marked accepted with no
-- conversation behind it and no way to recover.
drop policy if exists "respond to interest" on public.interests;
create policy "respond to interest" on public.interests
  for update using (receiver_id = auth.uid() and status = 'pending')
  with check (receiver_id = auth.uid() and status = 'declined');

revoke update on public.interests from authenticated;
grant update (status, responded_at) on public.interests to authenticated;

-- ---- conversations --------------------------------------------------------
drop policy if exists "participants read conversation" on public.conversations;
create policy "participants read conversation" on public.conversations
  for select using (
    user_a = auth.uid() or user_b = auth.uid()
    or public.is_wali_of(user_a) or public.is_wali_of(user_b)
  );

-- No update policy at all. Opening, approving and closing are done by the
-- functions below, which check permission themselves — that is what stops a
-- participant simply setting status to 'open' and skipping the guardian.
drop policy if exists "participants update conversation" on public.conversations;

-- ---- messages -------------------------------------------------------------
drop policy if exists "read conversation messages" on public.messages;
create policy "read conversation messages" on public.messages
  for select using (
    public.in_conversation(conversation_id)
    or public.wali_can_read_conversation(conversation_id)
  );

drop policy if exists "send message when open" on public.messages;
create policy "send message when open" on public.messages
  for insert with check (
    sender_id = auth.uid()
    and public.account_in_good_standing(auth.uid())
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and c.status = 'open'
        and (c.user_a = auth.uid() or c.user_b = auth.uid())
    )
  );

-- Messages are never editable or deletable by users: the transcript a wali
-- reads must be the real one.

-- ---- reports --------------------------------------------------------------
drop policy if exists "file own report" on public.reports;
create policy "file own report" on public.reports
  for insert with check (reporter_id = auth.uid() and status = 'open');

drop policy if exists "read own reports" on public.reports;
create policy "read own reports" on public.reports
  for select using (reporter_id = auth.uid());

revoke update, delete on public.reports from authenticated;

-- ---- verification ---------------------------------------------------------
drop policy if exists "own verification requests" on public.verification_requests;

drop policy if exists "read own verification" on public.verification_requests;
create policy "read own verification" on public.verification_requests
  for select using (user_id = auth.uid());

drop policy if exists "submit verification" on public.verification_requests;
create policy "submit verification" on public.verification_requests
  for insert with check (user_id = auth.uid() and status = 'pending');

-- Reviewing is a moderator action performed with the service role only.
revoke update, delete on public.verification_requests from authenticated;

-- ============================================================================
--  Transactional functions
-- ============================================================================

-- Accept an interest, and open the conversation only if no guardian is owed
-- an approval. Returns the conversation id.
create or replace function public.accept_interest(p_interest uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_interest public.interests%rowtype;
  v_conv_id  uuid;
  v_needs_a  boolean;
  v_needs_b  boolean;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;

  select * into v_interest from public.interests where id = p_interest;
  if not found then raise exception 'Interest not found'; end if;
  if v_interest.receiver_id <> auth.uid() then
    raise exception 'Only the recipient can accept this interest';
  end if;
  if v_interest.status <> 'pending' then
    raise exception 'This interest has already been answered';
  end if;
  if not public.account_in_good_standing(auth.uid()) then
    raise exception 'Your account cannot accept interests at the moment';
  end if;
  if public.is_blocked(v_interest.sender_id) then
    raise exception 'Contact between you is blocked';
  end if;

  update public.interests
     set status = 'accepted', responded_at = now()
   where id = p_interest;

  v_needs_a := public.side_needs_wali(v_interest.sender_id);
  v_needs_b := public.side_needs_wali(v_interest.receiver_id);

  -- A side that needs a guardian but has none actively linked would produce a
  -- conversation nobody could ever open. Refuse instead, and say why.
  if v_needs_a and not exists (
    select 1 from public.wali_links
    where ward_id = v_interest.sender_id and status = 'active' and wali_user_id is not null
  ) then
    raise exception 'They are waiting for their guardian to accept an invitation';
  end if;
  if v_needs_b and not exists (
    select 1 from public.wali_links
    where ward_id = v_interest.receiver_id and status = 'active' and wali_user_id is not null
  ) then
    raise exception 'Your guardian has not accepted their invitation yet';
  end if;

  -- If these two already have a conversation, reuse it rather than making a
  -- second transcript. A previously closed one is reopened and re-gated.
  select id into v_conv_id
    from public.conversations
   where least(user_a, user_b) = least(v_interest.sender_id, v_interest.receiver_id)
     and greatest(user_a, user_b) = greatest(v_interest.sender_id, v_interest.receiver_id);

  if v_conv_id is not null then
    update public.conversations c
       set needs_wali_a = case when c.user_a = v_interest.sender_id then v_needs_a else v_needs_b end,
           needs_wali_b = case when c.user_b = v_interest.receiver_id then v_needs_b else v_needs_a end,
           status = case when v_needs_a or v_needs_b then 'awaiting_wali'::conversation_t
                         else 'open'::conversation_t end,
           wali_a_approved_at = null, wali_b_approved_at = null,
           wali_a_approved_by = null, wali_b_approved_by = null,
           closed_reason = null,
           interest_id = p_interest
     where c.id = v_conv_id and c.status = 'closed';
    return v_conv_id;
  end if;

  insert into public.conversations (
    interest_id, user_a, user_b, status, needs_wali_a, needs_wali_b
  )
  values (
    p_interest, v_interest.sender_id, v_interest.receiver_id,
    case when v_needs_a or v_needs_b then 'awaiting_wali'::conversation_t
         else 'open'::conversation_t end,
    v_needs_a, v_needs_b
  )
  returning id into v_conv_id;

  return v_conv_id;
end $$;

-- The sender withdraws their own pending interest.
create or replace function public.withdraw_interest(p_interest uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_interest public.interests%rowtype;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  select * into v_interest from public.interests where id = p_interest;
  if not found then raise exception 'Interest not found'; end if;
  if v_interest.sender_id <> auth.uid() then
    raise exception 'Only the sender can withdraw this interest';
  end if;
  if v_interest.status <> 'pending' then
    raise exception 'Only a pending interest can be withdrawn';
  end if;

  update public.interests set status = 'withdrawn' where id = p_interest;
end $$;

-- A guardian approves his own side. The conversation opens only once every
-- side that needs approval has given it.
create or replace function public.wali_approve_conversation(p_conv uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_conv public.conversations%rowtype;
  v_is_a boolean;
  v_is_b boolean;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;

  select * into v_conv from public.conversations where id = p_conv;
  if not found then raise exception 'Conversation not found'; end if;
  if v_conv.status <> 'awaiting_wali' then
    raise exception 'This conversation is not awaiting approval';
  end if;

  v_is_a := public.is_wali_of(v_conv.user_a);
  v_is_b := public.is_wali_of(v_conv.user_b);
  if not (v_is_a or v_is_b) then
    raise exception 'Only an active guardian may approve this conversation';
  end if;

  if v_is_a then
    update public.conversations
       set wali_a_approved_at = now(), wali_a_approved_by = auth.uid()
     where id = p_conv;
  end if;
  if v_is_b then
    update public.conversations
       set wali_b_approved_at = now(), wali_b_approved_by = auth.uid()
     where id = p_conv;
  end if;

  update public.conversations
     set status = 'open'
   where id = p_conv
     and status = 'awaiting_wali'
     and (not needs_wali_a or wali_a_approved_at is not null)
     and (not needs_wali_b or wali_b_approved_at is not null);
end $$;

-- Either participant, or either guardian, may close a conversation.
create or replace function public.close_conversation(p_conv uuid, p_reason text default null)
returns void language plpgsql security definer set search_path = public as $$
declare v_conv public.conversations%rowtype;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;

  select * into v_conv from public.conversations where id = p_conv;
  if not found then raise exception 'Conversation not found'; end if;
  if not (v_conv.user_a = auth.uid() or v_conv.user_b = auth.uid()
          or public.is_wali_of(v_conv.user_a) or public.is_wali_of(v_conv.user_b)) then
    raise exception 'Not permitted';
  end if;

  update public.conversations
     set status = 'closed', closed_reason = coalesce(p_reason, 'closed')
   where id = p_conv;
end $$;

-- A guardian accepts an invitation using the code his ward sent him. The code
-- is consumed on use, so it cannot be replayed by anyone who saw it later.
create or replace function public.accept_wali_invite(p_code text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_link public.wali_links%rowtype;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;

  select * into v_link from public.wali_links where invite_code = p_code;
  if not found then raise exception 'That guardian code is not valid'; end if;
  if v_link.status <> 'invited' or v_link.wali_user_id is not null then
    raise exception 'That invitation has already been used';
  end if;
  if v_link.ward_id = auth.uid() then raise exception 'You cannot be your own guardian'; end if;

  update public.wali_links
     set wali_user_id = auth.uid(),
         status = 'active',
         accepted_at = now(),
         invite_code = null
   where id = v_link.id;

  -- A newly active guardian may satisfy holds that were already in place.
  perform public.reevaluate_held_conversations(v_link.ward_id);

  return v_link.id;
end $$;

-- Recompute the guardian holds on every conversation involving one person,
-- and open any that no longer need approval. Called after a guardian link
-- changes, so a revocation can never leave a conversation frozen.
create or replace function public.reevaluate_held_conversations(p_person uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.conversations c
     set needs_wali_a = public.side_needs_wali(c.user_a),
         needs_wali_b = public.side_needs_wali(c.user_b)
   where c.status = 'awaiting_wali'
     and (c.user_a = p_person or c.user_b = p_person);

  update public.conversations c
     set status = 'open'
   where c.status = 'awaiting_wali'
     and (c.user_a = p_person or c.user_b = p_person)
     and (not c.needs_wali_a or c.wali_a_approved_at is not null)
     and (not c.needs_wali_b or c.wali_b_approved_at is not null);
end $$;

-- If someone turns their own guardian requirement off, anything still held for
-- them must be recomputed — otherwise the conversation freezes for good.
create or replace function public.reevaluate_on_wali_pref() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.wali_required is distinct from old.wali_required then
    perform public.reevaluate_held_conversations(new.id);
  end if;
  return null;
end $$;

drop trigger if exists trg_profiles_wali_pref on public.profiles;
create trigger trg_profiles_wali_pref
  after update of wali_required on public.profiles
  for each row execute function public.reevaluate_on_wali_pref();

-- Same for a guardian who relaxes his own oversight, or whose link is revoked:
-- holds that no longer apply should lift on their own.
create or replace function public.reevaluate_on_link_change() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.reevaluate_held_conversations(new.ward_id);
  return null;
end $$;

drop trigger if exists trg_wali_link_reevaluate on public.wali_links;
-- No column list: a BEFORE trigger changing `status` does not add it to the
-- statement's SET list, so a narrower trigger would miss exactly the cases
-- this exists for.
create trigger trg_wali_link_reevaluate
  after update on public.wali_links
  for each row execute function public.reevaluate_on_link_change();

-- A ward removes her guardian, or a guardian steps down.
create or replace function public.revoke_wali(p_link uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_link public.wali_links%rowtype;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;

  select * into v_link from public.wali_links where id = p_link;
  if not found then raise exception 'Guardian link not found'; end if;
  if v_link.ward_id <> auth.uid() and v_link.wali_user_id is not distinct from null then
    raise exception 'Not permitted';
  end if;
  if v_link.ward_id <> auth.uid() and v_link.wali_user_id <> auth.uid() then
    raise exception 'Not permitted';
  end if;
  if v_link.status = 'revoked' then return; end if;

  update public.wali_links set status = 'revoked' where id = p_link;

  -- Only the ward herself may cancel her own preference for a guardian. A
  -- guardian stepping down must not quietly switch her supervision off.
  if v_link.ward_id = auth.uid() and not exists (
    select 1 from public.wali_links
    where ward_id = v_link.ward_id and status in ('invited', 'active') and id <> p_link
  ) then
    update public.profiles set wali_required = false where id = v_link.ward_id;
  end if;

  -- Recompute anything still held for this ward, so a revocation cannot leave
  -- a conversation frozen with nobody able to approve it.
  perform public.reevaluate_held_conversations(v_link.ward_id);
end $$;

-- Names of the guardians supervising a conversation, readable by anyone
-- entitled to read that conversation — so the man in it is told plainly that
-- a guardian is watching, without exposing the guardian's contact details.
create or replace function public.conversation_walis(p_conv uuid)
returns table (wali_name text)
language sql stable security definer set search_path = public as $$
  select w.wali_name
  from public.conversations c
  join public.wali_links w on w.ward_id in (c.user_a, c.user_b)
  where c.id = p_conv
    and w.status = 'active'
    and (public.in_conversation(p_conv) or public.wali_can_read_conversation(p_conv));
$$;

-- Keep conversation lists sorted by recency.
create or replace function public.touch_conversation() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.conversations set last_message_at = now() where id = new.conversation_id;
  return new;
end $$;

drop trigger if exists trg_touch_conversation on public.messages;
create trigger trg_touch_conversation
  after insert on public.messages
  for each row execute function public.touch_conversation();

-- Blocking someone immediately closes any shared conversation.
create or replace function public.close_on_block() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.conversations
     set status = 'closed', closed_reason = 'blocked'
   where (user_a = new.blocker_id and user_b = new.blocked_id)
      or (user_a = new.blocked_id and user_b = new.blocker_id);
  return new;
end $$;

drop trigger if exists trg_close_on_block on public.blocks;
create trigger trg_close_on_block
  after insert on public.blocks
  for each row execute function public.close_on_block();

-- ============================================================================
--  Function privileges — nothing here may be called without a session
-- ============================================================================
revoke execute on function
  public.accept_interest(uuid),
  public.withdraw_interest(uuid),
  public.wali_approve_conversation(uuid),
  public.close_conversation(uuid, text),
  public.accept_wali_invite(text),
  public.revoke_wali(uuid),
  public.conversation_walis(uuid),
  public.is_blocked(uuid),
  public.my_gender(),
  public.is_wali_of(uuid),
  public.in_conversation(uuid),
  public.wali_can_read_conversation(uuid),
  public.side_needs_wali(uuid),
  public.account_in_good_standing(uuid)
from anon, public;

-- This one is internal only: it changes conversation status and is called from
-- inside other security-definer functions and a trigger. It must never be
-- reachable as an API call, so `authenticated` is revoked explicitly —
-- Supabase's default privileges grant it otherwise, and `create or replace`
-- preserves an existing grant.
revoke execute on function public.reevaluate_held_conversations(uuid)
  from anon, public, authenticated;

-- Trigger functions are not an API surface either.
revoke execute on function
  public.reevaluate_on_wali_pref(),
  public.reevaluate_on_link_change(),
  public.guard_wali_link(),
  public.touch_conversation(),
  public.close_on_block(),
  public.touch_updated_at()
from anon, public, authenticated;

grant execute on function
  public.accept_interest(uuid),
  public.withdraw_interest(uuid),
  public.wali_approve_conversation(uuid),
  public.close_conversation(uuid, text),
  public.accept_wali_invite(text),
  public.revoke_wali(uuid),
  public.conversation_walis(uuid)
to authenticated;

-- These are called from inside the policies above. RLS quals are permission
-- checked against the invoking role, so the grant must be explicit rather than
-- inherited from a default we do not control.
grant execute on function
  public.is_blocked(uuid),
  public.my_gender(),
  public.is_wali_of(uuid),
  public.in_conversation(uuid),
  public.wali_can_read_conversation(uuid),
  public.side_needs_wali(uuid),
  public.account_in_good_standing(uuid)
to authenticated;

-- ============================================================================
--  Storage buckets
-- ============================================================================
insert into storage.buckets (id, name, public) values ('photos', 'photos', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public) values ('verification', 'verification', false)
on conflict (id) do nothing;

drop policy if exists "own photo folder" on storage.objects;
create policy "own photo folder" on storage.objects
  for all to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "own verification folder" on storage.objects;
create policy "own verification folder" on storage.objects
  for all to authenticated
  using (bucket_id = 'verification' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'verification' and (storage.foldername(name))[1] = auth.uid()::text);

-- A match may see the photo, unless it is held for the guardian alone.
drop policy if exists "matches view photos" on storage.objects;
create policy "matches view photos" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'photos'
    and exists (
      select 1
      from public.conversations c
      join public.profiles p on p.id::text = (storage.foldername(name))[1]
      where c.status = 'open'
        and p.photo_visibility = 'matches_only'
        and (
          (c.user_a = auth.uid() and c.user_b::text = (storage.foldername(name))[1]) or
          (c.user_b = auth.uid() and c.user_a::text = (storage.foldername(name))[1])
        )
    )
  );

-- A guardian may always see his ward's photo. Compared as text, never cast to
-- uuid — a single non-uuid folder in the bucket would otherwise error out
-- every read for everyone.
drop policy if exists "wali views ward photo" on storage.objects;
create policy "wali views ward photo" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'photos'
    and exists (
      select 1 from public.wali_links w
      where w.wali_user_id = auth.uid()
        and w.status = 'active'
        and w.ward_id::text = (storage.foldername(name))[1]
    )
  );

-- And he may see the face of the person his ward is speaking to — he is being
-- asked to approve that person, after all.
drop policy if exists "wali views ward counterparty photo" on storage.objects;
create policy "wali views ward counterparty photo" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'photos'
    and exists (
      select 1
      from public.conversations c
      join public.wali_links w on w.ward_id in (c.user_a, c.user_b)
      join public.profiles p on p.id::text = (storage.foldername(name))[1]
      where w.wali_user_id = auth.uid()
        and w.status = 'active'
        and c.status in ('awaiting_wali', 'open')
        -- A photo held for a guardian's eyes only means *her own* guardian,
        -- not the guardian on the other side of the conversation.
        and p.photo_visibility = 'matches_only'
        and (
          c.user_a::text = (storage.foldername(name))[1] or
          c.user_b::text = (storage.foldername(name))[1]
        )
    )
  );

-- ============================================================================
--  Realtime
-- ============================================================================
do $$ begin
  alter publication supabase_realtime add table public.messages;
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table public.interests;
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table public.conversations;
exception when duplicate_object then null; end $$;
