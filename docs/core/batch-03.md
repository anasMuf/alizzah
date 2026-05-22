# Batch 3 — Administrasi: Relasi & Daycare

> **Scope:** Student Enrollments · Effective Days · Student Extracurriculars · Extracurriculars Master · Daycare Enrollments · Class Group Students
> **Endpoint:** 18
> **Dependensi:** Batch 2 selesai
> **Harus selesai sebelum:** Batch 4

---

## Tujuan Batch Ini

Membangun relasi antara siswa dengan rombel (enrollment), input hari efektif per rombel per bulan, pendaftaran ekstrakurikuler/pasta siswa, dan daycare. Seluruh data di batch ini menjadi **trigger** generate tagihan di Batch 5.

---

## Daftar Endpoint

| # | Method | Endpoint | Role |
|---|--------|----------|------|
| 1 | GET | `/api/v1/class-groups/:id/students` | superadmin, admin_administrasi, admin_keuangan |
| 2 | GET | `/api/v1/class-groups/:id/effective-days` | superadmin, admin_administrasi |
| 3 | POST | `/api/v1/class-groups/:id/effective-days` | superadmin, admin_administrasi |
| 4 | PUT | `/api/v1/class-groups/:id/effective-days/:ed_id` | superadmin, admin_administrasi |
| 5 | GET | `/api/v1/extracurriculars` | superadmin, admin_administrasi |
| 6 | POST | `/api/v1/extracurriculars` | superadmin, admin_administrasi |
| 7 | PUT | `/api/v1/extracurriculars/:id` | superadmin, admin_administrasi |
| 8 | DELETE | `/api/v1/extracurriculars/:id` | superadmin, admin_administrasi |
| 9 | GET | `/api/v1/students/:id/enrollments` | superadmin, admin_administrasi, admin_keuangan |
| 10 | GET | `/api/v1/students/:id/extracurriculars` | superadmin, admin_administrasi |
| 11 | POST | `/api/v1/students/:id/extracurriculars` | superadmin, admin_administrasi |
| 12 | PUT | `/api/v1/students/:id/extracurriculars/:se_id` | superadmin, admin_administrasi |
| 13 | DELETE | `/api/v1/students/:id/extracurriculars/:se_id` | superadmin, admin_administrasi |
| 14 | GET | `/api/v1/students/:id/academic-events` | superadmin, admin_administrasi |
| 15 | GET | `/api/v1/daycare-enrollments` | superadmin, admin_administrasi |
| 16 | POST | `/api/v1/daycare-enrollments` | superadmin, admin_administrasi |
| 17 | GET | `/api/v1/daycare-enrollments/:id` | superadmin, admin_administrasi |
| 18 | PUT | `/api/v1/daycare-enrollments/:id` | superadmin, admin_administrasi |

> **Catatan:** `PATCH /daycare-enrollments/:id/status` dimasukkan ke Batch 3 juga (total 19, karena endpoint ini minimal dan terkait langsung).

---

## Checklist Implementasi

### 1. Student Enrollments

#### Model

- [ ] `model/student_enrollment.go`

```go
type StudentEnrollment struct {
    model.PrimaryKey
    StudentID      uint      `gorm:"not null;index"`
    ClassGroupID   uint      `gorm:"not null;index"`
    AcademicYearID uint      `gorm:"not null;index"`
    StartDate      time.Time `gorm:"type:date;not null"`
    EndDate        *time.Time `gorm:"type:date"`
    Status         string    `gorm:"size:20;not null;default:active"`
    // active | completed | transferred | dropped
    EnrollmentType string    `gorm:"size:20;not null"`
    // new | promotion | mutation | retained | class_change
    Notes          string    `gorm:"type:text"`
    CreatedBy      uint      `gorm:"not null"`
    CreatedAt      time.Time
    UpdatedAt      time.Time

    Student      model.Student      `gorm:"foreignKey:StudentID"`
    ClassGroup   model.ClassGroup   `gorm:"foreignKey:ClassGroupID"`
    AcademicYear model.AcademicYear `gorm:"foreignKey:AcademicYearID"`
    Creator      model.User         `gorm:"foreignKey:CreatedBy"`
}
```

#### DTO

