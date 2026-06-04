# Feedback 05: Fitur Dispensasi Tagihan

## Konteks

Dispensasi adalah potongan/keringanan yang diberikan kepada siswa tertentu pada item tagihan tertentu. Saat ini bisnis logic yang berjalan: dispensasi hanya berlaku pada item **SPP** saja, bisa berupa **persentase** atau **nominal tetap**.

Dispensasi diberikan berdasarkan alasan yang beragam, dan seorang siswa bisa memiliki **lebih dari satu dispensasi** yang saling menumpuk (stackable). Durasi dispensasi juga harus fleksibel — bisa untuk periode tertentu atau berlaku selamanya selama alasan masih valid.

**Contoh kasus nyata:**
- Anak guru → dispensasi selama ibunya masih mengajar di Alizzah (tanpa batas waktu)
- Siswa yatim/piatu → dispensasi selama masih bersekolah (tanpa batas waktu)
- Siswa satu dusun dengan Alizzah → dispensasi tetap
- Kombinasi: siswa yatim + satu dusun → 2 dispensasi yang menumpuk

## Tujuan

Implementasi fitur dispensasi yang fleksibel: bisa berdurasi tertentu atau permanen, bisa lebih dari satu per siswa (stackable), dan saat ini hanya berlaku pada SPP.

## Status Saat Ini

- Tidak ada tabel atau logic dispensasi di sistem
- Tagihan SPP di-generate flat dari fee config (`monthly_spp`)
- Belum ada mekanisme untuk menurunkan nominal tagihan secara per-siswa

## Rencana Implementasi

### 1. Database — Tabel `dispensations`

```sql
CREATE TABLE dispensations (
    id SERIAL PRIMARY KEY,
    student_id INT NOT NULL REFERENCES students(id),
    academic_year_id INT NOT NULL REFERENCES academic_years(id),
    fee_category VARCHAR(30) NOT NULL DEFAULT 'monthly_spp',
    discount_type VARCHAR(10) NOT NULL,         -- 'percent' | 'fixed'
    discount_value DECIMAL(15,2) NOT NULL,      -- 20 (%) atau 50000 (Rp)
    is_permanent BOOLEAN NOT NULL DEFAULT false, -- true = berlaku selamanya (tanpa end)
    start_month INT NOT NULL,
    start_year INT NOT NULL,
    end_month INT,              -- null jika is_permanent = true
    end_year INT,               -- null jika is_permanent = true
    reason VARCHAR(100) NOT NULL,               -- label singkat: "Anak Guru", "Yatim", "Satu Dusun"
    notes TEXT,                                 -- keterangan tambahan (opsional)
    is_active BOOLEAN NOT NULL DEFAULT true,    -- bisa di-nonaktifkan tanpa dihapus
    created_by INT NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP
);

CREATE INDEX idx_dispensations_student ON dispensations(student_id, academic_year_id, is_active);
```

**Desain key:**
- `is_permanent = true` + `end_month/end_year = null` → berlaku selamanya
- `is_permanent = false` + `end_month/end_year` diisi → berlaku untuk periode tertentu
- `is_active = true/false` → bisa dinonaktifkan sewaktu-waktu tanpa hapus (misal: ibu guru resign, dispensasi di-nonaktifkan)
- Satu siswa bisa punya **banyak dispensasi aktif** sekaligus → stackable

### 2. Backend

**Model `dispensation.go`:**
```go
type Dispensation struct {
    PrimaryKey
    StudentID      uint    `gorm:"not null;index"`
    AcademicYearID uint    `gorm:"not null;index"`
    FeeCategory    string  `gorm:"size:30;not null;default:monthly_spp"`
    DiscountType   string  `gorm:"size:10;not null"`    // percent | fixed
    DiscountValue  float64 `gorm:"type:decimal(15,2);not null"`
    IsPermanent    bool    `gorm:"not null;default:false"`
    StartMonth     uint    `gorm:"not null"`
    StartYear      uint    `gorm:"not null"`
    EndMonth       *uint
    EndYear        *uint
    Reason         string  `gorm:"size:100;not null"`
    Notes          string  `gorm:"type:text"`
    IsActive       bool    `gorm:"not null;default:true"`
    CreatedBy      uint    `gorm:"not null"`
    BaseModelTimeAt

    Student      Student      `gorm:"foreignKey:StudentID"`
    AcademicYear AcademicYear `gorm:"foreignKey:AcademicYearID"`
    Creator      User         `gorm:"foreignKey:CreatedBy"`
}
```

