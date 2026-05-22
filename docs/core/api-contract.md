# API Contract: Alizzah Manajemen

> Berdasarkan: `erd.md`

---

## Base URL

```
/api/v1
```

## Authentication

Semua endpoint (kecuali login) memerlukan JWT Bearer token:

```
Authorization: Bearer <token>
```

## Response Format

```jsonc
// Success
{ "message": "Deskripsi sukses", "data": { ... } }

// Success list
{ "message": "Data retrieved successfully", "data": [...], "meta": { "page": 1, "limit": 20, "total": 100 } }

// Error
{ "message": "Pesan error yang jelas" }
```

## HTTP Status Codes

| Code | Keterangan |
|------|------------|
| 200 | OK |
| 201 | Created |
| 400 | Bad Request — validasi gagal |
| 401 | Unauthorized — token invalid/expired |
| 403 | Forbidden — role tidak punya akses |
| 404 | Not Found |
| 409 | Conflict — duplikasi data |
| 422 | Unprocessable Entity — logika bisnis gagal |
| 500 | Internal Server Error |

## Role Akses

| Role | Kode |
|---|---|
| Superadmin | `superadmin` |
| Admin Administrasi | `admin_administrasi` |
| Admin Keuangan | `admin_keuangan` |
| Kepala Sekolah | `kepala_sekolah` |
| Yayasan | `yayasan` |

---

## Ringkasan Endpoint

| Domain | Endpoint | Method | Role |
|--------|----------|--------|------|
| Auth | `/auth/login` | POST | Public |
| Auth | `/auth/logout` | POST | All |
| Auth | `/auth/me` | GET | All |
| Users | `/users` | GET, POST | superadmin |
| Users | `/users/:id` | GET, PUT, DELETE | superadmin |
| Academic Years | `/academic-years` | GET, POST | superadmin, admin_administrasi |
| Academic Years | `/academic-years/:id` | GET, PUT | superadmin, admin_administrasi |
| Academic Years | `/academic-years/:id/activate` | PATCH | superadmin |
| Students | `/students` | GET, POST | superadmin, admin_administrasi |
| Students | `/students/import` | POST | superadmin, admin_administrasi |
| Students | `/students/:id` | GET, PUT, DELETE | superadmin, admin_administrasi |
| Students | `/students/:id/enrollments` | GET | superadmin, admin_administrasi, admin_keuangan |
| Students | `/students/:id/extracurriculars` | GET, POST | superadmin, admin_administrasi |
| Students | `/students/:id/extracurriculars/:se_id` | PUT, DELETE | superadmin, admin_administrasi |
| Students | `/students/:id/guardians` | GET, POST | superadmin, admin_administrasi |
| Students | `/students/:id/guardians/:gid` | DELETE | superadmin, admin_administrasi |
| Students | `/students/:id/guardians/:gid/primary` | PATCH | superadmin, admin_administrasi |
| Students | `/students/:id/invoices` | GET | superadmin, admin_keuangan |
| Students | `/students/:id/payments` | GET | superadmin, admin_keuangan |
| Students | `/students/:id/savings` | GET | superadmin, admin_keuangan |
| Students | `/students/:id/savings/transactions` | GET | superadmin, admin_keuangan |
| Students | `/students/:id/savings/withdrawals` | POST | superadmin, admin_keuangan |
| Students | `/students/:id/academic-events` | GET | superadmin, admin_administrasi |
| Guardians | `/guardians` | POST | superadmin, admin_administrasi |
| Guardians | `/guardians/:id` | GET, PUT | superadmin, admin_administrasi |
| Class Groups | `/class-groups` | GET, POST | superadmin, admin_administrasi |
| Class Groups | `/class-groups/:id` | GET, PUT, DELETE | superadmin, admin_administrasi |
| Class Groups | `/class-groups/:id/students` | GET | superadmin, admin_administrasi, admin_keuangan |
| Class Groups | `/class-groups/:id/effective-days` | GET, POST | superadmin, admin_administrasi |
| Class Groups | `/class-groups/:id/effective-days/:ed_id` | PUT | superadmin, admin_administrasi |
| Extracurriculars | `/extracurriculars` | GET, POST | superadmin, admin_administrasi |
| Extracurriculars | `/extracurriculars/:id` | PUT, DELETE | superadmin, admin_administrasi |
| Daycare | `/daycare-enrollments` | GET, POST | superadmin, admin_administrasi |
| Daycare | `/daycare-enrollments/:id` | GET, PUT | superadmin, admin_administrasi |
| Daycare | `/daycare-enrollments/:id/status` | PATCH | superadmin, admin_administrasi |
| Academic Events | `/academic-events/promotions` | POST | superadmin, admin_administrasi |
| Academic Events | `/academic-events/graduations` | POST | superadmin, admin_administrasi |
| Academic Events | `/academic-events/class-changes` | POST | superadmin, admin_administrasi |
| Academic Events | `/academic-events/transfers` | POST | superadmin, admin_administrasi |
| Academic Events | `/academic-events/withdrawals` | POST | superadmin, admin_administrasi |
| Fee Configs | `/fee-configs` | GET, POST | superadmin |
| Fee Configs | `/fee-configs/:id` | GET, PUT | superadmin |
| Fee Configs | `/fee-configs/:id/items` | GET, POST | superadmin |
| Fee Configs | `/fee-configs/:id/items/:item_id` | PUT, DELETE | superadmin |
| Invoices | `/invoices` | GET | superadmin, admin_keuangan |
| Invoices | `/invoices/:id` | GET | superadmin, admin_keuangan |
| Invoices | `/invoices/:id/items` | POST | superadmin, admin_keuangan |
| Invoices | `/invoices/:id/items/:item_id` | PUT, DELETE | superadmin, admin_keuangan |
| Invoices | `/invoices/:id/installments` | GET, POST | superadmin, admin_keuangan |
| Invoices | `/invoices/:id/installments/:inst_id` | PUT, DELETE | superadmin, admin_keuangan |
| Payments | `/payments` | GET, POST | superadmin, admin_keuangan |
| Payments | `/payments/:id` | GET | superadmin, admin_keuangan |
| Expense Categories | `/expense-categories` | GET, POST | superadmin, admin_keuangan |
| Expense Categories | `/expense-categories/:id` | PUT, DELETE | superadmin |
| Expenses | `/expenses` | GET, POST | superadmin, admin_keuangan |
| Expenses | `/expenses/:id` | GET, PUT, DELETE | superadmin, admin_keuangan |
| Cash | `/cash/balance` | GET | superadmin, admin_keuangan, kepala_sekolah |
| Cash | `/cash/transactions` | GET | superadmin, admin_keuangan, kepala_sekolah |
| Cash | `/cash/transfers` | POST | superadmin, admin_keuangan |
| Vault | `/vault/balance` | GET | superadmin, admin_keuangan, kepala_sekolah |
| Vault | `/vault/transactions` | GET | superadmin, admin_keuangan, kepala_sekolah |
| Daily Closings | `/daily-closings` | GET, POST | superadmin, admin_keuangan |
| Daily Closings | `/daily-closings/:id` | GET | superadmin, admin_keuangan, kepala_sekolah, yayasan |
| Daily Closings | `/daily-closings/:id/confirm` | PATCH | superadmin, admin_keuangan |
| Reports | `/reports/daily` | GET | superadmin, admin_keuangan, kepala_sekolah |
| Reports | `/reports/monthly` | GET | superadmin, admin_keuangan, kepala_sekolah |
| Reports | `/reports/annual` | GET | superadmin, admin_keuangan, kepala_sekolah, yayasan |
| Reports | `/reports/students/:id` | GET | superadmin, admin_keuangan |
| Reports | `/reports/class-groups/:id` | GET | superadmin, admin_keuangan, kepala_sekolah |

