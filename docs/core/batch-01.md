# Batch 1 — Foundation

> **Scope:** Auth · Users · Academic Years
> **Endpoint:** 13
> **Dependensi:** —
> **Harus selesai sebelum:** Batch 2

---

## Tujuan Batch Ini

Membangun pondasi sistem: autentikasi, manajemen pengguna, dan tahun ajaran. Semua shared utility, middleware, dan konvensi response juga dibuat di batch ini sebagai standar untuk seluruh batch berikutnya.

---

## Daftar Endpoint

| # | Method | Endpoint | Role |
|---|--------|----------|------|
| 1 | POST | `/api/v1/auth/login` | Public |
| 2 | POST | `/api/v1/auth/logout` | All |
| 3 | GET | `/api/v1/auth/me` | All |
| 4 | GET | `/api/v1/users` | superadmin |
| 5 | POST | `/api/v1/users` | superadmin |
| 6 | GET | `/api/v1/users/:id` | superadmin |
| 7 | PUT | `/api/v1/users/:id` | superadmin |
| 8 | DELETE | `/api/v1/users/:id` | superadmin |
| 9 | GET | `/api/v1/academic-years` | superadmin, admin_administrasi |
| 10 | POST | `/api/v1/academic-years` | superadmin, admin_administrasi |
| 11 | GET | `/api/v1/academic-years/:id` | superadmin, admin_administrasi |
| 12 | PUT | `/api/v1/academic-years/:id` | superadmin, admin_administrasi |
| 13 | PATCH | `/api/v1/academic-years/:id/activate` | superadmin |

---

## Checklist Implementasi

### 0. Shared Utilities (dikerjakan pertama)

- [x] `model/model.go` — struct `PrimaryKey` dan `BaseModelTimeAt`
- [x] `dto/success_response.go` — `SuccessResponse{Message, Data}`
- [x] `dto/error_response.go` — `ErrorResponse{Status, Code, Message, Details}`
- [x] `dto/paginated_response.go` — `PaginatedResponse{Message, Data, Meta}` + struct `Meta{Page, Limit, Total}`
- [x] `utility/validator.go` — custom Echo validator wrapping `go-playground/validator`
- [x] `utility/pagination.go` — helper `ParsePagination(c echo.Context) (page, limit int)`
- [x] `middleware/auth.go` — JWT middleware, inject claims ke context
- [x] `middleware/role.go` — `RequireRoles(roles ...string) echo.MiddlewareFunc`
- [x] `handler/error_handler.go` — custom Echo error handler (mapping error ke HTTP status)
- [x] `config/database.go` — koneksi PostgreSQL via GORM + auto-migrate

---

### 1. Auth

#### Layer

**`model/user.go`**
```go
type User struct {
    model.PrimaryKey
    FullName string `gorm:"size:100;not null"`
    Email    string `gorm:"size:100;not null;uniqueIndex"`
    Password string `gorm:"size:255;not null"`
    Role     string `gorm:"size:30;not null"`
    model.BaseModelTimeAt
}
```

**`dto/auth.go`**
```go
type LoginRequest struct {
    Email    string `json:"email" validate:"required,email"`
    Password string `json:"password" validate:"required,min=6"`
}

type LoginResponse struct {
    Token string       `json:"token"`
    User  UserResponse `json:"user"`
}

type UserResponse struct {
    ID       uint   `json:"id"`
    FullName string `json:"full_name"`
    Email    string `json:"email"`
    Role     string `json:"role"`
}
```

**`repository/user_repository.go`**
```go
type UserRepository interface {
    FindByEmail(email string) (*model.User, error)
    FindByID(id uint) (*model.User, error)
    FindAll(search, role string, page, limit int) ([]model.User, int64, error)
    Create(user *model.User) error
    Update(user *model.User) error
    Delete(id uint) error
}
```

**`service/auth_service.go`**
```go
type AuthService interface {
    Login(req dto.LoginRequest) (*dto.LoginResponse, error)
    GetMe(userID uint) (*dto.UserResponse, error)
}
```

**`handler/auth_handler.go`**
- Implementasi handler `Login`, `Logout`, `Me`
- Swagger annotation lengkap

#### Checklist

- [x] `model/user.go`
- [x] `dto/auth.go`
- [x] `dto/user.go`
- [x] `repository/user_repository.go`
- [x] `service/auth_service.go`
- [x] `service/user_service.go`
- [x] `handler/auth_handler.go`
- [x] `handler/user_handler.go`
- [x] Route auth di `main.go`:
  ```go
  auth := e.Group("/api/v1/auth")
  auth.POST("/login", authHandler.Login)
  auth.POST("/logout", authHandler.Logout, jwtMiddleware)
  auth.GET("/me", authHandler.Me, jwtMiddleware)
  ```

---

### 2. Users

> Semua endpoint `/users` menggunakan middleware: JWT + `RequireRoles("superadmin")`

#### Checklist

- [x] `dto/user.go` tambahkan:
  - `CreateUserRequest` (full_name, email, password, role)
  - `UpdateUserRequest`
  - `UserDetailResponse`
- [x] Implementasi `user_repository.go` — `FindAll`, `FindByID`, `Create`, `Update`, `Delete`
- [x] Implementasi `user_service.go` — hash password via `bcrypt` di Create/Update
- [x] Implementasi `handler/user_handler.go` — `List`, `Create`, `Get`, `Update`, `Delete`
- [x] Route users di `main.go`:
  ```go
  users := api.Group("/users", jwtMiddleware, roleMiddleware("superadmin"))
  users.GET("", userHandler.List)
  users.POST("", userHandler.Create)
  users.GET("/:id", userHandler.Get)
  users.PUT("/:id", userHandler.Update)
  users.DELETE("/:id", userHandler.Delete)
  ```