- [ ] `dto/student_enrollment.go`

```go
type EnrollmentBriefResponse struct {
    ID             uint   `json:"id"`
    ClassGroupID   uint   `json:"class_group_id"`
    ClassGroupName string `json:"class_group_name"`
    Level          string `json:"level"`
    AcademicYearID uint   `json:"academic_year_id"`
    AcademicYearName string `json:"academic_year_name"`
    StartDate      string `json:"start_date"`
    Status         string `json:"status"`
}

type EnrollmentDetailResponse struct {
    ID             uint    `json:"id"`
    AcademicYear   AcademicYearBriefResponse `json:"academic_year"`
    ClassGroup     ClassGroupBriefResponse   `json:"class_group"`
    StartDate      string  `json:"start_date"`
    EndDate        *string `json:"end_date"`
    Status         string  `json:"status"`
    EnrollmentType string  `json:"enrollment_type"`
    Notes          *string `json:"notes"`
}

type EnrollmentQueryParams struct {
    AcademicYearID uint
}
```

#### Repository

- [ ] `repository/student_enrollment_repository.go`

```go
type StudentEnrollmentRepository interface {
    FindByStudentID(studentID uint, params dto.EnrollmentQueryParams) ([]model.StudentEnrollment, error)
    FindActiveByStudentID(studentID uint) (*model.StudentEnrollment, error)
    FindActiveByClassGroupID(classGroupID uint) ([]model.StudentEnrollment, error)
    Create(enrollment *model.StudentEnrollment) error
    UpdateStatus(id uint, status string, endDate *time.Time) error
    ExistsByStudentAndYear(studentID, academicYearID uint) (bool, error)
}
```

#### Service

- [ ] `service/student_enrollment_service.go`

```go
type StudentEnrollmentService interface {
    GetByStudentID(studentID uint, params dto.EnrollmentQueryParams) ([]dto.EnrollmentDetailResponse, error)
    GetStudentsByClassGroup(classGroupID uint) ([]dto.StudentListResponse, error)
}
```

> Pembuatan enrollment dilakukan via `academic_event_service` di Batch 4. Di sini service hanya untuk READ.

#### Handler

- [ ] `handler/student_enrollment_handler.go`
  - `GetByStudent` — untuk `GET /students/:id/enrollments`
  - `GetStudentsByClassGroup` — untuk `GET /class-groups/:id/students`

#### Route

- [ ] Register di `main.go`:

```go
// Nested di students
students.GET("/:id/enrollments", enrollmentHandler.GetByStudent,
    roleMiddleware("superadmin", "admin_administrasi", "admin_keuangan"))

// Nested di class-groups
classGroups.GET("/:id/students", enrollmentHandler.GetStudentsByClassGroup,
    roleMiddleware("superadmin", "admin_administrasi", "admin_keuangan"))
```

---

### 2. Effective Days (Hari Efektif)

#### Model

- [ ] `model/effective_day.go`

```go
type EffectiveDay struct {
    model.PrimaryKey
    ClassGroupID   uint `gorm:"not null;index"`
    AcademicYearID uint `gorm:"not null;index"`
    Month          uint `gorm:"not null"` // 1–12
    Year           uint `gorm:"not null"`
    TotalDays      uint `gorm:"not null"`
    TotalMondays   uint `gorm:"not null"`
    CreatedBy      uint `gorm:"not null"`
    CreatedAt      time.Time
    UpdatedAt      time.Time

    ClassGroup   model.ClassGroup   `gorm:"foreignKey:ClassGroupID"`
    AcademicYear model.AcademicYear `gorm:"foreignKey:AcademicYearID"`
    Creator      model.User         `gorm:"foreignKey:CreatedBy"`
}

// UNIQUE constraint: (class_group_id, month, year)
```

#### DTO

- [ ] `dto/effective_day.go`

