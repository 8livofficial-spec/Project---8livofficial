# Admin Portal Functionality Audit

Date: 2026-06-18

## Scope

Audited the primary Admin Portal surface in `frontend/app/admin/page.tsx` and related Admin APIs for interactive elements: sidebar navigation, module buttons, table actions, empty states, forms, exports, provider management, payments, provider wallets, memberships, reports, notifications, and settings.

## Findings And Fixes

### Navigation

- Fixed sidebar navigation to update route state through `/admin?tab=...`.
- Added dedicated route entry pages for payments, provider wallets, and membership plans.
- Added Provider Management navigation under User Management.

### Buttons With Missing Actions

- Provider row `Edit`, `Activate/Deactivate`, and `Schedule` now perform actions.
- Doctor card `Edit` and `Deactivate` now route/update provider management.
- Payment row `View`, `Download`, `Refund`, and `Patient` now perform actions.
- Provider Wallet `View Wallet`, `Approve`, `Hold`, and `Transactions` now perform actions.
- Membership `Add Discount`, `Edit Plan`, `Edit Features`, `View Members`, and `Activate/Deactivate` now perform actions.
- Report `View Report` buttons now navigate to the matching operational module.
- Notification `Compose` and channel buttons now provide deterministic workflow feedback.
- Platform Settings `Manage` buttons now provide deterministic workflow feedback.

### Routes With Missing Navigation

- Added:
  - `/admin/payments`
  - `/admin/provider-wallets`
  - `/admin/membership-plans`
- These route to the correct Admin module state.

### Tables Missing CRUD Actions

- Payments table now supports view receipt, download receipt, refund request, and open patient.
- Provider table now supports edit, activation/deactivation, and schedule navigation.
- Provider Wallet table now supports wallet filtering, payout approval, payout hold, and transaction count view.
- Membership table supports member filtering through plan cards.

### Forms Missing Validation

- Provider create/edit validates required fields.
- Provider create/edit shows success/API errors and resets on successful create/update.
- Existing staff and plan forms retain validation.

### Placeholder Components / Mock Data

- Fallback membership plans still exist in `frontend/app/api/admin/plans/route.ts` for missing DB setup.
- Settings persistence is not yet backed by a `platform_settings` table; actions are explicit and no longer inert.
- Notification sending requires SMTP/SMS/push provider credentials; actions now tell admins what configuration is required.

### New API Integration

- Added `POST /api/admin/payments/refund` to record refund requests.
- Added `PATCH /api/admin/provider-payouts` to update payout status such as `HELD`.
- Added provider management API earlier:
  - `GET /api/admin/providers`
  - `POST /api/admin/providers`
  - `PATCH /api/admin/providers`

### Remaining Production Hardening

- Replace browser `alert`/`prompt` flows with branded modals/toasts.
- Add server-backed PDF receipts instead of JSON receipt download.
- Add real payment gateway refund execution after Razorpay refund keys/business rules are finalized.
- Add persistent `platform_settings` and `notification_templates` tables.
- Add pagination/sort controls for large datasets.
