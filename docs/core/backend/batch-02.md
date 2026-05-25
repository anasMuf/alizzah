# Batch 2 — Administrasi: Master Data

> **Scope:** Students · Guardians · Class Groups · Extracurriculars (master)
> **Endpoint:** 18
> **Dependensi:** Batch 1 selesai
> **Harus selesai sebelum:** Batch 3

---

## Tujuan Batch Ini

Membangun seluruh master data modul administrasi: data siswa, wali murid, rombel, dan master ekstrakurikuler. Belum ada relasi siswa ke rombel atau enrollment — itu dikerjakan di Batch 3.

---

## Daftar Endpoint

| # | Method | Endpoint | Role |
|---|--------|----------|------|
| 1 | GET | `/api/v1/students` | superadmin, admin_administrasi, admin_keuangan |
| 2 | POST | `/api/v1/students` | superadmin, admin_administrasi |
| 3 | POST | `/api/v1/students/import` | superadmin, admin_administrasi |
| 4 | GET | `/api/v1/students/:id` | superadmin, admin_administrasi, admin_keuangan |
| 5 | PUT | `/api/v1/students/:id` | superadmin, admin_administrasi |
| 6 | DELETE | `/api/v1/students/:id` | superadmin, admin_administrasi |
| 7 | POST | `/api/v1/guardians` | superadmin, admin_administrasi |
| 8 | GET | `/api/v1/guardians/:id` | superadmin, admin_administrasi |
| 9 | PUT | `/api/v1/guardians/:id` | superadmin, admin_administrasi |
| 10 | GET | `/api/v1/students/:id/guardians` | superadmin, admin_administrasi |
| 11 | POST | `/api/v1/students/:id/guardians` | superadmin, admin_administrasi |
| 12 | DELETE | `/api/v1/students/:id/guardians/:guardian_id` | superadmin, admin_administrasi |
| 13 | PATCH | `/api/v1/students/:id/guardians/:guardian_id/primary` | superadmin, admin_administrasi |
| 14 | GET | `/api/v1/class-groups` | superadmin, admin_administrasi, admin_keuangan |
| 15 | POST | `/api/v1/class-groups` | superadmin, admin_administrasi |
| 16 | GET | `/api/v1/class-groups/:id` | superadmin, admin_administrasi, admin_keuangan |
| 17 | PUT | `/api/v1/class-groups/:id` | superadmin, admin_administrasi |
| 18 | DELETE | `/api/v1/class-groups/:id` | superadmin, admin_administrasi |

---

## Checklist Implementasi

### 1. Students

#### Model

- [x] `model/student.go`

```go
type Student struct {
    model.PrimaryKey
    FullName      string  `gorm:"size:100;not null"`
    BirthPlace    string  `gorm:"size:100;not null"`
    BirthDate     time.Time `gorm:"type:date;not null"`
    Gender        string  `gorm:"size:1;not null"` // L | P
    Religion      string  `gorm:"size:30"`
    PhotoURL      string  `gorm:"size:255"`
    Status        string  `gorm:"size:20;not null;default:active"` // active | graduated | transferred | dropped
    IsDaycareOnly bool    `gorm:"default:false"`
    model.BaseModelTimeAt

    // Relations
    Guardians          []Guardian         `gorm:"many2many:student_guardians;"`
    StudentGuardians   []StudentGuardian  `gorm:"foreignKey:StudentID"`
    Enrollments        []StudentEnrollment `gorm:"foreignKey:StudentID"`
}
```

- [x] `model/guardian.go`

```go
type Guardian struct {
    model.PrimaryKey
    FullName     string `gorm:"size:100;not null"`
    Relationship string `gorm:"size:20;not null"` // ayah | ibu | wali
    Phone        string `gorm:"size:20;not null"`
    Address      string `gorm:"type:text"`
    model.BaseModelTimeAt

    Students []Student `gorm:"many2many:student_guardians;"`
}
```

- [x] `model/student_guardian.go`