---

## 1. Auth

### Login
```
POST /api/v1/auth/login
```

Public — tidak memerlukan token.

Request Body:
```json
{
  "email": "admin@alizzah.sch.id",
  "password": "secret123"
}
```

Validation:
| Field | Rules |
|---|---|
| email | required, email |
| password | required, min=6 |

Response `200 OK`:
```json
{
  "message": "Login berhasil",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": 1,
      "full_name": "Admin Keuangan",
      "email": "admin@alizzah.sch.id",
      "role": "admin_keuangan"
    }
  }
}
```

---

### Logout
```
POST /api/v1/auth/logout
```

Response `200 OK`:
```json
{ "message": "Logout berhasil" }
```

---

### Get Current User
```
GET /api/v1/auth/me
```

Response `200 OK`:
```json
{
  "message": "Data retrieved successfully",
  "data": {
    "id": 1,
    "full_name": "Admin Keuangan",
    "email": "admin@alizzah.sch.id",
    "role": "admin_keuangan",
    "created_at": "2025-07-01T00:00:00Z"
  }
}
```

---

## 2. Users

> Role yang diizinkan: `superadmin`

### List Users
```
GET /api/v1/users
```

Query Parameters:
| Param | Type | Keterangan |
|---|---|---|
| page | int | Default 1 |
| limit | int | Default 20 |
| role | string | Filter by role |
| search | string | Cari nama atau email |

Response `200 OK`:
```json
{
  "message": "Data retrieved successfully",
  "data": [
    {
      "id": 1,
      "full_name": "Admin Keuangan",
      "email": "admin@alizzah.sch.id",
      "role": "admin_keuangan",
      "created_at": "2025-07-01T00:00:00Z"
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 5 }
}
```

---

### Create User
```
POST /api/v1/users
```

Request Body:
```json
{
  "full_name": "Admin Baru",
  "email": "adminbaru@alizzah.sch.id",
  "password": "password123",
  "role": "admin_keuangan"
}
```

Validation:
| Field | Rules |
|---|---|
| full_name | required, min=3, max=100 |
| email | required, email, unique |
| password | required, min=8 |
| role | required, oneof=superadmin admin_administrasi admin_keuangan kepala_sekolah yayasan |

Response `201 Created`:
```json
{
  "message": "User berhasil dibuat",
  "data": { "id": 2, "full_name": "Admin Baru", "email": "adminbaru@alizzah.sch.id", "role": "admin_keuangan" }
}
```

---

### Get User
```
GET /api/v1/users/:id
```

Response `200 OK`: objek user.

---

### Update User
```
PUT /api/v1/users/:id
```

Request Body: sama dengan Create, seluruh field required (PUT = replace).
Password boleh dikosongkan jika tidak ingin diubah — jika kosong, password lama dipertahankan.

Response `200 OK`: objek user yang diupdate.

---

### Delete User
```
DELETE /api/v1/users/:id
```

Response `200 OK`:
```json
{ "message": "User berhasil dihapus" }
```

---

## 3. Academic Years

> Role: `superadmin`, `admin_administrasi` (kecuali activate hanya `superadmin`)

### List Academic Years
```
GET /api/v1/academic-years
```

Response `200 OK`:
```json
{
  "message": "Data retrieved successfully",
  "data": [
    {
      "id": 1,
      "name": "2025/2026",
      "start_date": "2025-07-14",
      "end_date": "2026-06-30",
      "is_active": true,
      "created_at": "2025-07-01T00:00:00Z"
    }
  ]
}
```

---

### Create Academic Year
```
POST /api/v1/academic-years
```

Request Body:
```json
{
  "name": "2025/2026",
  "start_date": "2025-07-14",
  "end_date": "2026-06-30"
}
```

Validation:
| Field | Rules |
|---|---|
| name | required, max=20, unique |
| start_date | required, date |
| end_date | required, date, gt=start_date |

Response `201 Created`: objek academic year.

---

### Get Academic Year
```
GET /api/v1/academic-years/:id
```

Response `200 OK`: objek academic year.

---

### Update Academic Year
```
PUT /api/v1/academic-years/:id
```

Request Body: sama dengan Create.

> Tidak dapat mengubah tahun ajaran yang sedang aktif dan sudah memiliki data tagihan.

Response `200 OK`: objek academic year yang diupdate.

---

### Activate Academic Year
```
PATCH /api/v1/academic-years/:id/activate
```

> Hanya `superadmin`. Menonaktifkan tahun ajaran yang sedang aktif dan mengaktifkan yang baru.

Response `200 OK`:
```json
{ "message": "Tahun ajaran 2025/2026 berhasil diaktifkan" }
```

---

## 4. Students

> Role: `superadmin`, `admin_administrasi`. Admin keuangan hanya dapat GET.

### List Students
```
GET /api/v1/students
```

Query Parameters:
| Param | Type | Keterangan |
|---|---|---|
| page | int | Default 1 |
| limit | int | Default 20 |
| search | string | Cari nama siswa |
| status | string | Filter: active, graduated, transferred, dropped |
| class_group_id | int | Filter by rombel |
| academic_year_id | int | Filter by tahun ajaran (default aktif) |
| is_daycare_only | bool | Filter siswa daycare only |

Response `200 OK`:
```json
{
  "message": "Data retrieved successfully",
  "data": [
    {
      "id": 1,
      "full_name": "Ahmad Fauzan",
      "gender": "L",
      "birth_date": "2020-03-15",
      "status": "active",
      "is_daycare_only": false,
      "current_enrollment": {
        "class_group_id": 3,
        "class_group_name": "Intan 1",
        "level": "intan"
      }
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 85 }
}
```

---

### Create Student
```
POST /api/v1/students
```

Request Body:
```json
{
  "full_name": "Ahmad Fauzan",
  "birth_place": "Surabaya",
  "birth_date": "2020-03-15",
  "gender": "L",
  "religion": "Islam",
  "is_daycare_only": false,
  "guardians": [
    {
      "full_name": "Budi Santoso",
      "relationship": "ayah",
      "phone": "08123456789",
      "address": "Jl. Raya No. 1, Surabaya",
      "is_primary": true
    }
  ]
}
```

Validation:
| Field | Rules |
|---|---|
| full_name | required, min=3, max=100 |
| birth_place | required, max=100 |
| birth_date | required, date |
| gender | required, oneof=L P |
| religion | optional, max=30 |
| is_daycare_only | optional, bool |
| guardians | optional, array, min=1 |
| guardians[].full_name | required, max=100 |
| guardians[].relationship | required, oneof=ayah ibu wali |
| guardians[].phone | required, max=20 |
| guardians[].is_primary | required, bool |

Response `201 Created`:
```json
{
  "message": "Data siswa berhasil dibuat",
  "data": {
    "id": 10,
    "full_name": "Ahmad Fauzan",
    "gender": "L",
    "birth_date": "2020-03-15",
    "birth_place": "Surabaya",
    "religion": "Islam",
    "status": "active",
    "is_daycare_only": false,
    "created_at": "2025-07-14T08:00:00Z"
  }
}
```

---

### Import Students
```
POST /api/v1/students/import
```

Content-Type: `multipart/form-data`

Form Fields:
| Field | Type | Keterangan |
|---|---|---|
| file | file | File SQL atau CSV sesuai format yang disepakati |

Response `200 OK`:
```json
{
  "message": "Import selesai",
  "data": {
    "total": 85,
    "success": 83,
    "failed": 2,
    "errors": [
      { "row": 12, "message": "Nama tidak boleh kosong" },
      { "row": 47, "message": "Format tanggal lahir tidak valid" }
    ]
  }
}
```

