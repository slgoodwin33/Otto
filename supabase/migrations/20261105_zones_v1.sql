-- Zones: named areas you draw on the map (build .77).
-- Shape stored as a GeoJSON Polygon (RFC 7946, lng/lat order) plus a PostGIS geometry generated
-- from it, so the server (and Otto chat) can ask "what happened inside this zone".
-- Borrowed: Home Assistant / OwnTracks have zones as circles; a drawn polygon follows GeoJSON instead.
create sequence if not exists public.zones_code_seq;
create table public.zones (
  id bigint generated always as identity primary key,
  code text not null unique default ('ZN-' || lpad(nextval('public.zones_code_seq')::text, 5, '0')),
  name text not null check (length(trim(name)) between 1 and 80),
  geojson jsonb not null check (geojson->>'type' = 'Polygon'),
  geom geometry(Polygon, 4326) generated always as (st_setsrid(st_geomfromgeojson(geojson::text), 4326)) stored,
  notes text,
  created_at timestamptz not null default now()
);
create index zones_geom_idx on public.zones using gist (geom);
alter table public.zones enable row level security;
create policy zones_owner_all on public.zones for all
  using (lower(coalesce((select auth.jwt()) ->> 'email', '')) = 'slgoodwin33@gmail.com')
  with check (lower(coalesce((select auth.jwt()) ->> 'email', '')) = 'slgoodwin33@gmail.com');
