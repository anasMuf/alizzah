package seeders

import (
	"api/model"
	"log"
	"os"

	"gorm.io/gorm"
)

type feeItemDef struct {
	Category    string
	ItemKey     string
	Name        string
	Level       string
	Gender      string
	Amount      float64
	Unit        string
	IsMandatory bool // true = otomatis masuk tagihan per jenjang
}

func SeedFeeConfigs(db *gorm.DB) {
	var count int64
	db.Model(&model.FeeConfig{}).Count(&count)
	if count > 0 {
		log.Println("Fee configs sudah ada, skip seeder")
		return
	}

	var activeYear model.AcademicYear
	if err := db.Where("is_active = ?", true).First(&activeYear).Error; err != nil {
		log.Println("Gagal cari tahun ajaran aktif untuk fee config seeder:", err)
		return
	}

	fc := model.FeeConfig{
		AcademicYearID:   activeYear.ID,
		SavingsAdminRate: 2.50,
	}
	if err := db.Create(&fc).Error; err != nil {
		log.Println("Gagal membuat fee config:", err)
		return
	}

	koperasiItemKeys := map[string]bool{
		"seragam_4stel":     true,
		"rompi_prasiaga":    true,
		"tas_sekolah":       true,
		"kaos_kaki":         true,
		"lunch_box":         true,
		"baju_ganti":        true,
		"buku_ddtk":         true,
		"buku_pk_karakter":  true,
		"kaos_field_trip":   true,
		"map_hasil_karya":   true,
		"map_raport_foto":   true,
		"buku_asik_membaca": true,
		"buku_kreativitas":  true,
		"buku_jurnal":       true,
		"kalender":          true,
		"buku_kotak":        true,
		"jilbab_field_trip": true,
	}

	items := buildFeeConfigItems()
	for _, item := range items {
		fci := model.FeeConfigItem{
			FeeConfigID: fc.ID,
			Category:    item.Category,
			ItemKey:     item.ItemKey,
			Name:        item.Name,
			Level:       item.Level,
			Gender:      item.Gender,
			Amount:      item.Amount,
			Unit:        item.Unit,
			IsMandatory: item.IsMandatory,
		}

		if os.Getenv("KOPERASI_SEAM_ENABLED") == "true" && koperasiItemKeys[item.ItemKey] {
			fci.IsKoperasi = true

			// Dynamic lookup to associate seeded Koperasi products without import cycles
			var prodName string
			switch item.ItemKey {
			case "seragam_4stel":
				prodName = "4 Stel Seragam"
			case "rompi_prasiaga":
				prodName = "Rompi & Atribut Prasiaga"
			case "tas_sekolah":
				prodName = "Tas Sekolah"
			case "kaos_kaki":
				prodName = "Kaos Kaki"
			case "lunch_box":
				prodName = "1 Set Lunch Box"
			case "baju_ganti":
				prodName = "Baju Ganti"
			case "buku_ddtk":
				prodName = "Buku DDTK"
			case "buku_pk_karakter":
				prodName = "Buku PK Karakter"
			case "kaos_field_trip":
				prodName = "Kaos Field Trip"
			case "map_hasil_karya":
				prodName = "Map Hasil Karya"
			case "map_raport_foto":
				prodName = "Map Raport dan Foto Raport"
			case "buku_asik_membaca":
				prodName = "1 Seri Buku Asik Membaca"
			case "buku_kreativitas":
				prodName = "Buku Kreatifitas"
			case "buku_jurnal":
				prodName = "2 Pcs Buku Jurnal"
			case "kalender":
				prodName = "Kalender"
			case "buku_kotak":
				prodName = "Buku Kotak"
			case "jilbab_field_trip":
				prodName = "Jilbab Field Trip"
			}

			if prodName != "" {
				var prodID uint
				if err := db.Table("koperasi_products").Select("id").Where("name = ? AND is_active = ?", prodName, true).First(&prodID).Error; err == nil {
					fci.KoperasiProductID = &prodID
				}
			}
		}

		if err := db.Create(&fci).Error; err != nil {
			log.Printf("Gagal membuat fee item '%s' (level=%s): %v", item.Name, item.Level, err)
		}
	}
	log.Printf("Fee config seeder berhasil (%d items)", len(items))
}