```go
type UpsertEffectiveDayRequest struct {
    AcademicYearID uint `json:"academic_year_id" validate:"required"`
    Month          uint `json:"month" validate:"required,min=1,max=12"`
    Year           uint `json:"year" validate:"required,min=2020"`
    TotalDays      uint `json:"total_days" validate:"required,min=0,max=31"`
    TotalMondays   uint `json:"total_mondays" validate:"required,min=0,max=5"`
}

type EffectiveDayResponse struct {
    ID           uint   `json:"id"`
    ClassGroupID uint   `json:"class_group_id"`
    Month        uint   `json:"month"`
    Year         uint   `json:"year"`
    TotalDays    uint   `json:"total_days"`
    TotalMondays uint   `json:"total_mondays"`
    CreatedBy    UserBriefResponse `json:"created_by"`
    CreatedAt    string `json:"created_at"`
}

type EffectiveDayQueryParams struct {
    AcademicYearID uint
    Year           uint
}
```

#### Repository

- [ ] `repository/effective_day_repository.go`

```go
type EffectiveDayRepository interface {
    FindByClassGroup(classGroupID uint, params dto.EffectiveDayQueryParams) ([]model.EffectiveDay, error)
    FindByClassGroupMonthYear(classGroupID, month, year uint) (*model.EffectiveDay, error)
    Upsert(ed *model.EffectiveDay) error
    Update(ed *model.EffectiveDay) error
}
```

#### Service

- [ ] `service/effective_day_service.go`

```go
type EffectiveDayService interface {
    GetByClassGroup(classGroupID uint, params dto.EffectiveDayQueryParams) ([]dto.EffectiveDayResponse, error)
    Upsert(classGroupID uint, createdBy uint, req dto.UpsertEffectiveDayRequest) (*dto.EffectiveDayResponse, error)
    Update(classGroupID, edID uint, req dto.UpsertEffectiveDayRequest) (*dto.EffectiveDayResponse, error)
}
```

Logika bisnis `Upsert`:
1. Cek apakah record `(classGroupID, month, year)` sudah ada
2. Jika belum → INSERT; jika sudah → UPDATE
3. Setelah berhasil simpan → **emit event** / panggil invoice service untuk recalculate nominal `monthly_infaq` pada invoice bulanan bulan tersebut (jika invoice sudah ter-generate)

> **Catatan:** Trigger recalculate invoice baru akan aktif penuh setelah Batch 5. Di batch ini, tandai dengan `TODO`:
> ```go
> // TODO(batch-5): trigger recalculate infaq harian di invoice bulan tersebut
> ```

#### Handler

- [ ] `handler/effective_day_handler.go`
  - `List`, `Upsert`, `Update`

#### Route

- [ ] Register di `main.go`:

```go
classGroups.GET("/:id/effective-days", effectiveDayHandler.List,
    roleMiddleware("superadmin", "admin_administrasi"))
classGroups.POST("/:id/effective-days", effectiveDayHandler.Upsert,
    roleMiddleware("superadmin", "admin_administrasi"))
classGroups.PUT("/:id/effective-days/:ed_id", effectiveDayHandler.Update,
    roleMiddleware("superadmin", "admin_administrasi"))
```

---

### 3. Extracurriculars (Master Data)

#### Model

- [ ] `model/extracurricular.go`

```go
type Extracurricular struct {
    model.PrimaryKey
    Name string `gorm:"size:100;not null;uniqueIndex"`
    Type string `gorm:"size:20;not null"` // pasta | calisan | ekskul
    model.BaseModelTimeAt
}
```

#### DTO

- [ ] `dto/extracurricular.go`

```go
type CreateExtracurricularRequest struct {
    Name string `json:"name" validate:"required,max=100"`
    Type string `json:"type" validate:"required,oneof=pasta calisan ekskul"`
}

type ExtracurricularResponse struct {
    ID   uint   `json:"id"`
    Name string `json:"name"`
    Type string `json:"type"`
}

type ExtracurricularQueryParams struct {
    Type string
}
```

#### Repository

- [ ] `repository/extracurricular_repository.go`

```go
type ExtracurricularRepository interface {
    FindAll(params dto.ExtracurricularQueryParams) ([]model.Extracurricular, error)
    FindByID(id uint) (*model.Extracurricular, error)
    Create(ex *model.Extracurricular) error
    Update(ex *model.Extracurricular) error
    Delete(id uint) error
    IsUsedByStudents(id uint) (bool, error)
}
```

#### Service

- [ ] `service/extracurricular_service.go`

