-- Single-use password reset tokens: the reset JWT carries the OTP row id as `jti`.
-- /api/auth/reset-with-otp sets reset_token_used_at atomically, so a token can
-- change the password only once (see app/api/auth/reset-with-otp/route.ts).
--
-- MUST be applied before deploying the code that reads this column.

ALTER TABLE password_reset_otps
  ADD COLUMN IF NOT EXISTS reset_token_used_at TIMESTAMP WITH TIME ZONE;
