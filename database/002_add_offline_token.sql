-- Add offline token column to shops table
-- This migration adds access_token_offline for Vapi calls and ensures proper indexing

-- Add access_token_offline column if it doesn't exist
alter table public.shops
  add column if not exists access_token_offline text;

-- Backfill from access_token where offline is null
update public.shops
set access_token_offline = access_token
where access_token_offline is null and access_token is not null;

-- Add unique index on normalized shop domain for consistent lookups
create unique index if not exists ux_shops_domain_norm
  on public.shops (lower(shop_domain));

-- Add comment for documentation
comment on column public.shops.access_token_offline is 'Offline access token for Vapi calls and background operations';
comment on index ux_shops_domain_norm is 'Unique index on normalized shop domain for consistent lookups';
