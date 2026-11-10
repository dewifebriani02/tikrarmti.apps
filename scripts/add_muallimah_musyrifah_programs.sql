-- Script to add Muallimah and Musyrifah programs
-- Run this script to create sample programs for registration

-- First, create a batch for 2025 if it doesn't exist
INSERT INTO batches (id, name, description, start_date, end_date, registration_start_date, registration_end_date, status, duration_weeks, program_type)
VALUES (
    gen_random_uuid(),
    'Batch 2025 - Program Guru MTI',
    'Batch untuk program persiapan guru dan musyrifah MTI tahun 2025',
    '2025-01-15',
    '2025-12-15',
    '2024-12-20',
    '2025-01-10',
    'open',
    48,
    'guru_mti'
) ON CONFLICT DO NOTHING;

-- Get the batch ID
DO $$
DECLARE
    batch_id UUID;
BEGIN
    SELECT id INTO batch_id FROM batches WHERE name = 'Batch 2025 - Program Guru MTI';

    IF batch_id IS NOT NULL THEN
        -- Create Muallimah Program
        INSERT INTO programs (id, batch_id, name, description, target_level, duration_weeks, max_thalibah, status)
        VALUES (
            gen_random_uuid(),
            batch_id,
            'Program Muallimah 100%',
            'Program persiapan dan sertifikasi 100 muallimah profesional yang siap mengajar di MTI. Peserta akan mendapatkan pelatihan intensif, sertifikasi internasional, dan kesempatan karir sebagai pengajar Al-Quran.',
            'SMA/Sederajat - S1',
            24,
            100,
            'open'
        ) ON CONFLICT DO NOTHING;

        -- Create Musyrifah Program
        INSERT INTO programs (id, batch_id, name, description, target_level, duration_weeks, max_thalibah, status)
        VALUES (
            gen_random_uuid(),
            batch_id,
            'Program Musyrifah Profesional',
            'Program pelatihan musyrifah profesional yang akan mendampingi muallimah dalam melaksanakan tugas pendidikan. Fokus pada pengembangan leadership, manajemen, dan kemampuan pembinaan thalibah.',
            'S1/Sederajat',
            12,
            50,
            'open'
        ) ON CONFLICT DO NOTHING;

        RAISE NOTICE 'Programs created successfully for batch: %', batch_id;
    ELSE
        RAISE NOTICE 'Batch not found. Please create the batch first.';
    END IF;
END $$;

-- Verify the programs were created
SELECT
    p.name,
    p.description,
    p.duration_weeks,
    p.max_thalibah,
    p.status,
    b.name as batch_name,
    b.start_date,
    b.end_date
FROM programs p
JOIN batches b ON p.batch_id = b.id
WHERE p.name ILIKE '%muallimah%' OR p.name ILIKE '%musyrifah%'
ORDER BY p.name;