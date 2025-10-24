-- Add offline token column if missing
alter table public.shops
  add column if not exists access_token_offline text;

-- Optional backfill from legacy access_token
update public.shops
  set access_token_offline = access_token
where access_token_offline is null and access_token is not null;

-- Normalize domain uniqueness (if not already present)
create unique index if not exists ux_shops_domain_norm
  on public.shops (lower(shop_domain));

-- Refresh PostgREST schema cache (execute once manually in SQL editor)
-- NOTIFY pgrst, 'reload schema';