#### Catatan Teknis

- Password harus di-hash dengan `bcrypt` sebelum disimpan
- `DELETE` menggunakan soft delete GORM (`deleted_at`)
- Tidak boleh menghapus user yang sedang login (cek dari JWT claims)

---

### 3. Academic Years

> Middleware: JWT + role sesuai endpoint

#### Layer

**`model/academic_year.go`**
```go
type AcademicYear struct {
    model.PrimaryKey
    Name      string    `gorm:"size:20;not null;uniqueIndex"`
    StartDate time.Time `gorm:"type:date;not null"`
    EndDate   time.Time `gorm:"type:date;not null"`
    IsActive  bool      `gorm:"default:false"`
    model.BaseModelTimeAt
}
```

**`dto/academic_year.go`**
```go
type CreateAcademicYearRequest struct {
    Name      string `json:"name" validate:"required,max=20"`
    StartDate string `json:"start_date" validate:"required,datetime=2006-01-02"`
    EndDate   string `json:"end_date" validate:"required,datetime=2006-01-02"`
}

type AcademicYearResponse struct {
    ID        uint   `json:"id"`
    Name      string `json:"name"`
    StartDate string `json:"start_date"`
    EndDate   string `json:"end_date"`
    IsActive  bool   `json:"is_active"`
    CreatedAt string `json:"created_at"`
}
```

**`repository/academic_year_repository.go`**
```go
type AcademicYearRepository interface {
    FindAll() ([]model.AcademicYear, error)
    FindByID(id uint) (*model.AcademicYear, error)
    FindActive() (*model.AcademicYear, error)
    FindByName(name string) (*model.AcademicYear, error)
    Create(ay *model.AcademicYear) error
    Update(ay *model.AcademicYear) error
    SetActive(id uint) error   // deactivate all, then activate target
}
```

#### Checklist

- [x] `model/academic_year.go`
- [x] `dto/academic_year.go`
- [x] `repository/academic_year_repository.go`
- [x] `service/academic_year_service.go`
  - Validasi: `end_date > start_date`
  - `SetActive`: jalankan dalam satu DB transaction — UPDATE semua `is_active=false`, lalu UPDATE target `is_active=true`
  - Tidak bisa update/delete tahun ajaran aktif yang sudah punya data
- [x] `handler/academic_year_handler.go` — `List`, `Create`, `Get`, `Update`, `Activate`
- [x] Route di `main.go`:
  ```go
  ay := api.Group("/academic-years", jwtMiddleware)
  ay.GET("", ayHandler.List, roleMiddleware("superadmin", "admin_administrasi"))
  ay.POST("", ayHandler.Create, roleMiddleware("superadmin", "admin_administrasi"))
  ay.GET("/:id", ayHandler.Get, roleMiddleware("superadmin", "admin_administrasi"))
  ay.PUT("/:id", ayHandler.Update, roleMiddleware("superadmin", "admin_administrasi"))
  ay.PATCH("/:id/activate", ayHandler.Activate, roleMiddleware("superadmin"))
  ```

---

## Catatan Teknis Batch 1

### JWT Strategy

```go
// Claims yang disimpan di token
type JWTClaims struct {
    UserID uint   `json:"user_id"`
    Role   string `json:"role"`
    jwt.StandardClaims
}

// Helper untuk extract claims dari context
func GetCurrentUser(c echo.Context) *JWTClaims {
    token := c.Get("user").(*jwt.Token)
    return token.Claims.(*JWTClaims)
}
```

### Role Guard

```go
func RequireRoles(roles ...string) echo.MiddlewareFunc {
    return func(next echo.HandlerFunc) echo.HandlerFunc {
        return func(c echo.Context) error {
            claims := GetCurrentUser(c)
            for _, role := range roles {
                if claims.Role == role {
                    return next(c)
                }
            }
            return echo.NewHTTPError(http.StatusForbidden, "Akses tidak diizinkan")
        }
    }
}
```

### Auto-Migrate di `main.go`

```go
db.AutoMigrate(
    &model.User{},
    &model.AcademicYear{},
    // tambahkan model baru di setiap batch
)
```

---

## Acceptance Criteria Batch 1

- [x] `POST /auth/login` → mengembalikan JWT token jika kredensial benar; 401 jika salah
- [x] `POST /auth/logout` → mengembalikan 200 OK (stateless, client discard token)
- [x] `GET /auth/me` → mengembalikan data user dari token; 401 jika tanpa token
- [x] `GET /users` → hanya bisa diakses oleh superadmin; 403 jika role lain
- [x] `POST /users` → password tersimpan sebagai bcrypt hash di DB
- [x] `PUT /users/:id` → password opsional (jika kosong, password lama dipertahankan)
- [x] `DELETE /users/:id` → soft delete, user masih ada di DB dengan `deleted_at` terisi
- [x] `DELETE /users/:id` → tidak bisa menghapus akun sendiri (422)
- [x] `GET /academic-years` → mengembalikan semua tahun ajaran
- [x] `POST /academic-years` → validasi end_date > start_date; nama unik
- [x] `PATCH /academic-years/:id/activate` → hanya satu tahun ajaran yang `is_active=true`
- [x] Swagger UI accessible di `GET /swagger/index.html`
- [x] Semua endpoint mengembalikan format response sesuai konvensi (SuccessResponse / ErrorResponse)
- [x] Superadmin seeder otomatis (superadmin@alizzah.sch.id / password123)
- [x] Legacy columns (username, phone, address, deposit) di-drop dari tabel users

