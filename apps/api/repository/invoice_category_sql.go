package repository

// invoiceCategoryPosExpr adalah ekspresi SQL "pos" sebuah item tagihan.
//
// Item dispensasi disimpan sebagai invoice_item berkategori `dispensation`
// dengan amount negatif (potongan). Agar potongan MENGURANGI pos yang benar
// alih-alih berdiri sebagai bucket `dispensation` tersendiri, item tersebut
// dialihkan ke pos asalnya lewat `offset_category` (diisi oleh backfill di
// cmd/api/main.go). Item non-dispensasi memakai kategorinya apa adanya.
//
// Sifat penting: ekspresi ini hanya MEMINDAHKAN atribusi antar pos — jumlah
// total lintas pos tidak berubah. Baris dispensasi yang `offset_category`-nya
// kosong (seharusnya tidak ada) tetap jatuh ke bucket `dispensation` sebagai
// sinyal data yang belum di-backfill.
//
// Mengasumsikan tabel `invoice_items` di-alias `ii`, dan dipakai pada SELECT
// maupun GROUP BY agar keduanya konsisten (PostgreSQL menolak alias di GROUP BY
// pada sebagian konteks).
const invoiceCategoryPosExpr = "CASE WHEN ii.category = 'dispensation' AND COALESCE(ii.offset_category,'') <> '' THEN ii.offset_category ELSE ii.category END"
