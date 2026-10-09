-- ==============================================================================
-- 8LIV META WHATSAPP CLOUD API INTEGRATION SCHEMA
-- ==============================================================================
-- Migration: whatsapp_integration.sql
-- Description: Complete schema for WhatsApp OTP authentication, transactional
--              notifications, webhook event processing, two-way messaging,
--              opt-in preferences, and resilient outbox queue.
-- ==============================================================================

-- 1. WHATSAPP OTP CHALLENGES TABLE
-- Stores cryptographically hashed OTP challenges for login, registration, and phone verification.
CREATE TABLE IF NOT EXISTS public.whatsapp_otp_challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number TEXT NOT NULL,
    token_hash TEXT NOT NULL,
    purpose TEXT NOT NULL CHECK (purpose IN ('LOGIN', 'SIGNUP', 'VERIFY_PHONE', 'RESET_PASSWORD', 'SENSITIVE_ACTION')),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    attempts INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 5,
    resend_cooldown_until TIMESTAMPTZ NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    consumed_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_otp_phone_purpose ON public.whatsapp_otp_challenges(phone_number, purpose);
CREATE INDEX IF NOT EXISTS idx_whatsapp_otp_token_hash ON public.whatsapp_otp_challenges(token_hash);
CREATE INDEX IF NOT EXISTS idx_whatsapp_otp_expires_at ON public.whatsapp_otp_challenges(expires_at DESC);

-- 2. WHATSAPP MESSAGES LOG TABLE
-- Complete transactional audit log of all outbound and inbound WhatsApp messages.
CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meta_message_id TEXT UNIQUE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    recipient_phone TEXT NOT NULL,
    direction TEXT NOT NULL CHECK (direction IN ('OUTBOUND', 'INBOUND')),
    message_type TEXT NOT NULL,
    template_name TEXT,
    content TEXT,
    raw_payload JSONB DEFAULT '{}'::jsonb,
    status TEXT NOT NULL CHECK (status IN ('PENDING', 'SENT', 'DELIVERED', 'READ', 'FAILED')),
    error_code TEXT,
    error_message TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_meta_id ON public.whatsapp_messages(meta_message_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_recipient ON public.whatsapp_messages(recipient_phone);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_user_id ON public.whatsapp_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_status ON public.whatsapp_messages(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_created_at ON public.whatsapp_messages(created_at DESC);

-- 3. WHATSAPP CONVERSATIONS TABLE
-- Tracks two-way support threads, 24-hour customer service window, and opt-out preferences.
CREATE TABLE IF NOT EXISTS public.whatsapp_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number TEXT NOT NULL UNIQUE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    customer_name TEXT,
    last_customer_message_at TIMESTAMPTZ,
    last_agent_message_at TIMESTAMPTZ,
    is_opted_out BOOLEAN NOT NULL DEFAULT false,
    opted_out_at TIMESTAMPTZ,
    assigned_agent_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'PENDING', 'RESOLVED', 'CLOSED')),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_phone ON public.whatsapp_conversations(phone_number);
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_user ON public.whatsapp_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_last_msg ON public.whatsapp_conversations(last_customer_message_at DESC);

-- 4. WHATSAPP WEBHOOK DEDUPLICATION TABLE
-- Guarantees exactly-once processing for Meta webhook events.
CREATE TABLE IF NOT EXISTS public.whatsapp_webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id TEXT NOT NULL UNIQUE,
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL,
    processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_webhook_event_id ON public.whatsapp_webhook_events(event_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_webhook_processed ON public.whatsapp_webhook_events(processed_at DESC);

-- 5. WHATSAPP NOTIFICATION PREFERENCES TABLE
-- Tracks customer consent, marketing opt-ins, and transactional notification settings.
CREATE TABLE IF NOT EXISTS public.whatsapp_notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    phone_number TEXT NOT NULL,
    opt_in_transactional BOOLEAN NOT NULL DEFAULT true,
    opt_in_marketing BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_notif_pref_user ON public.whatsapp_notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_notif_pref_phone ON public.whatsapp_notification_preferences(phone_number);

-- 6. WHATSAPP OUTBOX QUEUE TABLE
-- Guarantees resilient, asynchronous message delivery with bounded retries.
CREATE TABLE IF NOT EXISTS public.whatsapp_outbox_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    idempotency_key TEXT UNIQUE NOT NULL,
    recipient_phone TEXT NOT NULL,
    payload JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSING', 'DELIVERED', 'FAILED', 'DEAD_LETTER')),
    attempts INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 5,
    next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_outbox_status_next ON public.whatsapp_outbox_queue(status, next_attempt_at) WHERE status IN ('PENDING', 'PROCESSING');
CREATE INDEX IF NOT EXISTS idx_whatsapp_outbox_idempotency ON public.whatsapp_outbox_queue(idempotency_key);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

ALTER TABLE public.whatsapp_otp_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_outbox_queue ENABLE ROW LEVEL SECURITY;

-- 1. Service Role full access across all WhatsApp tables
DROP POLICY IF EXISTS "Service role manages whatsapp_otp_challenges" ON public.whatsapp_otp_challenges;
CREATE POLICY "Service role manages whatsapp_otp_challenges"
  ON public.whatsapp_otp_challenges FOR ALL
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role manages whatsapp_messages" ON public.whatsapp_messages;
CREATE POLICY "Service role manages whatsapp_messages"
  ON public.whatsapp_messages FOR ALL
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role manages whatsapp_conversations" ON public.whatsapp_conversations;
CREATE POLICY "Service role manages whatsapp_conversations"
  ON public.whatsapp_conversations FOR ALL
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role manages whatsapp_webhook_events" ON public.whatsapp_webhook_events;
CREATE POLICY "Service role manages whatsapp_webhook_events"
  ON public.whatsapp_webhook_events FOR ALL
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role manages whatsapp_notification_preferences" ON public.whatsapp_notification_preferences;
CREATE POLICY "Service role manages whatsapp_notification_preferences"
  ON public.whatsapp_notification_preferences FOR ALL
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role manages whatsapp_outbox_queue" ON public.whatsapp_outbox_queue;
CREATE POLICY "Service role manages whatsapp_outbox_queue"
  ON public.whatsapp_outbox_queue FOR ALL
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- 2. Authenticated user access to their own messages and preferences
DROP POLICY IF EXISTS "Users can read own whatsapp messages" ON public.whatsapp_messages;
CREATE POLICY "Users can read own whatsapp messages"
  ON public.whatsapp_messages FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view and manage own whatsapp preferences" ON public.whatsapp_notification_preferences;
CREATE POLICY "Users can view and manage own whatsapp preferences"
  ON public.whatsapp_notification_preferences FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 3. Admin / Staff access to conversations
DROP POLICY IF EXISTS "Admins can view and manage all conversations" ON public.whatsapp_conversations;
CREATE POLICY "Admins can view and manage all conversations"
  ON public.whatsapp_conversations FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'doctor', 'dietitian')));

NOTIFY pgrst, 'reload schema';