```go
type StudentGuardian struct {
    model.PrimaryKey
    StudentID  uint `gorm:"not null;index"`
    GuardianID uint `gorm:"not null;index"`
    IsPrimary  bool `gorm:"default:false"`
    CreatedAt  time.Time
    UpdatedAt  time.Time

    Student  Student  `gorm:"foreignKey:StudentID"`
    Guardian Guardian `gorm:"foreignKey:GuardianID"`
}

// UNIQUE constraint: (student_id, guardian_id)
func (StudentGuardian) TableName() string { return "student_guardians" }
```

#### DTO

- [x] `dto/student.go`

```go
// Request
type CreateStudentRequest struct {
    FullName      string                  `json:"full_name" validate:"required,min=3,max=100"`
    BirthPlace    string                  `json:"birth_place" validate:"required,max=100"`
    BirthDate     string                  `json:"birth_date" validate:"required,datetime=2006-01-02"`
    Gender        string                  `json:"gender" validate:"required,oneof=L P"`
    Religion      string                  `json:"religion" validate:"omitempty,max=30"`
    IsDaycareOnly bool                    `json:"is_daycare_only"`
    Guardians     []CreateGuardianInline  `json:"guardians" validate:"omitempty,dive"`
}

type CreateGuardianInline struct {
    FullName     string `json:"full_name" validate:"required,max=100"`
    Relationship string `json:"relationship" validate:"required,oneof=ayah ibu wali"`
    Phone        string `json:"phone" validate:"required,max=20"`
    Address      string `json:"address" validate:"omitempty"`
    IsPrimary    bool   `json:"is_primary"`
}

type UpdateStudentRequest struct {
    FullName      string `json:"full_name" validate:"required,min=3,max=100"`
    BirthPlace    string `json:"birth_place" validate:"required,max=100"`
    BirthDate     string `json:"birth_date" validate:"required,datetime=2006-01-02"`
    Gender        string `json:"gender" validate:"required,oneof=L P"`
    Religion      string `json:"religion" validate:"omitempty,max=30"`
    IsDaycareOnly bool   `json:"is_daycare_only"`
}

type StudentQueryParams struct {
    Search        string
    Status        string
    ClassGroupID  uint
    AcademicYearID uint
    IsDaycareOnly *bool
    Page          int
    Limit         int
}

// Response
type StudentListResponse struct {
    ID            uint                       `json:"id"`
    FullName      string                     `json:"full_name"`
    Gender        string                     `json:"gender"`
    BirthDate     string                     `json:"birth_date"`
    Status        string                     `json:"status"`
    IsDaycareOnly bool                       `json:"is_daycare_only"`
    CurrentEnrollment *EnrollmentBriefResponse `json:"current_enrollment,omitempty"`
}

type StudentDetailResponse struct {
    ID            uint                         `json:"id"`
    FullName      string                       `json:"full_name"`
    Gender        string                       `json:"gender"`
    BirthPlace    string                       `json:"birth_place"`
    BirthDate     string                       `json:"birth_date"`
    Religion      string                       `json:"religion"`
    PhotoURL      *string                      `json:"photo_url"`
    Status        string                       `json:"status"`
    IsDaycareOnly bool                         `json:"is_daycare_only"`
    Guardians     []GuardianBriefResponse      `json:"guardians"`
    CurrentEnrollment *EnrollmentBriefResponse `json:"current_enrollment,omitempty"`
    FinancialSummary  *FinancialSummaryResponse `json:"financial_summary,omitempty"`
    CreatedAt     string                       `json:"created_at"`
}

// FinancialSummaryResponse diisi oleh service keuangan (batch 5+)
// Saat batch ini, kembalikan nil
type FinancialSummaryResponse struct {
    TotalUnpaid             float64 `json:"total_unpaid"`
    SavingsGeneralBalance   float64 `json:"savings_general_balance"`
    SavingsMandatoryBalance float64 `json:"savings_mandatory_balance"`
}
```

#### Repository

- [x] `repository/student_repository.go`

```go
type StudentRepository interface {
    FindAll(params dto.StudentQueryParams) ([]model.Student, int64, error)
    FindByID(id uint) (*model.Student, error)
    Create(student *model.Student) error
    Update(student *model.Student) error
    Delete(id uint) error
    HasActiveEnrollment(id uint) (bool, error)
    BulkCreate(students []model.Student) (int, []ImportError, error)
}
```

