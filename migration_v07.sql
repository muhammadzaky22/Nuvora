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
