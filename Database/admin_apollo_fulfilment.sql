-- 8liv Admin-managed Apollo Pharmacy fulfilment
-- Phase 1 migration: create new immutable prescription and fulfilment schema.
-- Legacy pharmacy tables are intentionally preserved for audit/migration.

create extension if not exists pgcrypto;

do $$ begin
  create type prescription_status as enum ('DRAFT', 'READY_FOR_REVIEW', 'SIGNED', 'ISSUED', 'REPLACED', 'CANCELLED', 'EXPIRED');
exception when duplicate_object then null; end $$;

do $$ begin
  create type fulfilment_vendor as enum ('APOLLO_PHARMACY');
exception when duplicate_object then null; end $$;

do $$ begin
  create type pharmacy_order_status as enum (
    'PENDING_ADMIN_REVIEW',
    'UNDER_REVIEW',
    'READY_TO_PLACE',
    'ORDER_PLACED_WITH_APOLLO',
    'CONFIRMED_BY_APOLLO',
    'PARTIALLY_AVAILABLE',
    'UNAVAILABLE',
    'PACKED',
    'SHIPPED',
    'OUT_FOR_DELIVERY',
    'DELIVERED',
    'CANCELLED',
    'REFUND_PENDING',
    'REFUNDED'
  );
exception when duplicate_object then null; end $$;

create table if not exists public.prescriptions (
  id uuid primary key default gen_random_uuid(),
  prescription_number text not null unique,
  consultation_id uuid not null references public.doctor_consultations(id) on delete restrict,
  patient_id uuid not null references auth.users(id) on delete restrict,
  doctor_id uuid not null references auth.users(id) on delete restrict,
  diagnosis text not null,
  status prescription_status not null default 'DRAFT',
  version integer not null default 1 check (version > 0),
  issued_at timestamptz,
  valid_until date not null,
  signed_pdf_path text,
  signature_hash text,
  canonical_data jsonb not null default '{}'::jsonb,
  supersedes_prescription_id uuid references public.prescriptions(id) on delete restrict,
  cancelled_at timestamptz,
  cancellation_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint prescriptions_signed_requirements check (
    status not in ('SIGNED', 'ISSUED') or (issued_at is not null and signed_pdf_path is not null and signature_hash is not null)
  )
);

