alter table public.resorts
  add column if not exists pass_affiliations text[] not null default '{}';
