-- ============================================================
-- Cleanup: Hapus savings_transactions dengan admin_fee > 0
-- ============================================================
-- Jalankan query ini di database local (alizzah_test) dulu
-- untuk verifikasi, lalu jalankan di production.
--
-- Backup dulu:
--   pg_dump -t savings_transactions > savings_txn_backup.sql
-- ============================================================

BEGIN;

-- 1. Lihat dulu data yang akan dihapus (preview)
SELECT id, student_savings_id, transaction_type, source_type, 
       amount, admin_fee, net_amount, notes, created_at
FROM savings_transactions 
WHERE admin_fee > 0
ORDER BY created_at DESC;

-- 2. Hapus savings_transactions dengan admin_fee > 0
--    (hanya guardian_withdrawal yang pernah punya admin fee)
DELETE FROM savings_transactions 
WHERE admin_fee > 0;

-- 3. Verifikasi tidak ada lagi admin_fee > 0
SELECT count(*) AS remaining_with_admin_fee
FROM savings_transactions 
WHERE admin_fee > 0;

-- ROLLBACK; -- uncomment untuk test dulu
COMMIT;
