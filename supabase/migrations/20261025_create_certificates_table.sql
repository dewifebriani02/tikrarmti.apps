-- Migration: 20261025_create_certificates_table.sql
-- Create certificates table for automated Canva PDF import with dynamic QR Code verification

CREATE TABLE IF NOT EXISTS certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_number VARCHAR(100) UNIQUE NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  batch_id UUID REFERENCES batches(id) ON DELETE SET NULL,
  juz_number VARCHAR(50),
  predicate VARCHAR(100),
  score_lisan NUMERIC,
  score_tulisan NUMERIC,
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  hijri_date VARCHAR(100),
  pdf_url TEXT NOT NULL,
  qr_code_url TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  status VARCHAR(20) DEFAULT 'issued',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_certificates_user_id ON certificates(user_id);
CREATE INDEX IF NOT EXISTS idx_certificates_batch_id ON certificates(batch_id);
CREATE INDEX IF NOT EXISTS idx_certificates_cert_number ON certificates(certificate_number);
