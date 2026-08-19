-- NUVORA v0.2 — DATABASE BARU DARI NOL
-- Jalankan seluruh file ini di SQL Editor pada project Supabase BARU.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text default '',
  created_at timestamptz not null default now()
);

create table if not exists public.invitations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  slug text not null unique,
  event_type text not null default 'Pernikahan',
  title text not null,
  event_date date,
  location text default '',
  style text not null default 'Ivory',
  accent text not null default '#a98861',
  cover_url text default '',
  description text default '',
  status text not null default 'draft' check (status in ('draft','published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.guests (
  id uuid primary key default gen_random_uuid(),
  invitation_id uuid not null references public.invitations(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  group_name text default '',
  phone text default '',
  guest_count integer not null default 1 check (guest_count between 1 and 20),
  token uuid not null default gen_random_uuid(),
  checked_in_at timestamptz,
  checked_in_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.rsvps (
  id uuid primary key default gen_random_uuid(),
  invitation_id uuid not null references public.invitations(id) on delete cascade,
  guest_name text not null,
  attendance text not null check (attendance in ('hadir','tidak_hadir')),
  guest_count integer not null default 1 check (guest_count between 1 and 20),
  message text default '',
  created_at timestamptz not null default now()
);

create table if not exists public.wishes (
  id uuid primary key default gen_random_uuid(),
  invitation_id uuid not null references public.invitations(id) on delete cascade,
  guest_name text not null,
  message text not null,
  created_at timestamptz not null default now()
);

create index if not exists invitations_owner_idx on public.invitations(owner_id);
create index if not exists invitations_slug_idx on public.invitations(slug);
create index if not exists guests_owner_idx on public.guests(owner_id);
create index if not exists guests_invitation_idx on public.guests(invitation_id);
create index if not exists guests_token_idx on public.guests(token);
create index if not exists guests_checked_in_idx on public.guests(invitation_id,checked_in_at);
create index if not exists rsvps_invitation_idx on public.rsvps(invitation_id);
create index if not exists wishes_invitation_idx on public.wishes(invitation_id);

alter table public.profiles enable row level security;
alter table public.invitations enable row level security;
alter table public.guests enable row level security;
alter table public.rsvps enable row level security;
alter table public.wishes enable row level security;

-- Profiles
create policy "profile_select_own" on public.profiles for select to authenticated
using ((select auth.uid()) = id);
create policy "profile_insert_own" on public.profiles for insert to authenticated
with check ((select auth.uid()) = id);
create policy "profile_update_own" on public.profiles for update to authenticated
using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- Invitations: owner can CRUD their rows.
create policy "inv_owner_select" on public.invitations for select to authenticated
using ((select auth.uid()) = owner_id);
create policy "inv_owner_insert" on public.invitations for insert to authenticated
with check ((select auth.uid()) = owner_id);
create policy "inv_owner_update" on public.invitations for update to authenticated
using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy "inv_owner_delete" on public.invitations for delete to authenticated
using ((select auth.uid()) = owner_id);

-- Public can read only published invitations.
create policy "inv_public_read_published" on public.invitations for select to anon
using (status = 'published');
create policy "inv_auth_read_published" on public.invitations for select to authenticated
using (status = 'published');

-- Guests: only the owner.
create policy "guest_owner_select" on public.guests for select to authenticated
using ((select auth.uid()) = owner_id);
create policy "guest_owner_insert" on public.guests for insert to authenticated
with check (
  (select auth.uid()) = owner_id
  and exists (
    select 1 from public.invitations i
    where i.id = invitation_id and i.owner_id = (select auth.uid())
  )
);
create policy "guest_owner_update" on public.guests for update to authenticated
using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy "guest_owner_delete" on public.guests for delete to authenticated
using ((select auth.uid()) = owner_id);

-- RSVP: public insert only when invitation is published; owner can read.
create policy "rsvp_public_insert" on public.rsvps for insert to anon
with check (exists (select 1 from public.invitations i where i.id = invitation_id and i.status='published'));
create policy "rsvp_auth_insert" on public.rsvps for insert to authenticated
with check (exists (select 1 from public.invitations i where i.id = invitation_id and i.status='published'));
create policy "rsvp_owner_select" on public.rsvps for select to authenticated
using (exists (select 1 from public.invitations i where i.id = invitation_id and i.owner_id = (select auth.uid())));

-- Wishes: public insert/read for published invitation; owner can read.
create policy "wish_public_insert" on public.wishes for insert to anon
with check (exists (select 1 from public.invitations i where i.id = invitation_id and i.status='published'));
create policy "wish_auth_insert" on public.wishes for insert to authenticated
with check (exists (select 1 from public.invitations i where i.id = invitation_id and i.status='published'));
create policy "wish_public_select" on public.wishes for select to anon
using (exists (select 1 from public.invitations i where i.id = invitation_id and i.status='published'));
create policy "wish_auth_public_select" on public.wishes for select to authenticated
using (exists (select 1 from public.invitations i where i.id = invitation_id and i.status='published'));
create policy "wish_owner_select" on public.wishes for select to authenticated
using (exists (select 1 from public.invitations i where i.id = invitation_id and i.owner_id = (select auth.uid())));

grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.invitations to authenticated;
grant select, insert, update, delete on public.guests to authenticated;
grant select, insert on public.rsvps to authenticated;
grant select, insert on public.wishes to authenticated;

grant select on public.invitations to anon;
grant insert on public.rsvps to anon;
grant select, insert on public.wishes to anon;

-- Public media bucket for invitation covers.
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('media','media',true,5242880,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public=true,file_size_limit=5242880,allowed_mime_types=array['image/jpeg','image/png','image/webp'];

create policy "media_upload_own_folder" on storage.objects for insert to authenticated
with check (bucket_id='media' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "media_update_own_folder" on storage.objects for update to authenticated
using (bucket_id='media' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "media_delete_own_folder" on storage.objects for delete to authenticated
using (bucket_id='media' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- Create profile automatically at signup.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id,full_name)
  values (new.id,coalesce(new.raw_user_meta_data->>'full_name',''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- ===== NUVORA v0.4 BUSINESS LAYER =====
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

-- ===== NUVORA v0.5 FUNCTIONAL CONTENT & OPERATIONS =====
-- NUVORA v0.5 — Editor Content, Revision, Manual Payment & Invoice
-- Jalankan setelah v0.4 jika upgrade.

alter table public.invitations
  add column if not exists content jsonb not null default '{}'::jsonb;

create table if not exists public.order_messages (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  author_role text not null check (author_role in ('customer','admin')),
  message text not null check (char_length(message) between 1 and 5000),
  created_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  customer_id uuid not null references public.profiles(id) on delete cascade,
  amount bigint not null check (amount >= 0),
  method text not null default 'Transfer Bank',
  proof_path text not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  review_note text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists order_messages_order_idx on public.order_messages(order_id,created_at);
create index if not exists payments_customer_idx on public.payments(customer_id,created_at desc);
create index if not exists payments_order_idx on public.payments(order_id);

alter table public.order_messages enable row level security;
alter table public.payments enable row level security;

create policy "messages_participant_read" on public.order_messages for select to authenticated
using (
  public.is_admin()
  or exists(select 1 from public.orders o where o.id=order_id and o.customer_id=(select auth.uid()))
);

create policy "payments_customer_read" on public.payments for select to authenticated
using ((select auth.uid())=customer_id or public.is_admin());

create policy "payments_admin_update" on public.payments for update to authenticated
using (public.is_admin()) with check (public.is_admin());

grant select on public.order_messages to authenticated;
grant select,update on public.payments to authenticated;

create or replace function public.add_order_message(p_order_id uuid,p_message text)
returns public.order_messages
language plpgsql
security definer
set search_path=''
as $$
declare
  v_user uuid:=auth.uid();
  v_role text;
  v_row public.order_messages;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  select role into v_role from public.profiles where id=v_user;
  if v_role is null then raise exception 'Profile not found'; end if;

  if not (
    v_role='admin'
    or exists(select 1 from public.orders o where o.id=p_order_id and o.customer_id=v_user)
  ) then raise exception 'Not allowed'; end if;

  if char_length(trim(p_message)) < 1 then raise exception 'Message required'; end if;

  insert into public.order_messages(order_id,author_id,author_role,message)
  values(p_order_id,v_user,v_role,trim(p_message))
  returning * into v_row;
  return v_row;
end;
$$;
revoke all on function public.add_order_message(uuid,text) from public;
grant execute on function public.add_order_message(uuid,text) to authenticated;

create or replace function public.submit_payment(p_order_id uuid,p_method text,p_proof_path text)
returns public.payments
language plpgsql
security definer
set search_path=''
as $$
declare
  v_user uuid:=auth.uid();
  v_amount bigint;
  v_row public.payments;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  select amount into v_amount from public.orders
  where id=p_order_id and customer_id=v_user and status<>'cancelled';
  if v_amount is null then raise exception 'Order not available'; end if;
  if coalesce(trim(p_proof_path),'')='' then raise exception 'Proof required'; end if;

  insert into public.payments(order_id,customer_id,amount,method,proof_path,status)
  values(p_order_id,v_user,v_amount,coalesce(nullif(trim(p_method),''),'Transfer Bank'),p_proof_path,'pending')
  returning * into v_row;
  return v_row;
end;
$$;
revoke all on function public.submit_payment(uuid,text,text) from public;
grant execute on function public.submit_payment(uuid,text,text) to authenticated;

create or replace function public.review_payment(p_payment_id uuid,p_status text,p_note text default '')
returns public.payments
language plpgsql
security definer
set search_path=''
as $$
declare
  v_row public.payments;
begin
  if not public.is_admin() then raise exception 'Admin only'; end if;
  if p_status not in ('approved','rejected') then raise exception 'Invalid payment status'; end if;

  update public.payments
  set status=p_status,review_note=coalesce(p_note,''),updated_at=now()
  where id=p_payment_id
  returning * into v_row;

  if v_row.id is null then raise exception 'Payment not found'; end if;

  if p_status='approved' then
    update public.orders
    set status=case when status='pending' then 'confirmed' else status end,
        updated_at=now()
    where id=v_row.order_id;
  end if;

  return v_row;
end;
$$;
revoke all on function public.review_payment(uuid,text,text) from public;
grant execute on function public.review_payment(uuid,text,text) to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values(
  'payment-proofs','payment-proofs',false,8388608,
  array['image/jpeg','image/png','image/webp','application/pdf']
)
on conflict(id) do update set public=false,file_size_limit=8388608,allowed_mime_types=array['image/jpeg','image/png','image/webp','application/pdf'];

create policy "payment_proof_upload_own" on storage.objects for insert to authenticated
with check(bucket_id='payment-proofs' and (storage.foldername(name))[1]=(select auth.uid())::text);

create policy "payment_proof_read_owner_admin" on storage.objects for select to authenticated
using(
  bucket_id='payment-proofs'
  and (
    (storage.foldername(name))[1]=(select auth.uid())::text
    or public.is_admin()
  )
);

create policy "payment_proof_delete_owner_admin" on storage.objects for delete to authenticated
using(
  bucket_id='payment-proofs'
  and (
    (storage.foldername(name))[1]=(select auth.uid())::text
    or public.is_admin()
  )
);

update storage.buckets
set file_size_limit=6291456,
    allowed_mime_types=array['image/jpeg','image/png','image/webp']
where id='media';


create table if not exists public.platform_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.platform_settings enable row level security;

create policy "settings_auth_read" on public.platform_settings for select to authenticated
using (true);

create policy "settings_admin_insert" on public.platform_settings for insert to authenticated
with check (public.is_admin());

create policy "settings_admin_update" on public.platform_settings for update to authenticated
using (public.is_admin()) with check (public.is_admin());

grant select,insert,update on public.platform_settings to authenticated;

insert into public.platform_settings(key,value)
values('payment','{"bank_name":"","account_number":"","account_holder":"","qris_image_url":"","payment_note":"Silakan transfer sesuai total invoice lalu upload bukti pembayaran."}'::jsonb)
on conflict(key) do nothing;

-- ===== NUVORA v0.6 ANALYTICS / NOTIFICATIONS / DESIGN APPROVAL =====
-- NUVORA v0.6 — Analytics, In-App Notifications, Design Approval
-- Jalankan setelah v0.5 jika upgrade.

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null default 'info',
  title text not null,
  message text not null default '',
  entity_type text default '',
  entity_id uuid,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.design_reviews (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  invitation_id uuid not null references public.invitations(id) on delete cascade,
  version integer not null check (version > 0),
  status text not null default 'pending'
    check (status in ('pending','approved','changes_requested')),
  admin_note text default '',
  customer_note text default '',
  created_by uuid not null references public.profiles(id) on delete restrict,
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(order_id,version)
);

create table if not exists public.analytics_events (
  id bigint generated by default as identity primary key,
  invitation_id uuid not null references public.invitations(id) on delete cascade,
  event_type text not null
    check (event_type in ('open','rsvp','wish','maps','streaming','gift_copy','guest_pass_view')),
  session_id text not null check (char_length(session_id) between 8 and 120),
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_unread_idx
  on public.notifications(user_id,read_at,created_at desc);
create index if not exists design_reviews_order_idx
  on public.design_reviews(order_id,created_at desc);
create index if not exists analytics_invitation_idx
  on public.analytics_events(invitation_id,created_at desc);
create index if not exists analytics_event_idx
  on public.analytics_events(invitation_id,event_type);

alter table public.notifications enable row level security;
alter table public.design_reviews enable row level security;
alter table public.analytics_events enable row level security;

-- Notifications: users see and mark only their own rows.
create policy "notifications_read_own" on public.notifications for select to authenticated
using ((select auth.uid())=user_id);

create policy "notifications_update_own" on public.notifications for update to authenticated
using ((select auth.uid())=user_id)
with check ((select auth.uid())=user_id);

revoke update on public.notifications from authenticated;
grant select on public.notifications to authenticated;
grant update(read_at) on public.notifications to authenticated;

-- Design reviews: admin sees all; customer sees reviews belonging to their order.
create policy "design_reviews_read_participant" on public.design_reviews for select to authenticated
using (
  public.is_admin()
  or exists(
    select 1 from public.orders o
    where o.id=order_id and o.customer_id=(select auth.uid())
  )
);

grant select on public.design_reviews to authenticated;

-- Public analytics events contain no guest name/email/phone.
create policy "analytics_public_insert_published" on public.analytics_events for insert to anon,authenticated
with check (
  exists(
    select 1 from public.invitations i
    where i.id=invitation_id and i.status='published'
  )
);

create policy "analytics_owner_read" on public.analytics_events for select to authenticated
using (
  public.is_admin()
  or exists(
    select 1 from public.invitations i
    where i.id=invitation_id and i.owner_id=(select auth.uid())
  )
);

grant insert on public.analytics_events to anon,authenticated;
grant select on public.analytics_events to authenticated;

-- Internal notification helpers. Not directly executable by frontend users.
create or replace function public.notify_user(
  p_user_id uuid,
  p_type text,
  p_title text,
  p_message text,
  p_entity_type text default '',
  p_entity_id uuid default null
)
returns void
language plpgsql
security definer
set search_path=''
as $$
begin
  if p_user_id is null then return; end if;
  insert into public.notifications(user_id,type,title,message,entity_type,entity_id)
  values(p_user_id,coalesce(p_type,'info'),coalesce(p_title,'Notifikasi'),coalesce(p_message,''),coalesce(p_entity_type,''),p_entity_id);
end;
$$;

create or replace function public.notify_admins(
  p_type text,
  p_title text,
  p_message text,
  p_entity_type text default '',
  p_entity_id uuid default null
)
returns void
language plpgsql
security definer
set search_path=''
as $$
begin
  insert into public.notifications(user_id,type,title,message,entity_type,entity_id)
  select p.id,coalesce(p_type,'info'),coalesce(p_title,'Notifikasi'),coalesce(p_message,''),coalesce(p_entity_type,''),p_entity_id
  from public.profiles p
  where p.role='admin';
end;
$$;

revoke all on function public.notify_user(uuid,text,text,text,text,uuid) from public;
revoke all on function public.notify_admins(text,text,text,text,uuid) from public;

-- Replace order creation so admin receives an in-app notification.
create or replace function public.create_order(
  p_theme_id uuid,
  p_plan_id uuid,
  p_invitation_id uuid default null,
  p_notes text default ''
)
returns public.orders
language plpgsql
security definer
set search_path=''
as $$
declare
  v_user uuid := auth.uid();
  v_amount bigint;
  v_order public.orders;
begin
  if v_user is null then raise exception 'Authentication required'; end if;

  select p.price into v_amount
  from public.plans p
  where p.id=p_plan_id and p.active=true;
  if v_amount is null then raise exception 'Plan not available'; end if;

  if not exists(select 1 from public.themes t where t.id=p_theme_id and t.status='active')
    then raise exception 'Theme not available'; end if;

  if p_invitation_id is not null and not exists(
    select 1 from public.invitations i
    where i.id=p_invitation_id and i.owner_id=v_user
  ) then raise exception 'Invitation not owned by current user'; end if;

  insert into public.orders(customer_id,invitation_id,theme_id,plan_id,status,amount,notes)
  values(v_user,p_invitation_id,p_theme_id,p_plan_id,'pending',v_amount,coalesce(p_notes,''))
  returning * into v_order;

  perform public.notify_admins(
    'order_new','Order baru',
    'Order '||coalesce(v_order.order_no,'')||' baru masuk.',
    'order',v_order.id
  );
  return v_order;
end;
$$;
revoke all on function public.create_order(uuid,uuid,uuid,text) from public;
grant execute on function public.create_order(uuid,uuid,uuid,text) to authenticated;

-- Admin status update goes through RPC to avoid arbitrary customer updates.
create or replace function public.update_order_status(p_order_id uuid,p_status text)
returns public.orders
language plpgsql
security definer
set search_path=''
as $$
declare
  v_order public.orders;
begin
  if not public.is_admin() then raise exception 'Admin only'; end if;
  if p_status not in ('pending','confirmed','processing','completed','cancelled')
    then raise exception 'Invalid order status'; end if;

  update public.orders
  set status=p_status,updated_at=now()
  where id=p_order_id
  returning * into v_order;

  if v_order.id is null then raise exception 'Order not found'; end if;

  perform public.notify_user(
    v_order.customer_id,'order_status','Status order diperbarui',
    'Order '||coalesce(v_order.order_no,'')||' sekarang '||p_status||'.',
    'order',v_order.id
  );
  return v_order;
end;
$$;
revoke all on function public.update_order_status(uuid,text) from public;
grant execute on function public.update_order_status(uuid,text) to authenticated;

-- Replace chat RPC so the opposite side gets notified.
create or replace function public.add_order_message(p_order_id uuid,p_message text)
returns public.order_messages
language plpgsql
security definer
set search_path=''
as $$
declare
  v_user uuid:=auth.uid();
  v_role text;
  v_order public.orders;
  v_row public.order_messages;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  select role into v_role from public.profiles where id=v_user;
  if v_role is null then raise exception 'Profile not found'; end if;
  select * into v_order from public.orders where id=p_order_id;
  if v_order.id is null then raise exception 'Order not found'; end if;

  if not (v_role='admin' or v_order.customer_id=v_user)
    then raise exception 'Not allowed'; end if;
  if char_length(trim(p_message))<1 then raise exception 'Message required'; end if;

  insert into public.order_messages(order_id,author_id,author_role,message)
  values(p_order_id,v_user,v_role,trim(p_message))
  returning * into v_row;

  if v_role='admin' then
    perform public.notify_user(
      v_order.customer_id,'order_message','Pesan baru dari admin',
      left(trim(p_message),160),'order',p_order_id
    );
  else
    perform public.notify_admins(
      'order_message','Pesan baru dari pelanggan',
      left(trim(p_message),160),'order',p_order_id
    );
  end if;

  return v_row;
end;
$$;
revoke all on function public.add_order_message(uuid,text) from public;
grant execute on function public.add_order_message(uuid,text) to authenticated;

-- Replace payment submission so admins are notified.
create or replace function public.submit_payment(p_order_id uuid,p_method text,p_proof_path text)
returns public.payments
language plpgsql
security definer
set search_path=''
as $$
declare
  v_user uuid:=auth.uid();
  v_amount bigint;
  v_order_no text;
  v_row public.payments;
begin
  if v_user is null then raise exception 'Authentication required'; end if;

  select amount,order_no into v_amount,v_order_no
  from public.orders
  where id=p_order_id and customer_id=v_user and status<>'cancelled';

  if v_amount is null then raise exception 'Order not available'; end if;
  if coalesce(trim(p_proof_path),'')='' then raise exception 'Proof required'; end if;

  insert into public.payments(order_id,customer_id,amount,method,proof_path,status)
  values(p_order_id,v_user,v_amount,coalesce(nullif(trim(p_method),''),'Transfer Bank'),p_proof_path,'pending')
  returning * into v_row;

  perform public.notify_admins(
    'payment_new','Bukti pembayaran baru',
    'Bukti untuk '||coalesce(v_order_no,'order')||' menunggu review.',
    'payment',v_row.id
  );
  return v_row;
end;
$$;
revoke all on function public.submit_payment(uuid,text,text) from public;
grant execute on function public.submit_payment(uuid,text,text) to authenticated;

-- Replace payment review so customer is notified.
create or replace function public.review_payment(p_payment_id uuid,p_status text,p_note text default '')
returns public.payments
language plpgsql
security definer
set search_path=''
as $$
declare
  v_row public.payments;
  v_order public.orders;
begin
  if not public.is_admin() then raise exception 'Admin only'; end if;
  if p_status not in ('approved','rejected') then raise exception 'Invalid payment status'; end if;

  update public.payments
  set status=p_status,review_note=coalesce(p_note,''),updated_at=now()
  where id=p_payment_id
  returning * into v_row;

  if v_row.id is null then raise exception 'Payment not found'; end if;

  select * into v_order from public.orders where id=v_row.order_id;

  if p_status='approved' then
    update public.orders
    set status=case when status='pending' then 'confirmed' else status end,updated_at=now()
    where id=v_row.order_id
    returning * into v_order;
  end if;

  perform public.notify_user(
    v_row.customer_id,'payment_review',
    case when p_status='approved' then 'Pembayaran diterima' else 'Pembayaran perlu diperbaiki' end,
    coalesce(nullif(p_note,''),'Pembayaran '||coalesce(v_order.order_no,'')||' '||p_status||'.'),
    'payment',v_row.id
  );

  return v_row;
end;
$$;
revoke all on function public.review_payment(uuid,text,text) from public;
grant execute on function public.review_payment(uuid,text,text) to authenticated;

-- Admin connects an order to one project owned by that order customer.
create or replace function public.assign_order_invitation(p_order_id uuid,p_invitation_id uuid)
returns public.orders
language plpgsql
security definer
set search_path=''
as $$
declare
  v_order public.orders;
  v_title text;
begin
  if not public.is_admin() then raise exception 'Admin only'; end if;
  select * into v_order from public.orders where id=p_order_id;
  if v_order.id is null then raise exception 'Order not found'; end if;

  select title into v_title from public.invitations
  where id=p_invitation_id and owner_id=v_order.customer_id;
  if v_title is null then raise exception 'Invitation must belong to this customer'; end if;

  update public.orders
  set invitation_id=p_invitation_id,updated_at=now()
  where id=p_order_id
  returning * into v_order;

  perform public.notify_user(
    v_order.customer_id,'order_assignment','Project dihubungkan',
    'Order '||coalesce(v_order.order_no,'')||' sudah dihubungkan ke project '||v_title||'.',
    'order',v_order.id
  );
  return v_order;
end;
$$;
revoke all on function public.assign_order_invitation(uuid,uuid) from public;
grant execute on function public.assign_order_invitation(uuid,uuid) to authenticated;

create or replace function public.create_design_review(p_order_id uuid,p_note text default '')
returns public.design_reviews
language plpgsql
security definer
set search_path=''
as $$
declare
  v_order public.orders;
  v_version integer;
  v_row public.design_reviews;
begin
  if not public.is_admin() then raise exception 'Admin only'; end if;
  select * into v_order from public.orders where id=p_order_id;
  if v_order.id is null then raise exception 'Order not found'; end if;
  if v_order.invitation_id is null then raise exception 'Assign invitation first'; end if;

  select coalesce(max(version),0)+1 into v_version
  from public.design_reviews where order_id=p_order_id;

  insert into public.design_reviews(
    order_id,invitation_id,version,status,admin_note,created_by
  ) values(
    p_order_id,v_order.invitation_id,v_version,'pending',coalesce(p_note,''),auth.uid()
  ) returning * into v_row;

  perform public.notify_user(
    v_order.customer_id,'design_review','Desain siap direview',
    'Versi '||v_version||' dari '||coalesce(v_order.order_no,'order')||' menunggu persetujuan.',
    'design_review',v_row.id
  );
  return v_row;
end;
$$;
revoke all on function public.create_design_review(uuid,text) from public;
grant execute on function public.create_design_review(uuid,text) to authenticated;

create or replace function public.respond_design_review(
  p_review_id uuid,
  p_status text,
  p_note text default ''
)
returns public.design_reviews
language plpgsql
security definer
set search_path=''
as $$
declare
  v_user uuid:=auth.uid();
  v_order public.orders;
  v_row public.design_reviews;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if p_status not in ('approved','changes_requested')
    then raise exception 'Invalid review response'; end if;

  select o.* into v_order
  from public.orders o
  join public.design_reviews r on r.order_id=o.id
  where r.id=p_review_id;

  if v_order.id is null or v_order.customer_id<>v_user
    then raise exception 'Not allowed'; end if;

  update public.design_reviews
  set status=p_status,customer_note=coalesce(p_note,''),responded_at=now(),updated_at=now()
  where id=p_review_id and status='pending'
  returning * into v_row;

  if v_row.id is null then raise exception 'Review is no longer pending'; end if;

  perform public.notify_admins(
    'design_response',
    case when p_status='approved' then 'Desain disetujui' else 'Perubahan desain diminta' end,
    coalesce(v_order.order_no,'Order')||': '||coalesce(nullif(p_note,''),p_status),
    'design_review',v_row.id
  );
  return v_row;
end;
$$;
revoke all on function public.respond_design_review(uuid,text,text) from public;
grant execute on function public.respond_design_review(uuid,text,text) to authenticated;


-- ===== NUVORA v0.7 PRODUCTION / PREFS / RELEASE PREP =====
-- NUVORA v0.7 — Production Lifecycle, Notification Preferences, Android Release Prep
-- Jalankan setelah v0.6 jika upgrade.

alter table public.profiles
  add column if not exists notification_preferences jsonb not null
  default '{"orders":true,"payments":true,"messages":true,"design":true,"production":true}'::jsonb;

create table if not exists public.production_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  stage text not null check (
    stage in (
      'brief_received','designing','review','revision',
      'finalizing','published','completed'
    )
  ),
  note text default '',
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

create index if not exists production_events_order_idx
  on public.production_events(order_id,created_at);

alter table public.production_events enable row level security;

create policy "production_read_participant" on public.production_events for select to authenticated
using (
  public.is_admin()
  or exists(
    select 1 from public.orders o
    where o.id=order_id and o.customer_id=(select auth.uid())
  )
);

grant select on public.production_events to authenticated;

-- Notification helper with per-user preferences.
create or replace function public.notify_user(
  p_user_id uuid,
  p_type text,
  p_title text,
  p_message text,
  p_entity_type text default '',
  p_entity_id uuid default null
)
returns void
language plpgsql
security definer
set search_path=''
as $$
declare
  v_category text;
  v_enabled boolean := true;
begin
  if p_user_id is null then return; end if;

  v_category := case
    when p_type in ('order_new','order_status','order_assignment') then 'orders'
    when p_type in ('payment_new','payment_review') then 'payments'
    when p_type='order_message' then 'messages'
    when p_type in ('design_review','design_response') then 'design'
    when p_type='production_update' then 'production'
    else ''
  end;

  if v_category<>'' then
    select case
      when coalesce(notification_preferences->>v_category,'true')='false' then false
      else true
    end
    into v_enabled
    from public.profiles
    where id=p_user_id;
  end if;

  if coalesce(v_enabled,true) then
    insert into public.notifications(user_id,type,title,message,entity_type,entity_id)
    values(
      p_user_id,
      coalesce(p_type,'info'),
      coalesce(p_title,'Notifikasi'),
      coalesce(p_message,''),
      coalesce(p_entity_type,''),
      p_entity_id
    );
  end if;
end;
$$;

create or replace function public.notify_admins(
  p_type text,
  p_title text,
  p_message text,
  p_entity_type text default '',
  p_entity_id uuid default null
)
returns void
language plpgsql
security definer
set search_path=''
as $$
declare
  v_category text;
begin
  v_category := case
    when p_type in ('order_new','order_status','order_assignment') then 'orders'
    when p_type in ('payment_new','payment_review') then 'payments'
    when p_type='order_message' then 'messages'
    when p_type in ('design_review','design_response') then 'design'
    when p_type='production_update' then 'production'
    else ''
  end;

  insert into public.notifications(user_id,type,title,message,entity_type,entity_id)
  select
    p.id,
    coalesce(p_type,'info'),
    coalesce(p_title,'Notifikasi'),
    coalesce(p_message,''),
    coalesce(p_entity_type,''),
    p_entity_id
  from public.profiles p
  where p.role='admin'
    and (
      v_category=''
      or coalesce(p.notification_preferences->>v_category,'true')<>'false'
    );
end;
$$;

revoke all on function public.notify_user(uuid,text,text,text,text,uuid) from public;
revoke all on function public.notify_admins(text,text,text,text,uuid) from public;

create or replace function public.update_notification_preferences(p_preferences jsonb)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_user uuid:=auth.uid();
  v_clean jsonb;
begin
  if v_user is null then raise exception 'Authentication required'; end if;

  v_clean:=jsonb_build_object(
    'orders', case when p_preferences->>'orders'='false' then false else true end,
    'payments', case when p_preferences->>'payments'='false' then false else true end,
    'messages', case when p_preferences->>'messages'='false' then false else true end,
    'design', case when p_preferences->>'design'='false' then false else true end,
    'production', case when p_preferences->>'production'='false' then false else true end
  );

  update public.profiles
  set notification_preferences=v_clean
  where id=v_user;

  return v_clean;
end;
$$;

revoke all on function public.update_notification_preferences(jsonb) from public;
grant execute on function public.update_notification_preferences(jsonb) to authenticated;

create or replace function public.add_production_event(
  p_order_id uuid,
  p_stage text,
  p_note text default ''
)
returns public.production_events
language plpgsql
security definer
set search_path=''
as $$
declare
  v_order public.orders;
  v_row public.production_events;
  v_label text;
begin
  if not public.is_admin() then raise exception 'Admin only'; end if;

  if p_stage not in (
    'brief_received','designing','review','revision',
    'finalizing','published','completed'
  ) then raise exception 'Invalid production stage'; end if;

  select * into v_order from public.orders where id=p_order_id;
  if v_order.id is null then raise exception 'Order not found'; end if;

  insert into public.production_events(order_id,stage,note,created_by)
  values(p_order_id,p_stage,coalesce(p_note,''),auth.uid())
  returning * into v_row;

  if p_stage in ('designing','review','revision','finalizing','published')
     and v_order.status in ('confirmed','processing') then
    update public.orders
    set status='processing',updated_at=now()
    where id=v_order.id;
  elsif p_stage='completed' and v_order.status<>'cancelled' then
    update public.orders
    set status='completed',updated_at=now()
    where id=v_order.id;
  else
    update public.orders
    set updated_at=now()
    where id=v_order.id;
  end if;

  v_label:=case p_stage
    when 'brief_received' then 'Brief Masuk'
    when 'designing' then 'Desain Dikerjakan'
    when 'review' then 'Menunggu Review'
    when 'revision' then 'Revisi'
    when 'finalizing' then 'Finalisasi'
    when 'published' then 'Dipublish'
    when 'completed' then 'Selesai'
    else p_stage
  end;

  perform public.notify_user(
    v_order.customer_id,
    'production_update',
    'Tahap produksi diperbarui',
    coalesce(v_order.order_no,'Order')||': '||v_label,
    'order',
    v_order.id
  );

  return v_row;
end;
$$;

revoke all on function public.add_production_event(uuid,text,text) from public;
grant execute on function public.add_production_event(uuid,text,text) to authenticated;