**Endpoints:**
| Method | Path | Fungsi | Role |
|--------|------|--------|------|
| `GET` | `/v1/students/:id/dispensations` | List dispensasi siswa (semua tahun ajaran) | Admin Keuangan+ |
| `POST` | `/v1/students/:id/dispensations` | Buat dispensasi baru | Admin Keuangan+ |
| `PUT` | `/v1/dispensations/:id` | Update dispensasi | Admin Keuangan+ |
| `PATCH` | `/v1/dispensations/:id/toggle` | Aktifkan/nonaktifkan dispensasi | Admin Keuangan+ |
| `DELETE` | `/v1/dispensations/:id` | Soft delete dispensasi | Admin Keuangan+ |

**Logic pengecekan dispensasi aktif:**
```go
func (r *dispensationRepo) FindActiveForStudentMonth(
    studentID, academicYearID uint,
    month, year uint,
    feeCategory string,
) ([]Dispensation, error) {
    var results []Dispensation
    query := r.db.Where(
        "student_id = ? AND academic_year_id = ? AND fee_category = ? AND is_active = true AND deleted_at IS NULL",
        studentID, academicYearID, feeCategory,
    ).Where(
        // Start date <= target month
        "(start_year < ? OR (start_year = ? AND start_month <= ?))",
        year, year, month,
    ).Where(
        // End date >= target month OR permanent
        "is_permanent = true OR (end_year > ? OR (end_year = ? AND end_month >= ?))",
        year, year, month,
    )
    err := query.Find(&results).Error
    return results, err
}
```

**Logic kalkulasi stacking dispensasi:**
```go
func CalculateTotalDiscount(originalAmount float64, dispensations []Dispensation) float64 {
    totalDiscount := float64(0)

    for _, d := range dispensations {
        switch d.DiscountType {
        case "percent":
            // Persentase dihitung dari amount asli (bukan dari sisa setelah potongan lain)
            totalDiscount += originalAmount * d.DiscountValue / 100
        case "fixed":
            totalDiscount += d.DiscountValue
        }
    }

    // Pastikan total diskon tidak melebihi original amount
    if totalDiscount > originalAmount {
        totalDiscount = originalAmount
    }

    return totalDiscount
}
```

### 3. Integrasi dengan Invoice Generate

Di `GenerateMonthly()` (`invoice_generate_service.go`), setelah buat item SPP:

```go
// Cari semua dispensasi aktif untuk siswa ini di bulan ini
dispensations, _ := s.dispensationRepo.FindActiveForStudentMonth(
    params.StudentID, params.AcademicYearID,
    params.Month, params.Year, "monthly_spp",
)

if len(dispensations) > 0 {
    // Hitung total item SPP asli
    sppOriginalAmount := float64(0)
    for _, item := range invoiceItems {
        if item.Category == "monthly_spp" {
            sppOriginalAmount += item.Amount
        }
    }

    // Hitung total diskon dari semua dispensasi yang menumpuk
    totalDiscount := CalculateTotalDiscount(sppOriginalAmount, dispensations)

    // Tambah item dispensasi sebagai item terpisah (amount negatif)
    // Satu item per dispensasi agar jejak audit jelas
    remainingDiscount := totalDiscount
    for _, d := range dispensations {
        discountForThis := float64(0)
        if d.DiscountType == "percent" {
            discountForThis = sppOriginalAmount * d.DiscountValue / 100
        } else {
            discountForThis = d.DiscountValue
        }
        // Cap agar tidak melebihi remaining
        if discountForThis > remainingDiscount {
            discountForThis = remainingDiscount
        }
        remainingDiscount -= discountForThis

        if discountForThis > 0 {
            label := fmt.Sprintf("Dispensasi: %s", d.Reason)
            if d.DiscountType == "percent" {
                label = fmt.Sprintf("Dispensasi: %s (%.0f%%)", d.Reason, d.DiscountValue)
            }
            invoiceItems = append(invoiceItems, model.InvoiceItem{
                Name:        label,
                Category:    "dispensation",
                Amount:      -discountForThis,
                IsMandatory: true,
                Notes:       d.Notes,
            })
        }
    }
}
```

**Catatan:** Item SPP tetap full amount di invoice. Dispensasi tampil sebagai item terpisah dengan amount negatif. Ini memberikan:
- Jejak audit yang jelas
- Tampil di struk pembayaran
- Wali murid tahu ada potongan dan alasannya
- Total tagihan berkurang otomatis dari recalculate total

### 4. Dispensasi Permanen — Carry Over ke Tahun Ajaran Baru

Saat proses kenaikan kelas / tahun ajaran baru:
- Dispensasi dengan `is_permanent = true` yang masih `is_active = true` → otomatis di-copy ke tahun ajaran baru
- Dispensasi dengan periode tertentu (`is_permanent = false`) → tidak di-copy, hanya berlaku di tahun ajaran asalnya

