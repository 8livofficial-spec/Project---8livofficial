-- Rollback for Database/provider_onboarding_finance_v2.sql.
-- This drops only v2 objects introduced by the non-destructive migration.

DROP POLICY IF EXISTS provider_profiles_v2_provider_select ON public.provider_profiles_v2;
DROP POLICY IF EXISTS provider_profiles_v2_provider_update_onboarding ON public.provider_profiles_v2;
DROP POLICY IF EXISTS provider_owned_select_professional ON public.provider_professional_details;
DROP POLICY IF EXISTS provider_owned_write_professional ON public.provider_professional_details;
DROP POLICY IF EXISTS provider_owned_insert_professional ON public.provider_professional_details;
DROP POLICY IF EXISTS provider_owned_update_professional ON public.provider_professional_details;
DROP POLICY IF EXISTS provider_tax_restricted_select ON public.provider_tax_profiles;
DROP POLICY IF EXISTS provider_payout_restricted_select ON public.provider_payout_profiles;
DROP POLICY IF EXISTS provider_documents_select ON public.provider_documents;
DROP POLICY IF EXISTS provider_document_versions_select ON public.provider_document_versions;
DROP POLICY IF EXISTS provider_acceptances_select ON public.provider_agreement_acceptances;
DROP POLICY IF EXISTS provider_finance_select_earnings ON public.provider_earnings;
DROP POLICY IF EXISTS provider_finance_select_wallets ON public.provider_wallets;
DROP POLICY IF EXISTS provider_finance_select_wallet_transactions ON public.provider_wallet_transactions;
DROP POLICY IF EXISTS provider_finance_select_payout_records ON public.provider_payout_records;
DROP POLICY IF EXISTS provider_private_documents_provider_read_own ON storage.objects;
DROP POLICY IF EXISTS provider_private_documents_provider_upload_own ON storage.objects;
DROP POLICY IF EXISTS provider_private_documents_admin_read ON storage.objects;
-- Supabase blocks direct deletes from storage.buckets.
-- If you truly need to remove this bucket during rollback, empty and delete
-- provider-private-documents from the Supabase Storage UI or Storage API.

DROP TABLE IF EXISTS public.data_erasure_requests;
DROP TABLE IF EXISTS public.provider_offboarding_settlements;
DROP TABLE IF EXISTS public.tax_withholding_records;
DROP TABLE IF EXISTS public.provider_disputes;
DROP TABLE IF EXISTS public.idempotency_keys;
DROP TABLE IF EXISTS public.provider_audit_logs;
DROP TABLE IF EXISTS public.payout_exceptions;
DROP TABLE IF EXISTS public.payout_earning_links;
DROP TABLE IF EXISTS public.provider_payout_records;
DROP TABLE IF EXISTS public.payout_batches;
DROP TABLE IF EXISTS public.provider_wallet_transactions;
DROP TABLE IF EXISTS public.provider_wallets;
DROP TABLE IF EXISTS public.provider_earnings;
DROP TABLE IF EXISTS public.provider_compensation_rules;
DROP TABLE IF EXISTS public.provider_verification_reviews;
DROP TABLE IF EXISTS public.provider_onboarding_submissions;
DROP TABLE IF EXISTS public.provider_agreement_acceptances;
DROP TABLE IF EXISTS public.provider_agreements;
ALTER TABLE IF EXISTS public.provider_documents DROP CONSTRAINT IF EXISTS provider_documents_current_version_fk;
DROP TABLE IF EXISTS public.provider_document_versions;
DROP TABLE IF EXISTS public.provider_documents;
DROP TABLE IF EXISTS public.provider_payout_profiles;
DROP TABLE IF EXISTS public.provider_tax_profiles;
DROP TABLE IF EXISTS public.provider_professional_details;
DROP TABLE IF EXISTS public.provider_activation_tokens;
DROP TABLE IF EXISTS public.provider_profiles_v2;

DROP FUNCTION IF EXISTS public.create_provider_earning_v2(UUID,TEXT,UUID,TEXT,NUMERIC,TEXT);
DROP FUNCTION IF EXISTS public.release_provider_payout_holds_v2(UUID,UUID);
DROP FUNCTION IF EXISTS public.recalculate_provider_wallet_v2(UUID);
DROP FUNCTION IF EXISTS public.current_provider_profile_v2_id();
DROP FUNCTION IF EXISTS public.current_profile_role();

DROP TYPE IF EXISTS public.provider_payout_record_status;
DROP TYPE IF EXISTS public.payout_batch_status;
DROP TYPE IF EXISTS public.provider_wallet_tx_type;
DROP TYPE IF EXISTS public.provider_earning_status;
DROP TYPE IF EXISTS public.provider_document_status;
DROP TYPE IF EXISTS public.provider_payout_status_v2;
DROP TYPE IF EXISTS public.provider_bank_status;
DROP TYPE IF EXISTS public.provider_kyc_status;
DROP TYPE IF EXISTS public.provider_clinical_status;
DROP TYPE IF EXISTS public.provider_account_status;
DROP TYPE IF EXISTS public.provider_onboarding_status;
DROP TYPE IF EXISTS public.provider_role_v2;
