# Provider Onboarding and Finance v2

## Existing Codebase Assessment

- Current provider/admin functionality lives primarily in `frontend/app`, with Supabase service access in `frontend/lib/supabaseServer.ts`.
- Existing provider profiles are split across `profiles`, `provider_profiles`, and `doctor_profiles`.
- Existing provider wallet logic is in `Database/production_wallet_ledger.sql` and `frontend/lib/walletLedger.ts`. It is append-oriented but still keeps a mutable wallet balance table and uses profile-level payout amounts.
- This implementation is non-destructive and introduces `provider_profiles_v2`, `provider_earnings`, `provider_wallets`, `provider_wallet_transactions`, payout batch tables, audit tables, and provider onboarding tables alongside legacy data.

## Architecture Summary

- Admin creates providers through `/api/admin/providers` without a permanent password.
- Activation tokens are random, hash-only, single-use, expiring rows in `provider_activation_tokens`.
- Provider onboarding state is enforced by `/api/provider/me` and the provider portal loader.
- Tax and bank values are encrypted before storage and only masked values are returned to provider-facing APIs.
- Earnings and wallet changes are append-only through `create_provider_earning_v2` and `provider_wallet_transactions`.
- Missing compensation creates `CONFIGURATION_REQUIRED` earnings plus `payout_exceptions`; it does not create a silent zero earning.
- Payout verification is separate from clinical verification. Held earnings are released by `release_provider_payout_holds_v2` after payout approval.

## State Machines

- Onboarding: `NOT_STARTED -> IN_PROGRESS -> SUBMITTED -> UNDER_REVIEW -> CHANGES_REQUESTED|APPROVED|REJECTED|SUSPENDED|DEACTIVATED`
- Clinical: `PENDING -> UNDER_REVIEW -> APPROVED|CHANGES_REQUESTED|REJECTED|EXPIRED|SUSPENDED`
- Bank: `NOT_CONFIGURED -> PENDING -> VERIFIED|FAILED|CHANGES_REQUESTED`
- Payout: `NOT_CONFIGURED -> VERIFICATION_PENDING -> ACTIVE|ON_HOLD|FAILED|DISABLED`
- Payout batch: `DRAFT -> CALCULATED -> UNDER_REVIEW -> APPROVED -> PROCESSING -> COMPLETED|PARTIALLY_COMPLETED|FAILED|CANCELLED`

## Migration Files

- Forward: `Database/provider_onboarding_finance_v2.sql`
- Rollback: `Database/provider_onboarding_finance_v2_rollback.sql`

The migration creates table RLS, storage bucket RLS for `provider-private-documents`, key indexes, immutable ledger constraints, payout dual-control constraints, and wallet recalculation RPCs.

## Encryption and Storage

- `frontend/lib/providerPlatform/crypto.ts` uses AES-256-GCM with `PROVIDER_DATA_ENCRYPTION_KEY`.
- Production should replace this local key source with external KMS or Supabase Vault and document key rotation.
- Full PAN and bank account numbers are never returned by v2 provider APIs.
- Storage bucket `provider-private-documents` is private with MIME and file-size restrictions.

## APIs and Services

- Services live in `frontend/lib/providerPlatform`.
- Provider APIs include activation, onboarding sections, agreements, submit, wallet, earnings, payouts, and statements.
- Admin APIs include provider invite, clinical approval, payout approval with step-up header, request changes, compensation rule creation, earnings, and payouts.

## Data Migration Plan

1. Apply the v2 migration.
2. Backfill `provider_profiles_v2` from `profiles` and `provider_profiles` with `legacy_provider_id = profiles.id`.
3. Create v2 wallets for backfilled providers.
4. Reconcile legacy `wallet_ledger_transactions` into v2 exceptions before creating corrective earnings.
5. For existing zero-value completed consultations, create `payout_exceptions` and do not guess amounts.
6. Keep legacy wallet tables until reconciliation is signed off.

## Reconciliation Plan

Daily checks should verify:

- Wallet balances equal sums from `provider_wallet_transactions`.
- Paid earnings have exactly one payout link.
- Payout totals equal linked earnings.
- No earning appears in more than one payout.
- Completed eligible services have either an earning or a payout exception.
- No non-cancelled earning has a silent zero amount.

## Deployment Checklist

- Apply `Database/provider_onboarding_finance_v2.sql`.
- Set `PROVIDER_DATA_ENCRYPTION_KEY` and `PROVIDER_DATA_KEY_VERSION`.
- Confirm Supabase project region and retention policy for India regulatory requirements.
- Create/verify SMTP credentials for invitation email.
- Run `npm run lint` and `npm run build`.
- Smoke test provider invite, activation, onboarding submit, admin clinical approval, admin payout approval, and held earning release.

## Rollback Plan

- Stop provider v2 traffic.
- Run `Database/provider_onboarding_finance_v2_rollback.sql`.
- Revert app code if necessary.
- Legacy provider and wallet tables are not dropped by the v2 migration or rollback.

## Manual QA Checklist

- Admin invite sends activation email and returns no token/password.
- Activation link works once and rejects expired/used tokens.
- Provider is redirected to onboarding before dashboard access.
- Role-specific professional validation rejects missing required fields.
- Tax and bank APIs return only masked data.
- Clinical and payout approvals can be performed separately.
- Held earnings show as on hold instead of zero.
- Missing compensation creates a payout exception.
- Provider cannot view another provider's v2 wallet, earnings, payouts, or onboarding rows through RLS.
- Payout approval requires step-up header and releases held earnings.
