package koperasi

import (
	"log"
	"strings"

	"api/internal/modules/koperasi/anggota"
	"api/internal/modules/koperasi/barang"
	"api/internal/modules/koperasi/master"
	"api/internal/modules/koperasi/pemasok"

	"gorm.io/gorm"
)

// Seed mengisi data master koperasi (anggota, pemasok, barang) bila tabel terkait
// masih kosong — supaya modul tidak kosong saat deploy/instalasi baru. Idempotent:
// tiap bagian dilewati bila sudah ada datanya. Hanya master (tanpa transaksi)
// agar tidak bergantung pada tahun ajaran / seam kas.
func Seed(db *gorm.DB) {
	seedMembers(db)
	seedSuppliers(db)
	seedProducts(db)
	seedMasterData(db)
}

// seedMasterData mengisi master kategori & satuan barang (sumber dropdown form
// barang, feedback-01 B2). Idempotent per nilai (FirstOrCreate). Selain default,
// juga backfill nilai kategori/satuan yang sudah terpakai di barang yang ada agar
// dropdown lengkap setelah migrasi.
func seedMasterData(db *gorm.DB) {
	categories := map[string]bool{"Seragam": true, "Perlengkapan": true, "Alat Tulis": true, "Buku": true}
	units := map[string]bool{"pcs": true, "set": true, "lusin": true, "pack": true, "box": true}

	var products []barang.Product
	if err := db.Find(&products).Error; err == nil {
		for _, p := range products {
			if v := strings.TrimSpace(p.Category); v != "" {
				categories[v] = true
			}
			if v := strings.TrimSpace(p.Unit); v != "" {
				units[v] = true
			}
		}
	}

	upsert := func(kind, name string) {
		m := master.MasterData{Kind: kind, Name: name}
		if err := db.Where(m).FirstOrCreate(&m).Error; err != nil {
			log.Printf("Seed koperasi master %s %q gagal: %v", kind, name, err)
		}
	}
	for name := range categories {
		upsert(master.KindCategory, name)
	}
	for name := range units {
		upsert(master.KindUnit, name)
	}
	log.Printf("Seed koperasi: master %d kategori, %d satuan (idempotent)", len(categories), len(units))
}

func seedMembers(db *gorm.DB) {
	var count int64
	db.Model(&anggota.Member{}).Count(&count)
	if count > 0 {
		return
	}
	members := []anggota.Member{
		{FullName: "Siti Aminah", MemberType: "pegawai", Phone: "081200000001", IsActive: true},
		{FullName: "Budi Santoso", MemberType: "pegawai", Phone: "081200000002", IsActive: true},
		{FullName: "Hj. Rohmah", MemberType: "pengurus_yayasan", Phone: "081200000003", IsActive: true},
		{FullName: "Pak Darto (OB)", MemberType: "pegawai", Phone: "081200000004", IsActive: true},
		{FullName: "Warung Bu Eni", MemberType: "pihak_luar", Phone: "081200000005", IsActive: true},
	}
	if err := db.Create(&members).Error; err != nil {
		log.Printf("Seed koperasi members gagal: %v", err)
		return
	}
	log.Printf("Seed koperasi: %d anggota", len(members))
}

func seedSuppliers(db *gorm.DB) {
	var count int64
	db.Model(&pemasok.Supplier{}).Count(&count)
	if count > 0 {
		return
	}
	suppliers := []pemasok.Supplier{
		{Name: "CV Sandang Jaya", ContactPerson: "Pak Andi", Phone: "0274000111", Address: "Jl. Mawar No. 1, Yogyakarta"},
		{Name: "Toko Buku Cerdas", ContactPerson: "Bu Lina", Phone: "0274000222", Address: "Jl. Melati No. 2, Yogyakarta"},
		{Name: "Grosir Alat Tulis", ContactPerson: "Pak Joko", Phone: "0274000333", Address: "Jl. Kenanga No. 3, Yogyakarta"},
	}
	if err := db.Create(&suppliers).Error; err != nil {
		log.Printf("Seed koperasi suppliers gagal: %v", err)
		return
	}
	log.Printf("Seed koperasi: %d pemasok", len(suppliers))
}

func seedProducts(db *gorm.DB) {
	var count int64
	db.Model(&barang.Product{}).Count(&count)
	if count > 0 {
		return
	}
	products := []barang.Product{
		{Name: "Seragam Batik", Category: "Seragam", Unit: "pcs", CostPrice: 50000, SalePrice: 75000, Stock: 40, IsActive: true},
		{Name: "Seragam Olahraga", Category: "Seragam", Unit: "set", CostPrice: 60000, SalePrice: 90000, Stock: 30, IsActive: true},
		{Name: "Tas Sekolah", Category: "Perlengkapan", Unit: "pcs", CostPrice: 70000, SalePrice: 100000, Stock: 25, IsActive: true},
		{Name: "Buku Tulis (lusin)", Category: "Alat Tulis", Unit: "lusin", CostPrice: 30000, SalePrice: 42000, Stock: 50, IsActive: true},
		{Name: "Lunchbox", Category: "Perlengkapan", Unit: "pcs", CostPrice: 25000, SalePrice: 40000, Stock: 35, IsActive: true},
	}
	if err := db.Create(&products).Error; err != nil {
		log.Printf("Seed koperasi products gagal: %v", err)
		return
	}
	log.Printf("Seed koperasi: %d barang", len(products))
}
