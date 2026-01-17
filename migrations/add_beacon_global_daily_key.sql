-- Add global_daily_key to beacon_events for per-user daily push throttling
-- Safe to run multiple times

alter table if exists public.beacon_events
  add column if not exists global_daily_key text;

create index if not exists idx_beacon_events_global_daily_key_message_sent
  on public.beacon_events (global_daily_key, message_sent);

create index if not exists idx_beacon_events_user_timestamp_message_sent
  on public.beacon_events (user_id, timestamp, message_sent);