---

### Get Student
```
GET /api/v1/students/:id
```

Response `200 OK`:
```json
{
  "message": "Data retrieved successfully",
  "data": {
    "id": 1,
    "full_name": "Ahmad Fauzan",
    "gender": "L",
    "birth_place": "Surabaya",
    "birth_date": "2020-03-15",
    "religion": "Islam",
    "photo_url": null,
    "status": "active",
    "is_daycare_only": false,
    "guardians": [
      {
        "id": 5,
        "full_name": "Budi Santoso",
        "relationship": "ayah",
        "phone": "08123456789",
        "is_primary": true
      }
    ],
    "current_enrollment": {
      "id": 12,
      "class_group_id": 3,
      "class_group_name": "Intan 1",
      "level": "intan",
      "academic_year_id": 1,
      "academic_year_name": "2025/2026",
      "start_date": "2025-07-14",
      "status": "active"
    },
    "financial_summary": {
      "total_unpaid": 450000,
      "savings_general_balance": 150000,
      "savings_mandatory_balance": 80000
    },
    "created_at": "2025-07-14T08:00:00Z"
  }
}
```

---

### Update Student
```
PUT /api/v1/students/:id
```

Request Body: sama dengan Create (tanpa `guardians` — dikelola via endpoint terpisah).

Response `200 OK`: objek student.

---

### Delete Student (Soft Delete)
```
DELETE /api/v1/students/:id
```

> Hanya bisa dihapus jika belum punya enrollment aktif.

Response `200 OK`:
```json
{ "message": "Data siswa berhasil dihapus" }
```

---

### Get Student Enrollments
```
GET /api/v1/students/:id/enrollments
```

Query Parameters:
| Param | Type | Keterangan |
|---|---|---|
| academic_year_id | int | Filter by tahun ajaran |

Response `200 OK`:
```json
{
  "message": "Data retrieved successfully",
  "data": [
    {
      "id": 12,
      "academic_year": { "id": 1, "name": "2025/2026" },
      "class_group": { "id": 3, "name": "Intan 1", "level": "intan" },
      "start_date": "2025-07-14",
      "end_date": null,
      "status": "active",
      "enrollment_type": "new",
      "notes": null
    }
  ]
}
```

---

### Get Student Academic Events
```
GET /api/v1/students/:id/academic-events
```

Response `200 OK`: array riwayat event akademik siswa.

---

### Get Student Guardians
```
GET /api/v1/students/:id/guardians
```

Response `200 OK`: array guardian yang terhubung ke siswa.

---

### Link Guardian to Student
```
POST /api/v1/students/:id/guardians
```

Request Body:
```json
{
  "guardian_id": 5,
  "is_primary": false
}
```

> Gunakan endpoint ini untuk menghubungkan guardian yang sudah ada ke siswa lain (wali murid dengan lebih dari satu anak).

Response `201 Created`:
```json
{ "message": "Wali murid berhasil ditautkan ke siswa" }
```

---

### Unlink Guardian from Student
```
DELETE /api/v1/students/:id/guardians/:guardian_id
```

Response `200 OK`:
```json
{ "message": "Wali murid berhasil dilepas dari siswa" }
```

---

### Set Primary Guardian
```
PATCH /api/v1/students/:id/guardians/:guardian_id/primary
```

Response `200 OK`:
```json
{ "message": "Wali murid utama berhasil diperbarui" }
```

---

## 5. Guardians

### Create Guardian
```
POST /api/v1/guardians
```

Request Body:
```json
{
  "full_name": "Siti Aminah",
  "relationship": "ibu",
  "phone": "08198765432",
  "address": "Jl. Mawar No. 5, Surabaya"
}
```

Response `201 Created`: objek guardian.

---

### Get Guardian
```
GET /api/v1/guardians/:id
```

Response `200 OK`: objek guardian beserta daftar siswa yang terhubung.

---

### Update Guardian
```
PUT /api/v1/guardians/:id
```

Response `200 OK`: objek guardian.

---

## 6. Class Groups (Rombel)

### List Class Groups
```
GET /api/v1/class-groups
```

Query Parameters:
| Param | Type | Keterangan |
|---|---|---|
| academic_year_id | int | Default: tahun ajaran aktif |
| level | string | Filter: mutiara, intan, berlian |

Response `200 OK`:
```json
{
  "message": "Data retrieved successfully",
  "data": [
    {
      "id": 3,
      "academic_year_id": 1,
      "name": "Intan 1",
      "level": "intan",
      "schedule": {
        "weekdays": {
          "days": ["Senin", "Selasa", "Rabu", "Kamis"],
          "time_in": "07:15",
          "time_out": "10:00",
          "time_out_calisan": "10:30"
        },
        "weekend": {
          "days": ["Jumat", "Sabtu"],
          "time_in": "07:15",
          "time_out": "09:00",
          "time_out_calisan": null
        }
      },
      "student_count": 15
    }
  ]
}
```

---

### Create Class Group
```
POST /api/v1/class-groups
```

Request Body:
```json
{
  "academic_year_id": 1,
  "name": "Intan 1",
  "level": "intan",
  "schedule": {
    "weekdays": {
      "days": ["Senin", "Selasa", "Rabu", "Kamis"],
      "time_in": "07:15",
      "time_out": "10:00",
      "time_out_calisan": "10:30"
    },
    "weekend": {
      "days": ["Jumat", "Sabtu"],
      "time_in": "07:15",
      "time_out": "09:00",
      "time_out_calisan": null
    }
  }
}
```

Validation:
| Field | Rules |
|---|---|
| academic_year_id | required, exists:academic_years |
| name | required, max=50 |
| level | required, oneof=mutiara intan berlian |
| schedule | required, valid JSON structure |

Response `201 Created`: objek class group.

---

### Get Class Group
```
GET /api/v1/class-groups/:id
```

Response `200 OK`: objek class group.

---

### Update Class Group
```
PUT /api/v1/class-groups/:id
```

Response `200 OK`: objek class group.

---

### Delete Class Group
```
DELETE /api/v1/class-groups/:id
```

> Hanya bisa dihapus jika tidak punya siswa aktif.

Response `200 OK`:
```json
{ "message": "Rombel berhasil dihapus" }
```

---

### Get Students in Class Group
```
GET /api/v1/class-groups/:id/students
```

Response `200 OK`: array siswa beserta info enrollment.

---

## 7. Effective Days (Hari Efektif)

### List Effective Days
```
GET /api/v1/class-groups/:id/effective-days
```

Query Parameters:
| Param | Type | Keterangan |
|---|---|---|
| academic_year_id | int | Default: tahun ajaran aktif |
| year | int | Filter by tahun |

Response `200 OK`:
```json
{
  "message": "Data retrieved successfully",
  "data": [
    {
      "id": 1,
      "class_group_id": 3,
      "month": 7,
      "year": 2025,
      "total_days": 20,
      "total_mondays": 4,
      "created_by": { "id": 2, "full_name": "Admin Administrasi" },
      "created_at": "2025-07-01T00:00:00Z"
    }
  ]
}
```

---

### Create or Update Effective Days
```
POST /api/v1/class-groups/:id/effective-days
```

Request Body:
```json
{
  "academic_year_id": 1,
  "month": 7,
  "year": 2025,
  "total_days": 20,
  "total_mondays": 4
}
```

Validation:
| Field | Rules |
|---|---|
| academic_year_id | required, exists:academic_years |
| month | required, min=1, max=12 |
| year | required, min=2020 |
| total_days | required, min=0, max=31 |
| total_mondays | required, min=0, max=5 |

