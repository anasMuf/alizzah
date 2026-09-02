-- ============================================================
-- Fix: Write-off sisa Laptop Kids Agustus — siswa 105
-- ============================================================
-- Masalah: Siswa 105 (MUHAMMAD DYLAN YUSUF DZUHAIRI) berhenti
--          mengikuti Laptop Kids (end_date 2026-09-02). Cleanup
--          hanya menghapus item unpaid; item Laptop Kids Agustus
--          sudah dibayar sebagian (50.000 dari 100.000) sehingga
--          sisa 50.000 masih tertagih di invoice 671.
--
--          Keputusan (sesi 2026-09-02): saat siswa berhenti, sisa
--          item partial DIBEBASKAN (write-off) — nominal item
--          diturunkan ke jumlah yang sudah dibayar, status lunas,
--          dengan catatan agar traceable. Ini meniru perilaku baru
--          RemoveExtracurricularInvoices (invoice_generate_service.go).
--
--          Catatan: di production, aksi ini sebaiknya dijalankan
--          lewat tombol "Bersihkan Tagihan PASTA" (endpoint
--          cleanup-invoices yang tercatat di audit trail) setelah
--          deploy. Script ini untuk koreksi data test/local.
--
-- Jalankan di alizzah_test.
-- ============================================================

BEGIN;

-- 1. Write-off semua item Laptop Kids siswa 105 yang berstatus partial
--    (paid_amount > 0 dan < amount): nominal = yang sudah dibayar,
--    status = paid, notes menjelaskan alasannya.
UPDATE invoice_items ii
SET amount = ii.paid_amount,
    status = 'paid',
    notes  = 'Sisa dibebaskan — siswa berhenti mengikuti (' ||
             i.month || '/' || i.year || ')'
FROM invoices i
WHERE ii.invoice_id = i.id
  AND i.student_id = 105
  AND ii.name = 'Laptop Kids'
  AND ii.paid_amount > 0
  AND ii.paid_amount < ii.amount;

-- 2. Recalculate total_amount, paid_amount, dan status invoice yang
--    item-nya berubah (meniru recalculateInvoiceTotal — menjumlah SELURUH
--    item pada invoice yang terdampak).
WITH changed AS (
    SELECT DISTINCT i.id AS invoice_id
    FROM invoice_items ii
    JOIN invoices i ON ii.invoice_id = i.id
    WHERE i.student_id = 105
      AND ii.name = 'Laptop Kids'
),
agg AS (
    SELECT
        ii.invoice_id,
        COALESCE(SUM(ii.amount), 0)      AS new_total,
        COALESCE(SUM(ii.paid_amount), 0) AS new_paid
    FROM invoice_items ii
    JOIN changed c ON c.invoice_id = ii.invoice_id
    GROUP BY ii.invoice_id
)
UPDATE invoices i
SET
    total_amount = agg.new_total,
    paid_amount  = agg.new_paid,
    status = CASE
        WHEN agg.new_paid >= agg.new_total THEN 'paid'
        WHEN agg.new_paid > 0             THEN 'partial'
        ELSE 'unpaid'
    END
FROM agg
WHERE i.id = agg.invoice_id;

COMMIT;

-- ============================================================
-- Verifikasi (jalankan manual setelah COMMIT):
-- ============================================================

-- Item Laptop Kids seharusnya jadi 50.000 / lunas / ber-note:
-- SELECT ii.id, ii.name, ii.amount, ii.paid_amount, ii.status, ii.notes
-- FROM invoice_items ii
-- WHERE ii.invoice_id = (
--     SELECT id FROM invoices
--     WHERE student_id = 105 AND type = 'monthly'
--       AND month = 8 AND year = 2026
-- );

-- Invoice Agustus seharusnya lunas 369.000:
-- SELECT month, year, status, total_amount, paid_amount,
--        total_amount - paid_amount AS sisa
-- FROM invoices
-- WHERE student_id = 105 AND type = 'monthly'
--   AND month = 8 AND year = 2026;
