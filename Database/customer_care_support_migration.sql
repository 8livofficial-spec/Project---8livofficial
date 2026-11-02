-- =============================================================================
-- 8LIV CUSTOMER CARE & PATIENT HELPDESK MIGRATION
-- =============================================================================

-- 1. Support Tickets Table
CREATE TABLE IF NOT EXISTS support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_number SERIAL UNIQUE,
    patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    assigned_agent_id UUID REFERENCES auth.users(id),
    category VARCHAR(60) NOT NULL, -- 'booking', 'lab_report', 'billing', 'prescription', 'diet_fitness', 'general'
    priority VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
    status VARCHAR(30) DEFAULT 'open', -- 'open', 'in_progress', 'waiting_on_patient', 'resolved', 'closed'
    subject VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    resolution_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexing for fast ticket queries
CREATE INDEX IF NOT EXISTS idx_support_tickets_patient_id ON support_tickets(patient_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned_agent ON support_tickets(assigned_agent_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created_at ON support_tickets(created_at DESC);

-- 2. Threaded Ticket Messages & Internal Notes
CREATE TABLE IF NOT EXISTS support_ticket_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES auth.users(id),
    sender_role VARCHAR(30) NOT NULL, -- 'support_agent', 'patient', 'doctor', 'admin'
    message_body TEXT NOT NULL,
    is_internal_note BOOLEAN DEFAULT false, -- True: visible only to agents/staff; False: visible to patient
    attachments JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_ticket_messages_ticket_id ON support_ticket_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_support_ticket_messages_created_at ON support_ticket_messages(created_at ASC);

-- 3. Categorized Patient Blood Reports
CREATE TABLE IF NOT EXISTS patient_lab_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    uploaded_by UUID NOT NULL REFERENCES auth.users(id),
    uploaded_by_role VARCHAR(30) NOT NULL, -- 'support_agent', 'patient', 'admin'
    report_category VARCHAR(60) NOT NULL, -- 'hba1c_diabetes', 'lipid_profile', 'thyroid_panel', 'cbc', 'lft_kft', 'general_blood'
    test_date DATE,
    file_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    file_path TEXT NOT NULL,
    mime_type VARCHAR(100),
    file_size_bytes BIGINT,
    doctor_reviewed BOOLEAN DEFAULT false,
    doctor_review_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_patient_lab_reports_patient_id ON patient_lab_reports(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_lab_reports_category ON patient_lab_reports(report_category);

-- 4. Customer Care Operations Audit Trail
CREATE TABLE IF NOT EXISTS support_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES auth.users(id),
    patient_id UUID NOT NULL REFERENCES auth.users(id),
    action_type VARCHAR(60) NOT NULL, -- 'upload_blood_report', 'reschedule_appointment', 'resend_receipt', 'resend_prescription', 'resolve_ticket'
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_audit_logs_patient_id ON support_audit_logs(patient_id);
CREATE INDEX IF NOT EXISTS idx_support_audit_logs_agent_id ON support_audit_logs(agent_id);

-- Enable RLS
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_lab_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_audit_logs ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY service_role_support_tickets ON support_tickets FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY service_role_support_ticket_messages ON support_ticket_messages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY service_role_patient_lab_reports ON patient_lab_reports FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY service_role_support_audit_logs ON support_audit_logs FOR ALL USING (true) WITH CHECK (true);

