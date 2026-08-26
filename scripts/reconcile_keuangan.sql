-- ============================================================
-- Rekonsiliasi umum: konsistensi field denormalized & soft-delete
-- ============================================================
-- Script DIAGNOSTIK (SELECT-only, tidak mengubah data).
-- Mengecek konsistensi:
--   A. Tabungan siswa     : balance vs jumlah mutasi valid
--   B. Invoice & item     : total/paid vs item; paid item vs payment_items
--   C. Pembayaran         : total_amount vs payment_items; setoran vs mutasi tabungan
--   D. Koperasi           : paid_amount vs payments; stok vs beli-jual
--   E. Kas/Vault          : penutupan kas vs saldo terhitung
--
-- Cara pakai: psql -d alizzah_test -f scripts/reconcile_keuangan.sql
-- Baris di atas garis "RINGKASAN" adalah detail mismatch per aturan
-- (kosong = aman). Bagian RINGKASAN menampilkan jumlah mismatch per aturan.
-- ============================================================

-- ============================================================
-- A1. Tabungan: balance vs sum mutasi valid (deleted_at IS NULL)
-- ============================================================
SELECT 'A1 savings balance' AS rule,
       ss.id AS savings_id, ss.student_id, ss.type,
       ss.balance AS stored,
       COALESCE((SELECT SUM(CASE WHEN st.transaction_type='debit' THEN st.net_amount ELSE -st.net_amount END)
                 FROM savings_transactions st
                 WHERE st.student_savings_id = ss.id AND st.deleted_at IS NULL), 0) AS calc
FROM student_savings ss
WHERE ABS(ss.balance - COALESCE((SELECT SUM(CASE WHEN st.transaction_type='debit' THEN st.net_amount ELSE -st.net_amount END)
                                 FROM savings_transactions st
                                 WHERE st.student_savings_id = ss.id AND st.deleted_at IS NULL), 0)) > 0.01
ORDER BY ss.id;

-- ============================================================
-- B1. Invoice: total_amount vs sum item valid
-- ============================================================
SELECT 'B1 invoice total' AS rule, i.id AS invoice_id, i.student_id,
       i.total_amount AS stored,
       COALESCE((SELECT SUM(ii.amount) FROM invoice_items ii
                 WHERE ii.invoice_id = i.id AND ii.deleted_at IS NULL), 0) AS calc
FROM invoices i
WHERE i.deleted_at IS NULL
  AND ABS(i.total_amount - COALESCE((SELECT SUM(ii.amount) FROM invoice_items ii
                                     WHERE ii.invoice_id = i.id AND ii.deleted_at IS NULL), 0)) > 0.01
ORDER BY i.id;

-- ============================================================
-- B2. Invoice: paid_amount vs sum paid item valid
-- ============================================================
SELECT 'B2 invoice paid' AS rule, i.id AS invoice_id, i.student_id,
       i.paid_amount AS stored,
       COALESCE((SELECT SUM(ii.paid_amount) FROM invoice_items ii
                 WHERE ii.invoice_id = i.id AND ii.deleted_at IS NULL), 0) AS calc
FROM invoices i
WHERE i.deleted_at IS NULL
  AND ABS(i.paid_amount - COALESCE((SELECT SUM(ii.paid_amount) FROM invoice_items ii
                                    WHERE ii.invoice_id = i.id AND ii.deleted_at IS NULL), 0)) > 0.01
ORDER BY i.id;

-- ============================================================
-- B3. Invoice item: paid_amount vs sum payment_items valid
-- ============================================================
SELECT 'B3 item paid' AS rule, ii.id AS item_id, ii.invoice_id, ii.category,
       ii.paid_amount AS stored,
       COALESCE((SELECT SUM(pi.amount) FROM payment_items pi
                 WHERE pi.invoice_item_id = ii.id AND pi.deleted_at IS NULL), 0) AS calc
FROM invoice_items ii
WHERE ii.deleted_at IS NULL
  AND ABS(ii.paid_amount - COALESCE((SELECT SUM(pi.amount) FROM payment_items pi
                                     WHERE pi.invoice_item_id = ii.id AND pi.deleted_at IS NULL), 0)) > 0.01
ORDER BY ii.id;