#### Service

- [x] `service/student_service.go`

```go
type StudentService interface {
    GetAll(params dto.StudentQueryParams) ([]dto.StudentListResponse, *dto.Meta, error)
    GetByID(id uint) (*dto.StudentDetailResponse, error)
    Create(req dto.CreateStudentRequest) (*dto.StudentDetailResponse, error)
    Update(id uint, req dto.UpdateStudentRequest) (*dto.StudentDetailResponse, error)
    Delete(id uint) error
    Import(file multipart.File) (*dto.ImportResult, error)
}
```

Logika bisnis:
- `Create` → dalam satu DB transaction: insert `students` + insert `guardians` + insert `student_guardians`
- `Delete` → cek `HasActiveEnrollment` dulu; jika ada kembalikan 422
- `Import` → parse CSV/SQL → validasi per row → `BulkCreate` → kembalikan summary

#### Handler

- [x] `handler/student_handler.go`
  - `List`, `Create`, `Import`, `Get`, `Update`, `Delete`
  - `Import` menggunakan `c.FormFile("file")`

#### Route

- [x] Register di `main.go`:

```go
students := api.Group("/students", jwtMiddleware)
students.GET("", studentHandler.List,
    roleMiddleware("superadmin", "admin_administrasi", "admin_keuangan"))
students.POST("", studentHandler.Create,
    roleMiddleware("superadmin", "admin_administrasi"))
students.POST("/import", studentHandler.Import,
    roleMiddleware("superadmin", "admin_administrasi"))
students.GET("/:id", studentHandler.Get,
    roleMiddleware("superadmin", "admin_administrasi", "admin_keuangan"))
students.PUT("/:id", studentHandler.Update,
    roleMiddleware("superadmin", "admin_administrasi"))
students.DELETE("/:id", studentHandler.Delete,
    roleMiddleware("superadmin", "admin_administrasi"))
```

---

### 2. Guardians

#### Model

Sudah didefinisikan di atas (`model/guardian.go` dan `model/student_guardian.go`).

#### DTO

- [x] `dto/guardian.go`

```go
type CreateGuardianRequest struct {
    FullName     string `json:"full_name" validate:"required,max=100"`
    Relationship string `json:"relationship" validate:"required,oneof=ayah ibu wali"`
    Phone        string `json:"phone" validate:"required,max=20"`
    Address      string `json:"address" validate:"omitempty"`
}

type LinkGuardianRequest struct {
    GuardianID uint `json:"guardian_id" validate:"required"`
    IsPrimary  bool `json:"is_primary"`
}

type GuardianResponse struct {
    ID           uint             `json:"id"`
    FullName     string           `json:"full_name"`
    Relationship string           `json:"relationship"`
    Phone        string           `json:"phone"`
    Address      string           `json:"address"`
    Students     []StudentBriefResponse `json:"students,omitempty"`
}

type GuardianBriefResponse struct {
    ID           uint   `json:"id"`
    FullName     string `json:"full_name"`
    Relationship string `json:"relationship"`
    Phone        string `json:"phone"`
    IsPrimary    bool   `json:"is_primary"`
}
```

#### Repository

- [x] `repository/guardian_repository.go`

```go
type GuardianRepository interface {
    FindByID(id uint) (*model.Guardian, error)
    Create(guardian *model.Guardian) error
    Update(guardian *model.Guardian) error
    FindByStudentID(studentID uint) ([]model.StudentGuardian, error)
    LinkToStudent(studentID, guardianID uint, isPrimary bool) error
    UnlinkFromStudent(studentID, guardianID uint) error
    SetPrimary(studentID, guardianID uint) error // tx: set all false → set target true
    IsLinkedToStudent(studentID, guardianID uint) (bool, error)
}
```

#### Service

- [x] `service/guardian_service.go`

