alter table public.profiles
  add column if not exists pass_affiliations text[] not null default '{}';

alter table public.trips
  add column if not exists status text not null default 'active'
    check (status in ('active', 'archived')),
  add column if not exists version integer not null default 1
    check (version >= 1),
  add column if not exists source_trip_id uuid references public.trips(id) on delete set null,
  add column if not exists is_public boolean not null default false,
  add column if not exists share_token text unique,
  add column if not exists shared_at timestamptz,
  add column if not exists archived_at timestamptz,
  add column if not exists assumptions jsonb not null default '{}'::jsonb,
  add column if not exists origin_label text,
  add column if not exists origin_latitude numeric(8, 5),
  add column if not exists origin_longitude numeric(8, 5);

alter table public.ai_trip_recommendations
  add column if not exists prompt_version text,
  add column if not exists fallback_reason text,
  add column if not exists provider_latency_ms integer;

create index if not exists trips_user_status_created_idx
  on public.trips (user_id, status, created_at desc);

create index if not exists trips_public_share_token_idx
  on public.trips (share_token)
  where is_public = true and share_token is not null;

drop policy if exists "Public shared trips are readable" on public.trips;
create policy "Public shared trips are readable" on public.trips
  for select
  to anon, authenticated
  using (is_public = true and share_token is not null);

drop policy if exists "Public shared trip stops are readable" on public.trip_stops;
create policy "Public shared trip stops are readable" on public.trip_stops
  for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.trips
      where trips.id = trip_stops.trip_id
      and trips.is_public = true
      and trips.share_token is not null
    )
  );