-- ============================================================
-- B4. Status tidak konsisten dengan kondisi item (aturan kanonik)
--     unpaid=paid 0; paid=paid>0 & SEMUA item paid;
--     partial=paid>0 & masih ada item unpaid.
--     (Bukan perbandingan paid >= total — dispensasi negatif membuat
--      paid bisa == total padahal masih ada item belum lunas.)
-- ============================================================
SELECT 'B4 invoice status' AS rule, i.id AS ref_id, i.status, i.paid_amount, i.total_amount
FROM invoices i
WHERE i.deleted_at IS NULL
  AND NOT (
        (i.status = 'unpaid' AND i.paid_amount <= 0)
     OR (i.status = 'paid' AND i.paid_amount > 0
         AND NOT EXISTS (SELECT 1 FROM invoice_items ii
                         WHERE ii.invoice_id = i.id AND ii.deleted_at IS NULL AND ii.status <> 'paid'))
     OR (i.status = 'partial' AND i.paid_amount > 0
         AND EXISTS (SELECT 1 FROM invoice_items ii
                     WHERE ii.invoice_id = i.id AND ii.deleted_at IS NULL AND ii.status <> 'paid'))
  )
UNION ALL
SELECT 'B4 item status', ii.id, ii.status, ii.paid_amount, ii.amount
FROM invoice_items ii
WHERE ii.deleted_at IS NULL
  AND ii.amount > 0  -- item diskon/dispensasi (amount <= 0) dilewati: dianggap valid saat berstatus 'paid'
  AND NOT (
        (ii.status = 'unpaid' AND ii.paid_amount <= 0)
     OR (ii.status = 'paid' AND ii.paid_amount >= ii.amount)
     OR (ii.status = 'partial' AND ii.paid_amount > 0 AND ii.paid_amount < ii.amount)
  )
ORDER BY rule, ref_id;

-- ============================================================
-- C1. Payment: total_amount vs sum payment_items valid
-- ============================================================
SELECT 'C1 payment total' AS rule, p.id AS payment_id, p.student_id,
       p.total_amount AS stored,
       COALESCE((SELECT SUM(pi.amount) FROM payment_items pi
                 WHERE pi.payment_id = p.id AND pi.deleted_at IS NULL), 0) AS calc
FROM payments p
WHERE p.deleted_at IS NULL
  AND ABS(p.total_amount - COALESCE((SELECT SUM(pi.amount) FROM payment_items pi
                                     WHERE pi.payment_id = p.id AND pi.deleted_at IS NULL), 0)) > 0.01
ORDER BY p.id;

-- ============================================================
-- C2. Setoran tabungan di payment harus punya mutasi payment_deposit valid
-- ============================================================
SELECT 'C2 deposit txn' AS rule, p.id AS payment_id, p.student_id, p.savings_deposit
FROM payments p
WHERE p.deleted_at IS NULL
  AND p.savings_deposit > 0
  AND NOT EXISTS (
      SELECT 1 FROM savings_transactions st
      JOIN student_savings ss ON ss.id = st.student_savings_id
      WHERE st.source_type = 'payment_deposit' AND st.source_id = p.id
        AND st.deleted_at IS NULL AND ss.type = 'general'
  )
ORDER BY p.id;

-- ============================================================
-- D1. Koperasi sales: paid_amount vs sum payments (ref=sale, in)
-- ============================================================
SELECT 'D1 sale paid' AS rule, s.id AS ref_id, s.sale_date,
       s.paid_amount AS stored,
       COALESCE((SELECT SUM(kp.amount) FROM koperasi_payments kp
                 WHERE kp.ref_type = 'sale' AND kp.ref_id = s.id
                   AND kp.direction = 'in' AND kp.deleted_at IS NULL), 0) AS calc
FROM koperasi_sales s
WHERE s.deleted_at IS NULL
  AND ABS(s.paid_amount - COALESCE((SELECT SUM(kp.amount) FROM koperasi_payments kp
                                    WHERE kp.ref_type = 'sale' AND kp.ref_id = s.id
                                      AND kp.direction = 'in' AND kp.deleted_at IS NULL), 0)) > 0.01
ORDER BY s.id;

-- ============================================================
-- D2. Koperasi purchases: paid_amount vs sum payments (ref=purchase, out)
-- ============================================================
SELECT 'D2 purchase paid' AS rule, p.id AS ref_id, p.purchase_date,
       p.paid_amount AS stored,
       COALESCE((SELECT SUM(kp.amount) FROM koperasi_payments kp
                 WHERE kp.ref_type = 'purchase' AND kp.ref_id = p.id
                   AND kp.direction = 'out' AND kp.deleted_at IS NULL), 0) AS calc
FROM koperasi_purchases p
WHERE p.deleted_at IS NULL
  AND ABS(p.paid_amount - COALESCE((SELECT SUM(kp.amount) FROM koperasi_payments kp
                                    WHERE kp.ref_type = 'purchase' AND kp.ref_id = p.id
                                      AND kp.direction = 'out' AND kp.deleted_at IS NULL), 0)) > 0.01
