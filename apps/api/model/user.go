package model

// User represents the users table.
// Roles: superadmin (bypass semua modul) | admin (akses dibatasi per modul
// via tabel user_modules — lihat model.UserModule).
type User struct {
	PrimaryKey
	FullName string `gorm:"size:100;not null" json:"full_name"`
	Email    string `gorm:"size:100;not null;uniqueIndex" json:"email"`
	Password string `gorm:"size:255;not null" json:"-"`
	Role     string `gorm:"size:30;not null" json:"role"`
	BaseModelTimeAt
}

func (User) TableName() string {
	return "users"
}