func buildFeeConfigItems() []feeItemDef {
	var items []feeItemDef

	// === SPP (monthly_spp) — semester 1 (Jul-Des) & semester 2 (Jan-Jun) ===
	items = append(items,
		feeItemDef{"monthly_spp", "spp_kb_sem1", "SPP KB (Sem 1)", "mutiara", "all", 150000, "fixed", false},
		feeItemDef{"monthly_spp", "spp_kb_sem2", "SPP KB (Sem 2)", "mutiara", "all", 175000, "fixed", false},
		feeItemDef{"monthly_spp", "spp_tk_sem1", "SPP TK (Sem 1)", "intan", "all", 150000, "fixed", false},
		feeItemDef{"monthly_spp", "spp_tk_sem2", "SPP TK (Sem 2)", "intan", "all", 175000, "fixed", false},
		feeItemDef{"monthly_spp", "spp_tk_sem1", "SPP TK (Sem 1)", "berlian", "all", 150000, "fixed", false},
		feeItemDef{"monthly_spp", "spp_tk_sem2", "SPP TK (Sem 2)", "berlian", "all", 175000, "fixed", false},
	)

	// === Infaq Harian (monthly_infaq) ===
	items = append(items,
		feeItemDef{"monthly_infaq", "infaq_harian", "Infaq Harian", "all", "all", 6000, "per_day", false},
	)

	// === Biaya Awal (initial) ===
	initialItems := []struct {
		key    string
		name   string
		amount float64
	}{
		{"seragam_4stel", "4 Stel Seragam", 765000},
		{"rompi_prasiaga", "Atribut Prasiaga", 110000},
		{"tas_sekolah", "1 Tas Sekolah", 85000},
		{"kaos_kaki", "2 Pc Kaos Kaki", 25000},
		{"lunch_box", "1 Set Lunch Box", 100000},
		{"baju_ganti", "1 Stel Baju Ganti", 70000},
		{"infaq_sarpras", "Infaq Sarpras", 500000},
		{"infaq_ape", "Infaq APE", 600000},
		{"buku_ddtk", "Buku DDTK", 20000},
		{"biaya_psikotes", "Psikotes IQ", 150000},
	}
	for _, it := range initialItems {
		items = append(items, feeItemDef{"initial", it.key, it.name, "all", "all", it.amount, "fixed", false})
	}

	// === Biaya Registrasi (registration) — per jenjang ===
	type regItem struct {
		key     string
		name    string
		intan   float64
		berlian float64
		mutiara float64
		gender  string
	}
	regItems := []regItem{
		{"biaya_mpls", "Biaya MPLS", 100000, 100000, 100000, "all"},
		{"buku_bayar", "Buku Bayar", 10000, 10000, 10000, "all"},
		{"infaq_awal_tabungan", "Infaq Awal Tabungan", 10000, 10000, 10000, "all"},
		{"buku_pk_karakter", "Buku PK Karakter", 20000, 20000, 20000, "all"},
		{"kaos_field_trip", "Kaos Field Trip", 75000, 75000, 75000, "all"},
		{"map_hasil_karya", "Map Hasil Karya", 30000, 0, 30000, "all"},
		{"map_raport_foto", "Map Raport dan Foto Raport", 60000, 0, 60000, "all"},
		{"alat_belajar", "Alat Belajar", 200000, 200000, 150000, "all"},
		{"buku_asik_membaca", "1 Seri Buku Asik Membaca", 50000, 0, 0, "all"},
		{"buku_kreativitas", "Buku Kreatifitas", 120000, 120000, 120000, "all"},
		{"iuran_kegiatan", "Iuran Kegiatan Kecamatan/Kabupaten", 100000, 100000, 100000, "all"},
		{"buku_jurnal", "2 Pcs Buku Jurnal", 30000, 30000, 30000, "all"},
		{"administrasi_lpp", "Administrasi LPP (4 Trimester)", 60000, 60000, 60000, "all"},
		{"kalender", "Kalender", 30000, 30000, 30000, "all"},
		{"buku_kotak", "Buku Kotak", 30000, 30000, 0, "all"},
		{"jilbab_field_trip", "Jilbab Field Trip", 40000, 40000, 40000, "P"},
		}
	for _, r := range regItems {
		levelAmounts := map[string]float64{
			"mutiara": r.mutiara,
			"intan":   r.intan,
			"berlian": r.berlian,
		}
		for level, amount := range levelAmounts {
			if amount > 0 {
				items = append(items, feeItemDef{"registration", r.key, r.name, level, r.gender, amount, "fixed", false})
			}
		}
	}

	// === Pasta (unified: calisan + ekskul + pasta) ===
	type pastaItem struct {
		key       string
		name      string
		level     string
		amount    float64
		mandatory bool
	}
	pastaItems := []pastaItem{
		{"pasta_aslin", "Aslin (Asah Literasi Numerasi)", "intan", 25000, true},
		{"pasta_aslin", "Aslin (Asah Literasi Numerasi)", "berlian", 25000, true},
		{"pasta_calisan", "Calisan (Baca Tulis Al Qur'an)", "mutiara", 50000, false},
		{"pasta_calisan", "Calisan (Baca Tulis Al Qur'an)", "intan", 50000, false},
		{"pasta_calisan", "Calisan (Baca Tulis Al Qur'an)", "berlian", 50000, false},
		{"pasta_robotika", "Robotika", "intan", 100000, false},
		{"pasta_robotika", "Robotika", "berlian", 100000, false},
		{"pasta_sempoa", "Sempoa Kids", "intan", 50000, false},
		{"pasta_sempoa", "Sempoa Kids", "berlian", 50000, false},
		{"pasta_laptop", "Laptop Kids", "intan", 100000, false},
		{"pasta_laptop", "Laptop Kids", "berlian", 100000, false},
		{"pasta_tilawah", "Tilawah & Tahfidz Surat Pendek", "intan", 50000, false},
		{"pasta_tilawah", "Tilawah & Tahfidz Surat Pendek", "berlian", 50000, false},
		{"pasta_taekwondo", "Taekwondo", "intan", 50000, false},
		{"pasta_taekwondo", "Taekwondo", "berlian", 50000, false},
		{"pasta_menari", "Menari & Fashion Show", "mutiara", 50000, false},
		{"pasta_menari", "Menari & Fashion Show", "intan", 50000, false},
		{"pasta_menari", "Menari & Fashion Show", "berlian", 50000, false},
		{"pasta_melukis", "Melukis & Mewarnai", "mutiara", 50000, false},
		{"pasta_melukis", "Melukis & Mewarnai", "intan", 50000, false},
		{"pasta_melukis", "Melukis & Mewarnai", "berlian", 50000, false},
		{"pasta_menyanyi", "Menyanyi", "mutiara", 50000, false},
		{"pasta_menyanyi", "Menyanyi", "intan", 50000, false},
		{"pasta_menyanyi", "Menyanyi", "berlian", 50000, false},
		{"pasta_keyboard", "Musik Keyboard", "intan", 50000, false},
		{"pasta_keyboard", "Musik Keyboard", "berlian", 50000, false},
	}
	for _, p := range pastaItems {
		items = append(items, feeItemDef{"pasta", p.key, p.name, p.level, "all", p.amount, "fixed", p.mandatory})
	}

	// === Tabungan Wajib Berlian ===
	items = append(items,
		feeItemDef{"savings_mandatory", "tabungan_wajib", "Tabungan Wajib Berlian", "berlian", "all", 15000, "per_monday", false},
	)

	// === Tabungan Wajib Mutiara ===
	items = append(items,
		feeItemDef{"savings_mandatory", "tabungan_wajib_mutiara", "Tabungan Wajib Mutiara", "mutiara", "all", 10000, "fixed", false},
	)

	// === Daycare ===
	// Biaya Awal (hanya Premium)
	items = append(items, feeItemDef{"daycare", "daycare_premium_initial", "Biaya Awal Daycare Premium", "all", "all", 400000, "fixed", false})

	// SPD Premium (flat bulanan)
	daycareSPD := []struct {
		key    string
		name   string
		amount float64
	}{
		{"daycare_premium_0715_kbtk_spd", "SPD Premium 07-15 KB-TK", 400000},
		{"daycare_premium_0715_under3_spd", "SPD Premium 07-15 <3th", 500000},
		{"daycare_premium_1015_kbtk_spd", "SPD Premium 10-15 KB-TK", 300000},
		{"daycare_premium_1015_under3_spd", "SPD Premium 10-15 <3th", 400000},
		{"daycare_premium_1013_kbtk_spd", "SPD Premium 10-13 KB-TK", 200000},
		{"daycare_premium_1013_under3_spd", "SPD Premium 10-13 <3th", 300000},
	}
	for _, d := range daycareSPD {
		items = append(items, feeItemDef{"daycare", d.key, d.name, "all", "all", d.amount, "fixed", false})
	}

	// SPD Regular (per hari, × kehadiran)
	daycareDaily := []struct {
		key    string
		name   string
		amount float64
	}{
		{"daycare_regular_0715_kbtk_daily", "SPD Regular 07-15 KB-TK", 20000},
		{"daycare_regular_0715_under3_daily", "SPD Regular 07-15 <3th", 25000},
		{"daycare_regular_1015_kbtk_daily", "SPD Regular 10-15 KB-TK", 15000},
		{"daycare_regular_1015_under3_daily", "SPD Regular 10-15 <3th", 20000},
		{"daycare_regular_1013_kbtk_daily", "SPD Regular 10-13 KB-TK", 10000},
		{"daycare_regular_1013_under3_daily", "SPD Regular 10-13 <3th", 15000},
	}
	for _, d := range daycareDaily {
		items = append(items, feeItemDef{"daycare", d.key, d.name, "all", "all", d.amount, "per_day", false})
	}

	// Konsumsi & TPQ
	items = append(items,
		feeItemDef{"daycare", "daycare_premium_meal", "Paket Konsumsi Premium", "all", "all", 400000, "fixed", false},
		feeItemDef{"daycare", "daycare_regular_meal", "Paket Konsumsi Regular", "all", "all", 20000, "per_day", false},
		feeItemDef{"daycare", "daycare_premium_tpq", "Lanjut TPQ Premium", "all", "all", 80000, "fixed", false},
		feeItemDef{"daycare", "daycare_regular_tpq", "Lanjut TPQ Regular", "all", "all", 4000, "per_day", false},
	)

	// === Wisuda (placeholder) ===
	items = append(items,
		feeItemDef{"graduation", "biaya_wisuda", "Biaya Wisuda", "berlian", "all", 0, "fixed", false},
	)

	// === Fasilitas ===
	// === Fasilitas: fee item dibuat otomatis oleh facility seeder ===

	return items
}
