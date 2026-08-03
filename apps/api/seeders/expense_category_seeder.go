package seeders

import (
	"api/model"
	"log"

	"gorm.io/gorm"
)

var defaultExpenseCategories = []struct {
	Name            string
	InvoiceCategory string // mapping ke invoice_items.category
	Children        []string
}{
	// === Income-mapped categories ===
	{"Biaya Awal", "initial", []string{"Infaq Sarpras", "Infaq APE", "Biaya Psikotes IQ", "Koperasi"}},
	{"Biaya Registrasi", "registration", []string{"Biaya MPLS", "Buku PK Karakter", "Alat Belajar", "Iuran Kegiatan Kecamatan/Kabupaten", "Administrasi LPP", "Kalender", "Koperasi"}},
	{"SPP", "monthly_spp", []string{"Gaji Guru"}},
	{"Infaq Harian", "monthly_infaq", []string{"Bekal Siswa", "Kegiatan Sekolah"}},
	{"Daycare", "daycare", nil},
	{"Pasta & Ekskul", "pasta", nil},
	{"Tabungan Wajib", "savings_mandatory", nil},
	{"Wisuda", "graduation", nil},
	{"Fasilitas", "facility", nil},
	// === Catch-all (no income mapping) ===
	{"Lain-lain", "lainnya", []string{"ATK", "Transportasi", "Listrik & Air", "Internet & Telepon", "Pemeliharaan", "Lain-lain"}},
}

func SeedExpenseCategories(db *gorm.DB) {
	var count int64
	db.Model(&model.ExpenseCategory{}).Count(&count)
	if count > 0 {
		log.Println("Expense categories sudah ada, skip seeder")
		return
	}

	for _, cat := range defaultExpenseCategories {
		parent := model.ExpenseCategory{Name: cat.Name, InvoiceCategory: cat.InvoiceCategory}
		if err := db.Create(&parent).Error; err != nil {
			log.Printf("Gagal membuat kategori '%s': %v", cat.Name, err)
			continue
		}
		for _, childName := range cat.Children {
			child := model.ExpenseCategory{Name: childName, ParentID: &parent.ID}
			if err := db.Create(&child).Error; err != nil {
				log.Printf("Gagal membuat sub-kategori '%s': %v", childName, err)
			}
		}
	}
	log.Println("Expense categories seeder berhasil")
}
