package koperasi

import (
	"flag"
	"log"
	"strings"
	"time"

	"api/internal/modules/koperasi/anggota"
	"api/internal/modules/koperasi/barang"
	"api/internal/modules/koperasi/master"
	"api/internal/modules/koperasi/pemasok"

	"gorm.io/gorm"
)

var (
	seedMembersFlag   = flag.Bool("seed-koperasi-members", false, "Seed data anggota koperasi")
	seedSuppliersFlag = flag.Bool("seed-koperasi-suppliers", false, "Seed data pemasok koperasi")
)

// Seed mengisi data master koperasi (anggota, pemasok, barang) bila tabel terkait
// masih kosong — supaya modul tidak kosong saat deploy/instalasi baru. Idempotent:
// tiap bagian dilewati bila sudah ada datanya. Hanya master (tanpa transaksi)
// agar tidak bergantung pada tahun ajaran / seam kas.
func Seed(db *gorm.DB) {
	seedEmployees(db)
	if *seedMembersFlag {
		seedMembers(db)
	}
	if *seedSuppliersFlag {
		seedSuppliers(db)
	}
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

func parseDate(s string) *time.Time {
	if s == "" {
		return nil
	}
	t, err := time.Parse("2006-01-02", s)
	if err != nil {
		return nil
	}
	return &t
}

func seedEmployees(db *gorm.DB) {
	var count int64
	db.Model(&anggota.Employee{}).Count(&count)
	if count > 0 {
		return
	}
	employees := []anggota.Employee{
		{LegacyID: 1, FullName: "Abdul Rohim, S.PdI", JoinDate: parseDate("2005-11-15"), IsActive: true},
		{LegacyID: 2, FullName: "Khoirul  Izzah, S.Pd AUD", JoinDate: parseDate("2005-11-15"), IsActive: true},
		{LegacyID: 3, FullName: "Miftahul Jannah, S.Pd", JoinDate: parseDate("2005-11-15"), IsActive: true},
		{LegacyID: 4, FullName: "Fatimah Zahroh, S.Pd", JoinDate: parseDate("2005-11-15"), IsActive: true},
		{LegacyID: 5, FullName: "Umami Faizah, SE, S.Pd", JoinDate: parseDate("2005-11-15"), IsActive: true},
		{LegacyID: 7, FullName: "Iin Mayasari, S.Pd", JoinDate: parseDate("2007-03-01"), IsActive: true},
		{LegacyID: 8, FullName: "Indah Susanti, S.Pd", JoinDate: parseDate("2008-06-02"), IsActive: true},
		{LegacyID: 9, FullName: "Sri Wahyudati, S.Pd", JoinDate: parseDate("2011-07-01"), IsActive: true},
		{LegacyID: 10, FullName: "Maratul Mufidah, S.Pd", JoinDate: parseDate("2012-07-01"), IsActive: true},
		{LegacyID: 11, FullName: "Siti Zulaikhah, S.Pd", JoinDate: parseDate("2013-06-01"), IsActive: true},
		{LegacyID: 12, FullName: "Khafidhotul Mushonnifah", JoinDate: parseDate("2013-07-01"), IsActive: true},
		{LegacyID: 13, FullName: "Heni Khumaaidah, S.Pd", JoinDate: parseDate("2014-09-01"), IsActive: true},
		{LegacyID: 15, FullName: "Choirul Ummah", JoinDate: parseDate("2015-02-01"), IsActive: true},
		{LegacyID: 16, FullName: "Elis Masrikhah, S.Pd", JoinDate: parseDate("2015-07-01"), IsActive: true},
		{LegacyID: 17, FullName: "Fitriyah Hanim, S.Pd", JoinDate: parseDate("2015-11-01"), IsActive: true},
		{LegacyID: 19, FullName: "Nur Fadilah, s.Pd", JoinDate: parseDate("2016-06-01"), IsActive: true},
		{LegacyID: 20, FullName: "Dini Mayasusanti, S.Pd", JoinDate: parseDate("2016-07-07"), IsActive: true},
		{LegacyID: 22, FullName: "Husnul Khotimah", JoinDate: parseDate("2017-03-27"), IsActive: true},
		{LegacyID: 23, FullName: "Triana Septi Anifah", JoinDate: parseDate("2017-03-27"), IsActive: true},
		{LegacyID: 24, FullName: "Ifatin Nikmah, S.Pd", JoinDate: parseDate("2018-03-12"), IsActive: true},
		{LegacyID: 25, FullName: "Mei Nur Firdaus, S.S", JoinDate: parseDate("2019-06-01"), IsActive: true},
		{LegacyID: 27, FullName: "Nur Sa'diyah", JoinDate: parseDate(""), IsActive: true},
		{LegacyID: 28, FullName: "Faizatur Rohmah", JoinDate: parseDate("2021-11-22"), IsActive: true},
		{LegacyID: 30, FullName: "Anita Khoirina, S.Pd", JoinDate: parseDate("2021-10-22"), IsActive: true},
		{LegacyID: 31, FullName: "Dhiayu  Choirun Nisak, S.Pd", JoinDate: parseDate("2022-06-06"), IsActive: true},
		{LegacyID: 32, FullName: "Qurrotul Azizah", JoinDate: parseDate("2022-08-26"), IsActive: true},
		{LegacyID: 33, FullName: "Ika Nur Istiqomah", JoinDate: parseDate("2022-10-25"), IsActive: true},
		{LegacyID: 36, FullName: "Rizky Nurus Shobah", JoinDate: parseDate("2023-09-04"), IsActive: true},
		{LegacyID: 38, FullName: "Nadlifatul Faniyah", JoinDate: parseDate("2023-08-15"), IsActive: true},
		{LegacyID: 39, FullName: "Khiqma Liatul Khoirina", JoinDate: parseDate("2025-09-15"), IsActive: true},
		{LegacyID: 40, FullName: "Anindya Margaretha Setya  Winara", JoinDate: parseDate("2025-09-15"), IsActive: true},
	}
	if err := db.Create(&employees).Error; err != nil {
		log.Printf("Seed koperasi employees gagal: %v", err)
		return
	}
	log.Printf("Seed koperasi: %d pegawai (referensi)", len(employees))
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
	// Hanya seed produk koperasi yang berelasi dengan fee items dengan stok default 500
	products := []barang.Product{
		{Name: "4 Stel Seragam", Category: "Seragam", Unit: "set", IsActive: true, Variants: []barang.Variant{
			{Name: barang.DefaultVariantName, CostPrice: 500000, SalePrice: 750000, Stock: 500, IsActive: true},
		}},
		{Name: "Rompi & Atribut Prasiaga", Category: "Seragam", Unit: "set", IsActive: true, Variants: []barang.Variant{
			{Name: barang.DefaultVariantName, CostPrice: 80000, SalePrice: 110000, Stock: 500, IsActive: true},
		}},
		{Name: "Tas Sekolah", Category: "Perlengkapan", Unit: "pcs", IsActive: true, Variants: []barang.Variant{
			{Name: barang.DefaultVariantName, CostPrice: 60000, SalePrice: 85000, Stock: 500, IsActive: true},
		}},
		{Name: "Kaos Kaki", Category: "Perlengkapan", Unit: "pcs", IsActive: true, Variants: []barang.Variant{
			{Name: barang.DefaultVariantName, CostPrice: 15000, SalePrice: 25000, Stock: 500, IsActive: true},
		}},
		{Name: "1 Set Lunch Box", Category: "Perlengkapan", Unit: "pcs", IsActive: true, Variants: []barang.Variant{
			{Name: barang.DefaultVariantName, CostPrice: 70000, SalePrice: 100000, Stock: 500, IsActive: true},
		}},
		{Name: "Baju Ganti", Category: "Seragam", Unit: "set", IsActive: true, Variants: []barang.Variant{
			{Name: barang.DefaultVariantName, CostPrice: 50000, SalePrice: 70000, Stock: 500, IsActive: true},
		}},
		{Name: "Buku DDTK", Category: "Buku", Unit: "pcs", IsActive: true, Variants: []barang.Variant{
			{Name: barang.DefaultVariantName, CostPrice: 12000, SalePrice: 20000, Stock: 500, IsActive: true},
		}},
		{Name: "Buku PK Karakter", Category: "Buku", Unit: "pcs", IsActive: true, Variants: []barang.Variant{
			{Name: barang.DefaultVariantName, CostPrice: 10000, SalePrice: 15000, Stock: 500, IsActive: true},
		}},
		{Name: "Kaos Field Trip", Category: "Seragam", Unit: "pcs", IsActive: true, Variants: []barang.Variant{
			{Name: barang.DefaultVariantName, CostPrice: 45000, SalePrice: 65000, Stock: 500, IsActive: true},
		}},
		{Name: "Map Hasil Karya", Category: "Perlengkapan", Unit: "pcs", IsActive: true, Variants: []barang.Variant{
			{Name: barang.DefaultVariantName, CostPrice: 18000, SalePrice: 25000, Stock: 500, IsActive: true},
		}},
		{Name: "Map Raport dan Foto Raport", Category: "Perlengkapan", Unit: "pcs", IsActive: true, Variants: []barang.Variant{
			{Name: barang.DefaultVariantName, CostPrice: 40000, SalePrice: 60000, Stock: 500, IsActive: true},
		}},
		{Name: "1 Seri Buku Asik Membaca", Category: "Buku", Unit: "pcs", IsActive: true, Variants: []barang.Variant{
			{Name: barang.DefaultVariantName, CostPrice: 25000, SalePrice: 40000, Stock: 500, IsActive: true},
		}},
		{Name: "Buku Kreatifitas", Category: "Buku", Unit: "pcs", IsActive: true, Variants: []barang.Variant{
			{Name: barang.DefaultVariantName, CostPrice: 70000, SalePrice: 100000, Stock: 500, IsActive: true},
		}},
		{Name: "2 Pcs Buku Jurnal", Category: "Buku", Unit: "pcs", IsActive: true, Variants: []barang.Variant{
			{Name: barang.DefaultVariantName, CostPrice: 20000, SalePrice: 30000, Stock: 500, IsActive: true},
		}},
		{Name: "Kalender", Category: "Perlengkapan", Unit: "pcs", IsActive: true, Variants: []barang.Variant{
			{Name: barang.DefaultVariantName, CostPrice: 20000, SalePrice: 30000, Stock: 500, IsActive: true},
		}},
		{Name: "Buku Kotak", Category: "Buku", Unit: "pcs", IsActive: true, Variants: []barang.Variant{
			{Name: barang.DefaultVariantName, CostPrice: 15000, SalePrice: 25000, Stock: 500, IsActive: true},
		}},
		{Name: "Jilbab Field Trip", Category: "Seragam", Unit: "pcs", IsActive: true, Variants: []barang.Variant{
			{Name: barang.DefaultVariantName, CostPrice: 25000, SalePrice: 35000, Stock: 500, IsActive: true},
		}},
	}
	if err := db.Create(&products).Error; err != nil {
		log.Printf("Seed koperasi products gagal: %v", err)
		return
	}
	log.Printf("Seed koperasi: %d barang", len(products))
}
