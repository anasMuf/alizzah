-- ============================================================
-- Fix: transaksi tabungan "yatim" + koreksi saldo tersimpan
-- ============================================================
-- Latar belakang:
--   Sebagian savings_transactions diset deleted_at (soft delete) saat
--   payment-nya dihapus, tapi model GORM belum punya field DeletedAt,
--   sehingga semua query tetap menghitung transaksi "yatim" ini.
--   Akibatnya mutasi (saldo berjalan) ≠ student_savings.balance.
--
--   Kasus khusus siswa 65: reversal setoran yatim pernah di-clamp ke 0
--   oleh bug reversePayment lama, membuat saldo tersimpan Rp 66.000 lebih
--   tinggi dari mutasi valid (167.000 vs 101.000).
--
-- Script ini:
--   1. Menampilkan transaksi yatim (preview)
--   2. Menampilkan saldo yang meleset dari mutasi VALID (preview)
--   3. Mengoreksi balance = mutasi valid (hanya siswa 65 yang berubah)
--   4. (Opsional) Menghapus permanen transaksi yatim
--   5. Verifikasi tidak ada selisih
--
-- Prasyarat kode: patch model SavingsTransaction + field DeletedAt sudah
-- diterapkan (query aplikasi otomatis mem-filter deleted_at IS NULL).
--
-- Jalankan di local (alizzah_test) dulu, lalu production.
--
-- Backup dulu:
--   pg_dump -t savings_transactions -t student_savings -t payments \
--     > savings_backup_$(date +%Y%m%d).sql
-- ============================================================

BEGIN;

-- ============================================================
-- STEP 0: Preview — transaksi yatim (soft-deleted + source payment hilang)
-- ============================================================
SELECT st.id AS txn_id, ss.student_id, ss.type, st.source_type, st.source_id,
       st.amount, st.net_amount, st.deleted_at
FROM savings_transactions st
JOIN student_savings ss ON ss.id = st.student_savings_id
WHERE st.deleted_at IS NOT NULL
  AND st.source_type IN ('payment_usage','payment_deposit','payment_mandatory')
  AND (st.source_id IS NULL
       OR NOT EXISTS (SELECT 1 FROM payments p WHERE p.id = st.source_id))
ORDER BY ss.student_id, st.id;

-- ============================================================
-- STEP 1: Preview — saldo tersimpan vs mutasi VALID (deleted_at IS NULL)
-- ============================================================
WITH calculated AS (
    SELECT
        ss.id                     AS savings_id,
        ss.student_id,
        ss.type,
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
    GROUP BY ss.id, ss.student_id, ss.type, ss.balance
)
SELECT s.full_name, c.student_id, c.type, c.stored_balance, c.calc_balance,
       c.calc_balance - c.stored_balance AS selisih
FROM calculated c
JOIN students s ON s.id = c.student_id
WHERE c.stored_balance <> c.calc_balance
ORDER BY selisih DESC;

-- ============================================================
-- STEP 2: Koreksi balance → mutasi valid
-- (Dataset saat ini hanya siswa 65 general yang berubah: 167.000 → 101.000.
--  Akun lain sudah konsisten karena yatim tidak pernah masuk ke balance.)
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
    GROUP BY ss.id
)
UPDATE student_savings ss
SET balance    = c.calc_balance,
    updated_at = NOW()
FROM calculated c
WHERE ss.id = c.savings_id
  AND ss.balance <> c.calc_balance;

-- ============================================================
-- STEP 3: (Opsional) Hapus permanen transaksi yatim.
-- Aman: query aplikasi sudah mem-filter deleted_at IS NULL setelah patch
-- model, jadi baris ini tidak mempengaruhi angka. Hapus untuk membersihkan
-- tabel. Uncomment jika ingin menjalankan:
-- ============================================================
-- DELETE FROM savings_transactions st
-- USING student_savings ss
-- WHERE st.student_savings_id = ss.id
--   AND st.deleted_at IS NOT NULL
--   AND st.source_type IN ('payment_usage','payment_deposit','payment_mandatory')
--   AND (st.source_id IS NULL
--        OR NOT EXISTS (SELECT 1 FROM payments p WHERE p.id = st.source_id));

-- ============================================================
-- STEP 4: Verifikasi — tidak boleh ada selisih lagi
-- ============================================================
WITH calculated AS (
    SELECT
        ss.id                     AS savings_id,
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
    GROUP BY ss.id, ss.balance
)
SELECT
    COUNT(*)                                        AS total_accounts,
    COUNT(*) FILTER (WHERE stored_balance <> calc_balance) AS remaining_mismatch,
    COALESCE(SUM(stored_balance - calc_balance), 0) AS total_selisih
FROM calculated;

-- Jika remaining_mismatch = 0 → COMMIT
-- ROLLBACK;  -- uncomment untuk test dulu
COMMIT;