ORDER BY p.id;

-- ============================================================
-- D3. Koperasi loans: paid_amount vs sum installments amount_paid
-- ============================================================
SELECT 'D3 loan paid' AS rule, l.id AS ref_id, l.loan_date,
       l.paid_amount AS stored,
       COALESCE((SELECT SUM(li.amount_paid) FROM koperasi_loan_installments li
                 WHERE li.loan_id = l.id AND li.deleted_at IS NULL), 0) AS calc
FROM koperasi_loans l
WHERE l.deleted_at IS NULL
  AND ABS(l.paid_amount - COALESCE((SELECT SUM(li.amount_paid) FROM koperasi_loan_installments li
                                    WHERE li.loan_id = l.id AND li.deleted_at IS NULL), 0)) > 0.01
ORDER BY l.id;

-- ============================================================
-- D4. Koperasi stock varian: stock vs beli - jual
-- ============================================================
SELECT 'D4 variant stock' AS rule, v.id AS variant_id, v.name,
       v.stock AS stored,
       COALESCE((SELECT SUM(pi.quantity) FROM koperasi_purchase_items pi
                 JOIN koperasi_purchases p ON p.id = pi.purchase_id
                 WHERE pi.variant_id = v.id AND p.deleted_at IS NULL), 0)
     - COALESCE((SELECT SUM(si.quantity) FROM koperasi_sale_items si
                 JOIN koperasi_sales s ON s.id = si.sale_id
                 WHERE si.variant_id = v.id AND s.deleted_at IS NULL), 0) AS calc
FROM koperasi_product_variants v
WHERE v.deleted_at IS NULL
  AND v.stock <> COALESCE((SELECT SUM(pi.quantity) FROM koperasi_purchase_items pi
                           JOIN koperasi_purchases p ON p.id = pi.purchase_id
                           WHERE pi.variant_id = v.id AND p.deleted_at IS NULL), 0)
                  - COALESCE((SELECT SUM(si.quantity) FROM koperasi_sale_items si
                              JOIN koperasi_sales s ON s.id = si.sale_id
                              WHERE si.variant_id = v.id AND s.deleted_at IS NULL), 0)
ORDER BY v.id;

-- ============================================================
-- E1. Tutup buku (daily closing): SystemCashAmount vs saldo kas terhitung
--     saldo kas = sum(cash_transactions debit) - sum(credit) sampai closing_date
-- ============================================================
SELECT 'E1 daily closing' AS rule, dc.id AS closing_id, dc.closing_date,
       dc.system_cash_amount AS stored,
       COALESCE((SELECT SUM(CASE WHEN ct.transaction_type='debit' THEN ct.amount ELSE -ct.amount END)
                 FROM cash_transactions ct
                 WHERE ct.academic_year_id = dc.academic_year_id
                   AND ct.transaction_date <= dc.closing_date), 0) AS calc
FROM daily_closings dc
WHERE ABS(dc.system_cash_amount - COALESCE((SELECT SUM(CASE WHEN ct.transaction_type='debit' THEN ct.amount ELSE -ct.amount END)
                                            FROM cash_transactions ct
                                            WHERE ct.academic_year_id = dc.academic_year_id
                                              AND ct.transaction_date <= dc.closing_date), 0)) > 0.01
ORDER BY dc.id;

