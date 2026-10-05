-- ============================================================
-- Reconcile: Payment header (total_amount) != Σ payment_items
-- ============================================================
-- Gejala: laporan Saldo/Posisi Kas/Pemasukan (berbasis payment_items)
--         lebih kecil dari uang yang benar-benar diterima, karena ada
--         payment yang header total_amount-nya tidak teralokasi penuh
--         ke item.
--
-- BUKTI uang RIIL (bukan sekadar salah ketik header):
--   cash_transactions mencatat DEBIT sebesar (header + savings) untuk
--   ketujuh payment ini — artinya uang fisik memang masuk kas. Yang
--   hilang hanyalah ATRIBUSI ke pos (payment_items), sehingga laporan
--   berbasis item kekurangan Rp 326.000 total.
--
-- Kasus (hasil investigasi alizzah_test, TA 2026/2027):
--   pay 769  RAFARDAN ATHALA AL FARIZKI     header 252.000  item 0        selisih 252.000
--   pay 92   RYU SATRIA PUTRA               header 1.092.000 item 1.067.000 selisih  25.000
--   pay 236  ADZKIYA FRANSTASYA SEYNA       header 337.000  item 312.000   selisih  25.000
--   pay 229  FAREL ARYA MEGANTARA           header 6.000    item 0        selisih   6.000
--   pay 267  KHALIESAH AZZAHRA H. MAHVEEN   header 6.000    item 0        selisih   6.000
--   pay 273  NAJEELA ARTANTI NURLAILA       header 6.000    item 0        selisih   6.000
--   pay 873  KHALIESAH AZZAHRA H. MAHVEEN   header 6.000    item 0        selisih   6.000
--   (savings_deposit terpisah; tidak masuk hitungan ini)
--
-- HASIL INVESTIGASI ASAL-USUL (penting untuk atribusi):
--   BUKAN dari workflow "tarik tunai lalu bayar" — dicek: TIDAK ADA satupun
--   dari ketujuh payment ini yang punya penarikan tabungan di hari yang sama.
--   Ini murni ITEMISASI TAK LENGKAP (header berisi nominal yang tak pernah
--   dibuatkan baris payment_item), sangat mungkin sisa migrasi data awal.
--
--   Petunjuk atribusi per kasus:
--   - pay 92 & 236 (selisih 25.000): semua item lain (SPP, Infaq, Registrasi)
--     terbayar normal; 25.000 = persis harga item "Aslin (Asah Literasi
--     Numerasi)" kategori PASTA. Kemungkinan besar pos = pasta. (Bulan tak
--     pasti — siswa punya banyak Aslin unpaid; tak ada Aslin Juli spesifik.)
--   - pay 769 (252.000) & pay 229/267/273/873 (6.000): TIDAK cocok dengan
--     amount item manapun milik siswa tsb. Perlu cek kuitansi fisik. 6.000
--     berulang di 4 siswa → mungkin biaya kecil legacy yang tak dimodelkan.
--
--   REKOMENDASI: untuk pay 92 & 236 pakai kategori 'pasta' (bukan
--   'incidental'); untuk 5 sisanya, konfirmasi kuitansi dulu, default
--   'incidental'. Sesuaikan STEP 2 sesuai keputusan staf keuangan.
--
-- KEPUTUSAN YANG HARUS DIAMBIL SEBELUM MENJALANKAN:
--   Karena uang riil, arah yang benar = ATRIBUSIKAN selisih ke sebuah
--   pos lewat payment_item baru, sehingga laporan berbasis item cocok
--   dengan kas. PERTANYAANNYA: pos apa? Idealnya staf keuangan cek
--   kuitansi asli tiap siswa dan set kategori yang tepat (monthly_spp,
--   registration, initial, dst).
--
--   Script ini memakai OPSI DEFAULT: buat invoice "incidental" + item
--   kategori 'incidental' senilai selisih, lalu payment_item-nya. Ini
--   membuat header == Σ item (guard integritas app terpenuhi) dan uang
--   muncul di laporan Saldo (Semua Pos) sebagai penerimaan insidental.
--
--   CATATAN: kategori 'incidental' TIDAK muncul sebagai pos tersendiri
--   di Posisi Kas per-pos (bucket tak terdaftar). Jika perlu tampil di
--   pos tertentu, ganti 'incidental' pada STEP 2 dengan kategori pos
--   yang sesuai (mis. 'monthly_spp') per siswa.
--
-- Jalankan di local (alizzah_test) dulu, verifikasi, baru production.
-- Backup dulu:
--   pg_dump -t invoices -t invoice_items -t payments -t payment_items > payments_backup.sql
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- STEP 1: Preview — payment yang tidak konsisten (harus 7 baris)
-- ------------------------------------------------------------
SELECT p.id AS payment_id,
       p.payment_date,
       p.student_id,
       p.total_amount            AS header,
       COALESCE(pi.items_sum, 0) AS items_sum,
       p.savings_deposit         AS savings,
       p.total_amount - COALESCE(pi.items_sum, 0) AS unaccounted
