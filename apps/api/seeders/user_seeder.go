package seeders

import (
	"api/model"
	"log"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

var defaultUsers = []struct {
	FullName string
	Email    string
	Role     string
}{
	{"Super Admin", "superadmin@alizzah.sch.id", "superadmin"},
	{"Admin Administrasi", "admin_administrasi@alizzah.sch.id", "admin_administrasi"},
	{"Admin Keuangan", "admin_keuangan@alizzah.sch.id", "admin_keuangan"},
	{"Kepala Sekolah", "kepala_sekolah@alizzah.sch.id", "kepala_sekolah"},
	{"Yayasan", "yayasan@alizzah.sch.id", "yayasan"},
}

func SeedUsers(db *gorm.DB) {
	hash, err := bcrypt.GenerateFromPassword([]byte("password123"), bcrypt.DefaultCost)
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
	log.Println("User seeder berhasil (5 role)")
}