```go
type ExtracurricularService interface {
    GetAll(params dto.ExtracurricularQueryParams) ([]dto.ExtracurricularResponse, error)
    Create(req dto.CreateExtracurricularRequest) (*dto.ExtracurricularResponse, error)
    Update(id uint, req dto.CreateExtracurricularRequest) (*dto.ExtracurricularResponse, error)
    Delete(id uint) error
}
```

Logika bisnis:
- `Delete` → cek `IsUsedByStudents`; jika masih dipakai kembalikan 422

#### Handler

- [ ] `handler/extracurricular_handler.go`
  - `List`, `Create`, `Update`, `Delete`

#### Route

- [ ] Register di `main.go`:

```go
extracurriculars := api.Group("/extracurriculars", jwtMiddleware,
    roleMiddleware("superadmin", "admin_administrasi"))
extracurriculars.GET("", extracurricularHandler.List)
extracurriculars.POST("", extracurricularHandler.Create)
extracurriculars.PUT("/:id", extracurricularHandler.Update)
extracurriculars.DELETE("/:id", extracurricularHandler.Delete)
```

---

### 4. Student Extracurriculars

#### Model

- [ ] `model/student_extracurricular.go`

```go
type StudentExtracurricular struct {
    model.PrimaryKey
    StudentID        uint       `gorm:"not null;index"`
    ExtracurricularID uint      `gorm:"not null;index"`
    AcademicYearID   uint      `gorm:"not null;index"`
    StartDate        time.Time  `gorm:"type:date;not null"`
    EndDate          *time.Time `gorm:"type:date"`
    CreatedAt        time.Time
    UpdatedAt        time.Time

    Student         model.Student         `gorm:"foreignKey:StudentID"`
    Extracurricular model.Extracurricular `gorm:"foreignKey:ExtracurricularID"`
    AcademicYear    model.AcademicYear    `gorm:"foreignKey:AcademicYearID"`
}
```

#### DTO

- [ ] `dto/student_extracurricular.go`

```go
type EnrollExtracurricularRequest struct {
    ExtracurricularID uint   `json:"extracurricular_id" validate:"required"`
    AcademicYearID    uint   `json:"academic_year_id" validate:"required"`
    StartDate         string `json:"start_date" validate:"required,datetime=2006-01-02"`
}

type UpdateStudentExtracurricularRequest struct {
    EndDate string `json:"end_date" validate:"required,datetime=2006-01-02"`
}

type StudentExtracurricularResponse struct {
    ID              uint                    `json:"id"`
    Extracurricular ExtracurricularResponse `json:"extracurricular"`
    StartDate       string                  `json:"start_date"`
    EndDate         *string                 `json:"end_date"`
}

type StudentExtracurricularQueryParams struct {
    AcademicYearID uint
}
```

#### Repository

- [ ] `repository/student_extracurricular_repository.go`

```go
type StudentExtracurricularRepository interface {
    FindByStudentID(studentID uint, params dto.StudentExtracurricularQueryParams) ([]model.StudentExtracurricular, error)
    FindByID(id uint) (*model.StudentExtracurricular, error)
    FindActiveByStudentID(studentID, academicYearID uint) ([]model.StudentExtracurricular, error)
    Create(se *model.StudentExtracurricular) error
    Update(se *model.StudentExtracurricular) error
    Delete(id uint) error
    AlreadyEnrolled(studentID, extracurricularID, academicYearID uint) (bool, error)
}
```

#### Service

- [ ] `service/student_extracurricular_service.go`

```go
type StudentExtracurricularService interface {
    GetByStudentID(studentID uint, params dto.StudentExtracurricularQueryParams) ([]dto.StudentExtracurricularResponse, error)
    Enroll(studentID, createdBy uint, req dto.EnrollExtracurricularRequest) (*dto.StudentExtracurricularResponse, error)
    Update(studentID, seID uint, req dto.UpdateStudentExtracurricularRequest) (*dto.StudentExtracurricularResponse, error)
    Unenroll(studentID, seID uint) error
}
```

Logika bisnis `Enroll`:
1. Cek `AlreadyEnrolled` → jika sudah aktif kembalikan 409
2. INSERT `student_extracurriculars`
3. **TODO(batch-5):** tambahkan item tagihan pasta/calisan/ekskul ke invoice bulanan berikutnya