> Jika record untuk `(class_group_id, month, year)` sudah ada, data akan di-update (upsert). Setelah berhasil disimpan, sistem otomatis me-recalculate nominal item infaq harian pada invoice bulanan bulan tersebut.

Response `200 OK`:
```json
{
  "message": "Hari efektif berhasil disimpan",
  "data": {
    "id": 1,
    "month": 7,
    "year": 2025,
    "total_days": 20,
    "total_mondays": 4
  }
}
```

---

## 8. Extracurriculars (Master Data)

### List Extracurriculars
```
GET /api/v1/extracurriculars
```

Query Parameters:
| Param | Type | Keterangan |
|---|---|---|
| type | string | Filter: pasta, calisan, ekskul |

Response `200 OK`:
```json
{
  "message": "Data retrieved successfully",
  "data": [
    { "id": 1, "name": "Robotika", "type": "pasta" },
    { "id": 2, "name": "Taekwondo", "type": "pasta" },
    { "id": 3, "name": "Calisan KB", "type": "calisan" },
    { "id": 4, "name": "Aslin", "type": "ekskul" }
  ]
}
```

---

### Create Extracurricular
```
POST /api/v1/extracurriculars
```

Request Body:
```json
{ "name": "Melukis", "type": "pasta" }
```

Validation:
| Field | Rules |
|---|---|
| name | required, max=100, unique |
| type | required, oneof=pasta calisan ekskul |

Response `201 Created`: objek extracurricular.

---

### Update Extracurricular
```
PUT /api/v1/extracurriculars/:id
```

Response `200 OK`: objek extracurricular.

---

### Delete Extracurricular
```
DELETE /api/v1/extracurriculars/:id
```

Response `200 OK`:
```json
{ "message": "Ekstrakurikuler berhasil dihapus" }
```

---

## 9. Student Extracurriculars

### Get Student Extracurriculars
```
GET /api/v1/students/:id/extracurriculars
```

Query Parameters:
| Param | Type | Keterangan |
|---|---|---|
| academic_year_id | int | Default: tahun ajaran aktif |

Response `200 OK`:
```json
{
  "data": [
    {
      "id": 1,
      "extracurricular": { "id": 1, "name": "Robotika", "type": "pasta" },
      "start_date": "2025-07-14",
      "end_date": null
    }
  ]
}
```

---

### Enroll Student to Extracurricular
```
POST /api/v1/students/:id/extracurriculars
```

Request Body:
```json
{
  "extracurricular_id": 1,
  "academic_year_id": 1,
  "start_date": "2025-07-14"
}
```

> Setelah berhasil, sistem otomatis menambahkan item tagihan ekstrakurikuler pada invoice bulanan berikutnya.

Response `201 Created`: objek student extracurricular.

---

### Update Student Extracurricular
```
PUT /api/v1/students/:id/extracurriculars/:se_id
```

Request Body:
```json
{ "end_date": "2025-12-31" }
```

Response `200 OK`: objek student extracurricular.

---

### Unenroll Student from Extracurricular
```
DELETE /api/v1/students/:id/extracurriculars/:se_id
```

Response `200 OK`:
```json
{ "message": "Siswa berhasil dikeluarkan dari ekstrakurikuler" }
```

---

## 10. Daycare Enrollments

### List Daycare Enrollments
```
GET /api/v1/daycare-enrollments
```

Query Parameters:
| Param | Type | Keterangan |
|---|---|---|
| academic_year_id | int | Default: aktif |
| status | string | active, inactive |
| search | string | Cari nama siswa |

Response `200 OK`: array daycare enrollment.

---

### Create Daycare Enrollment
```
POST /api/v1/daycare-enrollments
```

Request Body:
```json
{
  "student_id": 10,
  "academic_year_id": 1,
  "package_type": "monthly_tk",
  "start_date": "2025-07-14"
}
```

Validation:
| Field | Rules |
|---|---|
| student_id | required, exists:students |
| academic_year_id | required, exists:academic_years |
| package_type | required, oneof=monthly_kb monthly_tk monthly_package_kb monthly_package_tk daily |
| start_date | required, date |

Response `201 Created`: objek daycare enrollment.

---

### Get Daycare Enrollment
```
GET /api/v1/daycare-enrollments/:id
```

Response `200 OK`: objek daycare enrollment.

---

### Update Daycare Enrollment
```
PUT /api/v1/daycare-enrollments/:id
```

Response `200 OK`: objek daycare enrollment.

---

### Update Daycare Status
```
PATCH /api/v1/daycare-enrollments/:id/status
```

Request Body:
```json
{ "status": "inactive", "end_date": "2025-12-31" }
```

Response `200 OK`:
```json
{ "message": "Status daycare berhasil diperbarui" }
```

---

## 11. Academic Events (Siklus Akademik)

### Kenaikan Kelas (Massal)
```
POST /api/v1/academic-events/promotions
```

> Memproses kenaikan kelas massal dari satu tahun ajaran ke tahun ajaran baru.

Request Body:
```json
{
  "from_academic_year_id": 1,
  "to_academic_year_id": 2,
  "event_date": "2026-07-01",
  "retained_student_ids": [5, 12],
  "notes": "Kenaikan kelas TA 2025/2026"
}
```

Validation:
| Field | Rules |
|---|---|
| from_academic_year_id | required, exists:academic_years |
| to_academic_year_id | required, exists:academic_years, different from from_academic_year_id |
| event_date | required, date |
| retained_student_ids | optional, array of student ids |

Proses yang terjadi di backend:
1. Seluruh siswa aktif jenjang Mutiara → naik ke Intan (kecuali yang ada di `retained_student_ids`)
2. Seluruh siswa aktif jenjang Intan → naik ke Berlian
3. Siswa di `retained_student_ids` tetap di jenjang yang sama
4. Log event di `student_academic_events` untuk setiap siswa
5. Generate tagihan registrasi tahunan untuk tahun ajaran baru

Response `200 OK`:
```json
{
  "message": "Proses kenaikan kelas selesai",
  "data": {
    "promoted": 75,
    "retained": 2,
    "errors": []
  }
}
```

---

### Kelulusan
```
POST /api/v1/academic-events/graduations
```

Request Body:
```json
{
  "student_ids": [1, 2, 3],
  "academic_year_id": 1,
  "event_date": "2026-06-15",
  "notes": "Wisuda angkatan 2026"
}
```

Validation:
| Field | Rules |
|---|---|
| student_ids | required, array, min=1, exists:students (hanya jenjang berlian) |
| academic_year_id | required, exists:academic_years |
| event_date | required, date |

Proses yang terjadi di backend per siswa:
1. Generate invoice type `graduation`
2. Alokasi saldo `student_savings.mandatory` ke `invoice_items` graduation secara otomatis
3. Jika sisa tabungan wajib > tagihan wisuda → buat `savings_transactions` credit ke tabungan `general`
4. Jika sisa tabungan wajib < tagihan wisuda → sisa tercatat sebagai hutang invoice
5. Update `student_enrollments.status` → `completed`
6. Update `students.status` → `graduated`
7. Log event di `student_academic_events`

Response `200 OK`:
```json
{
  "message": "Proses kelulusan selesai",
  "data": {
    "total": 3,
    "results": [
      {
        "student_id": 1,
        "student_name": "Ahmad Fauzan",
        "graduation_invoice_id": 101,
        "graduation_amount": 500000,
        "mandatory_savings_used": 480000,
        "remaining_debt": 20000,
        "surplus_returned_to_general": 0
      }
    ]
  }
}
```

---

### Pindah Rombel
```
POST /api/v1/academic-events/class-changes
```

Request Body:
```json
{
  "student_id": 10,
  "from_class_group_id": 3,
  "to_class_group_id": 5,
  "event_date": "2025-09-01",
  "notes": "Permintaan orang tua"
}
```

