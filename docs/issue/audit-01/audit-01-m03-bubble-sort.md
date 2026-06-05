# A01-M03: Bubble Sort O(n²) Manual

## Problem (Masalah / Konteks)

`report_service.go` mengimplementasikan sorting manual dengan algoritma O(n²) alih-alih menggunakan `sort.Strings()` dari standard library. Untuk dataset besar (banyak tanggal transaksi), performa akan degrade.

## Current Behavior (Kondisi Saat Ini)

**File:** `apps/api/service/report_service.go:430-435`

```go
// sortStrings sorts a slice of strings in place
func sortStrings(s []string) {
    for i := 1; i < len(s); i++ {
        for j := i; j > 0 && s[j] < s[j-1]; j-- {
            s[j], s[j-1] = s[j-1], s[j]
        }
    }
}
```

Ini sebenarnya insertion sort, bukan bubble sort — tetap O(n²). Dipanggil di 3 tempat:

- `GetSaldo()` — sorting dates
- `GetTabunganReport()` — sorting dates
- `GetTabunganSiswaReport()` — sorting dates (via similar pattern)

## Expected Behavior (Kondisi yang Diharapkan)

Gunakan `sort.Strings()`:

```go
import "sort"

// Di GetSaldo, GetTabunganReport:
sort.Strings(dates)
```

Atau jika butuh custom sort: `sort.Slice()` / `sort.SliceStable()`.

## Relevant Files / Area

- `apps/api/service/report_service.go:430-435` — `sortStrings`
- `apps/api/service/report_service.go` — 3 call site di GetSaldo, GetTabunganReport, GetTabunganSiswaReport

## Task (Daftar Pekerjaan)

- [ ] Hapus fungsi `sortStrings`
- [ ] Ganti semua pemanggilan dengan `sort.Strings(dates)`
- [ ] Tambah `"sort"` import jika belum ada