Logika bisnis `Unenroll`:
1. Soft delete (set `end_date = today`)
2. **TODO(batch-5):** hapus item tagihan dari invoice bulan depan jika belum dibayar

#### Handler

- [ ] `handler/student_extracurricular_handler.go`
  - `GetByStudent`, `Enroll`, `Update`, `Unenroll`

#### Route

- [ ] Register di `main.go`:

```go
students.GET("/:id/extracurriculars", studentExtracurricularHandler.GetByStudent,
    roleMiddleware("superadmin", "admin_administrasi"))
students.POST("/:id/extracurriculars", studentExtracurricularHandler.Enroll,
    roleMiddleware("superadmin", "admin_administrasi"))
students.PUT("/:id/extracurriculars/:se_id", studentExtracurricularHandler.Update,
    roleMiddleware("superadmin", "admin_administrasi"))
students.DELETE("/:id/extracurriculars/:se_id", studentExtracurricularHandler.Unenroll,
    roleMiddleware("superadmin", "admin_administrasi"))
```

---

### 5. Student Academic Events (Read Only)

Endpoint write untuk academic events ada di Batch 4. Di sini hanya implementasi GET.

#### Model

- [ ] `model/student_academic_event.go`

```go
type StudentAcademicEvent struct {
    model.PrimaryKey
    StudentID          uint       `gorm:"not null;index"`
    AcademicYearID     uint       `gorm:"not null;index"`
    FromClassGroupID   *uint      `gorm:"index"`
    ToClassGroupID     *uint      `gorm:"index"`
    EventType          string     `gorm:"size:30;not null"`
    // promotion | retained | graduation | transfer_in |
    // transfer_out | class_change | dropout
    EventDate          time.Time  `gorm:"type:date;not null"`
    Notes              string     `gorm:"type:text"`
    CreatedBy          uint       `gorm:"not null"`
    CreatedAt          time.Time
    UpdatedAt          time.Time

    Student        model.Student      `gorm:"foreignKey:StudentID"`
    AcademicYear   model.AcademicYear `gorm:"foreignKey:AcademicYearID"`
    FromClassGroup *model.ClassGroup  `gorm:"foreignKey:FromClassGroupID"`
    ToClassGroup   *model.ClassGroup  `gorm:"foreignKey:ToClassGroupID"`
    Creator        model.User         `gorm:"foreignKey:CreatedBy"`
}
```

#### DTO

- [ ] `dto/student_academic_event.go`

```go
type AcademicEventResponse struct {
    ID             uint    `json:"id"`
    AcademicYear   AcademicYearBriefResponse  `json:"academic_year"`
    FromClassGroup *ClassGroupBriefResponse   `json:"from_class_group"`
    ToClassGroup   *ClassGroupBriefResponse   `json:"to_class_group"`
    EventType      string  `json:"event_type"`
    EventDate      string  `json:"event_date"`
    Notes          *string `json:"notes"`
    CreatedBy      UserBriefResponse `json:"created_by"`
    CreatedAt      string  `json:"created_at"`
}
```

#### Repository

- [ ] `repository/student_academic_event_repository.go`

```go
type StudentAcademicEventRepository interface {
    FindByStudentID(studentID uint) ([]model.StudentAcademicEvent, error)
    Create(event *model.StudentAcademicEvent) error // dipakai di Batch 4
}
```

#### Handler

- [ ] Tambahkan `GetAcademicEvents` ke `handler/student_enrollment_handler.go` atau buat file terpisah

#### Route

- [ ] Register di `main.go`:

```go
students.GET("/:id/academic-events", academicEventHandler.GetByStudent,
    roleMiddleware("superadmin", "admin_administrasi"))
```

---

### 6. Daycare Enrollments

#### Model

- [ ] `model/daycare_enrollment.go`

