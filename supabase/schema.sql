-- Run this whole file in Supabase → SQL Editor. Safe to run more than once.

create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  name text,
  phone text,
  requirement text,
  budget text,
  utm_source text,
  utm_campaign text,
  utm_content text,
  status text default 'new'
);

alter table leads add column if not exists investor_type text;
alter table leads add column if not exists timeline text;
alter table leads add column if not exists notes text;
alter table leads add column if not exists session_id text;
alter table leads add column if not exists source text;        -- ad | website | direct
alter table leads add column if not exists utm_medium text;
alter table leads add column if not exists utm_term text;
alter table leads add column if not exists fbclid text;
alter table leads add column if not exists page_url text;
alter table leads add column if not exists email text;
alter table leads add column if not exists contact_method text;    -- office | video | scheduled | callnow | whatsapp
alter table leads add column if not exists preferred_contact text; -- whatsapp | phone | email
alter table leads add column if not exists preferred_time text;
alter table leads add column if not exists consent boolean default false;
alter table leads add column if not exists consent_at timestamptz;
alter table leads add column if not exists language text;
   
create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  session_id text not null,
  role text not null,
  content text not null
);

create index if not exists leads_created_at_idx on leads (created_at desc);
create index if not exists messages_session_idx on messages (session_id, created_at);

-- No public access: only the server (service role key) can read or write.
alter table leads enable row level security;
alter table messages enable row level security;

-- ── Abuse protection: rate limits for the public chat ──────────────
create table if not exists chat_requests (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  visitor text not null  -- one-way hash of the visitor's IP, never the raw IP
);
create index if not exists chat_requests_visitor_idx on chat_requests (visitor, created_at desc);
create index if not exists chat_requests_created_idx on chat_requests (created_at desc);
alter table chat_requests enable row level security;

create or replace function check_chat_rate_limit(
  p_visitor text,
  p_window_seconds int,
  p_window_max int,
  p_visitor_daily_max int,
  p_global_daily_max int
) returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  n int;
begin
  select count(*) into n from chat_requests
    where visitor = p_visitor and created_at > now() - make_interval(secs => p_window_seconds);
  if n >= p_window_max then return 'visitor_window'; end if;

  select count(*) into n from chat_requests
    where visitor = p_visitor and created_at > now() - interval '1 day';
  if n >= p_visitor_daily_max then return 'visitor_daily'; end if;

  select count(*) into n from chat_requests where created_at > now() - interval '1 day';
  if n >= p_global_daily_max then return 'global_daily'; end if;

  insert into chat_requests (visitor) values (p_visitor);
  if random() < 0.02 then
    delete from chat_requests where created_at < now() - interval '2 days';
  end if;
  return 'ok';
end;
$$;

revoke all on function check_chat_rate_limit(text, int, int, int, int) from public, anon, authenticated;
grant execute on function check_chat_rate_limit(text, int, int, int, int) to service_role;

-- ── "Did you get the answer you were looking for?" (End this chat) ──
create table if not exists chat_feedback (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  session_id text,
  rating text not null,  -- yes | partly | no
  language text
);
alter table chat_feedback enable row level security;

-- ── Sales team leads dashboard (/admin) ─────────────────────────────
-- status: new | contacted | meeting | won | lost
alter table leads add column if not exists staff_notes text;
alter table leads add column if not exists updated_at timestamptz;
alter table leads add column if not exists updated_by text;
alter table leads add column if not exists contacted_at timestamptz;
-- Digits-only copy of the phone, so staff can search "0545..." or "971545..."
alter table leads add column if not exists phone_digits text
  generated always as (regexp_replace(coalesce(phone, ''), '\D', '', 'g')) stored;
create index if not exists leads_status_idx on leads (status, created_at desc);

create table if not exists lead_activity (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  lead_id uuid not null references leads(id) on delete cascade,
  actor text,       -- staff name
  action text not null, -- status | note
  detail text
);
create index if not exists lead_activity_lead_idx on lead_activity (lead_id, created_at desc);
alter table lead_activity enable row level security;