```go
type GuardianService interface {
    Create(req dto.CreateGuardianRequest) (*dto.GuardianResponse, error)
    GetByID(id uint) (*dto.GuardianResponse, error)
    Update(id uint, req dto.CreateGuardianRequest) (*dto.GuardianResponse, error)
    GetByStudentID(studentID uint) ([]dto.GuardianBriefResponse, error)
    LinkToStudent(studentID uint, req dto.LinkGuardianRequest) error
    UnlinkFromStudent(studentID, guardianID uint) error
    SetPrimary(studentID, guardianID uint) error
}
```

Logika bisnis:
- `SetPrimary` → jalankan dalam satu transaction: UPDATE semua `is_primary=false` untuk student tersebut → UPDATE target `is_primary=true`
- `UnlinkFromStudent` → tidak boleh unlink jika hanya tersisa satu wali

#### Handler

- [x] `handler/guardian_handler.go`
  - `Create`, `Get`, `Update`
  - `GetByStudent`, `LinkToStudent`, `UnlinkFromStudent`, `SetPrimary`

#### Route

- [x] Register di `main.go`:

```go
guardians := api.Group("/guardians", jwtMiddleware,
    roleMiddleware("superadmin", "admin_administrasi"))
guardians.POST("", guardianHandler.Create)
guardians.GET("/:id", guardianHandler.Get)
guardians.PUT("/:id", guardianHandler.Update)

// Nested di bawah students
students.GET("/:id/guardians", guardianHandler.GetByStudent,
    roleMiddleware("superadmin", "admin_administrasi"))
students.POST("/:id/guardians", guardianHandler.LinkToStudent,
    roleMiddleware("superadmin", "admin_administrasi"))
students.DELETE("/:id/guardians/:guardian_id", guardianHandler.UnlinkFromStudent,
    roleMiddleware("superadmin", "admin_administrasi"))
students.PATCH("/:id/guardians/:guardian_id/primary", guardianHandler.SetPrimary,
    roleMiddleware("superadmin", "admin_administrasi"))
```

---

### 3. Class Groups (Rombel)

#### Model

- [x] `model/class_group.go`

```go
type ClassGroup struct {
    model.PrimaryKey
    AcademicYearID uint            `gorm:"not null;index"`
    Name           string          `gorm:"size:50;not null"`
    Level          string          `gorm:"size:20;not null"` // mutiara | intan | berlian
    Schedule       datatypes.JSON  `gorm:"type:jsonb;not null"`
    model.BaseModelTimeAt

    AcademicYear AcademicYear       `gorm:"foreignKey:AcademicYearID"`
    Enrollments  []StudentEnrollment `gorm:"foreignKey:ClassGroupID"`
}
```

> Gunakan `gorm.io/datatypes` untuk `datatypes.JSON`.

#### DTO

- [x] `dto/class_group.go`

```go
type ScheduleBlock struct {
    Days            []string `json:"days"`
    TimeIn          string   `json:"time_in"`
    TimeOut         string   `json:"time_out"`
    TimeOutCalisan  *string  `json:"time_out_calisan"`
}

type ClassGroupSchedule struct {
    Weekdays ScheduleBlock `json:"weekdays"`
    Weekend  ScheduleBlock `json:"weekend"`
}

type CreateClassGroupRequest struct {
    AcademicYearID uint               `json:"academic_year_id" validate:"required"`
    Name           string             `json:"name" validate:"required,max=50"`
    Level          string             `json:"level" validate:"required,oneof=mutiara intan berlian"`
    Schedule       ClassGroupSchedule `json:"schedule" validate:"required"`
}

type ClassGroupResponse struct {
    ID             uint               `json:"id"`
    AcademicYearID uint               `json:"academic_year_id"`
    Name           string             `json:"name"`
    Level          string             `json:"level"`
    Schedule       ClassGroupSchedule `json:"schedule"`
    StudentCount   int                `json:"student_count"`
}

type ClassGroupQueryParams struct {
    AcademicYearID uint
    Level          string
}
```

#### Repository

- [x] `repository/class_group_repository.go`

```go
type ClassGroupRepository interface {
    FindAll(params dto.ClassGroupQueryParams) ([]model.ClassGroup, error)
    FindByID(id uint) (*model.ClassGroup, error)
    Create(cg *model.ClassGroup) error
    Update(cg *model.ClassGroup) error
    Delete(id uint) error
    HasActiveStudents(id uint) (bool, error)
    CountStudents(id uint) (int, error)
}
```