```go
type DaycareEnrollment struct {
    model.PrimaryKey
    StudentID      uint       `gorm:"not null;index"`
    AcademicYearID uint       `gorm:"not null;index"`
    PackageType    string     `gorm:"size:30;not null"`
    // monthly_kb | monthly_tk | monthly_package_kb |
    // monthly_package_tk | daily
    StartDate      time.Time  `gorm:"type:date;not null"`
    EndDate        *time.Time `gorm:"type:date"`
    Status         string     `gorm:"size:20;not null;default:active"` // active | inactive
    CreatedBy      uint       `gorm:"not null"`
    CreatedAt      time.Time
    UpdatedAt      time.Time

    Student      model.Student      `gorm:"foreignKey:StudentID"`
    AcademicYear model.AcademicYear `gorm:"foreignKey:AcademicYearID"`
    Creator      model.User         `gorm:"foreignKey:CreatedBy"`
}
```

#### DTO

- [ ] `dto/daycare_enrollment.go`

```go
type CreateDaycareEnrollmentRequest struct {
    StudentID      uint   `json:"student_id" validate:"required"`
    AcademicYearID uint   `json:"academic_year_id" validate:"required"`
    PackageType    string `json:"package_type" validate:"required,oneof=monthly_kb monthly_tk monthly_package_kb monthly_package_tk daily"`
    StartDate      string `json:"start_date" validate:"required,datetime=2006-01-02"`
}

type UpdateDaycareStatusRequest struct {
    Status  string `json:"status" validate:"required,oneof=active inactive"`
    EndDate string `json:"end_date" validate:"required_if=Status inactive,omitempty,datetime=2006-01-02"`
}

type DaycareEnrollmentResponse struct {
    ID           uint   `json:"id"`
    Student      StudentBriefResponse      `json:"student"`
    AcademicYear AcademicYearBriefResponse `json:"academic_year"`
    PackageType  string `json:"package_type"`
    StartDate    string `json:"start_date"`
    EndDate      *string `json:"end_date"`
    Status       string `json:"status"`
}

type DaycareEnrollmentQueryParams struct {
    AcademicYearID uint
    Status         string
    Search         string
    Page           int
    Limit          int
}
```

#### Repository

- [ ] `repository/daycare_enrollment_repository.go`

```go
type DaycareEnrollmentRepository interface {
    FindAll(params dto.DaycareEnrollmentQueryParams) ([]model.DaycareEnrollment, int64, error)
    FindByID(id uint) (*model.DaycareEnrollment, error)
    FindActiveByStudentID(studentID, academicYearID uint) (*model.DaycareEnrollment, error)
    Create(de *model.DaycareEnrollment) error
    Update(de *model.DaycareEnrollment) error
    UpdateStatus(id uint, status string, endDate *time.Time) error
}
```

#### Service

- [ ] `service/daycare_enrollment_service.go`

```go
type DaycareEnrollmentService interface {
    GetAll(params dto.DaycareEnrollmentQueryParams) ([]dto.DaycareEnrollmentResponse, *dto.Meta, error)
    GetByID(id uint) (*dto.DaycareEnrollmentResponse, error)
    Create(createdBy uint, req dto.CreateDaycareEnrollmentRequest) (*dto.DaycareEnrollmentResponse, error)
    Update(id uint, req dto.CreateDaycareEnrollmentRequest) (*dto.DaycareEnrollmentResponse, error)
    UpdateStatus(id uint, req dto.UpdateDaycareStatusRequest) error
}
```

Logika bisnis `Create`:
1. Cek `FindActiveByStudentID` — jika siswa sudah punya daycare aktif kembalikan 409
2. INSERT `daycare_enrollments`
3. **TODO(batch-5):** generate tagihan biaya awal daycare (pendaftaran + akomodasi) jika siswa baru pertama kali daycare

#### Handler

- [ ] `handler/daycare_enrollment_handler.go`
  - `List`, `Create`, `Get`, `Update`, `UpdateStatus`

#### Route

- [ ] Register di `main.go`:

```go
daycare := api.Group("/daycare-enrollments", jwtMiddleware,
    roleMiddleware("superadmin", "admin_administrasi"))
daycare.GET("", daycareHandler.List)
daycare.POST("", daycareHandler.Create)
daycare.GET("/:id", daycareHandler.Get)
daycare.PUT("/:id", daycareHandler.Update)
daycare.PATCH("/:id/status", daycareHandler.UpdateStatus)
```

---

### 7. Shared Brief Responses (Tambahan)

