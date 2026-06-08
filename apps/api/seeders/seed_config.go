package seeders

// seedSampleFinance mengontrol pembuatan data KEUANGAN sample:
//
//   - Pembayaran (Payment/PaymentItem + cash credit) atas tagihan  -> SeedSampleTransactions
//
//   - Pengeluaran (Expense + cash debit)                           -> SeedSampleTransactions
//
//   - Penerimaan dana bantuan (IncomeTransaction + cash credit)    -> SeedIncomeTransactions
//
//   - Dispensasi/keringanan tagihan contoh                         -> SeedDispensations
//
//     false = HANYA siswa, enrollment, akun tabungan, enroll ekskul, dan TAGIHAN
//     (biaya awal, registrasi, bulanan) — semua berstatus unpaid; saldo kas mulai 0.
//     true  = ikut menyemai pembayaran, pengeluaran, dan dana bantuan (data demo penuh).
//
// Catatan: tagihan tetap dibuat apa pun nilainya — yang di-toggle hanya arus kas.
const seedSampleFinance = false
