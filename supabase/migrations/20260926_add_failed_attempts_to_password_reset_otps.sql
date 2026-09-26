-- Brute-force guard for password reset OTPs (see app/api/auth/verify-otp/route.ts)
ALTER TABLE password_reset_otps
  ADD COLUMN IF NOT EXISTS failed_attempts INTEGER NOT NULL DEFAULT 0;
