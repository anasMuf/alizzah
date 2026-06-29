package dto

// CreateUserRequest is the request body for POST /api/v1/users.
// Modules hanya relevan untuk role `admin`; untuk `superadmin` diabaikan (bypass).
type CreateUserRequest struct {
	FullName string   `json:"full_name" validate:"required,min=3,max=100"`
	Email    string   `json:"email" validate:"required,email"`
	Password string   `json:"password" validate:"required,min=8"`
	Role     string   `json:"role" validate:"required,oneof=superadmin admin"`
	Modules  []string `json:"modules" validate:"omitempty,dive,oneof=administrasi keuangan koperasi laporan"`
}

// UpdateUserRequest is the request body for PUT /api/v1/users/:id.
// Password is optional — if empty, the old password is retained.
type UpdateUserRequest struct {
	FullName string   `json:"full_name" validate:"required,min=3,max=100"`
	Email    string   `json:"email" validate:"required,email"`
	Password string   `json:"password" validate:"omitempty,min=8"`
	Role     string   `json:"role" validate:"required,oneof=superadmin admin"`
	Modules  []string `json:"modules" validate:"omitempty,dive,oneof=administrasi keuangan koperasi laporan"`
}

// UserResponse is the standard user response (used in lists and details).
type UserResponse struct {
	ID        uint     `json:"id"`
	FullName  string   `json:"full_name"`
	Email     string   `json:"email"`
	Role      string   `json:"role"`
	Modules   []string `json:"modules"`
	CreatedAt string   `json:"created_at"`
}

// UserQueryParams holds query parameters for listing users.
type UserQueryParams struct {
	Search string
	Role   string
	Page   int
	Limit  int
}
