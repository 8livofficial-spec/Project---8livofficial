# 8liv Pharmacy Management System

## Folder Structure

- `Database/pharmacy_management.sql`: pharmacy schema, indexes, and starter RLS policies.
- `frontend/lib/pharmacy.ts`: pharmacy roles, order lifecycle, auth assertions, audit helpers, and notifications.
- `frontend/app/api/pharmacy/*`: dashboard, orders, inventory, prescriptions, and delivery APIs.
- `frontend/app/api/patient/medicine-orders`: patient-owned medicine order API.
- `frontend/app/api/admin/pharmacy`: admin pharmacy management API.
- `frontend/app/pharmacy/*`: pharmacy portal routes.
- `frontend/app/(dashboard)/patient/medicine-orders`: patient order tracking.
- `frontend/app/admin/pharmacy`: admin pharmacy management screen.

## Authentication Flow

Pharmacy pages are protected by `middleware.ts` using `user_role`. Server APIs enforce the durable authorization through `getAuthenticatedUser` and `pharmacy_users`.

Allowed pharmacy roles are `PHARMACY_ADMIN`, `PHARMACY_STAFF`, `DELIVERY_PARTNER`, and `ADMIN`. Patients and providers cannot access pharmacy APIs. Patients can only create and view orders tied to their own `doctor_consultations`.

## Order Lifecycle

`PRESCRIPTION_CREATED -> ORDER_PLACED -> PAYMENT_PENDING -> PAYMENT_COMPLETED -> PHARMACY_ACCEPTED -> PREPARING -> PACKED -> READY_FOR_DISPATCH -> OUT_FOR_DELIVERY -> DELIVERED`

Terminal or exception states: `CANCELLED`, `REFUNDED`.

Each transition appends `status_history` and stores a dedicated timestamp column such as `packed_at` or `delivered_at`.

## Security Implementation

- Patient order creation validates prescription ownership, active consultation status, verified doctor profile, prescription age, and duplicate fulfillment.
- Pharmacy users cannot edit prescriptions; they only update fulfillment, inventory, and delivery records.
- Delivery partners only receive delivery rows assigned to their partner record.
- Admin APIs can manage pharmacies, approve pharmacies, review revenue, and process refunds.
- `pharmacy_audit_logs` stores actor, role, action, target, IP address, metadata, and timestamp.

## Performance

The migration adds indexes for order status/date, patient order history, consultation lookup, inventory search, stock alerts, expiry tracking, delivery partner queues, and audit lookups. API routes implement pagination and server-side status/search filtering.

## Migration Notes

1. Apply `Database/pharmacy_management.sql` after the current core schema.
2. Create pharmacy users in Supabase Auth and add matching rows in `pharmacy_users`.
3. Set the login role cookie to one of the pharmacy roles when pharmacy staff sign in.
4. Backfill `prescription_created_at` for historical orders if importing existing fulfillment records.
5. Configure invoice/payment/refund integrations to write `payment_id`, `invoice_id`, and `refund_id`.

## Manual QA Checklist

- Patient with an approved prescription can create exactly one active order.
- Another patient cannot create or read that order.
- Patient can download prescription text and choose an external pharmacy without creating an order.
- Pharmacy staff can see dashboard KPIs, prescription queue, orders, inventory, and delivery pages.
- Invalid order status transitions return a 409 error.
- Low stock and expiring batch records appear in dashboard alerts.
- Delivery OTP is required before marking delivered.
- Delivery partner only sees assigned deliveries.
- Admin can load pharmacy management and process a refund status update.
- Audit logs are written for order creation, status changes, inventory updates, delivery updates, and admin actions.
