# A01-M01: RecalculateInfaqHarian — Update Partial Tanpa Transaksi

## Problem (Masalah / Konteks)

`RecalculateInfaqHarian()` melakukan loop update item invoice **satu per satu di luar transaksi database**. Jika server crash di tengah loop, sebagian item ter-update dan sebagian tidak — invoice berada dalam state inconsistent.

## Current Behavior (Kondisi Saat Ini)

**File:** `apps/api/service/invoice_generate_service.go:340-400` (sekitar)

```go
func (s *invoiceGenerateService) RecalculateInfaqHarian(classGroupID, month, year uint) error {
    // ... 
    for _, enrollment := range enrollments {
        // ...
        items, _ := s.invoiceItemRepo.FindByInvoiceID(invoice.ID)
        
        for _, item := range items {
            if item.Category == "monthly_infaq" {
                // ...
                // ❌ Update individual item tanpa transaksi
                s.invoiceItemRepo.Update(&item)     // ← tidak atomic
                needsRecalc = true
            }
        }
        
        if needsRecalc {
            s.recalculateInvoiceTotal(invoice.ID)   // ← juga tidak atomic
        }
    }
    return nil
}
```

### Steps to Reproduce

1. Panggil `RecalculateInfaqHarian` untuk rombel dengan 30 siswa
2. Server crash setelah 15 siswa terupdate
3. 15 invoice terupdate, 15 tidak — tidak ada rollback

## Expected Behavior (Kondisi yang Diharapkan)

Bungkus seluruh operasi dalam transaksi, atau minimal per-invoice:

```go
func (s *invoiceGenerateService) RecalculateInfaqHarian(classGroupID, month, year uint) error {
    // ...
    for _, enrollment := range enrollments {
        err := s.db.Transaction(func(tx *gorm.DB) error {
            // Semua update untuk satu invoice dalam satu transaksi
            // ...
            if needsRecalc {
                return s.recalculateInvoiceTotalWithTx(tx, invoice.ID)
            }
            return nil
        })
        if err != nil {
            // Log error, lanjut ke siswa berikutnya
            log.Printf("Gagal recalculate invoice %d: %v", invoice.ID, err)
        }
    }
    return nil
}
```

## Relevant Files / Area

- `apps/api/service/invoice_generate_service.go:340-400` — RecalculateInfaqHarian
- `apps/api/service/invoice_generate_service.go` — `recalculateInvoiceTotal` (private method)
- `apps/api/service/invoice_service.go` — `RecalculateTotalAmount` (public, sudah support tx)

## Task (Daftar Pekerjaan)

- [ ] Bungkus update per-invoice dalam transaksi database
- [ ] Error pada satu invoice jangan menghentikan seluruh batch
- [ ] Tambahkan logging untuk invoice yang gagal
- [ ] Periksa method serupa: `SyncExtracurricularMonthlyInvoices`, `SyncDaycareMonthlyInvoices` — apakah juga tanpa transaksi?
