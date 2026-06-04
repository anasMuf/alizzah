# Feedback 04: Tambah Item Antar Jemput

## Konteks

Sekolah menyediakan fasilitas antar jemput yang bersifat:
- **Harian** — dihitung berdasarkan jumlah hari efektif (seperti infaq harian)
- **Opsional** — tidak semua siswa memakai, perlu enrollment manual per siswa

Meskipun mekanismenya mirip ekskul (item opsional + enrollment per siswa), antar jemput **bukan ekskul**. Perlu entitas terpisah agar semantik jelas dan tidak mencampurkan konsep yang berbeda.

## Tujuan

Membuat modul "Fasilitas" terpisah dari ekskul, dengan item pertama "Antar Jemput" yang dihitung berdasarkan hari efektif dan bersifat opsional per siswa.

## Status Saat Ini

- Ekskul menggunakan tabel `extracurriculars` (type: pasta, calisan, ekskul) + `student_extracurriculars`
- Invoice generate service menghandle enrollment-based items dari ekskul di `GenerateMonthly()` line 208-226, tapi **tidak handle unit `per_day`** — semua dihitung flat
- Fee config item sudah support unit `per_day` dan `per_monday`

## Rencana Implementasi

### 1. Database — Tabel baru `facilities` + `student_facilities`

```sql
CREATE TABLE facilities (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,     -- "Antar Jemput", "Makan Siang", dll
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP
);

CREATE TABLE student_facilities (
    id SERIAL PRIMARY KEY,
    student_id INT NOT NULL REFERENCES students(id),
    facility_id INT NOT NULL REFERENCES facilities(id),
    academic_year_id INT NOT NULL REFERENCES academic_years(id),
    start_date DATE NOT NULL,
    end_date DATE,                          -- null = sampai akhir tahun ajaran
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    UNIQUE (student_id, facility_id, academic_year_id)
);
```

### 2. Backend — Model, Repository, Service, Handler

**Model `facility.go`:**
```go
type Facility struct {
    PrimaryKey
    Name        string `gorm:"size:100;not null;uniqueIndex"`
    Description string `gorm:"type:text"`
    IsActive    bool   `gorm:"not null;default:true"`
    BaseModelTimeAt
}
```

**Model `student_facility.go`:**
```go
type StudentFacility struct {
    PrimaryKey
    StudentID      uint       `gorm:"not null;index;uniqueIndex:uq_student_facility,priority:1"`
    FacilityID     uint       `gorm:"not null;index;uniqueIndex:uq_student_facility,priority:2"`
    AcademicYearID uint       `gorm:"not null;index;uniqueIndex:uq_student_facility,priority:3"`
    StartDate      time.Time  `gorm:"type:date;not null"`
    EndDate        *time.Time `gorm:"type:date"`
    BaseModelTimeAt

    Student      Student      `gorm:"foreignKey:StudentID"`
    Facility     Facility     `gorm:"foreignKey:FacilityID"`
    AcademicYear AcademicYear `gorm:"foreignKey:AcademicYearID"`
}
```

**Endpoints:**
| Method | Path | Fungsi |
|--------|------|--------|
| `GET` | `/v1/facilities` | List master fasilitas |
| `POST` | `/v1/facilities` | Tambah fasilitas baru |
| `PUT` | `/v1/facilities/:id` | Update fasilitas |
| `DELETE` | `/v1/facilities/:id` | Soft delete fasilitas |
| `GET` | `/v1/students/:id/facilities` | List fasilitas yang diikuti siswa |
| `POST` | `/v1/students/:id/facilities` | Assign siswa ke fasilitas |
| `DELETE` | `/v1/students/:id/facilities/:facility_id` | Cabut siswa dari fasilitas |

### 3. Konfigurasi Tarif — Fee Config Item

Di fee config, admin buat item dengan category baru `facility`:
```
Category:    facility
ItemKey:     antar_jemput
Name:        Antar Jemput
Level:       all
Amount:      15000       (tarif per hari)
Unit:        per_day
IsMandatory: false
```

**Perubahan DTO fee config:**
- Tambah `facility` ke validasi `category`: `oneof=initial registration monthly_spp monthly_infaq pasta calisan ekskul savings_mandatory daycare graduation facility`

