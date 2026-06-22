package model

// UserModule adalah grant akses modul per-user (RBAC by-modul).
//
// Role `superadmin` tidak memerlukan baris di sini (bypass semua modul).
// Role `admin` hanya dapat membuka modul yang punya baris untuk user-nya.
// Composite primary key (user_id, module) menjamin satu grant unik per user.
type UserModule struct {
	UserID uint   `gorm:"primaryKey" json:"user_id"`
	Module string `gorm:"primaryKey;size:30" json:"module"`
}

func (UserModule) TableName() string { return "user_modules" }
