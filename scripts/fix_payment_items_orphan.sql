-- ============================================================
-- Fix: rekonstruksi payment_items yang hilang (reconcile C1)
-- ============================================================
-- Latar belakang: 7 payment memiliki total_amount != jumlah payment_items
-- (lihat scripts/reconcile_keuangan.sql → C1). Forensik:
--   * payment 273 (siswa 88)  → infaq JULI 2026 item 4427 (sisa 84.000)
--   * payment 267 & 873 (116) → infaq AGUSTUS 2026 item 5260 (sisa 48.000;
--     infaq Juli sudah penuh 102.000)
--   * payment 229 (128)       → infaq AGUSTUS 2026 item 5296 (sisa 36.000;
--     infaq Juli sudah penuh 102.000)
--   * payment 92 & 236 (+25.000) & 769 (252.000): TIDAK ada item target
--     (dicek: invoice_items incl. soft-deleted tidak punya item senilai
--     itu). Uang sudah tercatat di kas (cash_transactions konsisten);
--     alokasi tidak bisa direkonstruksi → dibiarkan & didokumentasikan.
--
-- Backup dulu:
--   pg_dump -t payment_items -t invoice_items -t invoices > alokasi_backup.sql
-- ============================================================

BEGIN;

-- ============================================================
-- STEP 1: Preview — alokasi yang akan dibuat
-- ============================================================
SELECT r.payment_id, r.invoice_item_id, r.amount,
       ii.category, ii.name, ii.amount AS item_amount, ii.paid_amount AS item_paid_sebelum
FROM (VALUES
    (273, 4427, 6000),
    (267, 5260, 6000),
    (873, 5260, 6000),
    (229, 5296, 6000)
) AS r(payment_id, invoice_item_id, amount)
JOIN invoice_items ii ON ii.id = r.invoice_item_id
ORDER BY r.payment_id;

-- ============================================================
-- STEP 2: Buat payment_items yang hilang
-- (created_at mengikuti tanggal payment asli)
-- ============================================================
INSERT INTO payment_items (payment_id, invoice_item_id, amount, created_at, updated_at)
SELECT r.payment_id, r.invoice_item_id, r.amount, p.created_at, p.created_at
FROM (VALUES
    (273, 4427, 6000),
    (267, 5260, 6000),
    (873, 5260, 6000),
    (229, 5296, 6000)
) AS r(payment_id, invoice_item_id, amount)
JOIN payments p ON p.id = r.payment_id
WHERE NOT EXISTS (
    SELECT 1 FROM payment_items pi
    WHERE pi.payment_id = r.payment_id AND pi.invoice_item_id = r.invoice_item_id
);

-- ============================================================
-- STEP 3: Perbarui paid_amount & status item + invoice yang terdampak
-- (aturan kanonik: item partial jika 0 < paid < amount; invoice lunas
--  hanya jika SEMUA item lunas)
-- ============================================================
-- 3a. Item yang menerima alokasi baru (agregat per item — 267 & 873
-- keduanya menarget item 5260, jadi dijumlahkan dulu sebelum UPDATE)
UPDATE invoice_items ii
SET paid_amount = ii.paid_amount + t.add_amount,
    status = CASE
        WHEN ii.paid_amount + t.add_amount >= ii.amount THEN 'paid'
        ELSE 'partial'
    END,
    updated_at = NOW()
FROM (
    SELECT invoice_item_id, SUM(amount) AS add_amount
    FROM (VALUES
        (273, 4427, 6000),
        (267, 5260, 6000),
        (873, 5260, 6000),
        (229, 5296, 6000)
    ) AS r(payment_id, invoice_item_id, amount)
    GROUP BY invoice_item_id
) AS t
WHERE ii.id = t.invoice_item_id;

-- 3b. Recalculate invoice terdampak (415, 682, 694) — total/paid/status kanonik
WITH calc AS (
    SELECT ii.invoice_id,
           COALESCE(SUM(ii.amount), 0)                  AS total,
           COALESCE(SUM(ii.paid_amount), 0)             AS paid,
           COUNT(*) FILTER (WHERE ii.status <> 'paid')  AS unpaid_items
    FROM invoice_items ii
    WHERE ii.deleted_at IS NULL
      AND ii.invoice_id IN (415, 682, 694)
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
WHERE i.id = c.invoice_id AND i.deleted_at IS NULL;

-- ============================================================
-- STEP 4: Verifikasi
-- 4a. C1 seharusnya tersisa 3 (92, 236, 769) — tanpa target item
-- ============================================================
SELECT p.id AS payment_id, p.total_amount,
       COALESCE((SELECT SUM(pi.amount) FROM payment_items pi
                 WHERE pi.payment_id = p.id AND pi.deleted_at IS NULL), 0) AS sum_items
FROM payments p
WHERE p.deleted_at IS NULL
  AND ABS(p.total_amount - COALESCE((SELECT SUM(pi.amount) FROM payment_items pi
                                     WHERE pi.payment_id = p.id AND pi.deleted_at IS NULL), 0)) > 0.01
ORDER BY p.id;

-- 4b. Item & invoice terdampak
SELECT ii.id, ii.category, ii.paid_amount, ii.status FROM invoice_items ii WHERE ii.id IN (4427,5260,5296) ORDER BY ii.id;

COMMIT;
