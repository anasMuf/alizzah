package model

// User represents the users table.
// Roles: superadmin, admin_administrasi, admin_keuangan, kepala_sekolah, yayasan
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