**Linking fee config item ke facility:**
- Gunakan `item_key` untuk mencocokkan fee config item dengan facility (misal: `item_key = "antar_jemput"` → cocokkan dengan `facilities.name`)
- Atau tambah field `facility_id` di `fee_config_items` (lebih eksplisit)

### 4. Invoice Generate — Integrasi Fasilitas

Tambah logic di `GenerateMonthly()` setelah bagian ekskul/enrollment:

```go
// Fasilitas opsional (antar jemput, dll)
activeFacilities := getActiveStudentFacilities(params.StudentID, params.AcademicYearID)
for _, sf := range activeFacilities {
    feeItems := findFeeItemsByFacility(feeConfig.ID, sf.Facility)
    for _, feeItem := range feeItems {
        amount := feeItem.Amount
        itemName := feeItem.Name

        // Handle unit per_day → kalikan dengan hari efektif
        if feeItem.Unit == "per_day" && effectiveDays != nil {
            totalDays := effectiveDays.TotalDays
            amount = feeItem.Amount * float64(totalDays)
            itemName = fmt.Sprintf("%s (%d hari)", feeItem.Name, totalDays)
        }

        invoiceItems = append(invoiceItems, model.InvoiceItem{
            Name:        itemName,
            Category:    "facility",
            Amount:      amount,
            IsMandatory: true,
        })
    }
}
```

**Dependency baru untuk `invoiceGenerateService`:**
- `facilityRepo repository.FacilityRepository`
- `studentFacilityRepo repository.StudentFacilityRepository`

### 5. Recalculate — Extend untuk Fasilitas

`RecalculateInfaqHarian()` perlu di-extend untuk juga recalculate item fasilitas yang punya unit `per_day`:

```go
// Di RecalculateInfaqHarian(), setelah handle monthly_infaq dan savings_mandatory
if item.Category == "facility" {
    // Cari fee config item yang cocok
    // Jika unit == per_day, recalculate: amount = unit_price × totalDays
    // Update item.Amount dan item.Name
}
```

### 6. Frontend

**Halaman master fasilitas baru: `/administrasi/fasilitas`**
- CRUD daftar fasilitas (Antar Jemput, dll)
- Sederhana: nama + deskripsi + status aktif

**Tab fasilitas di detail siswa: `/administrasi/siswa/$id/fasilitas`**
- List fasilitas yang diikuti siswa
- Tombol "Tambah Fasilitas" → pilih dari master, set tanggal mulai
- Tombol hapus enrollment

**Sidebar:** Tambah menu "Fasilitas" di bawah section Administrasi

### File yang Perlu Dibuat/Diubah

| Layer | File | Perubahan |
|-------|------|-----------|
| Model | `apps/api/model/facility.go` | **Baru** |
| Model | `apps/api/model/student_facility.go` | **Baru** |
| DTO | `apps/api/dto/facility.go` | **Baru** |
| DTO | `apps/api/dto/fee_config.go` | Tambah category `facility` di validasi |
| Repository | `apps/api/repository/facility_repository.go` | **Baru** |
| Repository | `apps/api/repository/student_facility_repository.go` | **Baru** |
| Service | `apps/api/service/facility_service.go` | **Baru** |
| Handler | `apps/api/handler/facility_handler.go` | **Baru** |
| Route | `apps/api/route/routes.go` | Register endpoints |
| Invoice Generate | `apps/api/service/invoice_generate_service.go` | Inject facility repos, tambah logic fasilitas di `GenerateMonthly()` + extend `RecalculateInfaqHarian()` |
| Frontend Route | `apps/dashboard/src/routes/_authenticated/administrasi/fasilitas/` | **Baru** (index) |
| Frontend Route | `apps/dashboard/src/routes/_authenticated/administrasi/siswa/$id/fasilitas.tsx` | **Baru** (tab detail siswa) |
| Sidebar | `apps/dashboard/src/components/layout/Sidebar.tsx` | Tambah menu "Fasilitas" |
| API Client | Auto-generate via Orval | — |

## Catatan

- Entitas terpisah dari ekskul — tidak reuse `extracurriculars`/`student_extracurriculars`
- Pola ini scalable: jika ada fasilitas baru (makan siang, seragam rental, dll), tinggal tambah di master fasilitas + fee config item
- Enrollment fasilitas bersifat per tahun ajaran, tidak otomatis terbawa ke tahun ajaran berikutnya
