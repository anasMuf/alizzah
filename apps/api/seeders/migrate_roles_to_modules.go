package seeders

import (
	"api/middleware"
	"api/model"
	"log"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// MigrateRolesToModules mengonversi user role-bundle lama menjadi model RBAC
// by-modul: role `admin` + grant modul di tabel user_modules. Role `superadmin`
// dibiarkan apa adanya (bypass semua modul).
//
// Idempotent: setelah konversi role menjadi `admin`/`superadmin` sehingga query
// tidak lagi menemukan role lama; insert modul memakai ON CONFLICT DO NOTHING.
func MigrateRolesToModules(db *gorm.DB) {
	legacy := map[string][]string{
		"admin_administrasi": {middleware.ModuleAdministrasi},
		"admin_keuangan":     {middleware.ModuleKeuangan},
		"admin_koperasi":     {middleware.ModuleKoperasi},
		"kepala_sekolah":     {middleware.ModuleLaporan},
		"yayasan":            {middleware.ModuleLaporan},
	}

	roles := make([]string, 0, len(legacy))
	for r := range legacy {
		roles = append(roles, r)
	}

	var users []model.User
	if err := db.Where("role IN ?", roles).Find(&users).Error; err != nil {
		log.Println("MigrateRolesToModules: gagal query user role lama:", err)
		return
	}
	if len(users) == 0 {
		return
	}

	migrated := 0
	for _, u := range users {
		mods := legacy[u.Role]
		err := db.Transaction(func(tx *gorm.DB) error {
			for _, m := range mods {
				row := model.UserModule{UserID: u.ID, Module: m}
				if err := tx.Clauses(clause.OnConflict{DoNothing: true}).Create(&row).Error; err != nil {
					return err
				}
			}
			return tx.Model(&model.User{}).Where("id = ?", u.ID).Update("role", "admin").Error
		})
		if err != nil {
			log.Printf("MigrateRolesToModules: gagal migrasi user %d (%s): %v", u.ID, u.Email, err)
			continue
		}
		migrated++
	}
	log.Printf("MigrateRolesToModules: %d user role-lama dikonversi ke admin + modul", migrated)
}