Proses: update enrollment aktif, log event. Tidak ada efek ke tagihan.

Response `200 OK`:
```json
{ "message": "Siswa berhasil dipindahkan ke rombel Intan 3" }
```

---

### Mutasi Masuk dari Sekolah Luar
```
POST /api/v1/academic-events/transfers
```

Request Body:
```json
{
  "student_id": 15,
  "to_class_group_id": 3,
  "academic_year_id": 1,
  "start_date": "2025-09-01",
  "notes": "Mutasi dari TK Al-Hikmah Sidoarjo"
}
```

Validation:
| Field | Rules |
|---|---|
| student_id | required, exists:students |
| to_class_group_id | required, exists:class_groups (hanya level intan, hanya id 1 atau 8) |
| academic_year_id | required, exists:academic_years |
| start_date | required, date |

Proses: buat enrollment baru dengan `enrollment_type=mutation`, generate tagihan mulai bulan `start_date`.

Response `201 Created`:
```json
{ "message": "Siswa mutasi berhasil didaftarkan" }
```

---

### Keluar / Pindah Sekolah
```
POST /api/v1/academic-events/withdrawals
```

Request Body:
```json
{
  "student_id": 10,
  "event_date": "2025-10-01",
  "event_type": "transfer_out",
  "notes": "Pindah ke TK lain"
}
```

Validation:
| Field | Rules |
|---|---|
| student_id | required, exists:students |
| event_date | required, date |
| event_type | required, oneof=transfer_out dropout |
| notes | optional |

Proses: tutup enrollment aktif, update `students.status`, bekukan invoice aktif yang belum lunas.

Response `200 OK`:
```json
{ "message": "Status siswa berhasil diperbarui menjadi keluar" }
```

---

## 12. Fee Configs (Konfigurasi Tarif)

> Role: `superadmin` saja.

### List Fee Configs
```
GET /api/v1/fee-configs
```

Response `200 OK`: array fee config beserta `academic_year`.

---

### Create Fee Config
```
POST /api/v1/fee-configs
```

Request Body:
```json
{
  "academic_year_id": 1,
  "savings_admin_rate": 2.50
}
```

Validation:
| Field | Rules |
|---|---|
| academic_year_id | required, exists:academic_years, unique |
| savings_admin_rate | required, min=0, max=100 |

Response `201 Created`: objek fee config.

---

### Get Fee Config
```
GET /api/v1/fee-configs/:id
```

Response `200 OK`: objek fee config beserta semua items.

---

### Update Fee Config
```
PUT /api/v1/fee-configs/:id
```

Request Body:
```json
{ "savings_admin_rate": 3.00 }
```

Response `200 OK`: objek fee config.

---

### List Fee Config Items
```
GET /api/v1/fee-configs/:id/items
```

Query Parameters: `category`, `level`, `gender`.

Response `200 OK`:
```json
{
  "data": [
    {
      "id": 1,
      "category": "monthly_spp",
      "item_key": "spp_kb",
      "name": "SPP KB",
      "level": "mutiara",
      "gender": "all",
      "amount": 150000,
      "unit": "fixed"
    },
    {
      "id": 2,
      "category": "monthly_infaq",
      "item_key": "infaq_harian",
      "name": "Infaq Harian",
      "level": "all",
      "gender": "all",
      "amount": 7000,
      "unit": "per_day"
    }
  ]
}
```

---

### Create Fee Config Item
```
POST /api/v1/fee-configs/:id/items
```

Request Body:
```json
{
  "category": "pasta",
  "item_key": "pasta_robotika",
  "name": "Pasta Robotika",
  "level": "intan",
  "gender": "all",
  "amount": 100000,
  "unit": "fixed"
}
```

Validation:
| Field | Rules |
|---|---|
| category | required, oneof=initial registration monthly_spp monthly_infaq pasta calisan ekskul savings_mandatory daycare graduation |
| item_key | required, max=50, unique dalam fee_config |
| name | required, max=100 |
| level | required, oneof=all mutiara intan berlian |
| gender | required, oneof=all L P |
| amount | required, min=0 |
| unit | required, oneof=fixed per_day per_monday percent |

Response `201 Created`: objek fee config item.

---

### Update Fee Config Item
```
PUT /api/v1/fee-configs/:id/items/:item_id
```

Response `200 OK`: objek fee config item.

---

### Delete Fee Config Item
```
DELETE /api/v1/fee-configs/:id/items/:item_id
```

Response `200 OK`:
```json
{ "message": "Item tarif berhasil dihapus" }
```

---

## 13. Invoices (Tagihan)

### List Invoices
```
GET /api/v1/invoices
```

Query Parameters:
| Param | Type | Keterangan |
|---|---|---|
| student_id | int | Filter by siswa |
| academic_year_id | int | Default: aktif |
| type | string | initial, registration, monthly, graduation |
| status | string | unpaid, partial, paid |
| month | int | Filter bulan (untuk type monthly) |
| year | int | Filter tahun (untuk type monthly) |
| class_group_id | int | Filter by rombel |
| page | int | Default 1 |
| limit | int | Default 20 |

Response `200 OK`:
```json
{
  "data": [
    {
      "id": 1,
      "student": { "id": 1, "full_name": "Ahmad Fauzan" },
      "academic_year": { "id": 1, "name": "2025/2026" },
      "type": "monthly",
      "month": 7,
      "year": 2025,
      "status": "partial",
      "total_amount": 327000,
      "paid_amount": 150000,
      "due_date": null,
      "created_at": "2025-07-01T00:00:00Z"
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 240 }
}
```

---

### Get Invoice Detail
```
GET /api/v1/invoices/:id
```

Response `200 OK`:
```json
{
  "data": {
    "id": 1,
    "student": { "id": 1, "full_name": "Ahmad Fauzan", "class_group_name": "Intan 1" },
    "type": "monthly",
    "month": 7,
    "year": 2025,
    "status": "partial",
    "total_amount": 327000,
    "paid_amount": 150000,
    "items": [
      { "id": 1, "name": "SPP TK", "category": "monthly_spp", "amount": 150000, "paid_amount": 150000, "status": "paid", "is_mandatory": true },
      { "id": 2, "name": "Infaq Harian (20 hari)", "category": "monthly_infaq", "amount": 140000, "paid_amount": 0, "status": "unpaid", "is_mandatory": true },
      { "id": 3, "name": "Pasta Robotika", "category": "pasta", "amount": 100000, "paid_amount": 0, "status": "unpaid", "is_mandatory": true }
    ],
    "installments": [],
    "created_at": "2025-07-01T00:00:00Z"
  }
}
```

---

### Get Student Invoices
```
GET /api/v1/students/:id/invoices
```

Query Parameters: `type`, `status`, `academic_year_id`.

Response `200 OK`: array invoice.

---

### Add Invoice Item (Insidental)
```
POST /api/v1/invoices/:id/items
```

Request Body:
```json
{
  "name": "Biaya Rekreasi Kebun Binatang",
  "category": "incidental",
  "amount": 75000
}
```

Validation:
| Field | Rules |
|---|---|
| name | required, max=100 |
| category | required |
| amount | required, min=1 |

Response `201 Created`: objek invoice item baru.

---

### Update Invoice Item
```
PUT /api/v1/invoices/:id/items/:item_id
```

Request Body:
```json
{ "name": "Infaq Harian (18 hari)", "amount": 126000 }
```

> Hanya item yang belum lunas (`status != paid`) yang bisa diupdate.

Response `200 OK`: objek invoice item.

---

### Delete Invoice Item
```
DELETE /api/v1/invoices/:id/items/:item_id
```