-- ============================================================
-- RINGKASAN: jumlah mismatch per aturan
-- ============================================================
SELECT rule, COUNT(*) AS mismatch FROM (
    SELECT 'A1 savings balance' AS rule FROM student_savings ss
    WHERE ABS(ss.balance - COALESCE((SELECT SUM(CASE WHEN st.transaction_type='debit' THEN st.net_amount ELSE -st.net_amount END)
                                     FROM savings_transactions st
                                     WHERE st.student_savings_id = ss.id AND st.deleted_at IS NULL), 0)) > 0.01
    UNION ALL
    SELECT 'B1 invoice total' FROM invoices i
    WHERE i.deleted_at IS NULL
      AND ABS(i.total_amount - COALESCE((SELECT SUM(ii.amount) FROM invoice_items ii
                                         WHERE ii.invoice_id = i.id AND ii.deleted_at IS NULL), 0)) > 0.01
    UNION ALL
    SELECT 'B2 invoice paid' FROM invoices i
    WHERE i.deleted_at IS NULL
      AND ABS(i.paid_amount - COALESCE((SELECT SUM(ii.paid_amount) FROM invoice_items ii
                                        WHERE ii.invoice_id = i.id AND ii.deleted_at IS NULL), 0)) > 0.01
    UNION ALL
    SELECT 'B3 item paid' FROM invoice_items ii
    WHERE ii.deleted_at IS NULL
      AND ABS(ii.paid_amount - COALESCE((SELECT SUM(pi.amount) FROM payment_items pi
                                         WHERE pi.invoice_item_id = ii.id AND pi.deleted_at IS NULL), 0)) > 0.01
    UNION ALL
    	SELECT 'B4 status' FROM invoices i
    	WHERE i.deleted_at IS NULL
    	  AND NOT (
    	        (i.status = 'unpaid' AND i.paid_amount <= 0)
    	     OR (i.status = 'paid' AND i.paid_amount > 0
    	         AND NOT EXISTS (SELECT 1 FROM invoice_items ii
    	                         WHERE ii.invoice_id = i.id AND ii.deleted_at IS NULL AND ii.status <> 'paid'))
    	     OR (i.status = 'partial' AND i.paid_amount > 0
    	         AND EXISTS (SELECT 1 FROM invoice_items ii
    	                     WHERE ii.invoice_id = i.id AND ii.deleted_at IS NULL AND ii.status <> 'paid'))
    	  )
    UNION ALL
    SELECT 'C1 payment total' FROM payments p
    WHERE p.deleted_at IS NULL
      AND ABS(p.total_amount - COALESCE((SELECT SUM(pi.amount) FROM payment_items pi
                                         WHERE pi.payment_id = p.id AND pi.deleted_at IS NULL), 0)) > 0.01
    UNION ALL
    SELECT 'C2 deposit txn' FROM payments p
    WHERE p.deleted_at IS NULL AND p.savings_deposit > 0
      AND NOT EXISTS (
          SELECT 1 FROM savings_transactions st
          JOIN student_savings ss ON ss.id = st.student_savings_id
          WHERE st.source_type = 'payment_deposit' AND st.source_id = p.id
            AND st.deleted_at IS NULL AND ss.type = 'general'
      )
    UNION ALL
    SELECT 'D1 sale paid' FROM koperasi_sales s
    WHERE s.deleted_at IS NULL
      AND ABS(s.paid_amount - COALESCE((SELECT SUM(kp.amount) FROM koperasi_payments kp
                                        WHERE kp.ref_type = 'sale' AND kp.ref_id = s.id
                                          AND kp.direction = 'in' AND kp.deleted_at IS NULL), 0)) > 0.01
    UNION ALL
    SELECT 'D2 purchase paid' FROM koperasi_purchases p
    WHERE p.deleted_at IS NULL
      AND ABS(p.paid_amount - COALESCE((SELECT SUM(kp.amount) FROM koperasi_payments kp
                                        WHERE kp.ref_type = 'purchase' AND kp.ref_id = p.id
                                          AND kp.direction = 'out' AND kp.deleted_at IS NULL), 0)) > 0.01
    UNION ALL
    SELECT 'D3 loan paid' FROM koperasi_loans l
    WHERE l.deleted_at IS NULL
      AND ABS(l.paid_amount - COALESCE((SELECT SUM(li.amount_paid) FROM koperasi_loan_installments li
                                        WHERE li.loan_id = l.id AND li.deleted_at IS NULL), 0)) > 0.01
    UNION ALL
    SELECT 'D4 variant stock' FROM koperasi_product_variants v
    WHERE v.deleted_at IS NULL
      AND v.stock <> COALESCE((SELECT SUM(pi.quantity) FROM koperasi_purchase_items pi
                               JOIN koperasi_purchases p ON p.id = pi.purchase_id
                               WHERE pi.variant_id = v.id AND p.deleted_at IS NULL), 0)
                      - COALESCE((SELECT SUM(si.quantity) FROM koperasi_sale_items si
                                  JOIN koperasi_sales s ON s.id = si.sale_id
                                  WHERE si.variant_id = v.id AND s.deleted_at IS NULL), 0)
    UNION ALL
    SELECT 'E1 daily closing' FROM daily_closings dc
    WHERE ABS(dc.system_cash_amount - COALESCE((SELECT SUM(CASE WHEN ct.transaction_type='debit' THEN ct.amount ELSE -ct.amount END)
                                                FROM cash_transactions ct
                                                WHERE ct.academic_year_id = dc.academic_year_id
                                                  AND ct.transaction_date <= dc.closing_date), 0)) > 0.01
) t
GROUP BY rule
ORDER BY rule;