FROM payments p
LEFT JOIN (
    SELECT payment_id, SUM(amount) AS items_sum
    FROM payment_items WHERE deleted_at IS NULL GROUP BY payment_id
) pi ON pi.payment_id = p.id
WHERE p.deleted_at IS NULL
  AND ABS(p.total_amount - COALESCE(pi.items_sum, 0)) > 0.005
ORDER BY unaccounted DESC;

-- ------------------------------------------------------------
-- STEP 2: Buat invoice + item incidental untuk tiap selisih,
--         lalu payment_item yang menautkannya ke payment asal.
--         (Hanya untuk payment yang benar-benar tak konsisten.)
-- ------------------------------------------------------------
WITH mismatched AS (
    SELECT p.id AS payment_id,
           p.student_id,
           p.academic_year_id,
           p.total_amount - COALESCE(pi.items_sum, 0) AS unaccounted
    FROM payments p
    LEFT JOIN (
        SELECT payment_id, SUM(amount) AS items_sum
        FROM payment_items WHERE deleted_at IS NULL GROUP BY payment_id
    ) pi ON pi.payment_id = p.id
    WHERE p.deleted_at IS NULL
      AND ABS(p.total_amount - COALESCE(pi.items_sum, 0)) > 0.005
),
new_invoice AS (
    -- Korelasi 1:1 ke payment asal disimpan di notes ('reconcile:pay:<id>')
    -- agar aman walau ada beberapa payment identik milik siswa yang sama.
    INSERT INTO invoices (student_id, academic_year_id, type, status,
                          total_amount, paid_amount, notes, created_at, updated_at)
    SELECT student_id, academic_year_id, 'incidental', 'paid',
           unaccounted, unaccounted,
           'reconcile:pay:' || payment_id,
           now(), now()
    FROM mismatched
    RETURNING id AS invoice_id, notes, total_amount
),
paired AS (
    SELECT invoice_id,
           (regexp_match(notes, 'reconcile:pay:(\d+)'))[1]::bigint AS payment_id,
           total_amount AS unaccounted
    FROM new_invoice
),
new_item AS (
    INSERT INTO invoice_items (invoice_id, name, category, amount, paid_amount,
                               status, is_mandatory, created_at, updated_at)
    SELECT invoice_id, 'Rekonsiliasi penerimaan tanpa alokasi', 'incidental',
           unaccounted, unaccounted, 'paid', false, now(), now()
    FROM paired
    RETURNING id AS item_id, invoice_id
)
INSERT INTO payment_items (payment_id, invoice_item_id, amount, created_at, updated_at)
SELECT pr.payment_id, ni.item_id, pr.unaccounted, now(), now()
FROM new_item ni
JOIN paired pr ON pr.invoice_id = ni.invoice_id;

-- ------------------------------------------------------------
-- STEP 3: Verifikasi — tidak boleh ada lagi baris tak konsisten
-- ------------------------------------------------------------
SELECT COUNT(*) AS sisa_tidak_konsisten
FROM payments p
LEFT JOIN (
    SELECT payment_id, SUM(amount) AS items_sum
    FROM payment_items WHERE deleted_at IS NULL GROUP BY payment_id
) pi ON pi.payment_id = p.id
WHERE p.deleted_at IS NULL
  AND ABS(p.total_amount - COALESCE(pi.items_sum, 0)) > 0.005;

-- Jika STEP 3 = 0 dan angka masuk akal → COMMIT.
-- Jika ragu / ingin atribusi pos berbeda → ROLLBACK dan sesuaikan STEP 2.
ROLLBACK;  -- ganti ke COMMIT; setelah direview staf keuangan
