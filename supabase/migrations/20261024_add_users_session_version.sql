-- Session versioning: every session JWT carries `sv` (the user's session_version at
-- login). Bumping session_version revokes all existing sessions for that user.
-- Bumped on password change, OTP reset and admin password reset.
-- Existing tokens have no `sv` and are treated as version 0, so applying this
-- migration does not log anyone out.
--
-- MUST be applied before deploying the code that reads users.session_version.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS session_version integer NOT NULL DEFAULT 0;
