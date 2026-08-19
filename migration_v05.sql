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
