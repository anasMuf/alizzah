-- ============================================================
-- Fix: status & total/paid invoice mengikuti aturan kanonik
-- ============================================================
-- Aturan kanonik (sama dengan invoiceService.RecalculateTotalAmount):
--   - unpaid  : paid_amount = 0
--   - partial : paid_amount > 0 dan masih ada item belum lunas
--   - paid    : paid_amount > 0 dan SEMUA item lunas
-- (BUKAN paid >= total — dispensasi negatif / item bernilai 0 membuat
--  paid bisa == total padahal masih ada item yang belum dibayar.)
--
-- Data yang diperbaiki: invoice 504, 557 (status 'paid' padahal ada item
-- fasilitas belum dibayar) dan kasus serupa lainnya.
--
-- Jalankan di local (alizzah_test) dulu, lalu production.
-- Backup dulu:  pg_dump -t invoices -t invoice_items > invoices_backup.sql
-- ============================================================

BEGIN;

-- ============================================================
-- STEP 1: Preview — invoice yang statusnya akan berubah
-- ============================================================
WITH calc AS (
    SELECT ii.invoice_id,
           COALESCE(SUM(ii.amount), 0)                  AS total,
           COALESCE(SUM(ii.paid_amount), 0)             AS paid,
           COUNT(*) FILTER (WHERE ii.status <> 'paid')  AS unpaid_items
    FROM invoice_items ii
    WHERE ii.deleted_at IS NULL
    GROUP BY ii.invoice_id
)
SELECT i.id AS invoice_id, i.student_id, i.status AS status_lama,
       CASE WHEN c.paid <= 0 THEN 'unpaid'
            WHEN c.unpaid_items = 0 THEN 'paid'
            ELSE 'partial' END                         AS status_baru,
       i.total_amount AS total_lama, c.total AS total_baru,
       i.paid_amount AS paid_lama, c.paid AS paid_baru
FROM calc c
JOIN invoices i ON i.id = c.invoice_id AND i.deleted_at IS NULL
WHERE i.status <> CASE WHEN c.paid <= 0 THEN 'unpaid'
                       WHEN c.unpaid_items = 0 THEN 'paid'
                       ELSE 'partial' END
ORDER BY i.id;

-- ============================================================
-- STEP 2: Update
-- ============================================================
WITH calc AS (
    SELECT ii.invoice_id,
           COALESCE(SUM(ii.amount), 0)                  AS total,
           COALESCE(SUM(ii.paid_amount), 0)             AS paid,
           COUNT(*) FILTER (WHERE ii.status <> 'paid')  AS unpaid_items
    FROM invoice_items ii
    WHERE ii.deleted_at IS NULL
    GROUP BY ii.invoice_id
)
UPDATE invoices i
SET total_amount = c.total,
    paid_amount  = c.paid,
    status       = CASE WHEN c.paid <= 0 THEN 'unpaid'
                        WHEN c.unpaid_items = 0 THEN 'paid'
                        ELSE 'partial' END,
    updated_at   = NOW()
FROM calc c
WHERE i.id = c.invoice_id
  AND i.deleted_at IS NULL
  AND i.status <> CASE WHEN c.paid <= 0 THEN 'unpaid'
                       WHEN c.unpaid_items = 0 THEN 'paid'
                       ELSE 'partial' END;

-- ============================================================
-- STEP 3: Verifikasi — jalankan scripts/reconcile_keuangan.sql
--   B4 invoice status harus 0 baris (kanonik).
-- ============================================================

COMMIT;
