-- ============================================================
-- Fix: Backfill balance student_savings yang selisih
-- ============================================================
-- Masalah: AddBalance gagal update kolom balance di beberapa
--          payment, tapi savings_transactions tetap tercatat.
--          Akibatnya saldo kurang dari seharusnya.
--
-- Jalankan di local (alizzah_test) dulu, lalu production.
--
-- Backup dulu:
--   pg_dump -t student_savings > student_savings_backup.sql
-- ============================================================

BEGIN;

-- ============================================================
-- STEP 1: Preview — siswa yang akan diperbaiki
-- ============================================================
WITH calculated AS (
    SELECT
        ss.id                     AS savings_id,
        ss.student_id,
        ss.balance                AS stored_balance,
        ss.type,
        COALESCE(SUM(
            CASE WHEN st.transaction_type = 'debit'
                 THEN st.net_amount
                 ELSE -st.net_amount
            END
        ), 0)                     AS calc_balance
    FROM student_savings ss
    LEFT JOIN savings_transactions st
        ON st.student_savings_id = ss.id
       AND st.deleted_at IS NULL
    WHERE ss.type = 'general'
      AND ss.deleted_at IS NULL
    GROUP BY ss.id, ss.student_id, ss.balance, ss.type
)
SELECT
    s.full_name,
    c.student_id,
    c.stored_balance,
    c.calc_balance,
    c.calc_balance - c.stored_balance AS selisih,
    c.savings_id
FROM calculated c
JOIN students s ON s.id = c.student_id
WHERE c.stored_balance <> c.calc_balance
ORDER BY (c.calc_balance - c.stored_balance) DESC;

-- ============================================================
-- STEP 2: Update balance ke nilai yang benar
-- ============================================================
WITH calculated AS (
    SELECT
        ss.id                     AS savings_id,
        COALESCE(SUM(
            CASE WHEN st.transaction_type = 'debit'
                 THEN st.net_amount
                 ELSE -st.net_amount
            END
        ), 0)                     AS calc_balance
    FROM student_savings ss
    LEFT JOIN savings_transactions st
        ON st.student_savings_id = ss.id
       AND st.deleted_at IS NULL
    WHERE ss.type = 'general'
      AND ss.deleted_at IS NULL
    GROUP BY ss.id
)
UPDATE student_savings ss
SET balance    = c.calc_balance,
    updated_at = NOW()
FROM calculated c
WHERE ss.id = c.savings_id
  AND ss.balance <> c.calc_balance;

-- ============================================================
-- STEP 3: Verifikasi — pastikan tidak ada selisih lagi
-- ============================================================
WITH calculated AS (
    SELECT
        ss.id                     AS savings_id,
        ss.student_id,
        ss.balance                AS stored_balance,
        COALESCE(SUM(
            CASE WHEN st.transaction_type = 'debit'
                 THEN st.net_amount
                 ELSE -st.net_amount
            END
        ), 0)                     AS calc_balance
    FROM student_savings ss
    LEFT JOIN savings_transactions st
        ON st.student_savings_id = ss.id
       AND st.deleted_at IS NULL
    WHERE ss.type = 'general'
      AND ss.deleted_at IS NULL
    GROUP BY ss.id, ss.student_id, ss.balance
)
SELECT
    COUNT(*)                                 AS total_general_savings,
    COUNT(*) FILTER (WHERE stored_balance <> calc_balance) AS remaining_mismatch,
    COALESCE(SUM(stored_balance - calc_balance), 0)       AS total_selisih
FROM calculated;

-- Jika remaining_mismatch = 0 → COMMIT
-- Jika masih ada → periksa ulang, lalu ROLLBACK

-- ROLLBACK;  -- uncomment untuk test dulu
COMMIT;
