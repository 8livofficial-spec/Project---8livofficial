-- 8liv Pharmacy Management System
-- Apply after the core schema that creates auth.users, profiles, doctor_profiles,
-- doctor_consultations, patient_notifications, and payment_transactions.

create extension if not exists pgcrypto;

do $$ begin
  create type pharmacy_status as enum ('PENDING_APPROVAL', 'APPROVED', 'SUSPENDED', 'DISABLED');
exception when duplicate_object then null; end $$;

do $$ begin
  create type pharmacy_user_role as enum ('PHARMACY_ADMIN', 'PHARMACY_STAFF', 'DELIVERY_PARTNER');
exception when duplicate_object then null; end $$;

do $$ begin
  create type medicine_status as enum ('ACTIVE', 'DISABLED', 'RECALLED', 'EXPIRED');
exception when duplicate_object then null; end $$;

do $$ begin
  create type prescription_order_status as enum (
    'PRESCRIPTION_CREATED',
    'ORDER_PLACED',
    'PAYMENT_PENDING',
    'PAYMENT_COMPLETED',
    'PHARMACY_ACCEPTED',
    'PREPARING',
    'PACKED',
    'READY_FOR_DISPATCH',
    'OUT_FOR_DELIVERY',
    'DELIVERED',
    'CANCELLED',
    'REFUNDED'
  );
exception when duplicate_object then null; end $$;

create table if not exists pharmacies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  license_number text not null unique,
  gst_number text,
  contact_email text,
  contact_phone text,
  address jsonb not null default '{}'::jsonb,
  status pharmacy_status not null default 'PENDING_APPROVAL',
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists pharmacy_users (
  id uuid primary key default gen_random_uuid(),
  pharmacy_id uuid references pharmacies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role pharmacy_user_role not null,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'SUSPENDED', 'DISABLED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

create table if not exists medicine_inventory (
  id uuid primary key default gen_random_uuid(),
  pharmacy_id uuid references pharmacies(id) on delete set null,
  name text not null,
  generic_name text,
  brand text,
  manufacturer text,
  category text,
  strength text,
  purchase_price numeric(12,2) not null default 0,
  selling_price numeric(12,2) not null default 0,
  current_stock integer not null default 0 check (current_stock >= 0),
  minimum_stock integer not null default 0 check (minimum_stock >= 0),
  maximum_stock integer not null default 0 check (maximum_stock >= 0),
  status medicine_status not null default 'ACTIVE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists medicine_batches (
  id uuid primary key default gen_random_uuid(),
  medicine_id uuid not null references medicine_inventory(id) on delete cascade,
  pharmacy_id uuid references pharmacies(id) on delete set null,
  batch_number text not null,
  expiry_date date not null,
  quantity_received integer not null default 0 check (quantity_received >= 0),
  quantity_available integer not null default 0 check (quantity_available >= 0),
  purchase_price numeric(12,2) not null default 0,
  selling_price numeric(12,2) not null default 0,
  status medicine_status not null default 'ACTIVE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (medicine_id, batch_number)
);

create table if not exists prescription_orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  consultation_id uuid not null references doctor_consultations(id) on delete restrict,
  patient_id uuid not null references auth.users(id) on delete restrict,
  doctor_id uuid references auth.users(id) on delete set null,
  pharmacy_id uuid references pharmacies(id) on delete set null,
  status prescription_order_status not null default 'PRESCRIPTION_CREATED',
  status_history jsonb not null default '[]'::jsonb,
  prescription_snapshot jsonb not null default '{}'::jsonb,
  delivery_address jsonb not null default '{}'::jsonb,
  use_insurance boolean not null default false,
  subtotal_amount numeric(12,2) not null default 0,
  tax_amount numeric(12,2) not null default 0,
  discount_amount numeric(12,2) not null default 0,
  delivery_fee numeric(12,2) not null default 0,
  total_amount numeric(12,2) not null default 0,
  payment_id text,
  invoice_id text,
  refund_id text,
  delivery_eta timestamptz,
  prescription_created_at timestamptz,
  order_placed_at timestamptz,
  payment_pending_at timestamptz,
  payment_completed_at timestamptz,
  pharmacy_accepted_at timestamptz,
  preparing_at timestamptz,
  packed_at timestamptz,
  ready_for_dispatch_at timestamptz,
  out_for_delivery_at timestamptz,
  delivered_at timestamptz,
  cancelled_at timestamptz,
  refunded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists prescription_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references prescription_orders(id) on delete cascade,
  medicine_id uuid references medicine_inventory(id) on delete set null,
  batch_id uuid references medicine_batches(id) on delete set null,
  medicine_name text not null,
  dosage text,
  duration text,
  quantity integer not null default 1 check (quantity > 0),
  unit_price numeric(12,2) not null default 0,
  line_total numeric(12,2) not null default 0,
  fulfillment_status text not null default 'PENDING',
  created_at timestamptz not null default now()
);

