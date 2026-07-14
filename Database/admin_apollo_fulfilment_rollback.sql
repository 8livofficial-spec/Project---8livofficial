-- Rollback for Database/admin_apollo_fulfilment.sql.
-- This drops only the new phase-1 fulfilment objects. Legacy pharmacy tables are untouched.

drop trigger if exists trg_prevent_signed_prescription_items_update on public.prescription_items;
drop trigger if exists trg_prevent_signed_prescription_mutation on public.prescriptions;
drop function if exists public.prevent_signed_prescription_items_mutation();
drop function if exists public.prevent_signed_prescription_mutation();

drop table if exists public.fulfilment_audit_logs;
drop table if exists public.pharmacy_order_status_history;
drop table if exists public.pharmacy_orders;
drop table if exists public.prescription_items;
drop table if exists public.prescriptions;

drop type if exists pharmacy_order_status;
drop type if exists fulfilment_vendor;
drop type if exists prescription_status;

-- Optional manual storage rollback after confirming no documents are needed:
-- delete from storage.objects where bucket_id = 'prescription-documents';
-- delete from storage.buckets where id = 'prescription-documents';
