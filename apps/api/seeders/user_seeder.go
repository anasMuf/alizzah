package seeders

import (
	"api/model"
	"log"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

// SeedSuperAdmin creates a default superadmin user if none exists.
func SeedSuperAdmin(db *gorm.DB) {
	var count int64
	db.Model(&model.User{}).Where("role = ?", "superadmin").Count(&count)
	if count > 0 {
		log.Println("Superadmin sudah ada, skip seeder")
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte("password123"), bcrypt.DefaultCost)
	if err != nil {
		log.Println("Gagal hash password seeder:", err)
		return
	}

	user := model.User{
		FullName: "Super Admin",
		Email:    "superadmin@alizzah.sch.id",
		Password: string(hash),
		Role:     "superadmin",
	}

	if err := db.Create(&user).Error; err != nil {
		log.Println("Gagal membuat superadmin:", err)
		return
	}

	log.Println("Superadmin default berhasil dibuat (superadmin@alizzah.sch.id / password123)")
}