> Hanya item non-mandatory (`is_mandatory = false`) dan belum dibayar yang bisa dihapus.

Response `200 OK`:
```json
{ "message": "Item tagihan berhasil dihapus" }
```

---

## 14. Invoice Installments (Jadwal Cicilan)

### Get Installments
```
GET /api/v1/invoices/:id/installments
```

Response `200 OK`:
```json
{
  "data": [
    { "id": 1, "installment_number": 1, "due_date": "2025-08-01", "amount": 250000, "notes": null },
    { "id": 2, "installment_number": 2, "due_date": "2025-10-01", "amount": 250000, "notes": null },
    { "id": 3, "installment_number": 3, "due_date": "2025-12-01", "amount": 250000, "notes": null }
  ]
}
```

---

### Create Installment Schedule
```
POST /api/v1/invoices/:id/installments
```

Request Body:
```json
{
  "installments": [
    { "installment_number": 1, "due_date": "2025-08-01", "amount": 250000 },
    { "installment_number": 2, "due_date": "2025-10-01", "amount": 250000 },
    { "installment_number": 3, "due_date": "2025-12-01", "amount": 250000 }
  ]
}
```

> Jumlah total `amount` dari semua cicilan tidak harus sama dengan `invoice.total_amount` — ini hanya jadwal referensi, bukan validasi ketat.

Response `201 Created`: array installment.

---

### Update Installment
```
PUT /api/v1/invoices/:id/installments/:inst_id
```

Request Body:
```json
{ "due_date": "2025-09-01", "amount": 275000, "notes": "Denda keterlambatan Rp 25.000" }
```

Response `200 OK`: objek installment.

---

### Delete Installment
```
DELETE /api/v1/invoices/:id/installments/:inst_id
```

Response `200 OK`:
```json
{ "message": "Jadwal cicilan berhasil dihapus" }
```

---

## 15. Payments (Pembayaran)

### List Payments
```
GET /api/v1/payments
```

Query Parameters:
| Param | Type | Keterangan |
|---|---|---|
| student_id | int | Filter by siswa |
| academic_year_id | int | Default: aktif |
| start_date | date | Filter tanggal mulai |
| end_date | date | Filter tanggal selesai |
| source | string | cash, savings |
| page | int | Default 1 |
| limit | int | Default 20 |

Response `200 OK`:
```json
{
  "data": [
    {
      "id": 1,
      "student": { "id": 1, "full_name": "Ahmad Fauzan" },
      "payment_date": "2025-07-20",
      "total_amount": 290000,
      "source": "cash",
      "created_by": { "id": 2, "full_name": "Admin Keuangan" },
      "created_at": "2025-07-20T09:30:00Z"
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 150 }
}
```

---

### Create Payment
```
POST /api/v1/payments
```

Request Body:
```json
{
  "student_id": 1,
  "academic_year_id": 1,
  "payment_date": "2025-07-20",
  "source": "cash",
  "notes": "Pembayaran Juli 2025",
  "items": [
    { "invoice_item_id": 1, "amount": 150000 },
    { "invoice_item_id": 2, "amount": 140000 }
  ],
  "savings_deposit": 50000
}
```

Validation:
| Field | Rules |
|---|---|
| student_id | required, exists:students |
| academic_year_id | required, exists:academic_years |
| payment_date | required, date |
| source | required, oneof=cash savings |
| items | required jika tidak ada savings_deposit, array, min=1 |
| items[].invoice_item_id | required, exists:invoice_items |
| items[].amount | required, min=1, max=(item.amount - item.paid_amount) |
| savings_deposit | optional, min=0 |

> Jika `source=savings`, saldo tabungan umum siswa harus mencukupi `SUM(items[].amount)`. Tabungan umum tidak dikenakan biaya admin saat dipakai untuk bayar tagihan.

Proses di backend:
1. Buat record `payments`
2. Buat record `payment_items` per item
3. Update `invoice_items.paid_amount` dan `status`
4. Update `invoices.paid_amount` dan `status`
5. Jika `source=cash` → buat `cash_transactions` credit
6. Jika `source=savings` → buat `savings_transactions` debit (source_type=`payment_usage`)
7. Jika ada `savings_deposit` → buat `savings_transactions` credit (source_type=`payment_deposit`) + `vault_transactions` credit

Response `201 Created`:
```json
{
  "message": "Pembayaran berhasil dicatat",
  "data": {
    "id": 50,
    "payment_date": "2025-07-20",
    "total_amount": 290000,
    "source": "cash",
    "items": [
      { "invoice_item_id": 1, "invoice_item_name": "SPP TK", "amount": 150000 },
      { "invoice_item_id": 2, "invoice_item_name": "Infaq Harian", "amount": 140000 }
    ],
    "savings_deposit": 50000
  }
}
```

---

### Get Payment Detail
```
GET /api/v1/payments/:id
```

Response `200 OK`:
```json
{
  "data": {
    "id": 50,
    "student": { "id": 1, "full_name": "Ahmad Fauzan", "class_group_name": "Intan 1" },
    "payment_date": "2025-07-20",
    "total_amount": 290000,
    "source": "cash",
    "notes": "Pembayaran Juli 2025",
    "items": [
      { "id": 1, "invoice_item_id": 1, "invoice_item_name": "SPP TK", "amount": 150000 },
      { "id": 2, "invoice_item_id": 2, "invoice_item_name": "Infaq Harian (20 hari)", "amount": 140000 }
    ],
    "created_by": { "id": 2, "full_name": "Admin Keuangan" },
    "created_at": "2025-07-20T09:30:00Z"
  }
}
```

---

### Get Student Payments
```
GET /api/v1/students/:id/payments
```

Query Parameters: `academic_year_id`, `start_date`, `end_date`.

Response `200 OK`: array payment.

---

## 16. Savings (Tabungan)

### Get Student Savings
```
GET /api/v1/students/:id/savings
```

Response `200 OK`:
```json
{
  "data": {
    "general": {
      "id": 1,
      "type": "general",
      "balance": 150000
    },
    "mandatory": {
      "id": 2,
      "type": "mandatory",
      "balance": 80000
    }
  }
}
```

---

### Get Savings Transactions
```
GET /api/v1/students/:id/savings/transactions
```

Query Parameters:
| Param | Type | Keterangan |
|---|---|---|
| type | string | Filter: general, mandatory |
| start_date | date | — |
| end_date | date | — |
| page | int | Default 1 |
| limit | int | Default 20 |

Response `200 OK`:
```json
{
  "data": [
    {
      "id": 1,
      "savings_type": "general",
      "transaction_type": "credit",
      "amount": 50000,
      "admin_fee": 0,
      "net_amount": 50000,
      "source_type": "payment_deposit",
      "notes": "Setoran tabungan via pembayaran",
      "created_at": "2025-07-20T09:30:00Z"
    },
    {
      "id": 2,
      "savings_type": "general",
      "transaction_type": "debit",
      "amount": 100000,
      "admin_fee": 2500,
      "net_amount": 97500,
      "source_type": "guardian_withdrawal",
      "notes": "Penarikan oleh wali murid",
      "created_at": "2025-08-05T10:00:00Z"
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 8 }
}
```

---

### Guardian Withdrawal (Penarikan oleh Wali Murid)
```
POST /api/v1/students/:id/savings/withdrawals
```

Request Body:
```json
{
  "amount": 100000,
  "notes": "Permintaan penarikan wali murid"
}
```

Validation:
| Field | Rules |
|---|---|
| amount | required, min=1, max=student_savings.general.balance |
| notes | optional |

