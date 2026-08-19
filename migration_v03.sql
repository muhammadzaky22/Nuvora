-- NUVORA v0.3
-- Jalankan SETELAH schema.sql v0.2 pada project Supabase baru.

alter table public.guests
  add column if not exists checked_in_at timestamptz,
  add column if not exists checked_in_by uuid references auth.users(id) on delete set null;

create index if not exists guests_token_idx on public.guests(token);
create index if not exists guests_checked_in_idx on public.guests(invitation_id,checked_in_at);

-- Existing owner update policy from v0.2 already protects check-in updates.
-- No anon SELECT policy is added for guests: public pages never read the guest table.
-- QR tokens are resolved only by the authenticated invitation owner during check-in.
