-- Registration records are accessible only through the server registration bridge.
-- Sites owns authentication; user_id is the stable, site-scoped Sites identity.
create table public.tt_profiles (
 site_id text not null,
 user_id text not null,
 name text not null check (char_length(name) between 2 and 60),
 email text not null,
 created_at bigint not null,
 updated_at bigint not null,
 primary key (site_id,user_id)
);
create table public.tt_shops (
 site_id text not null,
 id uuid not null default gen_random_uuid(),
 owner_id text not null,
 name text not null check (char_length(name) between 2 and 100),
 address text not null check (char_length(address) between 8 and 300),
 contact text not null check (char_length(contact) between 5 and 120),
 description text not null check (char_length(description) between 10 and 1000),
 lat double precision not null check (lat between -90 and 90),
 lng double precision not null check (lng between -180 and 180),
 status text not null default 'pending' check (status in ('pending','approved','rejected')),
 created_at bigint not null,
 primary key (site_id,id),
 unique (site_id,owner_id),
 foreign key (site_id,owner_id) references public.tt_profiles(site_id,user_id)
);
create index tt_shops_catalog on public.tt_shops(site_id,status);
alter table public.tt_profiles enable row level security;
alter table public.tt_shops enable row level security;
revoke all on public.tt_profiles,public.tt_shops from anon,authenticated;
create policy tt_profiles_no_browser_access on public.tt_profiles as restrictive for all to anon,authenticated using (false) with check (false);
create policy tt_shops_no_browser_access on public.tt_shops as restrictive for all to anon,authenticated using (false) with check (false);
grant select,insert,update on public.tt_profiles,public.tt_shops to service_role;
comment on table public.tt_profiles is 'Private registration data. Only the authenticated Sites server bridge may access it; no direct browser grants.';
comment on table public.tt_shops is 'Private merchant applications. Approval is controlled by the Sites administrator.';