#### Service

- [x] `service/class_group_service.go`

```go
type ClassGroupService interface {
    GetAll(params dto.ClassGroupQueryParams) ([]dto.ClassGroupResponse, error)
    GetByID(id uint) (*dto.ClassGroupResponse, error)
    Create(req dto.CreateClassGroupRequest) (*dto.ClassGroupResponse, error)
    Update(id uint, req dto.CreateClassGroupRequest) (*dto.ClassGroupResponse, error)
    Delete(id uint) error
}
```

Logika bisnis:
- `Delete` → cek `HasActiveStudents`; jika ada kembalikan 422

#### Handler

- [x] `handler/class_group_handler.go`
  - `List`, `Create`, `Get`, `Update`, `Delete`

#### Route

- [x] Register di `main.go`:

```go
classGroups := api.Group("/class-groups", jwtMiddleware)
classGroups.GET("", classGroupHandler.List,
    roleMiddleware("superadmin", "admin_administrasi", "admin_keuangan"))
classGroups.POST("", classGroupHandler.Create,
    roleMiddleware("superadmin", "admin_administrasi"))
classGroups.GET("/:id", classGroupHandler.Get,
    roleMiddleware("superadmin", "admin_administrasi", "admin_keuangan"))
classGroups.PUT("/:id", classGroupHandler.Update,
    roleMiddleware("superadmin", "admin_administrasi"))
classGroups.DELETE("/:id", classGroupHandler.Delete,
    roleMiddleware("superadmin", "admin_administrasi"))
```

---

### 4. Auto-Migrate Update

- [x] Tambahkan model baru ke `config/database.go`:

```go
db.AutoMigrate(
    &model.User{},
    &model.AcademicYear{},
    // Batch 2
    &model.Student{},
    &model.Guardian{},
    &model.StudentGuardian{},
    &model.ClassGroup{},
)
```

---

## Catatan Teknis Batch 2

### Import CSV

Saat ini sekolah memiliki data lama dalam format SQL. Format import yang disepakati saat implementasi, namun endpoint sudah harus siap menerima `multipart/form-data`. Sementara buat parser CSV dengan kolom minimum:

```
full_name, birth_place, birth_date, gender, religion
```

### JSON Schedule di ClassGroup

Field `schedule` disimpan sebagai `jsonb` di PostgreSQL. Saat read, di-unmarshal ke struct `ClassGroupSchedule`. Pastikan index pada `schedule` tidak diperlukan (tidak perlu GIN index untuk batch ini).

### FinancialSummary di Student Detail

Response `financial_summary` pada `GET /students/:id` sudah diisi dari invoice & savings service (`student_service.go`). Data yang ditampilkan: `total_unpaid`, `savings_general_balance`, `savings_mandatory_balance`.

---

## Acceptance Criteria Batch 2

- [x] `POST /students` dengan `guardians` inline → student dan guardian tersimpan dalam satu transaction
- [x] `GET /students/:id` → response menyertakan `guardians` dan `current_enrollment: null` (belum ada enrollment)
- [x] `DELETE /students/:id` → gagal 422 jika siswa punya enrollment aktif
- [x] `POST /students/import` → mengembalikan summary sukses/gagal per row
- [x] `POST /guardians` → buat guardian baru (tanpa link ke siswa)
- [x] `POST /students/:id/guardians` dengan `guardian_id` → link guardian yang sudah ada ke siswa lain
- [x] `PATCH /students/:id/guardians/:guardian_id/primary` → hanya satu guardian yang `is_primary=true` per siswa
- [x] `DELETE /students/:id/guardians/:guardian_id` → gagal 422 jika hanya tersisa satu wali
- [x] `GET /class-groups` → filter by `academic_year_id` dan `level` berfungsi
- [x] `DELETE /class-groups/:id` → gagal 422 jika masih ada siswa aktif
- [x] Admin keuangan hanya bisa GET students dan class-groups, tidak bisa POST/PUT/DELETE