Proses di backend:
1. Hitung `admin_fee = amount × (savings_admin_rate / 100)`
2. Hitung `net_amount = amount - admin_fee`
3. Buat `savings_transactions` debit (source_type=`guardian_withdrawal`)
4. Update `student_savings.balance`
5. Buat `vault_transactions` debit (source_type=`savings_withdrawal`, amount=`net_amount`)

Response `200 OK`:
```json
{
  "message": "Penarikan tabungan berhasil dicatat",
  "data": {
    "amount": 100000,
    "admin_fee": 2500,
    "net_amount": 97500,
    "remaining_balance": 50000
  }
}
```

---

## 17. Expense Categories

### List Expense Categories
```
GET /api/v1/expense-categories
```

Response `200 OK`:
```json
{
  "data": [
    {
      "id": 1,
      "name": "Biaya Awal",
      "parent_id": null,
      "children": [
        { "id": 4, "name": "Infaq Sarpras" },
        { "id": 5, "name": "Infaq APE" },
        { "id": 6, "name": "Biaya Psikotes IQ" },
        { "id": 7, "name": "Koperasi" }
      ]
    },
    {
      "id": 2,
      "name": "Biaya Registrasi",
      "parent_id": null,
      "children": [
        { "id": 8, "name": "Biaya MPLS" },
        { "id": 9, "name": "Buku PK Karakter" }
      ]
    },
    {
      "id": 3,
      "name": "SPP",
      "parent_id": null,
      "children": [
        { "id": 10, "name": "Gaji Guru" }
      ]
    }
  ]
}
```

---

### Create Expense Category
```
POST /api/v1/expense-categories
```

Request Body:
```json
{ "name": "Operasional Kantor", "parent_id": 3 }
```

Validation:
| Field | Rules |
|---|---|
| name | required, max=100 |
| parent_id | optional, exists:expense_categories (hanya kategori level 1) |

Response `201 Created`: objek expense category.

---

### Update Expense Category
```
PUT /api/v1/expense-categories/:id
```

> Hanya `superadmin`.

Response `200 OK`: objek expense category.

---

### Delete Expense Category
```
DELETE /api/v1/expense-categories/:id
```

> Hanya `superadmin`. Tidak bisa dihapus jika punya sub-kategori atau sudah dipakai di `expenses`.

Response `200 OK`:
```json
{ "message": "Kategori pengeluaran berhasil dihapus" }
```

---

## 18. Expenses (Pengeluaran)

### List Expenses
```
GET /api/v1/expenses
```

Query Parameters:
| Param | Type | Keterangan |
|---|---|---|
| academic_year_id | int | Default: aktif |
| expense_category_id | int | Filter by sub-kategori |
| start_date | date | — |
| end_date | date | — |
| page | int | Default 1 |
| limit | int | Default 20 |

Response `200 OK`:
```json
{
  "data": [
    {
      "id": 1,
      "category": { "id": 10, "name": "Gaji Guru", "parent_name": "SPP" },
      "expense_date": "2025-07-31",
      "amount": 5000000,
      "description": "Gaji guru bulan Juli 2025",
      "receipt_url": null,
      "created_by": { "id": 2, "full_name": "Admin Keuangan" }
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 30 }
}
```

---

### Create Expense
```
POST /api/v1/expenses
```

Request Body:
```json
{
  "academic_year_id": 1,
  "expense_category_id": 10,
  "expense_date": "2025-07-31",
  "amount": 5000000,
  "description": "Gaji guru bulan Juli 2025",
  "receipt_url": null
}
```

Validation:
| Field | Rules |
|---|---|
| academic_year_id | required, exists:academic_years |
| expense_category_id | required, exists:expense_categories (hanya sub-kategori / leaf node) |
| expense_date | required, date |
| amount | required, min=1 |
| description | required |
| receipt_url | optional, url |

Proses: setelah insert `expenses`, buat `cash_transactions` debit (source_type=`expense`).

Response `201 Created`: objek expense.

---

### Get Expense
```
GET /api/v1/expenses/:id
```

Response `200 OK`: objek expense detail.

---

### Update Expense
```
PUT /api/v1/expenses/:id
```

> Tidak dapat mengupdate expense yang tanggalnya sudah melewati tutup buku yang dikonfirmasi.

Response `200 OK`: objek expense.

---

### Delete Expense
```
DELETE /api/v1/expenses/:id
```

> Tidak dapat menghapus expense yang tanggalnya sudah melewati tutup buku yang dikonfirmasi.

Response `200 OK`:
```json
{ "message": "Pengeluaran berhasil dihapus" }
```

---

## 19. Cash (Kas)

### Get Cash Balance
```
GET /api/v1/cash/balance
```

Response `200 OK`:
```json
{
  "data": {
    "balance": 12500000,
    "last_closing_date": "2025-07-19",
    "today_credit": 750000,
    "today_debit": 250000
  }
}
```

---

### List Cash Transactions
```
GET /api/v1/cash/transactions
```

Query Parameters:
| Param | Type | Keterangan |
|---|---|---|
| academic_year_id | int | Default: aktif |
| start_date | date | — |
| end_date | date | — |
| transaction_type | string | credit, debit |
| source_type | string | payment, expense, transfer_to_vault, transfer_from_vault |
| page | int | Default 1 |
| limit | int | Default 20 |

Response `200 OK`:
```json
{
  "data": [
    {
      "id": 1,
      "transaction_date": "2025-07-20",
      "transaction_type": "credit",
      "amount": 290000,
      "source_type": "payment",
      "source_id": 50,
      "description": "Pembayaran - Ahmad Fauzan",
      "created_by": { "id": 2, "full_name": "Admin Keuangan" }
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 200 }
}
```

---

### Transfer Kas ke Berangkas
```
POST /api/v1/cash/transfers
```

Request Body:
```json
{
  "amount": 500000,
  "description": "Setor tabungan ke berangkas"
}
```

Validation:
| Field | Rules |
|---|---|
| amount | required, min=1, max=current_cash_balance |
| description | required |

Proses: buat `cash_transactions` debit (source_type=`transfer_to_vault`) + `vault_transactions` credit (source_type=`transfer_from_cash`).

Response `200 OK`:
```json
{ "message": "Transfer ke berangkas berhasil", "data": { "transferred": 500000, "remaining_cash_balance": 12000000 } }
```

---

## 20. Vault (Berangkas)

### Get Vault Balance
```
GET /api/v1/vault/balance
```

Response `200 OK`:
```json
{
  "data": {
    "balance": 3200000,
    "total_savings_general": 1800000,
    "total_savings_mandatory": 1400000
  }
}
```

---

### List Vault Transactions
```
GET /api/v1/vault/transactions
```

Query Parameters: sama dengan `/cash/transactions`, dengan `source_type` enum: `transfer_from_cash`, `savings_deposit`, `savings_withdrawal`, `graduation_allocation`.

Response `200 OK`: array vault transaction.

---

## 21. Daily Closings (Tutup Buku Harian)

### List Daily Closings
```
GET /api/v1/daily-closings
```

Query Parameters:
| Param | Type | Keterangan |
|---|---|---|
| academic_year_id | int | Default: aktif |
| start_date | date | — |
| end_date | date | — |
| is_confirmed | bool | — |
| page | int | Default 1 |
| limit | int | Default 20 |

Response `200 OK`:
```json
{
  "data": [
    {
      "id": 1,
      "closing_date": "2025-07-20",
      "physical_cash_amount": 12750000,
      "system_cash_amount": 12750000,
      "difference": 0,
      "notes": null,
      "is_confirmed": true,
      "closed_by": { "id": 2, "full_name": "Admin Keuangan" }
    }
  ]
}
```

---

### Create Daily Closing
```
POST /api/v1/daily-closings
```

