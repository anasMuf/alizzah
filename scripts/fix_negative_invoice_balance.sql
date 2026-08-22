-- ============================================================
-- Fix: Invoice dengan sisa tagihan NEGATIF (paid > total)
-- ============================================================
-- Gejala: di dashboard muncul tagihan minus (mis. -500.000),
--         karena paid_amount > total_amount pada invoice.
--
-- Kasus yang diperbaiki (hasil investigasi alizzah_test):
--
--   1. Invoice 121 — MUHAMMAD DWI RIFKI VIRENDRA (initial)
--      Biaya awal 2.425.000 dipotong 500.000 DUA KALI
--      (2.425.000 -> 1.925.000 -> 1.425.000) padahal hanya ada
--      satu dispensasi "warga setoyo" 500.000. Siswa bayar
--      1.925.000, sehingga amount 1.425.000 < paid 1.925.000
--      => sisa -500.000. Fix: kembalikan amount ke 1.925.000.
--
--   2. Invoice 440 — SAYYIDAH AISYAH AL HAWARIYYUN (monthly 7/2026)
--      Item dispensasi SPP -150.000 TERCATAT DUA KALI (17431 yang
--      sudah paid -150.000 + 18125 duplikat paid 0). Fix: soft-
--      delete duplikat 18125, total invoice -33.000 -> 117.000.
--
--   3. Invoice 453 — ULIN NUHA AHSANA TAFSIRO (monthly 7/2026)
--      SPP Juli 150.000 sudah dibayar penuh (payment 1945,
--      30-Jul, kas debit 156.000) tapi item dispensasi -150.000
--      (17591) paid 0 tetap mengurangi total => sisa -150.000.
--      Fix (OPSI A): anggap SPP Juli tetap ditagih karena uang
--      sudah diterima kas, soft-delete item dispensasi 17591,
--      total invoice 102.000 -> 252.000 (lunas).
--      OPSI B (jika SPP Juli memang gratis): batalkan STEP 3,
--      biarkan -150.000 sebagai saldo kelebihan bayar.
--
-- Jalankan di local (alizzah_test) dulu, lalu production.
--
-- Backup dulu:
--   pg_dump -t invoices -t invoice_items > invoice_backup.sql
-- ============================================================

BEGIN;

-- ============================================================
-- STEP 1: Preview — kondisi sebelum fix
-- ============================================================
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
WHERE inv.id IN (121, 440, 453)
ORDER BY inv.id;

-- ============================================================
-- STEP 2: Invoice 121 (siswa 65) — amount biaya awal dikembalikan
--         ke 1.925.000 (2.425.000 - 500.000), status lunas
-- ============================================================
UPDATE invoice_items
SET amount     = 1925000.00,
    status     = 'paid',
    updated_at = now()
WHERE id = 18437;

UPDATE invoices
SET total_amount = 1925000.00,
    status       = 'paid',
    updated_at   = now()
WHERE id = 121;

-- ============================================================
-- STEP 3: Invoice 440 (siswa 113) — hapus duplikat dispensasi
--         18125 (-150.000), total jadi 117.000 (lunas)
-- ============================================================
UPDATE invoice_items
SET deleted_at = now(),
    updated_at = now()
WHERE id = 18125;

UPDATE invoices
SET total_amount = 117000.00,
    updated_at   = now()
WHERE id = 440;

-- ============================================================
-- STEP 4: Invoice 453 (siswa 126) — OPSI A: SPP Juli tetap
--         ditagih (uang sudah diterima), hapus item dispensasi
--         17591, total jadi 252.000 (lunas)
-- ============================================================
UPDATE invoice_items
SET deleted_at = now(),
    updated_at = now()
WHERE id = 17591;

UPDATE invoices
SET total_amount = 252000.00,
    updated_at   = now()
WHERE id = 453;

-- ============================================================
-- STEP 5: Verifikasi — tidak boleh ada sisa negatif lagi
-- ============================================================
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

-- Sanity: item-item aktif di ketiga invoice setelah fix
SELECT ii.invoice_id, ii.id AS item_id, ii.name, ii.category,
       ii.amount, ii.paid_amount, ii.status, ii.deleted_at
FROM invoice_items ii
WHERE ii.invoice_id IN (121, 440, 453) AND ii.deleted_at IS NULL
ORDER BY ii.invoice_id, ii.id;

COMMIT;
