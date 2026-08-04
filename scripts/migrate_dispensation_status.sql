-- ============================================================
-- Migrasi: Perbaikan status item dispensasi menjadi "paid"
-- ============================================================
-- Sebelumnya: item dispensasi dibuat dengan status default "unpaid",
--             menyebabkan inkonsistensi antara status invoice dan 
--             perhitungan sisa tagihan (tampil -150.000 dsb).
-- Sekarang:   item dispensasi dibuat dengan status "paid" karena
--             dispensasi adalah diskon otomatis, bukan item yang 
--             perlu dibayar.
--
-- Perubahan kode terkait:
--   - apps/api/service/invoice_generate_service.go:
--     GenerateInitial, GenerateMonthly, applyDispensationToInvoice
--   - apps/dashboard/.../keuangan/tagihan/$id.tsx
--   - apps/dashboard/.../pembayaran/components/-InvoiceSelector.tsx
--
-- Jalankan di local (alizzah_test) dulu, lalu production.
-- ============================================================

BEGIN;

-- 1. Preview: item dispensasi yang masih "unpaid"
SELECT ii.id, ii.invoice_id, ii.name, ii.amount, ii.paid_amount, ii.status,
       i.student_id, i.status AS invoice_status
FROM invoice_items ii
JOIN invoices i ON i.id = ii.invoice_id
WHERE ii.category = 'dispensation' AND ii.status != 'paid'
ORDER BY ii.id;

-- 2. Update semua item dispensasi menjadi "paid"
UPDATE invoice_items SET status = 'paid'
WHERE category = 'dispensation' AND status != 'paid';

-- 3. Preview: invoice yang semua itemnya sudah "paid" tapi status invoice belum "paid"
SELECT i.id, i.student_id, i.type, i.month, i.year, i.status, i.total_amount, i.paid_amount,
       calc.all_paid
FROM invoices i
JOIN (
    SELECT invoice_id,
           bool_and(status = 'paid') AS all_paid,
           SUM(paid_amount) AS paid
    FROM invoice_items
    GROUP BY invoice_id
    HAVING bool_and(status = 'paid') = true
) calc ON i.id = calc.invoice_id
WHERE i.status != 'paid'
ORDER BY i.id;

-- 4. Update status invoice yang semua itemnya sudah "paid"
UPDATE invoices i SET 
    status = 'paid',
    paid_amount = calc.paid
FROM (
    SELECT invoice_id,
           bool_and(status = 'paid') AS all_paid,
           SUM(paid_amount) AS paid
    FROM invoice_items
    GROUP BY invoice_id
    HAVING bool_and(status = 'paid') = true
) calc
WHERE i.id = calc.invoice_id AND i.status != 'paid';

COMMIT;
