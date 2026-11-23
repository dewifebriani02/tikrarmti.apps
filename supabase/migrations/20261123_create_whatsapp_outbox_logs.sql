-- Outbound WhatsApp Audit Log (Kotak Keluar / Outbox)
CREATE TABLE IF NOT EXISTS whatsapp_outbox_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_phone VARCHAR(100) NOT NULL,
  recipient_name VARCHAR(200),
  recipient_type VARCHAR(20) NOT NULL DEFAULT 'individual',
  message_type VARCHAR(20) NOT NULL DEFAULT 'text',
  message_body TEXT NOT NULL,
  media_url TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'sent',
  error_message TEXT,
  sender_number VARCHAR(40),
  sender_key_masked VARCHAR(40),
  sender_source VARCHAR(30),
  used_fallback BOOLEAN NOT NULL DEFAULT FALSE,
  source_tag VARCHAR(60) NOT NULL DEFAULT 'system',
  watzap_message_id VARCHAR(120),
  provider VARCHAR(20) NOT NULL DEFAULT 'watzap',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wa_outbox_created_at ON whatsapp_outbox_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wa_outbox_recipient_phone ON whatsapp_outbox_logs (recipient_phone);
CREATE INDEX IF NOT EXISTS idx_wa_outbox_status ON whatsapp_outbox_logs (status);
CREATE INDEX IF NOT EXISTS idx_wa_outbox_source_tag ON whatsapp_outbox_logs (source_tag);
CREATE INDEX IF NOT EXISTS idx_wa_outbox_sender_number ON whatsapp_outbox_logs (sender_number);
