package seeders

import (
	"api/model"
	"log"

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
		if err := db.Create(&fci).Error; err != nil {
			log.Printf("Gagal membuat fee item '%s' (level=%s): %v", item.Name, item.Level, err)
		}
	}
	log.Printf("Fee config seeder berhasil (%d items)", len(items))
}

func buildFeeConfigItems() []feeItemDef {
	var items []feeItemDef

	// === SPP (monthly_spp) ===
	items = append(items,
		feeItemDef{"monthly_spp", "spp_kb", "SPP KB", "mutiara", "all", 150000, "fixed", false},
		feeItemDef{"monthly_spp", "spp_tk", "SPP TK", "intan", "all", 150000, "fixed", false},
		feeItemDef{"monthly_spp", "spp_tk", "SPP TK", "berlian", "all", 150000, "fixed", false},
	)

	// === Infaq Harian (monthly_infaq) ===
	items = append(items,
		feeItemDef{"monthly_infaq", "infaq_harian", "Infaq Harian", "all", "all", 7000, "per_day", false},
	)

	// === Biaya Awal (initial) ===
	initialItems := []struct {
		key    string
		name   string
		amount float64
	}{
		{"seragam_4stel", "4 Stel Seragam", 750000},
		{"rompi_prasiaga", "1 pc Rompi & Atribut Prasiaga", 110000},
		{"tas_sekolah", "1 Tas Sekolah", 85000},
		{"kaos_kaki", "2 Pasang Kaos Kaki", 25000},
		{"lunch_box", "1 Set Lunch Box", 100000},
		{"baju_ganti", "1 Stel Baju Ganti", 70000},
		{"infaq_sarpras", "Infaq Sarpras", 500000},
		{"infaq_ape", "Infaq APE", 600000},
		{"buku_ddtk", "Buku DDTK", 20000},
		{"biaya_psikotes", "Biaya Psikotes IQ", 150000},
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
		{"buku_pk_karakter", "Buku PK Karakter", 15000, 15000, 15000, "all"},
		{"kaos_field_trip", "Kaos Field Trip", 65000, 65000, 65000, "all"},
		{"map_hasil_karya", "Map Hasil Karya", 25000, 25000, 25000, "all"},
		{"map_raport_foto", "Map Raport dan Foto Raport", 60000, 0, 50000, "all"},
		{"alat_belajar", "Alat Belajar", 200000, 200000, 150000, "all"},
		{"buku_asik_membaca", "1 Seri Buku Asik Membaca", 40000, 0, 0, "all"},
		{"buku_kreativitas", "Buku Kreatifitas", 100000, 100000, 100000, "all"},
		{"iuran_kegiatan", "Iuran Kegiatan Kecamatan/Kabupaten", 80000, 80000, 80000, "all"},
		{"buku_jurnal", "2 Pcs Buku Jurnal", 30000, 30000, 30000, "all"},
		{"administrasi_lpp", "Administrasi LPP (4 Trimester)", 60000, 60000, 60000, "all"},
		{"kalender", "Kalender", 30000, 30000, 30000, "all"},
		{"buku_kotak", "Buku Kotak", 0, 25000, 0, "all"},
		{"jilbab_field_trip", "Jilbab Field Trip", 35000, 35000, 35000, "P"},
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

	// === Pasta ===
	pastaItems := []struct {
		key    string
		name   string
		amount float64
	}{
		{"pasta_robotika", "Pasta Robotika", 100000},
		{"pasta_sempoa", "Pasta Sempoa Kids", 50000},
		{"pasta_tilawah", "Pasta Tilawah", 50000},
		{"pasta_laptop", "Pasta Laptop Kids", 100000},
		{"pasta_taekwondo", "Pasta Taekwondo", 50000},
		{"pasta_tari", "Pasta Tari", 50000},
		{"pasta_melukis", "Pasta Melukis", 50000},
		{"pasta_menyanyi", "Pasta Menyanyi", 50000},
	}
	for _, p := range pastaItems {
		items = append(items, feeItemDef{"pasta", p.key, p.name, "all", "all", p.amount, "fixed", false})
	}

	// === Calisan (wajib per jenjang) ===
	items = append(items,
		feeItemDef{"calisan", "calisan_kb", "Calisan KB", "mutiara", "all", 50000, "fixed", true},
		feeItemDef{"calisan", "calisan_tk", "Calisan TK", "intan", "all", 50000, "fixed", true},
		feeItemDef{"calisan", "calisan_tk", "Calisan TK", "berlian", "all", 50000, "fixed", true},
	)

	// === Ekskul wajib (Aslin untuk Berlian) ===
	items = append(items,
		feeItemDef{"ekskul", "ekskul_aslin", "Aslin", "berlian", "all", 25000, "fixed", true},
	)

	// === Tabungan Wajib Berlian ===
	items = append(items,
		feeItemDef{"savings_mandatory", "tabungan_wajib", "Tabungan Wajib Berlian", "berlian", "all", 10000, "per_monday", false},
	)

	// === Daycare ===
	daycareItems := []struct {
		key    string
		name   string
		amount float64
		unit   string
	}{
		{"daycare_pendaftaran", "Pendaftaran Daycare", 150000, "fixed"},
		{"daycare_akomodasi", "Akomodasi Daycare", 250000, "fixed"},
		{"daycare_spd_kb", "SPD Bulanan KB", 200000, "fixed"},
		{"daycare_spd_tk", "SPD Bulanan TK", 400000, "fixed"},
		{"daycare_paket_kb", "Paket Bulanan KB", 500000, "fixed"},
		{"daycare_paket_tk", "Paket Bulanan TK", 900000, "fixed"},
		{"daycare_harian", "SPP Harian Lepas", 15000, "fixed"},
		{"daycare_paket_harian", "Paket Harian", 35000, "fixed"},
		{"daycare_konsumsi", "Biaya Konsumsi", 20000, "per_day"},
	}
	for _, d := range daycareItems {
		items = append(items, feeItemDef{"daycare", d.key, d.name, "all", "all", d.amount, d.unit, false})
	}

	// === Wisuda (placeholder) ===
	items = append(items,
		feeItemDef{"graduation", "biaya_wisuda", "Biaya Wisuda", "berlian", "all", 0, "fixed", false},
	)

	// === Fasilitas ===
	items = append(items,
		feeItemDef{"facility", "facility_antar_jemput", "Antar Jemput", "all", "all", 15000, "per_day", false},
	)

	return items
}