create table if not exists delivery_partners (
  id uuid primary key default gen_random_uuid(),
  pharmacy_id uuid references pharmacies(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  name text not null,
  phone text,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'INACTIVE', 'SUSPENDED')),
  vehicle_details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists delivery_tracking (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references prescription_orders(id) on delete cascade,
  delivery_partner_id uuid references delivery_partners(id) on delete set null,
  status text not null default 'ASSIGNED',
  delivery_otp text,
  estimated_delivery_at timestamptz,
  delivered_at timestamptz,
  failed_at timestamptz,
  rescheduled_at timestamptz,
  failure_reason text,
  proof_of_delivery_url text,
  gps_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists medicine_stock_logs (
  id uuid primary key default gen_random_uuid(),
  medicine_id uuid not null references medicine_inventory(id) on delete cascade,
  pharmacy_id uuid references pharmacies(id) on delete set null,
  actor_id uuid references auth.users(id) on delete set null,
  actor_role text not null,
  adjustment_type text not null,
  quantity_delta integer not null,
  stock_before integer not null,
  stock_after integer not null,
  reason text,
  created_at timestamptz not null default now()
);

create table if not exists inventory_alerts (
  id uuid primary key default gen_random_uuid(),
  pharmacy_id uuid references pharmacies(id) on delete cascade,
  medicine_id uuid references medicine_inventory(id) on delete cascade,
  batch_id uuid references medicine_batches(id) on delete cascade,
  alert_type text not null check (alert_type in ('LOW_STOCK', 'EXPIRING_SOON', 'EXPIRED', 'RECALLED')),
  severity text not null default 'MEDIUM' check (severity in ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  message text not null,
  is_resolved boolean not null default false,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists pharmacy_audit_logs (
  id uuid primary key default gen_random_uuid(),
  pharmacy_id uuid references pharmacies(id) on delete set null,
  actor_id uuid references auth.users(id) on delete set null,
  actor_role text not null,
  action text not null,
  target_type text not null,
  target_id uuid,
  ip_address text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_pharmacy_users_user_id on pharmacy_users(user_id);
create index if not exists idx_medicine_inventory_search on medicine_inventory using gin (to_tsvector('simple', coalesce(name,'') || ' ' || coalesce(generic_name,'') || ' ' || coalesce(brand,'')));
create index if not exists idx_medicine_inventory_stock on medicine_inventory(status, current_stock, minimum_stock);
create index if not exists idx_medicine_batches_expiry on medicine_batches(expiry_date, quantity_available);
create index if not exists idx_prescription_orders_patient_created on prescription_orders(patient_id, created_at desc);
create index if not exists idx_prescription_orders_status_created on prescription_orders(status, created_at desc);
create index if not exists idx_prescription_orders_consultation on prescription_orders(consultation_id);
create index if not exists idx_delivery_tracking_partner on delivery_tracking(delivery_partner_id, status);
create index if not exists idx_stock_logs_medicine_created on medicine_stock_logs(medicine_id, created_at desc);
create index if not exists idx_inventory_alerts_open on inventory_alerts(is_resolved, created_at desc);
create index if not exists idx_pharmacy_audit_target on pharmacy_audit_logs(target_type, target_id, created_at desc);

alter table pharmacies enable row level security;
alter table pharmacy_users enable row level security;
alter table medicine_inventory enable row level security;
alter table medicine_batches enable row level security;
alter table prescription_orders enable row level security;
alter table prescription_order_items enable row level security;
alter table delivery_partners enable row level security;
alter table delivery_tracking enable row level security;
alter table medicine_stock_logs enable row level security;
alter table inventory_alerts enable row level security;
alter table pharmacy_audit_logs enable row level security;

create or replace function is_pharmacy_actor()
returns boolean
language sql
stable
security definer
as $$
  select exists (
    select 1 from pharmacy_users
    where user_id = auth.uid()
      and status = 'ACTIVE'
  );
$$;

create or replace function is_admin_actor()
returns boolean
language sql
stable
security definer
as $$
  select exists (
    select 1 from profiles
    where id = auth.uid()
      and upper(role) = 'ADMIN'
  );
$$;

do $$ begin
  create policy "patients read own pharmacy orders"
    on prescription_orders for select
    using (patient_id = auth.uid() or is_pharmacy_actor() or is_admin_actor());
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "patients read own order items"
    on prescription_order_items for select
    using (
      exists (
        select 1 from prescription_orders
        where prescription_orders.id = prescription_order_items.order_id
          and (prescription_orders.patient_id = auth.uid() or is_pharmacy_actor() or is_admin_actor())
      )
    );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "pharmacy actors manage pharmacy tables"
    on medicine_inventory for all
    using (is_pharmacy_actor() or is_admin_actor())
    with check (is_pharmacy_actor() or is_admin_actor());
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "pharmacy actors manage batches"
    on medicine_batches for all
    using (is_pharmacy_actor() or is_admin_actor())
    with check (is_pharmacy_actor() or is_admin_actor());
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "pharmacy actors read audits"
    on pharmacy_audit_logs for select
    using (is_pharmacy_actor() or is_admin_actor());
exception when duplicate_object then null; end $$;
