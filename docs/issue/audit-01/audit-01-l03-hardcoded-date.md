# A01-L03: Hardcoded `beginningOfTime` 2020-01-01

## Problem (Masalah / Konteks)

`GetTabunganReport` menggunakan hardcoded date `2020-01-01` sebagai "awal waktu" untuk menghitung saldo sebelum. Ini tidak fleksibel — jika sistem digunakan sebelum 2020, saldo sebelum akan salah.

## Current Behavior (Kondisi Saat Ini)

**File:** `apps/api/service/report_service.go`

```go
beginningOfTime := time.Date(2020, 1, 1, 0, 0, 0, 0, time.UTC)
```

## Expected Behavior (Kondisi yang Diharapkan)

Gunakan `StartDate` dari tahun ajaran aktif:

```go
ay, _ := s.academicYearRepo.FindActive()
beginningOfTime := ay.StartDate
```

Atau gunakan epoch: `time.Time{}` (zero value) jika query `created_at >= ?` bisa handle zero time.

## Relevant Files / Area

- `apps/api/service/report_service.go` — `GetTabunganReport`

## Task (Daftar Pekerjaan)

- [ ] Ganti hardcoded date dengan `ay.StartDate`
- [ ] Jika academic year tidak ditemukan, fallback ke `time.Time{}`
- [ ] Pastikan query `WHERE created_at >= ?` bekerja dengan benar untuk zero time
