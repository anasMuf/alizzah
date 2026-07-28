-- ============================================================
-- Migrasi: Tabungan wajib pindah dari brangkas (vault) ke kas (cash)
-- ============================================================
-- Sebelumnya: setoran tabungan wajib dicatat di vault_transactions 
--             + cash_transactions (transfer_to_vault).
-- Sekarang:   tabungan wajib berada di kas, uang tetap di cash
--             (tidak ada vault/transfer entry).
--
-- Jalankan di local (alizzah_test) dulu, lalu production.
-- ============================================================

BEGIN;

-- 1. Preview: vault_transactions yang terkait mandatory savings
SELECT vt.id, vt.transaction_date, vt.transaction_type, vt.amount,
       vt.source_type, vt.source_id, vt.description, vt.created_at
FROM vault_transactions vt
WHERE vt.source_type = 'savings_deposit'
  AND vt.source_id IN (
    SELECT DISTINCT st.source_id 
    FROM savings_transactions st 
    WHERE st.source_type = 'payment_mandatory'
  )
ORDER BY vt.created_at DESC;

-- 2. Preview: cash_transactions transfer_to_vault untuk mandatory savings
SELECT ct.id, ct.transaction_date, ct.transaction_type, ct.amount,
       ct.source_type, ct.source_id, ct.description, ct.created_at
FROM cash_transactions ct
WHERE ct.source_type = 'transfer_to_vault'
  AND ct.source_id IN (
    SELECT DISTINCT st.source_id 
    FROM savings_transactions st 
    WHERE st.source_type = 'payment_mandatory'
  )
ORDER BY ct.created_at DESC;

-- 3. Hapus vault_transactions untuk setoran tabungan wajib
DELETE FROM vault_transactions
WHERE source_type = 'savings_deposit'
  AND source_id IN (
    SELECT DISTINCT st.source_id 
    FROM savings_transactions st 
    WHERE st.source_type = 'payment_mandatory'
  );

-- 4. Hapus cash_transactions transfer_to_vault untuk tabungan wajib
DELETE FROM cash_transactions
WHERE source_type = 'transfer_to_vault'
  AND source_id IN (
    SELECT DISTINCT st.source_id 
    FROM savings_transactions st 
    WHERE st.source_type = 'payment_mandatory'
  );

-- 5. Verifikasi: tidak ada lagi vault entry untuk mandatory savings
SELECT count(*) AS remaining_vault_mandatory
FROM vault_transactions vt
WHERE vt.source_type = 'savings_deposit'
  AND vt.source_id IN (
    SELECT DISTINCT st.source_id 
    FROM savings_transactions st 
    WHERE st.source_type = 'payment_mandatory'
  );

-- ROLLBACK; -- uncomment untuk test dulu
COMMIT;
