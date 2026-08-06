-- ============================================================
-- Fix: Bersihkan data daycare yg rusak akibat bug Update & sync
-- ============================================================
-- Masalah:
--   1. Siswa punya >1 enrollment daycare (aktif + nonaktif) —
--      duplikat yg menyebabkan SPD di-inject berkali-kali.
--   2. Invoice bulanan punya item daycare dari berbagai
--      kombinasi time_slot/age_group akibat Update tanpa cleanup.
--   3. Invoice daycare_initial (Biaya Awal) belum dibuat utk
--      siswa premium baru.
--   4. Total amount invoice tidak sesuai krn item menumpuk.
--
-- Jalankan di alizzah_test dulu, lalu production.
--
-- Backup dulu:
--   pg_dump -t daycare_enrollments -t invoices -t invoice_items \
--     > daycare_backup_$(date +%Y%m%d).sql
-- ============================================================

BEGIN;

-- ============================================================
-- STEP 0: Preview — siswa dgn >1 enrollment
-- ============================================================
SELECT '=== STEP 0: Duplicate enrollments ===' as info;
SELECT
    s.full_name,
    de.student_id,
    de.academic_year_id,
    count(*)                AS total_enrollments,
    string_agg(de.id::text || '(' || de.category || '/' || de.status || ')', ', ') AS details
FROM daycare_enrollments de
JOIN students s ON s.id = de.student_id
GROUP BY s.full_name, de.student_id, de.academic_year_id
HAVING count(*) > 1;

-- ============================================================
-- STEP 1: Preview — invoice dgn item daycare >1 (selain meal+spd)
-- ============================================================
SELECT '=== STEP 1: Invoices with multiple daycare items ===' as info;
SELECT
    s.full_name,
    i.id                     AS invoice_id,
    i.type,
    i.month,
    i.year,
    i.total_amount,
    count(ii.id)             AS total_daycare_items,
    string_agg(ii.name || ' (' || ii.amount || ')', ' | ') AS items
FROM invoices i
JOIN invoice_items ii ON ii.invoice_id = i.id AND ii.category = 'daycare'
JOIN students s ON s.id = i.student_id
GROUP BY s.full_name, i.id, i.type, i.month, i.year, i.total_amount
HAVING count(ii.id) > 1
ORDER BY s.full_name, i.type, i.year, i.month;

-- ============================================================
-- STEP 2: Preview — siswa premium tanpa daycare_initial
-- ============================================================
SELECT '=== STEP 2: Premium students missing initial invoice ===' as info;
SELECT
    s.full_name,
    de.id                    AS enrollment_id,
    de.student_id,
    de.category,
    de.time_slot,
    de.age_group
FROM daycare_enrollments de
JOIN students s ON s.id = de.student_id
WHERE de.category = 'premium'
  AND de.status = 'active'
  AND NOT EXISTS (
    SELECT 1 FROM invoice_items ii
    JOIN invoices i ON i.id = ii.invoice_id
    WHERE i.student_id = de.student_id
      AND i.academic_year_id = de.academic_year_id
      AND i.type IN ('initial', 'daycare_initial')
      AND ii.category = 'daycare'
  )
ORDER BY s.full_name;

-- ============================================================
-- STEP 3: Hapus enrollment duplikat yg inactive
--         (keep yg active; jika >1 active, keep id tertinggi)
-- ============================================================
SELECT '=== STEP 3: Cleaning duplicate enrollments ===' as info;

-- Cari enrollment yg HARUS dihapus:
-- - inactive & ada enrollment aktif lain utk student+ay yg sama
-- - inactive tanpa pasangan aktif
-- - jika >1 active: hapus semua kecuali id tertinggi
WITH ranked AS (
    SELECT
        id,
        student_id,
        academic_year_id,
        status,
        ROW_NUMBER() OVER (
            PARTITION BY student_id, academic_year_id
            ORDER BY
                CASE WHEN status = 'active' THEN 0 ELSE 1 END,
                id DESC
        ) AS rn
    FROM daycare_enrollments
),
to_delete AS (
    SELECT id FROM ranked WHERE rn > 1
)
SELECT 'Will delete enrollments:' as info, id, student_id FROM daycare_enrollments WHERE id IN (SELECT id FROM to_delete);

-- Eksekusi hapus
WITH ranked AS (
    SELECT
        id,
        ROW_NUMBER() OVER (
            PARTITION BY student_id, academic_year_id
            ORDER BY
                CASE WHEN status = 'active' THEN 0 ELSE 1 END,
                id DESC
        ) AS rn
    FROM daycare_enrollments
),
to_delete AS (
    SELECT id FROM ranked WHERE rn > 1
)
DELETE FROM daycare_enrollments WHERE id IN (SELECT id FROM to_delete);

-- ============================================================
-- STEP 4: Bersihkan SEMUA item daycare yg duplikat di invoice
--         bulanan (regular & premium). Untuk setiap invoice,
--         hapus semua item daycare unpaid, lalu regenerate
--         yg benar di STEP 5.
-- ============================================================
SELECT '=== STEP 4: Cleaning all duplicate daycare items ===' as info;

