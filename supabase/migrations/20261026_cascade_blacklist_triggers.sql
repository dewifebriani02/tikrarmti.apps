-- Migration: 20261026_cascade_blacklist_triggers.sql
-- Purpose: Otomatis cascade status blacklist dari users ke daftar_ulang_submissions, halaqah_students, dan study_partners

-- 1. Function & Trigger BEFORE INSERT OR UPDATE pada tabel users:
-- Memastikan jika user di-blacklist, is_active otomatis FALSE dan blacklisted_at terisi.
CREATE OR REPLACE FUNCTION trg_fn_users_blacklist_before()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_blacklisted = TRUE THEN
        NEW.is_active := FALSE;
        IF NEW.blacklisted_at IS NULL THEN
            NEW.blacklisted_at := NOW();
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_blacklist_before ON users;
CREATE TRIGGER trg_users_blacklist_before
    BEFORE INSERT OR UPDATE OF is_blacklisted ON users
    FOR EACH ROW
    EXECUTE FUNCTION trg_fn_users_blacklist_before();

-- 2. Function & Trigger AFTER UPDATE pada tabel users:
-- Mengalirkan status blacklist ke daftar_ulang_submissions, halaqah_students, dan study_partners
CREATE OR REPLACE FUNCTION trg_fn_users_blacklist_cascade_after()
RETURNS TRIGGER AS $$
BEGIN
    -- Hanya berjalan jika is_blacklisted berubah menjadi TRUE
    IF NEW.is_blacklisted = TRUE AND (OLD.is_blacklisted IS DISTINCT FROM TRUE) THEN
        -- A. Update status daftar ulang menjadi 'dropout'
        UPDATE daftar_ulang_submissions
        SET status = 'dropout',
            rejection_reason = COALESCE(rejection_reason, NEW.blacklist_reason, 'User masuk daftar blacklist sistem'),
            updated_at = NOW()
        WHERE user_id = NEW.id
          AND status IN ('approved', 'submitted', 'draft');

        -- B. Update status keanggotaan halaqah menjadi 'inactive'
        UPDATE halaqah_students
        SET status = 'inactive'
        WHERE thalibah_id = NEW.id
          AND status = 'active';

        -- C. Update status pasangan partner halaqah menjadi 'disbanded'
        UPDATE study_partners
        SET pairing_status = 'disbanded',
            notes = CASE 
                WHEN notes IS NULL OR notes = '' THEN 'Mitra halaqah di-blacklist'
                ELSE notes || ' | Mitra halaqah di-blacklist'
            END,
            updated_at = NOW()
        WHERE (user_1_id = NEW.id OR user_2_id = NEW.id OR user_3_id = NEW.id)
          AND pairing_status = 'active';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_blacklist_cascade_after ON users;
CREATE TRIGGER trg_users_blacklist_cascade_after
    AFTER UPDATE OF is_blacklisted ON users
    FOR EACH ROW
    EXECUTE FUNCTION trg_fn_users_blacklist_cascade_after();

-- 3. Function & Trigger AFTER UPDATE pada tabel daftar_ulang_submissions:
-- Jika thalibah berubah status menjadi 'dropout' atau 'mengundurkan_diri',
-- otomatis nonaktifkan dari halaqah_students jika masih berstatus 'active'.
CREATE OR REPLACE FUNCTION trg_fn_daftar_ulang_dropout_cascade()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status IN ('dropout', 'mengundurkan_diri') AND (OLD.status IS DISTINCT FROM NEW.status) THEN
        UPDATE halaqah_students
        SET status = 'inactive'
        WHERE thalibah_id = NEW.user_id
          AND status = 'active';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_daftar_ulang_dropout_cascade ON daftar_ulang_submissions;
CREATE TRIGGER trg_daftar_ulang_dropout_cascade
    AFTER UPDATE OF status ON daftar_ulang_submissions
    FOR EACH ROW
    EXECUTE FUNCTION trg_fn_daftar_ulang_dropout_cascade();

-- 4. View Single Source of Truth untuk Thalibah Aktif
CREATE OR REPLACE VIEW v_active_thalibah AS
SELECT 
    u.id AS user_id,
    u.full_name,
    u.nama_kunyah,
    u.whatsapp,
    u.email,
    u.student_id_number,
    du.id AS submission_id,
    du.batch_id,
    du.confirmed_chosen_juz,
    du.status AS submission_status,
    hs.halaqah_id,
    h.name AS halaqah_name,
    hs.status AS halaqah_status
FROM users u
JOIN daftar_ulang_submissions du ON du.user_id = u.id AND du.status = 'approved'
LEFT JOIN halaqah_students hs ON hs.thalibah_id = u.id AND hs.status = 'active'
LEFT JOIN halaqah h ON h.id = hs.halaqah_id
WHERE (u.is_blacklisted IS FALSE OR u.is_blacklisted IS NULL)
  AND (u.is_active IS TRUE OR u.is_active IS NULL);

GRANT ALL ON FUNCTION trg_fn_users_blacklist_before() TO mti_user;
GRANT ALL ON FUNCTION trg_fn_users_blacklist_cascade_after() TO mti_user;
GRANT ALL ON FUNCTION trg_fn_daftar_ulang_dropout_cascade() TO mti_user;
GRANT ALL ON v_active_thalibah TO mti_user;