Request Body:
```json
{
  "academic_year_id": 1,
  "closing_date": "2025-07-21",
  "physical_cash_amount": 13200000,
  "notes": null
}
```

Validation:
| Field | Rules |
|---|---|
| academic_year_id | required, exists:academic_years |
| closing_date | required, date, unique, ≤ today |
| physical_cash_amount | required, min=0 |
| notes | required jika `difference ≠ 0` |

Proses di backend:
1. Hitung `system_cash_amount` dari total cash_transactions pada tanggal tersebut
2. Hitung `difference = physical_cash_amount - system_cash_amount`
3. Simpan dengan `is_confirmed = false`
4. Admin harus confirm secara eksplisit via endpoint `confirm`

Response `201 Created`:
```json
{
  "message": "Tutup buku berhasil dibuat, menunggu konfirmasi",
  "data": {
    "id": 2,
    "closing_date": "2025-07-21",
    "physical_cash_amount": 13200000,
    "system_cash_amount": 12750000,
    "difference": 450000,
    "is_confirmed": false
  }
}
```

---

### Get Daily Closing
```
GET /api/v1/daily-closings/:id
```

Response `200 OK`: objek daily closing detail.

---

### Confirm Daily Closing
```
PATCH /api/v1/daily-closings/:id/confirm
```

> Setelah dikonfirmasi, seluruh transaksi pada tanggal tersebut dikunci. Tidak bisa di-unconfirm.

Request Body:
```json
{ "notes": "Selisih karena uang kembalian tidak tercatat" }
```

Validation: `notes` required jika `difference ≠ 0`.

Response `200 OK`:
```json
{ "message": "Tutup buku berhasil dikonfirmasi dan dikunci" }
```

---

## 22. Reports (Laporan)

> Semua endpoint laporan mengembalikan data yang siap dicetak dari browser (format JSON terstruktur untuk di-render frontend).

### Laporan Harian
```
GET /api/v1/reports/daily
```

> Role: `superadmin`, `admin_keuangan`, `kepala_sekolah`

Query Parameters:
| Param | Type | Required | Keterangan |
|---|---|---|---|
| date | date | yes | Tanggal laporan |
| academic_year_id | int | no | Default: aktif |

Response `200 OK`:
```json
{
  "data": {
    "date": "2025-07-20",
    "academic_year": "2025/2026",
    "income_summary": {
      "total": 1500000,
      "by_category": [
        { "category": "SPP", "amount": 900000 },
        { "category": "Infaq Harian", "amount": 420000 },
        { "category": "Pasta", "amount": 180000 }
      ]
    },
    "expense_summary": {
      "total": 250000,
      "by_category": [
        { "category": "SPP", "sub_category": "Gaji Guru", "amount": 250000 }
      ]
    },
    "cash": {
      "opening_balance": 11500000,
      "total_credit": 1500000,
      "total_debit": 250000,
      "closing_balance": 12750000
    },
    "vault": {
      "balance": 3200000
    },
    "daily_closing": {
      "physical_cash_amount": 12750000,
      "system_cash_amount": 12750000,
      "difference": 0,
      "is_confirmed": true
    }
  }
}
```

---

### Laporan Bulanan
```
GET /api/v1/reports/monthly
```

> Role: `superadmin`, `admin_keuangan`, `kepala_sekolah`

Query Parameters:
| Param | Type | Required | Keterangan |
|---|---|---|---|
| month | int | yes | Bulan (1–12) |
| year | int | yes | Tahun |
| academic_year_id | int | no | Default: aktif |

Response `200 OK`:
```json
{
  "data": {
    "period": "Juli 2025",
    "income_summary": {
      "total_billed": 27500000,
      "total_paid": 24300000,
      "total_unpaid": 3200000,
      "by_category": [
        { "category": "SPP", "billed": 15000000, "paid": 14500000 },
        { "category": "Infaq Harian", "billed": 7000000, "paid": 6300000 },
        { "category": "Pasta", "billed": 3500000, "paid": 2500000 },
        { "category": "Registrasi", "billed": 2000000, "paid": 1000000 }
      ]
    },
    "expense_summary": {
      "total": 8500000,
      "by_category": [
        { "category": "SPP", "amount": 8500000 }
      ]
    },
    "arrears_by_class": [
      { "class_group_name": "Intan 1", "total_unpaid": 750000, "student_count": 3 }
    ],
    "cash": {
      "opening_balance": 5000000,
      "total_income": 24300000,
      "total_expense": 8500000,
      "closing_balance": 20800000
    }
  }
}
```

---

### Laporan Tahunan
```
GET /api/v1/reports/annual
```

> Role: `superadmin`, `admin_keuangan`, `kepala_sekolah`, `yayasan`

Query Parameters:
| Param | Type | Required | Keterangan |
|---|---|---|---|
| academic_year_id | int | yes | — |

Response `200 OK`:
```json
{
  "data": {
    "academic_year": "2025/2026",
    "income_summary": {
      "total_billed": 330000000,
      "total_paid": 310000000,
      "total_unpaid": 20000000
    },
    "expense_summary": {
      "total": 102000000
    },
    "net": 208000000,
    "by_month": [
      { "month": 7, "year": 2025, "income": 24300000, "expense": 8500000 }
    ],
    "cash_balance": 20800000,
    "vault_balance": 3200000
  }
}
```

---

### Rekap per Siswa
```
GET /api/v1/reports/students/:id
```

> Role: `superadmin`, `admin_keuangan`

Query Parameters:
| Param | Type | Keterangan |
|---|---|---|
| academic_year_id | int | Default: aktif. Gunakan `all` untuk lintas tahun ajaran |

Response `200 OK`:
```json
{
  "data": {
    "student": {
      "id": 1,
      "full_name": "Ahmad Fauzan",
      "class_group_name": "Intan 1",
      "academic_year": "2025/2026"
    },
    "savings": {
      "general_balance": 150000,
      "mandatory_balance": 80000
    },
    "invoice_summary": {
      "total_billed": 3270000,
      "total_paid": 1500000,
      "total_unpaid": 1770000
    },
    "invoices": [
      {
        "id": 1,
        "type": "monthly",
        "period": "Juli 2025",
        "total_amount": 327000,
        "paid_amount": 150000,
        "status": "partial",
        "items": [
          { "name": "SPP TK", "amount": 150000, "paid_amount": 150000, "status": "paid" },
          { "name": "Infaq Harian (20 hari)", "amount": 140000, "paid_amount": 0, "status": "unpaid" },
          { "name": "Pasta Robotika", "amount": 100000, "paid_amount": 0, "status": "unpaid" }
        ]
      }
    ],
    "payment_history": [
      {
        "id": 50,
        "payment_date": "2025-07-20",
        "total_amount": 150000,
        "source": "cash"
      }
    ]
  }
}
```

---

### Rekap per Kelas
```
GET /api/v1/reports/class-groups/:id
```

> Role: `superadmin`, `admin_keuangan`, `kepala_sekolah`

Query Parameters:
| Param | Type | Keterangan |
|---|---|---|
| month | int | Filter bulan |
| year | int | Filter tahun |
| academic_year_id | int | Default: aktif |

Response `200 OK`:
```json
{
  "data": {
    "class_group": { "id": 3, "name": "Intan 1", "level": "intan" },
    "period": "Juli 2025",
    "summary": {
      "total_students": 15,
      "total_billed": 4905000,
      "total_paid": 3800000,
      "total_unpaid": 1105000,
      "payment_rate": "77.5%"
    },
    "students": [
      {
        "student_id": 1,
        "student_name": "Ahmad Fauzan",
        "invoice_status": "partial",
        "total_amount": 327000,
        "paid_amount": 150000,
        "unpaid_amount": 177000
      }
    ]
  }
}
```
