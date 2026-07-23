package seeders

import (
	"api/model"
	"log"
	"os"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

// defaultUsers hanya berisi 1 akun superadmin. Akun admin lain dibuat lewat
// halaman kelola pengguna (superadmin-only) dengan grant modul per-user.
var defaultUsers = []struct {
	FullName string
	Email    string
	Role     string
}{
	{"Super Admin", "superadmin@alizzah.sch.id", "superadmin"},
}

func SeedUsers(db *gorm.DB) {
	// Password user awal dibaca dari env SEED_ADMIN_PASSWORD (wajib diisi di produksi),
	// fallback "password123" untuk dev/lokal.
	seedPassword := os.Getenv("SEED_ADMIN_PASSWORD")
	if seedPassword == "" {
		log.Println("⚠️  PERINGATAN: SEED_ADMIN_PASSWORD tidak diset, menggunakan fallback 'password123'. Pastikan env variable diset di production!")
		seedPassword = "password123"
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(seedPassword), 12)
	if err != nil {
		log.Println("Gagal hash password seeder:", err)
		return
	}

	for _, u := range defaultUsers {
		var count int64
		db.Model(&model.User{}).Where("role = ?", u.Role).Count(&count)
		if count > 0 {
			continue
		}

		user := model.User{
			FullName: u.FullName,
			Email:    u.Email,
			Password: string(hash),
			Role:     u.Role,
		}
		if err := db.Create(&user).Error; err != nil {
			log.Printf("Gagal membuat user %s: %v", u.Role, err)
			continue
		}
	}
	log.Println("User seeder berhasil (superadmin)")
}
