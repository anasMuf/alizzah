-- ============================================================
-- Laporan: payment dengan alokasi item hilang (reconcile C1)
-- ============================================================
-- Status: OPSI A (keputusan) — data TIDAK diubah.
--
-- Forensik (Agustus 2026):
--   7 payment memiliki total_amount != jumlah payment_items:
--     * payment 92  (siswa 195) : +25.000  tanpa item target
--     * payment 229 (siswa 128) : total 6.000, 0 item (pola infaq harian)
--     * payment 236 (siswa 144) : +25.000  tanpa item target
--     * payment 267 (siswa 116) : total 6.000, 0 item (pola infaq harian)
--     * payment 273 (siswa 88)  : total 6.000, 0 item (pola infaq harian)
--     * payment 769 (siswa 89)  : total 252.000, 0 item
--     * payment 873 (siswa 116) : total 6.000, 0 item (pola infaq harian)
--
-- Hasil investigasi:
--   * Kas & vault KONSISTEN untuk semua payment (uang masuk tercatat benar);
--     yang hilang hanya alokasi payment_items.
--   * Tidak ada payment_items yang menunjuk ke invoice_items yang hilang
--     (0 baris) — item-nya benar-benar terhapus/ tidak pernah dibuat.
--   * Untuk infaq 6.000 (229, 267, 273, 873): infaq Juli siswa 116 & 128
--     sudah penuh (102.000), siswa 88 masih ada ruang — rekonstruksi
--     sempat diuji (opsi B) lalu di-rollback.
--   * Untuk 92/236 (+25.000) dan 769 (252.000): tidak ada item target
--     (dicek termasuk invoice_items soft-deleted).
--
-- Keputusan: OPSI A — biarkan tanpa perubahan. Uang sudah benar di kas;
-- alokasi item historis tidak dapat direkonstruksi dengan aman.
-- Anomali tetap terdeteksi oleh scripts/reconcile_keuangan.sql (aturan C1).
-- ============================================================

-- ============================================================
-- C1: payment dengan total != jumlah payment_items valid
-- ============================================================
SELECT p.id AS payment_id, p.student_id, s.full_name AS siswa,
       p.payment_date, p.total_amount, p.savings_deposit,
       COALESCE((SELECT SUM(pi.amount) FROM payment_items pi
                 WHERE pi.payment_id = p.id AND pi.deleted_at IS NULL), 0) AS sum_items,
       p.total_amount - COALESCE((SELECT SUM(pi.amount) FROM payment_items pi
                                  WHERE pi.payment_id = p.id AND pi.deleted_at IS NULL), 0) AS selisih
FROM payments p
JOIN students s ON s.id = p.student_id
WHERE p.deleted_at IS NULL
  AND ABS(p.total_amount - COALESCE((SELECT SUM(pi.amount) FROM payment_items pi
                                     WHERE pi.payment_id = p.id AND pi.deleted_at IS NULL), 0)) > 0.01
ORDER BY p.id;

-- ============================================================
-- Bukti pendukung: kas & vault tetap konsisten (uang masuk benar)
-- ============================================================
SELECT ct.source_id AS payment_id,
       SUM(ct.amount) FILTER (WHERE ct.transaction_type='debit') AS kas_debit
FROM cash_transactions ct
WHERE ct.source_type='payment' AND ct.source_id IN (92,229,236,267,273,769,873)
GROUP BY ct.source_id ORDER BY ct.source_id;

-- ============================================================
-- Kesimpulan (opsi A):
--   1. TIDAK ada perubahan data yang dilakukan.
--   2. Uang 100% tercatat di kas (cash_transactions) & vault (setoran).
--   3. 7 payment di atas tampil di daftar pembayaran tanpa alokasi item —
--      perlu diverifikasi operator / dibiarkan sebagai catatan audit.
-- ============================================================
