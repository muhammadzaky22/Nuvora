-- NUVORA v0.4 — Business Platform
-- Jalankan SETELAH schema.sql v0.3 bila upgrading.
-- Untuk fresh install, schema.sql v0.4 juga sudah memuat struktur ini.

alter table public.profiles
  add column if not exists role text not null default 'customer'
  check (role in ('customer','admin'));

alter table public.invitations
  add column if not exists theme_id uuid;

create table if not exists public.themes (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  category text not null default 'General',
  description text default '',
  preview_url text default '',
  accent text not null default '#a98861',
  background text not null default '#f4eee7',
  featured boolean not null default false,
  status text not null default 'active' check (status in ('active','draft','archived')),
  sort_order integer not null default 0,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  price bigint not null default 0 check (price >= 0),
  description text default '',
  features jsonb not null default '[]'::jsonb,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_no text not null unique default ('NV-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,10))),
  customer_id uuid not null references public.profiles(id) on delete cascade,
  invitation_id uuid references public.invitations(id) on delete set null,
  theme_id uuid references public.themes(id) on delete set null,
  plan_id uuid references public.plans(id) on delete set null,
  status text not null default 'pending' check (status in ('pending','confirmed','processing','completed','cancelled')),
  amount bigint not null default 0 check (amount >= 0),
  notes text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname='invitations_theme_id_fkey'
  ) then
    alter table public.invitations
      add constraint invitations_theme_id_fkey foreign key (theme_id) references public.themes(id) on delete set null;
  end if;
end $$;

create index if not exists themes_status_sort_idx on public.themes(status,sort_order);
create index if not exists orders_customer_idx on public.orders(customer_id);
create index if not exists orders_status_idx on public.orders(status,created_at desc);

alter table public.themes enable row level security;
alter table public.plans enable row level security;
alter table public.orders enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists(
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role='admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- Public/authenticated users may browse active themes and active plans.
create policy "themes_public_read_active" on public.themes for select to anon,authenticated
using (status='active');
create policy "themes_admin_read_all" on public.themes for select to authenticated
using (public.is_admin());

create policy "plans_public_read_active" on public.plans for select to anon,authenticated
using (active=true);
create policy "plans_admin_read_all" on public.plans for select to authenticated
using (public.is_admin());

-- Admin manages catalog and plans.
create policy "themes_admin_insert" on public.themes for insert to authenticated
with check (public.is_admin());
create policy "themes_admin_update" on public.themes for update to authenticated
using (public.is_admin()) with check (public.is_admin());
create policy "themes_admin_delete" on public.themes for delete to authenticated
using (public.is_admin());

create policy "plans_admin_insert" on public.plans for insert to authenticated
with check (public.is_admin());
create policy "plans_admin_update" on public.plans for update to authenticated
using (public.is_admin()) with check (public.is_admin());
create policy "plans_admin_delete" on public.plans for delete to authenticated
using (public.is_admin());

-- Orders: customer owns their order; admin sees/manages all.
create policy "orders_customer_select" on public.orders for select to authenticated
using ((select auth.uid())=customer_id or public.is_admin());
create policy "orders_admin_insert" on public.orders for insert to authenticated
with check (public.is_admin());
create policy "orders_admin_update" on public.orders for update to authenticated
using (public.is_admin()) with check (public.is_admin());
create policy "orders_admin_delete" on public.orders for delete to authenticated
using (public.is_admin());

-- Admin can read all profiles and invitations for operational needs.
create policy "profiles_admin_select" on public.profiles for select to authenticated
using (public.is_admin());

create policy "inv_admin_select" on public.invitations for select to authenticated
using (public.is_admin());

-- Prevent customers from assigning themselves admin via direct client update.
revoke update on public.profiles from authenticated;
grant update(full_name) on public.profiles to authenticated;


-- Secure order creation: price is always read from the selected plan.
create or replace function public.create_order(
  p_theme_id uuid,
  p_plan_id uuid,
  p_invitation_id uuid default null,
  p_notes text default ''
)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_amount bigint;
  v_order public.orders;
begin
  if v_user is null then
    raise exception 'Authentication required';
  end if;

  select p.price into v_amount
  from public.plans p
  where p.id = p_plan_id and p.active = true;

  if v_amount is null then
    raise exception 'Plan not available';
  end if;

  if not exists (
    select 1 from public.themes t
    where t.id = p_theme_id and t.status='active'
  ) then
    raise exception 'Theme not available';
  end if;

  if p_invitation_id is not null and not exists (
    select 1 from public.invitations i
    where i.id=p_invitation_id and i.owner_id=v_user
  ) then
    raise exception 'Invitation not owned by current user';
  end if;

  insert into public.orders (
    customer_id, invitation_id, theme_id, plan_id, status, amount, notes
  ) values (
    v_user, p_invitation_id, p_theme_id, p_plan_id, 'pending', v_amount, coalesce(p_notes,'')
  )
  returning * into v_order;

  return v_order;
end;
$$;

revoke all on function public.create_order(uuid,uuid,uuid,text) from public;
grant execute on function public.create_order(uuid,uuid,uuid,text) to authenticated;

grant select on public.themes to anon,authenticated;
grant select on public.plans to anon,authenticated;
grant insert,update,delete on public.themes to authenticated;
grant insert,update,delete on public.plans to authenticated;
grant select,update,delete on public.orders to authenticated;

-- Seed themes
insert into public.themes (slug,name,category,description,accent,background,featured,status,sort_order,config)
values
('ivory-atelier','Ivory Atelier','Elegant','Ivory hangat dengan detail editorial premium.','#9b7c58','#f4eee7',true,'active',1,'{"background":"#f4eee7","accent":"#9b7c58"}'),
('noir-editorial','Noir Editorial','Modern','Dark editorial modern untuk tampilan tegas.','#d2b07a','#17151b',true,'active',2,'{"background":"#17151b","accent":"#d2b07a"}'),
('sage-garden','Sage Garden','Nature','Sage natural yang tenang dan minimal.','#62735d','#dfe6dc',true,'active',3,'{"background":"#dfe6dc","accent":"#62735d"}'),
('rose-amour','Rose Amour','Floral','Soft romantic dengan nuansa blush.','#9a6d72','#ead7d5',false,'active',4,'{"background":"#ead7d5","accent":"#9a6d72"}'),
('ocean-clean','Ocean Clean','Minimalist','Clean dan fresh dengan palet biru lembut.','#557181','#dbe6ec',false,'active',5,'{"background":"#dbe6ec","accent":"#557181"}'),
('terracotta-vows','Terracotta Vows','Rustic','Earth tone hangat untuk konsep rustic.','#985f49','#ead6cb',false,'active',6,'{"background":"#ead6cb","accent":"#985f49"}')
on conflict (slug) do nothing;

insert into public.plans (code,name,price,description,features,active,sort_order)
values
('essential','Essential',149000,'Undangan sederhana dan elegan','["1 tema","Nama tamu personal","Countdown","Maps","Galeri","Gift"]',true,1),
('premium','Premium',249000,'Untuk kebutuhan acara lengkap','["Semua Essential","RSVP","Ucapan","Guest Management","Love Story","2x revisi"]',true,2),
('signature','Signature',399000,'Lebih custom dan premium','["Semua Premium","Layout custom","QR Pass","Check-in","3x revisi"]',true,3)
on conflict (code) do nothing;

-- IMPORTANT:
-- Setelah membuat akun admin, jalankan manual sekali:
-- update public.profiles set role='admin' where id='<UUID_USER_ADMIN>';