DELETE FROM invoice_items ii
USING invoices i
WHERE ii.invoice_id = i.id
  AND i.type = 'monthly'
  AND ii.category IN ('daycare', 'daycare_meal')
  AND ii.paid_amount = 0
  AND i.id IN (
    -- Hanya invoice yg punya >1 item daycare (ada duplikat)
    SELECT i2.id
    FROM invoices i2
    JOIN invoice_items ii2 ON ii2.invoice_id = i2.id AND ii2.category = 'daycare'
    GROUP BY i2.id
    HAVING count(ii2.id) > 1
  );

-- ============================================================
-- STEP 5: Regenerate item SPD yg benar utk invoice yg dibersihkan
-- ============================================================
SELECT '=== STEP 5: Regenerate SPD items ===' as info;

-- 5a. Premium: inject SPD flat dari enrollment
INSERT INTO invoice_items (invoice_id, name, category, amount, is_mandatory, created_at, updated_at)
SELECT
    i.id,
    fci.name,
    'daycare',
    fci.amount,
    false,
    NOW(),
    NOW()
FROM invoices i
JOIN daycare_enrollments de
    ON de.student_id = i.student_id
   AND de.academic_year_id = i.academic_year_id
   AND de.status = 'active'
   AND de.category = 'premium'
JOIN fee_configs fc ON fc.academic_year_id = de.academic_year_id
JOIN fee_config_items fci
    ON fci.fee_config_id = fc.id
   AND fci.item_key = 'daycare_premium_' || REPLACE(de.time_slot, '-', '') || '_' || de.age_group || '_spd'
   AND fci.level = 'all'
   AND fci.gender = 'all'
WHERE i.type = 'monthly'
  -- Hanya invoice yg tidak punya item daycare (baru dibersihkan di STEP 4)
  AND NOT EXISTS (
    SELECT 1 FROM invoice_items existing
    WHERE existing.invoice_id = i.id AND existing.category = 'daycare'
  )
  -- Hanya bulan >= start_date enrollment
  AND (i.year > EXTRACT(YEAR FROM de.start_date)::int
       OR (i.year = EXTRACT(YEAR FROM de.start_date)::int
           AND i.month >= EXTRACT(MONTH FROM de.start_date)::int));

-- 5b. Regular: regenerate SPD dari monthly attendance record
INSERT INTO invoice_items (invoice_id, name, category, amount, quantity, unit_price, is_mandatory, created_at, updated_at)
SELECT
    i.id,
    fci.name || ' (' || dma.spd_days || ' hari)',
    'daycare',
    fci.amount * dma.spd_days,
    dma.spd_days,
    fci.amount,
    false,
    NOW(),
    NOW()
FROM invoices i
JOIN daycare_enrollments de
    ON de.student_id = i.student_id
   AND de.academic_year_id = i.academic_year_id
   AND de.status = 'active'
   AND de.category = 'regular'
JOIN daycare_monthly_attendances dma
    ON dma.student_id = i.student_id
   AND dma.month = i.month
   AND dma.year = i.year
JOIN fee_configs fc ON fc.academic_year_id = de.academic_year_id
JOIN fee_config_items fci
    ON fci.fee_config_id = fc.id
   AND fci.item_key = 'daycare_regular_' || REPLACE(de.time_slot, '-', '') || '_' || de.age_group || '_daily'
   AND fci.level = 'all'
   AND fci.gender = 'all'
WHERE i.type = 'monthly'
  AND dma.spd_days > 0
  AND NOT EXISTS (
    SELECT 1 FROM invoice_items existing
    WHERE existing.invoice_id = i.id AND existing.category = 'daycare'
  )
  AND (i.year > EXTRACT(YEAR FROM de.start_date)::int
       OR (i.year = EXTRACT(YEAR FROM de.start_date)::int
           AND i.month >= EXTRACT(MONTH FROM de.start_date)::int));

-- 5c. Regular + meal items dari monthly attendance
INSERT INTO invoice_items (invoice_id, name, category, amount, quantity, unit_price, is_mandatory, created_at, updated_at)
SELECT
    i.id,
    fci.name || ' (' || dma.meal_days || ' hari)',
    'daycare_meal',
    fci.amount * dma.meal_days,
    dma.meal_days,
    fci.amount,
    false,
    NOW(),
    NOW()
FROM invoices i
JOIN daycare_monthly_attendances dma
    ON dma.student_id = i.student_id
   AND dma.month = i.month
   AND dma.year = i.year
JOIN fee_configs fc ON fc.academic_year_id = i.academic_year_id
JOIN fee_config_items fci
    ON fci.fee_config_id = fc.id
   AND fci.item_key = 'daycare_regular_meal'
   AND fci.level = 'all'
   AND fci.gender = 'all'
