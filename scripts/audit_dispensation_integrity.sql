-- ============================================================
-- Audit: Integritas Item Dispensasi & Invoice
-- ============================================================
-- Mendeteksi pola kesalahan yang pernah terjadi (Agu 2026):
--   1. Item dispensasi DUPLIKAT pada invoice yang sama
--      (potongan diterapkan berulang → total invoice mengecil/negatif)
--   2. Invoice dengan SISA NEGATIF (paid_amount > total_amount)
--   3. Invoice dengan TOTAL NEGATIF
--   4. Ketidaksesuaian antara record dispensasi initial 500rb
--      dengan nilai item "Biaya Awal Pendidikan"
--
-- Cara pakai: jalankan rutin (mis. bulanan) di alizzah_test dulu,
-- lalu production. Script ini MURNI SELECT — tidak mengubah data.
-- Jika ada baris yang muncul, segera periksa & perbaiki.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Duplikat item dispensasi AKTIF (name + amount sama,
--    pada invoice yang sama, lebih dari satu)
-- ------------------------------------------------------------
SELECT ii.invoice_id,
       inv.student_id,
       s.full_name,
       inv.type,
       COALESCE(inv.month::text || '/' || inv.year::text, '-') AS periode,
       ii.name,
       ii.amount,
       COUNT(*)                                   AS jumlah_duplikat,
       string_agg(ii.id::text, ', ' ORDER BY ii.id) AS item_ids
FROM invoice_items ii
JOIN invoices inv ON inv.id = ii.invoice_id
JOIN students s  ON s.id = inv.student_id
WHERE ii.deleted_at IS NULL
  AND inv.deleted_at IS NULL
  AND ii.category = 'dispensation'
GROUP BY ii.invoice_id, inv.student_id, s.full_name, inv.type,
         inv.month, inv.year, ii.name, ii.amount
HAVING COUNT(*) > 1
ORDER BY ii.invoice_id;

-- ------------------------------------------------------------
-- 2. Invoice dengan sisa tagihan NEGATIF (paid > total)
-- ------------------------------------------------------------
SELECT inv.id AS invoice_id,
       inv.student_id,
       s.full_name,
       inv.type,
       COALESCE(inv.month::text || '/' || inv.year::text, '-') AS periode,
       inv.total_amount,
       inv.paid_amount,
       (inv.total_amount - inv.paid_amount) AS sisa,
       inv.status
FROM invoices inv
JOIN students s ON s.id = inv.student_id
WHERE inv.deleted_at IS NULL
  AND inv.paid_amount > inv.total_amount
ORDER BY inv.id;

-- ------------------------------------------------------------
-- 3. Invoice dengan TOTAL NEGATIF
-- ------------------------------------------------------------
SELECT inv.id AS invoice_id,
       inv.student_id,
       s.full_name,
       inv.type,
       inv.total_amount,
       inv.paid_amount,
       inv.status
FROM invoices inv
JOIN students s ON s.id = inv.student_id
WHERE inv.deleted_at IS NULL
  AND inv.total_amount < 0
ORDER BY inv.id;

-- ------------------------------------------------------------
-- 4. Ketidaksesuaian potongan initial 500rb
--    a) Siswa dgn dispensasi initial fixed 500rb AKTIF, tapi
--       item Biaya Awal Pendidikan ≠ 1.925.000
--    b) Siswa dgn Biaya Awal Pendidikan = 1.925.000, tapi TIDAK
--       ada dispensasi initial fixed 500rb aktif
-- ------------------------------------------------------------
-- 4a
SELECT d.student_id,
       s.full_name,
       ii.id  AS item_id,
       ii.amount,
       d.discount_value
FROM dispensations d
JOIN students s ON s.id = d.student_id
LEFT JOIN invoice_items ii
       ON ii.invoice_id = (SELECT id FROM invoices
                           WHERE student_id = d.student_id
                             AND type = 'initial'
                             AND deleted_at IS NULL
                           LIMIT 1)
      AND ii.category = 'initial'
      AND ii.deleted_at IS NULL
WHERE d.fee_category = 'initial'
  AND d.deleted_at IS NULL
  AND d.discount_type = 'fixed'
  AND d.discount_value = 500000
  AND (ii.amount IS DISTINCT FROM 1925000.00)
ORDER BY d.student_id;

-- 4b
SELECT inv.student_id,
       s.full_name,
       inv.id  AS invoice_id,
       ii.id   AS item_id,
       ii.amount
FROM invoice_items ii
JOIN invoices inv ON inv.id = ii.invoice_id
JOIN students s  ON s.id = inv.student_id
WHERE ii.category = 'initial'
  AND ii.deleted_at IS NULL
  AND inv.deleted_at IS NULL
  AND ii.amount = 1925000.00
  AND NOT EXISTS (
      SELECT 1 FROM dispensations d
      WHERE d.student_id = inv.student_id
        AND d.fee_category = 'initial'
        AND d.deleted_at IS NULL
        AND d.discount_type = 'fixed'
        AND d.discount_value = 500000
  )
ORDER BY inv.student_id;