```go
func (s *dispensationService) CarryOverPermanent(studentID, fromAcademicYearID, toAcademicYearID uint) error {
    permanents, _ := s.repo.FindPermanentActive(studentID, fromAcademicYearID)
    for _, d := range permanents {
        newD := d
        newD.ID = 0
        newD.AcademicYearID = toAcademicYearID
        // Reset start ke awal tahun ajaran baru
        newD.StartMonth = startMonthOfAcademicYear
        newD.StartYear = startYearOfAcademicYear
        s.repo.Create(&newD)
    }
    return nil
}
```

### 5. Frontend

**Tab baru di detail siswa: `/administrasi/siswa/$id/dispensasi`**

Layout:
```
┌──────────────────────────────────────────────────────────┐
│  Dispensasi Aktif                        [+ Tambah Baru] │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  ┌─ Anak Guru ──────────────────────────────────────┐   │
│  │  Potongan: 50% SPP                               │   │
│  │  Berlaku: Permanen (sejak Jul 2025)               │   │
│  │  Catatan: Ibu Siti - guru kelas Mutiara           │   │
│  │                        [Nonaktifkan] [Edit] [Hapus]│   │
│  └───────────────────────────────────────────────────┘   │
│                                                          │
│  ┌─ Satu Dusun ─────────────────────────────────────┐   │
│  │  Potongan: Rp 25.000 SPP                          │   │
│  │  Berlaku: Permanen (sejak Jul 2025)               │   │
│  │                        [Nonaktifkan] [Edit] [Hapus]│   │
│  └───────────────────────────────────────────────────┘   │
│                                                          │
│  Total estimasi potongan SPP/bulan: Rp 200.000           │
│  (SPP asli: Rp 350.000 → setelah dispensasi: Rp 150.000)│
└──────────────────────────────────────────────────────────┘
```

**Form tambah dispensasi:**
- Jenis tagihan: SPP (saat ini hanya SPP, dropdown disabled)
- Tipe potongan: Persentase / Nominal
- Nilai potongan: input angka
- Durasi: Permanen / Periode tertentu
  - Jika periode: bulan mulai - bulan akhir
- Alasan (wajib): input teks singkat — "Anak Guru", "Yatim", "Satu Dusun"
- Catatan (opsional): textarea

**Di halaman tagihan siswa (`tagihan/$id`):**
- Item dispensasi tampil sebagai baris merah dengan nominal negatif
- Badge alasan dispensasi

**Di halaman pembayaran (struk cetak):**
- Item dispensasi ikut dicetak

### File yang Perlu Dibuat/Diubah

| Layer | File | Perubahan |
|-------|------|-----------|
| Model | `apps/api/model/dispensation.go` | **Baru** |
| DTO | `apps/api/dto/dispensation.go` | **Baru** |
| Repository | `apps/api/repository/dispensation_repository.go` | **Baru** |
| Service | `apps/api/service/dispensation_service.go` | **Baru** — CRUD + carry over |
| Handler | `apps/api/handler/dispensation_handler.go` | **Baru** |
| Route | `apps/api/route/routes.go` | Register endpoints |
| Invoice Generate | `apps/api/service/invoice_generate_service.go` | Inject dispensation repo, cek + apply dispensasi di `GenerateMonthly()` |
| Siklus Akademik | `apps/api/service/enrollment_service.go` | Call `CarryOverPermanent()` saat kenaikan kelas |
| Frontend Route | `apps/dashboard/src/routes/_authenticated/administrasi/siswa/$id/dispensasi.tsx` | **Baru** |
| Frontend | `apps/dashboard/src/routes/_authenticated/keuangan/tagihan/$id.tsx` | Tampilkan item dispensasi (negatif) |
| Sidebar | Detail siswa tab navigation | Tambah tab "Dispensasi" |
| API Client | Auto-generate via Orval | — |

## Catatan Bisnis

- Dispensasi **stackable** — siswa bisa punya beberapa dispensasi sekaligus, total potongan dijumlahkan
- Dispensasi permanen otomatis terbawa ke tahun ajaran baru (carry over saat kenaikan kelas)
- Total potongan di-cap agar tidak melebihi amount SPP asli (tidak bisa negatif)
- Potongan persentase dihitung dari SPP asli (bukan dari sisa setelah potongan lain)
- Admin keuangan bisa langsung buat dispensasi tanpa perlu approval superadmin
- Dispensasi bisa dinonaktifkan (toggle `is_active`) tanpa dihapus — berguna saat kondisi berubah (misal: guru resign)
- Saat ini hanya SPP, tapi desain tabel support `fee_category` lain untuk extensibility
