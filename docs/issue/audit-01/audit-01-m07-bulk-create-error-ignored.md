# A01-M07: BulkCreate Error Diabaikan di Import Siswa

## Problem (Masalah / Konteks)

Saat import siswa via CSV, error dari `BulkCreate` diabaikan (`_`). Jika insert gagal (misal constraint violation, DB connection lost), tidak ada yang tahu — seolah-olah import berhasil tapi data tidak masuk.

## Current Behavior (Kondisi Saat Ini)

**File:** `apps/api/service/student_service.go:284`

```go
if len(students) > 0 {
    successCount, dbResults, _ := s.studentRepo.BulkCreate(students)  // ❌ error diabaikan
    details = append(details, dbResults...)
    
    return &dto.ImportSummaryResponse{
        TotalProcessed: totalProcessed,
        TotalSuccess:   successCount,
        TotalFailed:    totalProcessed - successCount,
        Details:        details,
    }, nil
}
```

### Steps to Reproduce

1. Import CSV dengan 100 siswa yang valid
2. Database connection putus saat insert
3. API mengembalikan `TotalSuccess: 0` tapi tanpa pesan error — user bingung

## Expected Behavior (Kondisi yang Diharapkan)

Tangkap error dan laporkan:

```go
if len(students) > 0 {
    successCount, dbResults, err := s.studentRepo.BulkCreate(students)
    if err != nil {
        return nil, fmt.Errorf("Gagal import data: %w", err)
    }
    details = append(details, dbResults...)
    // ...
}
```

## Relevant Files / Area

- `apps/api/service/student_service.go:284` — BulkCreate error diabaikan

## Task (Daftar Pekerjaan)

- [ ] Tangkap error dari `BulkCreate`
- [ ] Return error dengan pesan yang jelas jika gagal
- [ ] Pertimbangkan partial success: jika beberapa row gagal (unique constraint), laporkan yang gagal, commit yang berhasil