Tambahkan ke `dto/shared.go` — dipakai di banyak response batch ini dan berikutnya:

```go
type StudentBriefResponse struct {
    ID       uint   `json:"id"`
    FullName string `json:"full_name"`
    Gender   string `json:"gender"`
    Status   string `json:"status"`
}

type ClassGroupBriefResponse struct {
    ID    uint   `json:"id"`
    Name  string `json:"name"`
    Level string `json:"level"`
}

type AcademicYearBriefResponse struct {
    ID   uint   `json:"id"`
    Name string `json:"name"`
}

type UserBriefResponse struct {
    ID       uint   `json:"id"`
    FullName string `json:"full_name"`
}
```

---

### 8. Auto-Migrate Update

- [ ] Tambahkan model baru ke `config/database.go`:

```go
db.AutoMigrate(
    // ...Batch 1 & 2...
    // Batch 3
    &model.StudentEnrollment{},
    &model.EffectiveDay{},
    &model.Extracurricular{},
    &model.StudentExtracurricular{},
    &model.StudentAcademicEvent{},
    &model.DaycareEnrollment{},
)
```

---

## Catatan Teknis Batch 3

### Unique Constraint EffectiveDay

Tambahkan di migration atau via GORM tag:

```go
// Di model
type EffectiveDay struct {
    ...
}

// Di AutoMigrate atau migration file:
db.Exec(`ALTER TABLE effective_days
    ADD CONSTRAINT uq_effective_days_group_month_year
    UNIQUE (class_group_id, month, year)`)
```

### Upsert Pattern untuk EffectiveDay

```go
// Di repository
func (r *effectiveDayRepo) Upsert(ed *model.EffectiveDay) error {
    return r.db.
        Where(model.EffectiveDay{
            ClassGroupID: ed.ClassGroupID,
            Month:        ed.Month,
            Year:         ed.Year,
        }).
        Assign(model.EffectiveDay{
            TotalDays:    ed.TotalDays,
            TotalMondays: ed.TotalMondays,
            CreatedBy:    ed.CreatedBy,
        }).
        FirstOrCreate(ed).Error
}
```

### Batasan Mutasi ke Intan 1 atau 8

Validasi ini belum diterapkan di batch ini (enrollment belum ada write-nya). Akan divalidasi di Batch 4 saat endpoint `academic-events/transfers` dibuat.

### TODO Markers untuk Batch 5

Di setiap service yang akan menjadi trigger invoice, tambahkan komentar `TODO(batch-5)` agar mudah ditemukan saat implementasi:

```go
// TODO(batch-5): generate initial invoice setelah enrollment baru dibuat
// TODO(batch-5): recalculate infaq harian di invoice bulan tersebut
// TODO(batch-5): tambahkan item pasta ke invoice bulanan berikutnya
```

---

## Acceptance Criteria Batch 3

- [ ] `GET /class-groups/:id/students` → mengembalikan daftar siswa beserta info enrollment aktif di rombel tersebut
- [ ] `POST /class-groups/:id/effective-days` → upsert berhasil; response mengembalikan `200` jika update, konsisten di kedua kasus
- [ ] `PUT /class-groups/:id/effective-days/:ed_id` → update berhasil dan `TODO(batch-5)` tercatat di log
- [ ] `GET /extracurriculars` → filter by `type` berfungsi
- [ ] `DELETE /extracurriculars/:id` → gagal 422 jika masih dipakai siswa
- [ ] `POST /students/:id/extracurriculars` → gagal 409 jika siswa sudah terdaftar di ekstrakurikuler yang sama di tahun ajaran yang sama
- [ ] `GET /students/:id/enrollments` → mengembalikan riwayat enrollment per tahun ajaran; filter `academic_year_id` berfungsi
- [ ] `GET /students/:id/academic-events` → mengembalikan array kosong (belum ada event — diisi di Batch 4)
- [ ] `POST /daycare-enrollments` → gagal 409 jika siswa sudah punya daycare aktif di tahun ajaran yang sama
- [ ] `PATCH /daycare-enrollments/:id/status` → update status ke `inactive` memerlukan `end_date`
- [ ] Admin keuangan hanya bisa akses `GET /class-groups/:id/students` dan `GET /students/:id/enrollments`