WHERE i.type = 'monthly'
  AND dma.meal_days > 0
  AND NOT EXISTS (
    SELECT 1 FROM invoice_items existing
    WHERE existing.invoice_id = i.id AND existing.category = 'daycare_meal'
  );

-- Recalculate total_amount utk invoice yg kena perubahan
UPDATE invoices i
SET total_amount = (
    SELECT COALESCE(SUM(ii.amount), 0)
    FROM invoice_items ii
    WHERE ii.invoice_id = i.id
),
updated_at = NOW()
WHERE i.id IN (
    SELECT DISTINCT ii.invoice_id
    FROM invoice_items ii
    WHERE ii.created_at >= NOW() - INTERVAL '1 minute'
);

-- ============================================================
-- STEP 6: Generate daycare_initial utk premium tanpa Biaya Awal
-- ============================================================
SELECT '=== STEP 6: Generate missing initial invoices ===' as info;

INSERT INTO invoices (student_id, academic_year_id, type, status, total_amount, notes, created_at, updated_at)
SELECT
    de.student_id,
    de.academic_year_id,
    'daycare_initial',
    'unpaid',
    fci.amount,
    'Biaya awal pendaftaran daycare',
    NOW(),
    NOW()
FROM daycare_enrollments de
JOIN fee_configs fc ON fc.academic_year_id = de.academic_year_id
JOIN fee_config_items fci
    ON fci.fee_config_id = fc.id
   AND fci.item_key = 'daycare_premium_initial'
   AND fci.level = 'all'
   AND fci.gender = 'all'
WHERE de.category = 'premium'
  AND de.status = 'active'
  AND NOT EXISTS (
    SELECT 1 FROM invoice_items ii
    JOIN invoices i ON i.id = ii.invoice_id
    WHERE i.student_id = de.student_id
      AND i.academic_year_id = de.academic_year_id
      AND i.type IN ('initial', 'daycare_initial')
      AND ii.category = 'daycare'
  );

-- Insert item ke daycare_initial invoice yg baru dibuat
INSERT INTO invoice_items (invoice_id, name, category, amount, is_mandatory, created_at, updated_at)
SELECT
    i.id,
    fci.name,
    'daycare',
    fci.amount,
    false,
    NOW(),
    NOW()
FROM invoices i
JOIN fee_configs fc ON fc.academic_year_id = i.academic_year_id
JOIN fee_config_items fci
    ON fci.fee_config_id = fc.id
   AND fci.item_key = 'daycare_premium_initial'
   AND fci.level = 'all'
   AND fci.gender = 'all'
WHERE i.type = 'daycare_initial'
  AND NOT EXISTS (
    SELECT 1 FROM invoice_items existing
    WHERE existing.invoice_id = i.id AND existing.category = 'daycare'
  );

-- ============================================================
-- STEP 7: Verifikasi — pastikan tidak ada masalah tersisa
-- ============================================================
SELECT '=== VERIFICATION ===' as info;

-- 7a. Tidak ada duplicate enrollment
SELECT '7a. Duplicate enrollments (should be 0):' as info, count(*) as remaining
FROM (
    SELECT student_id, academic_year_id, count(*)
    FROM daycare_enrollments
    GROUP BY student_id, academic_year_id
    HAVING count(*) > 1
) dup;

-- 7b. Tidak ada invoice dgn >1 item daycare
SELECT '7b. Invoices with >1 daycare items (should be 0):' as info, count(*) as remaining
FROM (
    SELECT i.id
    FROM invoices i
    JOIN invoice_items ii ON ii.invoice_id = i.id AND ii.category = 'daycare'
    GROUP BY i.id
    HAVING count(ii.id) > 1
) multi;

-- 7c. Tidak ada premium aktif tanpa daycare_initial
SELECT '7c. Premium w/o initial invoice (should be 0):' as info, count(*) as remaining
FROM daycare_enrollments de
WHERE de.category = 'premium'
  AND de.status = 'active'
  AND NOT EXISTS (
    SELECT 1 FROM invoice_items ii
    JOIN invoices i ON i.id = ii.invoice_id
    WHERE i.student_id = de.student_id
      AND i.academic_year_id = de.academic_year_id
      AND i.type IN ('initial', 'daycare_initial')
      AND ii.category = 'daycare'
  );

-- 7d. Semua monthly invoice premium punya item SPD
SELECT '7d. Premium monthly w/o SPD (should be 0):' as info, count(*) as remaining
FROM invoices i
JOIN daycare_enrollments de
    ON de.student_id = i.student_id
   AND de.academic_year_id = i.academic_year_id
   AND de.status = 'active'
   AND de.category = 'premium'
WHERE i.type = 'monthly'
  AND NOT EXISTS (
    SELECT 1 FROM invoice_items ii
    WHERE ii.invoice_id = i.id AND ii.category = 'daycare'
  );

-- Jika semua remaining = 0 → COMMIT
-- Jika masih ada → ROLLBACK dan periksa ulang

-- ROLLBACK;  -- uncomment untuk test dulu
COMMIT;