create table if not exists public.prescription_items (
  id uuid primary key default gen_random_uuid(),
  prescription_id uuid not null references public.prescriptions(id) on delete cascade,
  medicine_name text not null,
  generic_name text,
  brand_name text,
  strength text not null,
  dosage_form text not null,
  dose text not null,
  route text not null,
  frequency text not null,
  duration_value integer not null check (duration_value > 0),
  duration_unit text not null check (duration_unit in ('DAYS', 'WEEKS', 'MONTHS')),
  quantity numeric not null check (quantity > 0),
  food_instruction text,
  special_instruction text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pharmacy_orders (
  id uuid primary key default gen_random_uuid(),
  prescription_id uuid not null references public.prescriptions(id) on delete restrict,
  patient_id uuid not null references auth.users(id) on delete restrict,
  vendor fulfilment_vendor not null default 'APOLLO_PHARMACY',
  status pharmacy_order_status not null default 'PENDING_ADMIN_REVIEW',
  assigned_admin_id uuid references auth.users(id) on delete set null,
  apollo_order_reference text,
  order_amount numeric check (order_amount is null or order_amount >= 0),
  currency text not null default 'INR',
  delivery_address_snapshot jsonb not null default '{}'::jsonb,
  patient_phone_snapshot text,
  courier_name text,
  tracking_number text,
  estimated_delivery_at timestamptz,
  placed_at timestamptz,
  confirmed_at timestamptz,
  packed_at timestamptz,
  shipped_at timestamptz,
  out_for_delivery_at timestamptz,
  delivered_at timestamptz,
  cancelled_at timestamptz,
  cancellation_reason text,
  unavailability_reason text,
  unavailable_medicines jsonb not null default '[]'::jsonb,
  internal_notes text,
  refund_status text,
  version integer not null default 1 check (version > 0),
  idempotency_key text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pharmacy_orders_apollo_reference_required check (
    status in ('PENDING_ADMIN_REVIEW', 'UNDER_REVIEW', 'READY_TO_PLACE', 'CANCELLED')
    or apollo_order_reference is not null
  )
);

create unique index if not exists idx_pharmacy_orders_prescription_once
  on public.pharmacy_orders(prescription_id);

create unique index if not exists idx_pharmacy_orders_idempotency
  on public.pharmacy_orders(idempotency_key);

create index if not exists idx_prescriptions_patient_status on public.prescriptions(patient_id, status, created_at desc);
create index if not exists idx_prescriptions_doctor_consultation on public.prescriptions(doctor_id, consultation_id, created_at desc);
create index if not exists idx_pharmacy_orders_patient_status on public.pharmacy_orders(patient_id, status, created_at desc);
create index if not exists idx_pharmacy_orders_status_updated on public.pharmacy_orders(status, updated_at desc);
create index if not exists idx_pharmacy_orders_apollo_ref on public.pharmacy_orders(apollo_order_reference) where apollo_order_reference is not null;
create index if not exists idx_pharmacy_orders_tracking on public.pharmacy_orders(tracking_number) where tracking_number is not null;

create table if not exists public.pharmacy_order_status_history (
  id uuid primary key default gen_random_uuid(),
  pharmacy_order_id uuid not null references public.pharmacy_orders(id) on delete cascade,
  previous_status pharmacy_order_status,
  new_status pharmacy_order_status not null,
  changed_by uuid not null references auth.users(id) on delete restrict,
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.fulfilment_audit_logs (
  id uuid primary key default gen_random_uuid(),
  prescription_id uuid references public.prescriptions(id) on delete set null,
  pharmacy_order_id uuid references public.pharmacy_orders(id) on delete set null,
  actor_id uuid references auth.users(id) on delete set null,
  actor_role text not null,
  action text not null,
  previous_values jsonb,
  new_values jsonb,
  reason text,
  ip_address text,
  user_agent text,
  request_id text,
  created_at timestamptz not null default now()
);

create index if not exists idx_fulfilment_audit_prescription on public.fulfilment_audit_logs(prescription_id, created_at desc);
create index if not exists idx_fulfilment_audit_order on public.fulfilment_audit_logs(pharmacy_order_id, created_at desc);

create or replace function public.prevent_signed_prescription_mutation()
returns trigger language plpgsql as $$
begin
  if old.status in ('SIGNED', 'ISSUED', 'REPLACED', 'EXPIRED') then
    if new.diagnosis is distinct from old.diagnosis
      or new.signed_pdf_path is distinct from old.signed_pdf_path
      or new.signature_hash is distinct from old.signature_hash
      or new.canonical_data is distinct from old.canonical_data
      or new.patient_id is distinct from old.patient_id
      or new.doctor_id is distinct from old.doctor_id
      or new.consultation_id is distinct from old.consultation_id then
      raise exception 'Signed prescription clinical content is immutable';
    end if;
  end if;
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_prevent_signed_prescription_mutation on public.prescriptions;
create trigger trg_prevent_signed_prescription_mutation
before update on public.prescriptions
for each row execute function public.prevent_signed_prescription_mutation();

create or replace function public.prevent_signed_prescription_items_mutation()
returns trigger language plpgsql as $$
declare parent_status prescription_status;
begin
  select status into parent_status from public.prescriptions where id = coalesce(new.prescription_id, old.prescription_id);
  if parent_status in ('SIGNED', 'ISSUED', 'REPLACED', 'EXPIRED') then
    raise exception 'Signed prescription items are immutable';
  end if;
  return coalesce(new, old);
end $$;

drop trigger if exists trg_prevent_signed_prescription_items_update on public.prescription_items;
create trigger trg_prevent_signed_prescription_items_update
before update or delete on public.prescription_items
for each row execute function public.prevent_signed_prescription_items_mutation();

alter table public.prescriptions enable row level security;
alter table public.prescription_items enable row level security;
alter table public.pharmacy_orders enable row level security;
alter table public.pharmacy_order_status_history enable row level security;
alter table public.fulfilment_audit_logs enable row level security;

drop policy if exists "patients read own prescriptions" on public.prescriptions;
create policy "patients read own prescriptions" on public.prescriptions for select to authenticated
  using (patient_id = auth.uid());

drop policy if exists "doctors read own prescriptions" on public.prescriptions;
create policy "doctors read own prescriptions" on public.prescriptions for select to authenticated
  using (doctor_id = auth.uid());

drop policy if exists "admins manage prescriptions" on public.prescriptions;
create policy "admins manage prescriptions" on public.prescriptions for all to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and lower(p.role) = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and lower(p.role) = 'admin'));

drop policy if exists "prescription items follow prescription read" on public.prescription_items;
create policy "prescription items follow prescription read" on public.prescription_items for select to authenticated
  using (exists (
    select 1 from public.prescriptions p
    where p.id = prescription_items.prescription_id
      and (p.patient_id = auth.uid() or p.doctor_id = auth.uid() or exists (select 1 from public.profiles pr where pr.id = auth.uid() and lower(pr.role) = 'admin'))
  ));

drop policy if exists "patients read own pharmacy orders" on public.pharmacy_orders;
create policy "patients read own pharmacy orders" on public.pharmacy_orders for select to authenticated
  using (patient_id = auth.uid());

drop policy if exists "admins manage fulfilment orders" on public.pharmacy_orders;
create policy "admins manage fulfilment orders" on public.pharmacy_orders for all to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and lower(p.role) = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and lower(p.role) = 'admin'));

drop policy if exists "patients read own order history" on public.pharmacy_order_status_history;
create policy "patients read own order history" on public.pharmacy_order_status_history for select to authenticated
  using (exists (select 1 from public.pharmacy_orders o where o.id = pharmacy_order_status_history.pharmacy_order_id and o.patient_id = auth.uid()));

drop policy if exists "admins read fulfilment audit logs" on public.fulfilment_audit_logs;
create policy "admins read fulfilment audit logs" on public.fulfilment_audit_logs for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and lower(p.role) = 'admin'));

-- Private Storage bucket. Requires Supabase storage schema.
insert into storage.buckets (id, name, public)
values ('prescription-documents', 'prescription-documents', false)
on conflict (id) do update set public = false;

-- Data validation/report queries for rollout:
-- select count(*) from public.prescription_orders;
-- select status, count(*) from public.pharmacy_orders group by status order by status;
-- select po.id from public.pharmacy_orders po left join public.prescriptions p on p.id = po.prescription_id where p.id is null;
-- select p.id from public.prescriptions p left join public.doctor_consultations dc on dc.id = p.consultation_id where dc.id is null;
-- select id, consultation_id from public.prescription_orders where consultation_id is null;
