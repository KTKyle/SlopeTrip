create extension if not exists "pgcrypto";

create type public.ability_level as enum ('beginner', 'intermediate', 'expert');
create type public.resort_region as enum ('northeast', 'midwest', 'rockies', 'west', 'pacific');
create type public.condition_source as enum ('seed', 'open-meteo', 'resort');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  seasons integer not null default 0 check (seasons >= 0 and seasons <= 80),
  ability_level public.ability_level not null default 'intermediate',
  rents_gear boolean not null default false,
  home_location_label text,
  home_latitude numeric(8, 5),
  home_longitude numeric(8, 5),
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_gear (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null,
  category text not null,
  notes text,
  created_at timestamptz not null default now()
);

create table public.resorts (
  id text primary key,
  name text not null,
  slug text not null unique,
  state text not null,
  region public.resort_region not null,
  latitude numeric(8, 5) not null,
  longitude numeric(8, 5) not null,
  elevation_ft integer not null,
  acres integer not null,
  trails integer not null,
  difficulty jsonb not null,
  ticket_estimate_usd integer not null,
  rental_estimate_usd integer not null,
  lodging_estimate_usd integer not null,
  image_url text not null,
  highlights text[] not null default '{}',
  pass_affiliations text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table public.resort_conditions (
  id uuid primary key default gen_random_uuid(),
  resort_id text not null references public.resorts(id) on delete cascade,
  snowfall_7_day_in numeric(5, 1) not null default 0,
  base_depth_in numeric(5, 1) not null default 0,
  temperature_f numeric(5, 1) not null default 32,
  source public.condition_source not null default 'seed',
  observed_at timestamptz not null default now()
);

create table public.trips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  days integer not null check (days >= 1 and days <= 14),
  budget_usd integer not null check (budget_usd >= 0),
  ability_level public.ability_level not null,
  include_rentals boolean not null default false,
  include_lodging boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.trip_stops (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  resort_id text not null references public.resorts(id) on delete restrict,
  stop_order integer not null check (stop_order >= 1),
  planned_day integer not null check (planned_day >= 1),
  estimated_cost_usd integer not null default 0,
  drive_minutes integer,
  notes text,
  unique (trip_id, stop_order)
);

create table public.ai_trip_recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  trip_id uuid references public.trips(id) on delete set null,
  request_summary jsonb not null,
  result_summary jsonb not null,
  model text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.user_gear enable row level security;
alter table public.resorts enable row level security;
alter table public.resort_conditions enable row level security;
alter table public.trips enable row level security;
alter table public.trip_stops enable row level security;
alter table public.ai_trip_recommendations enable row level security;

create policy "Profiles are self readable" on public.profiles
  for select using (auth.uid() = id);
create policy "Profiles are self writable" on public.profiles
  for insert with check (auth.uid() = id);
create policy "Profiles are self updatable" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

create policy "Gear is self readable" on public.user_gear
  for select using (auth.uid() = user_id);
create policy "Gear is self writable" on public.user_gear
  for insert with check (auth.uid() = user_id);
create policy "Gear is self updatable" on public.user_gear
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Gear is self deletable" on public.user_gear
  for delete using (auth.uid() = user_id);

create policy "Resorts are public read only" on public.resorts
  for select using (true);
create policy "Conditions are public read only" on public.resort_conditions
  for select using (true);

create policy "Trips are self readable" on public.trips
  for select using (auth.uid() = user_id);
create policy "Trips are self writable" on public.trips
  for insert with check (auth.uid() = user_id);
create policy "Trips are self updatable" on public.trips
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Trips are self deletable" on public.trips
  for delete using (auth.uid() = user_id);

create policy "Trip stops follow trip ownership" on public.trip_stops
  for select using (
    exists (
      select 1 from public.trips
      where trips.id = trip_stops.trip_id
      and trips.user_id = auth.uid()
    )
  );
create policy "Trip stops insert follow trip ownership" on public.trip_stops
  for insert with check (
    exists (
      select 1 from public.trips
      where trips.id = trip_stops.trip_id
      and trips.user_id = auth.uid()
    )
  );
create policy "Trip stops update follow trip ownership" on public.trip_stops
  for update using (
    exists (
      select 1 from public.trips
      where trips.id = trip_stops.trip_id
      and trips.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.trips
      where trips.id = trip_stops.trip_id
      and trips.user_id = auth.uid()
    )
  );
create policy "Trip stops delete follow trip ownership" on public.trip_stops
  for delete using (
    exists (
      select 1 from public.trips
      where trips.id = trip_stops.trip_id
      and trips.user_id = auth.uid()
    )
  );

create policy "AI recommendations are self readable" on public.ai_trip_recommendations
  for select using (auth.uid() = user_id);
create policy "AI recommendations are self writable" on public.ai_trip_recommendations
  for insert with check (auth.uid() = user_id);

create index resort_conditions_resort_observed_idx
  on public.resort_conditions (resort_id, observed_at desc);
create index trips_user_created_idx on public.trips (user_id, created_at desc);
create index trip_stops_trip_order_idx on public.trip_stops (trip_id, stop_order);
