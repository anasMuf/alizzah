# A01-C08: GenerateRegistration Error Diabaikan di ProcessPromotion

## Problem (Masalah / Konteks)

Saat proses kenaikan kelas (`POST /academic-events/promotions`), setiap siswa yang naik kelas juga dibuatkan invoice registrasi tahunan. Tapi error dari `GenerateRegistration` **diabaikan** (`_ =`). Jika generation gagal (misal fee config tidak ditemukan), siswa tetap naik kelas tetapi tidak punya invoice registrasi. User tidak mendapat notifikasi apa pun.

## Current Behavior (Kondisi Saat Ini)

**File:** `apps/api/service/academic_event_service.go:293-299`

```go
// Generate tagihan registrasi tahunan untuk tahun ajaran baru
if s.invoiceGen != nil {
    _ = s.invoiceGen.GenerateRegistration(dto.GenerateRegistrationInvoiceParams{
        StudentID:      enrollment.StudentID,
        AcademicYearID: req.ToAcademicYearID,
        Level:          newLevel,
        Gender:         enrollment.Student.Gender,
        CreatedBy:      createdBy,
    })
}
```

Pola yang sama juga ada di:

- `academic_event_service.go:477-499` (`ProcessTransferIn`) — error dari `GenerateInitial`, `GenerateRegistration`, dan `GenerateMonthlyRange` semuanya diabaikan
- `student_service.go:219-234` (`Create`) — error dari `GenerateInitial` dan `GenerateRegistration` diabaikan

## Expected Behavior (Kondisi yang Diharapkan)

Error dari invoice generation harus ditangkap dan **dilaporkan sebagai partial failure**, bukan diabaikan:

```go
// Generate tagihan registrasi
if s.invoiceGen != nil {
    if err := s.invoiceGen.GenerateRegistration(...); err != nil {
        result.Errors = append(result.Errors, dto.EventError{
            StudentID:   enrollment.StudentID,
            StudentName: enrollment.Student.FullName,
            Message:     fmt.Sprintf("Gagal generate invoice registrasi: %v", err),
        })
        // Tetap lanjutkan — enrollment sudah dibuat, invoice bisa digenerate ulang nanti
    }
}
```

## Relevant Files / Area

- `apps/api/service/academic_event_service.go:293-299` — ProcessPromotion
- `apps/api/service/academic_event_service.go:477-499` — ProcessTransferIn
- `apps/api/service/student_service.go:219-234` — Create

## Task (Daftar Pekerjaan)

- [ ] Ganti semua `_ = s.invoiceGen.Generate*()` dengan proper error handling
- [ ] Tambahkan error ke dalam result/response, jangan batalkan seluruh operasi
- [ ] Pastikan response API menyertakan list warnings/errors untuk partial failures
- [ ] Tulis test: simulasi fee config missing, pastikan siswa tetap naik kelas + error tercatat
