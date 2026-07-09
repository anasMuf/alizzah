package seeders

import (
	"api/model"
	"log"
	"time"

	"gorm.io/gorm"
)

type legacyStudent struct {
	Name       string
	Gender     string
	ClassGroup string
	BirthPlace string // kosong untuk siswa naik (data TTL belum tersedia)
	BirthDate  string // format "2006-01-02"; kosong => pakai placeholder
}

func SeedStudentsFromLegacy(db *gorm.DB) {
	var count int64
	db.Model(&model.Student{}).Count(&count)
	if count > 0 {
		log.Println("Students sudah ada, skip seeder")
		return
	}

	// Lookup active academic year
	var activeYear model.AcademicYear
	if err := db.Where("is_active = ?", true).First(&activeYear).Error; err != nil {
		log.Println("Gagal cari tahun ajaran aktif untuk student import:", err)
		return
	}

	// Lookup superadmin user for created_by
	var admin model.User
	if err := db.Where("role = ?", "superadmin").First(&admin).Error; err != nil {
		log.Println("Gagal cari superadmin untuk student import:", err)
		return
	}

	// Cache class groups by name
	var classGroups []model.ClassGroup
	db.Where("academic_year_id = ?", activeYear.ID).Find(&classGroups)
	cgMap := make(map[string]model.ClassGroup)
	for _, cg := range classGroups {
		cgMap[cg.Name] = cg
	}

	students := legacyStudentData()
	placeholderBirthDate := time.Date(2020, 1, 1, 0, 0, 0, 0, time.UTC)
	enrollmentStart := activeYear.StartDate

	var totalStudents, totalEnrollments, totalSavings, totalEvents int

	for _, s := range students {
		// Resolve tempat & tanggal lahir (PPDB punya data asli; siswa naik pakai placeholder)
		birthDate := placeholderBirthDate
		if s.BirthDate != "" {
			if t, err := time.Parse("2006-01-02", s.BirthDate); err == nil {
				birthDate = t
			} else {
				log.Printf("Tanggal lahir '%s' tidak valid untuk siswa '%s', pakai placeholder", s.BirthDate, s.Name)
			}
		}

		// Create student
		student := model.Student{
			FullName:      s.Name,
			BirthPlace:    s.BirthPlace,
			BirthDate:     birthDate,
			Gender:        s.Gender,
			Status:        "active",
			IsDaycareOnly: false,
		}
		if err := db.Create(&student).Error; err != nil {
			log.Printf("Gagal membuat siswa '%s': %v", s.Name, err)
			continue
		}
		totalStudents++

		// Create enrollment
		cg, ok := cgMap[s.ClassGroup]
		if !ok {
			log.Printf("Class group '%s' tidak ditemukan untuk siswa '%s'", s.ClassGroup, s.Name)
			continue
		}

		// enrollment_type per kategori rombel:
		//   - Mutiara 1-5 (siswa baru PPDB KB) → "new"
		//   - Rombel dengan IsMutation=true (siswa baru PPDB TK) → "mutation"
		//   - Intan & Berlian lainnya (siswa naik kelas) → "promotion"
		// Siswa "promotion" TIDAK dapat tagihan biaya awal: biaya awal sudah dibayar
		// saat pertama masuk di TA sebelumnya (yang tidak ikut di-seed), jadi dikosongkan.
		enrollmentType := "promotion"
		switch {
		case cg.IsMutation:
			enrollmentType = "mutation"
		case cg.Level == "mutiara":
			enrollmentType = "new"
		}
		isMutation := enrollmentType == "mutation"

		enrollment := model.StudentEnrollment{
			StudentID:      student.ID,
			ClassGroupID:   cg.ID,
			AcademicYearID: activeYear.ID,
			StartDate:      enrollmentStart,
			Status:         "active",
			EnrollmentType: enrollmentType,
			CreatedBy:      admin.ID,
		}
		if err := db.Create(&enrollment).Error; err != nil {
			log.Printf("Gagal membuat enrollment siswa '%s': %v", s.Name, err)
		} else {
			totalEnrollments++
		}

		// Catat event transfer_in untuk siswa mutasi
		if isMutation {
			event := model.StudentAcademicEvent{
				StudentID:        student.ID,
				AcademicYearID:   activeYear.ID,
				FromClassGroupID: nil,
				ToClassGroupID:   &cg.ID,
				EventType:        "transfer_in",
				EventDate:        enrollmentStart,
				Notes:            "Siswa mutasi (data seed)",
				CreatedBy:        admin.ID,
			}
			if err := db.Create(&event).Error; err != nil {
				log.Printf("Gagal membuat event transfer_in siswa '%s': %v", s.Name, err)
			} else {
				totalEvents++
			}
		}

		// Create general savings
		generalSavings := model.StudentSavings{
			StudentID: student.ID,
			Type:      "general",
			Balance:   0,
		}
		if err := db.Create(&generalSavings).Error; err != nil {
			log.Printf("Gagal membuat tabungan umum siswa '%s': %v", s.Name, err)
		} else {
			totalSavings++
		}

		// Create mandatory savings for Berlian students
		if cg.Level == "berlian" {
			mandatorySavings := model.StudentSavings{
				StudentID: student.ID,
				Type:      "mandatory",
				Balance:   0,
			}
			if err := db.Create(&mandatorySavings).Error; err != nil {
				log.Printf("Gagal membuat tabungan wajib siswa '%s': %v", s.Name, err)
			} else {
				totalSavings++
			}
		}
	}

	log.Printf("Student import seeder berhasil (%d siswa, %d enrollment, %d tabungan, %d event transfer_in)", totalStudents, totalEnrollments, totalSavings, totalEvents)
}

// legacyStudentData berisi data siswa TA 2026/2027, bersumber dari:
//   - docs/core/src/rombel_siswa_2026_2027_fix.md (pembagian rombel final)
//
// Catatan:
//   - Mutiara 1–5: siswa baru PPDB KB (ada data tempat/tanggal lahir dari PPDB sebelumnya).
//   - Intan 1 & 8: rombel mutasi (siswa baru PPDB TK, ada data TTL dari PPDB).
//   - Intan 2–7: siswa naik dari KB ke TK A (tanpa data TTL, pakai placeholder).
//   - Berlian 1–8: siswa naik dari TK A ke TK B (tanpa data TTL, pakai placeholder).
//   - Beberapa siswa baru PPDB yang tidak ada data TTL sebelumnya dikosongkan.
func legacyStudentData() []legacyStudent {
	return []legacyStudent{
		// === Mutiara 1 (KB) — 11 siswa ===
		{"ARSYA KALIEF ROMADONI", "L", "Mutiara 1", "Mojokerto", "2023-04-03"},
		{"WAHYU RADITTYA NUR AIDI", "L", "Mutiara 1", "Mojokerto", "2022-05-21"},
		{"DWINDA AQILATUNNISA", "P", "Mutiara 1", "", ""},
		{"ACHMAD ALI SALIM", "L", "Mutiara 1", "Mojokerto", "2022-06-18"},
		{"ZEA ALMAHYRA", "P", "Mutiara 1", "", ""},
		{"CEISYA ALMAHYRA RAMADHANI", "P", "Mutiara 1", "Mojokerto", "2023-04-05"},
		{"ALMEERA SAFA FARADISA", "P", "Mutiara 1", "Mojokerto", "2023-02-13"},
		{"MOCH. DHOFRON AL BARRA", "L", "Mutiara 1", "Mojokerto", "2022-01-06"},
		{"BARAKKA SULAIMAN", "L", "Mutiara 1", "Mojokerto", "2023-01-20"},
		{"MUHAMMAD FATHAN ALFARIZI", "L", "Mutiara 1", "Mojokerto", "2023-01-18"},
		{"AKBAR RAYYAN AL FARIZQI", "L", "Mutiara 1", "", ""},

		// === Mutiara 2 (KB) — 11 siswa ===
		{"EZHAR AL FAIZAN NUGROHO", "L", "Mutiara 2", "Mojokerto", "2022-07-14"},
		{"ROHMAD SUKAWAIDA", "L", "Mutiara 2", "Mojokerto", "2022-06-22"},
		{"NAUREEN GHANIA ALMAHYRA", "P", "Mutiara 2", "Mojokerto", "2023-02-01"},
		{"MUHAMMAD SAKDULLOH", "L", "Mutiara 2", "", ""},
		{"MUHAMMAD ZAVIER ALFARIZKY", "L", "Mutiara 2", "Mojokerto", "2022-11-22"},
		{"MUHAMMAD AZAM ATOULLOH MUSTOFA", "L", "Mutiara 2", "Mojokerto", "2023-01-23"},
		{"FATHAN TSAQIF ALGHIFARI", "L", "Mutiara 2", "Mojokerto", "2022-12-31"},
		{"SYAKILA HUMAIRA AZZAHRA", "P", "Mutiara 2", "Mojokerto", "2023-05-18"},
		{"IVONNY ANASTASYA SAVITRI", "P", "Mutiara 2", "Mojokerto", "2023-07-01"},
		{"ARHAM ALKHALIFI ARUMANPUTRA", "L", "Mutiara 2", "", ""},
		{"MAHREEN SHAFANA ALMAHYRA", "P", "Mutiara 2", "Mojokerto", "2022-10-25"},

		// === Mutiara 3 (KB) — 11 siswa ===
		{"FLORETTA SYAFAZEA HARUMI PUTRI", "P", "Mutiara 3", "Mojokerto", "2022-11-27"},
		{"ABBIYA HANENDA", "L", "Mutiara 3", "Bekasi", "2022-03-18"},
		{"REINA AKIARA SALSA", "P", "Mutiara 3", "Mojokerto", "2022-03-10"},
		{"DIVANA DANIA KHANZA", "P", "Mutiara 3", "Mojokerto", "2022-06-07"},
		{"AHMAD ZAYN ANAQI TAAMIR", "L", "Mutiara 3", "Mojokerto", "2022-03-31"},
		{"MUHAMMAD AZMI ATTHAULAH FAHMI", "L", "Mutiara 3", "Mojokerto", "2022-12-24"},
		{"MUHAMMAD GIBRAN ARRASYID", "L", "Mutiara 3", "Mojokerto", "2022-09-21"},
		{"MUHAMMAD NADEO BAGUS ANΑΝΤΑ", "L", "Mutiara 3", "Mojokerto", "2022-04-05"},
		{"ALEEYA KHAIRUNNISA", "P", "Mutiara 3", "Mojokerto", "2022-09-07"},
		{"DHEFIN RADEVA FIRMANSYAH", "L", "Mutiara 3", "Jombang", "2022-06-24"},
		{"ALWA KAIFIYA MAFAZA", "P", "Mutiara 3", "", ""},

		// === Mutiara 4 (KB) — 11 siswa ===
		{"AHMAD GALVIN PUTRA ASWIN", "L", "Mutiara 4", "Mojokerto", "2022-07-02"},
		{"ADRIAN FARZAN GHIFARI", "L", "Mutiara 4", "Mojokerto", "2022-12-10"},
		{"MUHAMMAD ARYA WIJAYA NUR ICHWAN", "L", "Mutiara 4", "Mojokerto", "2022-08-21"},
		{"MUHAMMAD RAFFASYA AL FATIH", "L", "Mutiara 4", "Mojokerto", "2022-12-05"},
		{"ADIBA HAFIZHAH NUR AKBAR", "P", "Mutiara 4", "Mojokerto", "2022-09-04"},
		{"DEOLINDA CINTA GAVAPUTRI RAHMAN", "P", "Mutiara 4", "Mojokerto", "2022-05-14"},
		{"DHEFAN GHAVA FIRMANSYAH", "L", "Mutiara 4", "Jombang", "2022-06-24"},
		{"DZAKIYAH RIKZATUNNISSA", "P", "Mutiara 4", "Mojokerto", "2023-01-01"},
		{"KAYVIN AHMADSYAH", "L", "Mutiara 4", "Mojokerto", "2023-08-25"},
		{"FARDAN ZAID AMRULLOH", "L", "Mutiara 4", "", ""},
		{"QUEENA MIKAYLA", "P", "Mutiara 4", "Mojokerto", "2022-08-25"},

		// === Mutiara 5 (KB) — 10 siswa ===
		{"REIGA DEAN PRATAMA", "L", "Mutiara 5", "Mojokerto", "2022-10-18"},
		{"DEVANYA ZIANNISA GRISTI", "P", "Mutiara 5", "", ""},
		{"AYDAN GHANI ARTA QOLBI", "L", "Mutiara 5", "", ""},
		{"MUHAMMAD ABIDZAR ALFARIZQI PRAYOGA", "L", "Mutiara 5", "", ""},
		{"MUHAMMAD FAZHIL ZULQARNAEN", "L", "Mutiara 5", "", ""},
		{"BIANCA HANA SYAHREENA", "P", "Mutiara 5", "", ""},
		{"BATARA DAMARIO SADEWO", "L", "Mutiara 5", "", ""},
		{"SHANUM FARZANA ZAYN", "P", "Mutiara 5", "", ""},
		{"IBNU HAFIZ YASATAMA", "L", "Mutiara 5", "", ""},
		{"DERREN ATTHARAZKA IBRAHIM", "L", "Mutiara 5", "Mojokerto", "2023-02-01"},

		// === Intan 1 (TK A) — 12 siswa ===
		{"MUHAMMAD ABRISAM ZHAFRAN AL KARIM", "L", "Intan 1", "Mojokerto", "2021-12-25"},
		{"MUHAMMAD KENZO AL KAUTSAR", "L", "Intan 1", "Mojokerto", "2021-06-09"},
		{"RAJENDRA UTTUNGGA SISWANTO", "L", "Intan 1", "Surabaya", "2021-11-05"},
		{"DZALENA HELINKA EDRIANNA", "L", "Intan 1", "Mojokerto", "2021-05-05"},
		{"AXANU GHAZALA AKBAR", "L", "Intan 1", "Mojokerto", "2022-03-15"},
		{"FIZA ZAFIA FATCHURROHMAN", "P", "Intan 1", "Mojokerto", "2021-08-10"},
		{"KEYNARRA ALLURA GISKA", "P", "Intan 1", "Mojokerto", "2022-04-16"},
		{"RAYYA FAHIMA SALWA RAMADHANI", "P", "Intan 1", "Mojokerto", "2021-04-27"},
		{"EARLYTA REYFISYA PUTRI", "P", "Intan 1", "Mojokerto", "2021-07-13"},
		{"AZHIFA KHALISA NAADHIRA", "P", "Intan 1", "Mojokerto", "2021-11-10"},
		{"MUHAMMAD DWI RIFKI VIRENDRA", "L", "Intan 1", "Mojokerto", "2021-08-02"},
		{"CIARA FREDELLA ARIANTO", "P", "Intan 1", "Mojokerto", "2021-10-19"},

		// === Intan 2 (TK A) — 12 siswa ===
		{"ISMATUL MAULA NIHAYA", "P", "Intan 2", "Mojokerto", "2021-03-13"},
		{"MAUZA ALMEER SAVERIO", "L", "Intan 2", "Mojokerto", "2021-04-28"},
		{"AHMAD ZAYN ALMAHDI", "L", "Intan 2", "", ""},
		{"AKALANKA ZUHAIR SYAHPUTRA", "L", "Intan 2", "", ""},
		{"AQILA KHANZA ADZKIYA", "P", "Intan 2", "", ""},
		{"AQILA ZALFA SABIRA", "P", "Intan 2", "", ""},
		{"GIBRAN NAFIZA ALFARUQ", "L", "Intan 2", "", ""},
		{"HAMZAH NEAS ALHANAN", "L", "Intan 2", "", ""},
		{"KEVIN ARSENIO AL'AFNI FAHLEVI", "L", "Intan 2", "", ""},
		{"KHALISA NOURA SUBAGYO", "P", "Intan 2", "", ""},
		{"NAURA RAYYANI AZIS", "P", "Intan 2", "", ""},
		{"ZUNAIRA BELLVANIA SAFARAZ", "P", "Intan 2", "", ""},

		// === Intan 3 (TK A) — 13 siswa ===
		{"MUHAMMAD HAFIY AL MUBAROK", "L", "Intan 3", "Mojokerto", "2021-07-21"},
		{"ALFAREZEL ARFAN WIRADHARMA", "L", "Intan 3", "", ""},
		{"AURORA BELVANIA ANTINI PUTRI", "P", "Intan 3", "", ""},
		{"AZKIA ZELINE SIFABELLA", "P", "Intan 3", "", ""},
		{"KENZIE FAEYZA VICHO ALLEXA", "L", "Intan 3", "", ""},
		{"KENZO RIFDAN AIRLANGGA", "L", "Intan 3", "", ""},
		{"MUHAMMAD ARSHAKA AZ ZAQI", "L", "Intan 3", "", ""},
		{"MUHAMMAD MISBAHUL ASRIF", "L", "Intan 3", "", ""},
		{"MUHAMMAD ZULKARNAIN ALQORNI", "L", "Intan 3", "", ""},
		{"NAJEELA ARTANTI NURLAILA", "P", "Intan 3", "", ""},
		{"RAFARDAN ATHALA AL FARIZKI", "L", "Intan 3", "", ""},
		{"AESTETIKA KAIFAH ARUNIKA", "P", "Intan 3", "", ""},
		{"CLARESTA MEISIELLA FITRI", "P", "Intan 3", "", ""},

		// === Intan 4 (TK A) — 12 siswa ===
		{"MIRZA HANIF ALFARIZQI", "L", "Intan 4", "Mojokerto", "2021-05-07"},
		{"BRYAN GHAVA ALRIZKY", "L", "Intan 4", "Mojokerto", "2021-11-13"},
		{"ABRISAM AHMAD REYNAN HARTANTO", "L", "Intan 4", "Surabaya", "2021-05-25"},
		{"ATAYA ZAIDAN RIZKI MUHAMMAD", "L", "Intan 4", "Mojokerto", "2021-01-01"},
		{"FELIA AZZA REYNA SABRIAH", "P", "Intan 4", "Mojokerto", "2021-05-25"},
		{"AYESHA KHAIRIYAH RABBANI", "P", "Intan 4", "Mojokerto", "2021-06-25"},
		{"ANNASYA NUR ISLAMADINA", "P", "Intan 4", "Mojokerto", "2021-12-28"},
		{"ZALFA AGHNIA PUTRI ERVANDIA", "P", "Intan 4", "Surabaya", "2021-06-13"},
		{"YASMIN PUTRI SHAKAYLA ZEA", "P", "Intan 4", "Mojokerto", "2021-09-29"},
		{"SHAKILA NAURA AZZAHRA", "P", "Intan 4", "Mojokerto", "2021-08-08"},
		{"CALLISTA HANIN SYAHIRA", "P", "Intan 4", "Mojokerto", "2021-03-02"},
		{"NUH TINATAR AUNILLAH", "L", "Intan 4", "Mojokerto", "2022-01-31"},

		// === Intan 5 (TK A) — 12 siswa ===
		{"MUHAMMAD ADHAM FAIQ ALFARIZQI", "L", "Intan 5", "Mojokerto", "2021-02-05"},
		{"MUHAMMAD DYLAN YUSUF DZUHAIRI", "L", "Intan 5", "Mojokerto", "2021-10-09"},
		{"ADZKIYA NAILA NADIRA", "P", "Intan 5", "", ""},
		{"AMARA SHAZA QAMIRA", "P", "Intan 5", "", ""},
		{"ARETA PUTRI AYU KIRANA", "P", "Intan 5", "", ""},
		{"EBRAHIM AL FARABI", "L", "Intan 5", "", ""},
		{"FADLAN APRILLIO ALFARIZKI", "L", "Intan 5", "", ""},
		{"SHELMA HILYA NAZIRA AFNUR", "P", "Intan 5", "", ""},
		{"FEISYA ZEA ATHALIA", "P", "Intan 5", "", ""},
		{"SAYYIDAH AISYAH AL HAWARIYYUN", "P", "Intan 5", "", ""},
		{"NAFEEZA AZZAHRA PRASANTI", "P", "Intan 5", "", ""},
		{"MOC RAFIF ALFARIZI SETIAWAN", "L", "Intan 5", "", ""},

		// === Intan 6 (TK A) — 13 siswa ===
		{"KHALIESAH AZZAHRA HUMAIRA MAHVEEN", "P", "Intan 6", "Mojokerto", "2021-05-01"},
		{"AMARA ZAREEN ALESHA", "P", "Intan 6", "Mojokerto", "2022-05-26"},
		{"AHMAD NADHIF SAKHA EL RAFIF", "L", "Intan 6", "", ""},
		{"ANNISA AIRA AR RAHIM", "P", "Intan 6", "", ""},
		{"HAIDAR ASKANA ZAFRAN", "L", "Intan 6", "", ""},
		{"HILYAH AL UNTSA MURSYIDA", "P", "Intan 6", "", ""},
		{"MOCH DEVANO HARIS ALFARIZI", "L", "Intan 6", "", ""},
		{"MUHAMMAD ABIZAR ABQARY", "L", "Intan 6", "", ""},
		{"MUHAMMAD ROQI ILA ALMA'ALI", "L", "Intan 6", "", ""},
		{"NAILIN NAJIYAH", "P", "Intan 6", "", ""},
		{"ULIN NUHA AHSANA TAFSIRO", "L", "Intan 6", "", ""},
		{"ELFANO RASKI SANJAYA", "L", "Intan 6", "", ""},
		{"FAREL ARYA MEGANTARA", "L", "Intan 6", "", ""},

		// === Intan 7 (TK A) — 12 siswa ===
		{"NADYA ALISYA AZ ZAHRA", "P", "Intan 7", "Mojokerto", "2021-09-18"},
		{"SALWA NAILUL MAGFIROH", "P", "Intan 7", "Mojokerto", "2022-02-03"},
		{"AHMAD AMMAR ATHAILLAH", "L", "Intan 7", "", ""},
		{"ALMEERA SABHIRA NAZEEFAH", "P", "Intan 7", "", ""},
		{"ARCELLO DAVIAN ALFARO", "L", "Intan 7", "", ""},
		{"ARSYILA YUMNA MAHESWARI", "P", "Intan 7", "", ""},
		{"MUHAMMAD RAFFASYA AL FARIQ", "L", "Intan 7", "", ""},
		{"MUHAMMAD TITO ARRASYID", "L", "Intan 7", "", ""},
		{"RABBANI FAUSTA RADITYA", "L", "Intan 7", "", ""},
		{"RIO IBRAHIM ARDIANSYAH", "L", "Intan 7", "", ""},
		{"RUMAYSA HAFSAH AL MAHIRA", "P", "Intan 7", "", ""},
		{"SYATHIR RAFINDRA ALFANI", "L", "Intan 7", "", ""},

		// === Intan 8 (TK A) — 13 siswa ===
		{"GRRESARANI ALMAHYRA MAHESWARI", "P", "Intan 8", "Mojokerto", "2022-02-07"},
		{"HURIN'IN TAZKIYYA NUFUS", "P", "Intan 8", "Madiun", "2022-01-18"},
		{"ABIZARD NABIL SETIAWAN", "L", "Intan 8", "", ""},
		{"ADZKIYA FRANSTASYA SEYNA", "P", "Intan 8", "", ""},
		{"ATHALLA ZAFRAN ZAINUDIN", "L", "Intan 8", "", ""},
		{"ELSHANUM BAHIRA", "P", "Intan 8", "", ""},
		{"GHIFARI ZAKI SYAPUTRA", "L", "Intan 8", "", ""},
		{"HAFIZ AL FARIZI PRATAMA", "L", "Intan 8", "", ""},
		{"KANZA ADILA KURNIAWAN", "P", "Intan 8", "", ""},
		{"MUHAMMAD HABLI HUKMA WA'ILMA", "L", "Intan 8", "", ""},
		{"MUHAMMAD SATRIA NARESWARA", "L", "Intan 8", "", ""},
		{"OCEAN SKY AZZAHRA", "P", "Intan 8", "", ""},
		{"MUHAMMAD IBRAHIM MUSA", "L", "Intan 8", "Mojokerto", "2022-04-23"},

		// === Berlian 1 (TK B) — 11 siswa ===
		{"ABIDZAR AL AFNI PRINCE R.A", "L", "Berlian 1", "", ""},
		{"ALVINO ARSYA AL AKBAR", "L", "Berlian 1", "", ""},
		{"ANANTARA KHAIRAN RIZQI FIRMANSYAH", "L", "Berlian 1", "", ""},
		{"AZKA ZYAN ASSEGAF", "L", "Berlian 1", "", ""},
		{"AZZALEA SHAQUEENA ARINDYA LATIF", "P", "Berlian 1", "", ""},
		{"DELISHA ADINDA SYAFANIA", "P", "Berlian 1", "", ""},
		{"EMIR DZAKY ZAKARIA", "L", "Berlian 1", "", ""},
		{"JIHAN TALITHA AZZAHRA", "P", "Berlian 1", "", ""},
		{"MAULANA HABIBI ABHIMATA", "L", "Berlian 1", "", ""},
		{"MUHAMMAD SULTAN NARESWARA", "L", "Berlian 1", "", ""},
		{"NUR LATIFAH AN NASYA", "P", "Berlian 1", "", ""},

		// === Berlian 2 (TK B) — 10 siswa ===
		{"ABDUL AZIZ", "L", "Berlian 2", "", ""},
		{"DWI ARYA MUHFIAN PUTRA", "L", "Berlian 2", "", ""},
		{"ELVANO ALFAREZI REYNDRA", "L", "Berlian 2", "", ""},
		{"ERLANGGA DENIZ PANCASENA", "L", "Berlian 2", "", ""},
		{"GAYUH KEYSA ZAKIA", "P", "Berlian 2", "", ""},
		{"NAURA SHAKILLA ALMAHYRA", "P", "Berlian 2", "", ""},
		{"NAURA ZHAFIRA RAMDHANI", "P", "Berlian 2", "", ""},
		{"QUEENSA FINTA ALVARIS QI", "P", "Berlian 2", "", ""},
		{"SYAFIRA AULIA AZZAHRA", "P", "Berlian 2", "", ""},
		{"ZAIDAN AL FATIH IRSYAD", "L", "Berlian 2", "", ""},

		// === Berlian 3 (TK B) — 11 siswa ===
		{"ABDULLAH DANISH DHIAURRAHMAN", "L", "Berlian 3", "", ""},
		{"AKMALUDIN HAMZAH TRAFANI", "L", "Berlian 3", "", ""},
		{"ANINDYA KIRANA NUR ICHWAN", "P", "Berlian 3", "", ""},
		{"BINTANG PUTRA WAHYU KURNIA", "L", "Berlian 3", "", ""},
		{"CHAIRIL RAFQI ALFAREZEL", "L", "Berlian 3", "", ""},
		{"KAYYISAH HAWWA AZZAHRA", "P", "Berlian 3", "", ""},
		{"MAHARDIKA RAESSA ANDANA", "L", "Berlian 3", "", ""},
		{"MICHEL APRILIA AVANI", "P", "Berlian 3", "", ""},
		{"MUHAMMAD IBRAHIM HABIBULLOH", "L", "Berlian 3", "", ""},
		{"RAISSA ALYSSA ERABANI", "P", "Berlian 3", "", ""},
		{"MUHAMMAD AKMAL ALFA RIZQI", "L", "Berlian 3", "", ""},

		// === Berlian 4 (TK B) — 11 siswa ===
		{"ALFIIN ZULFIKAR RIZKI", "L", "Berlian 4", "", ""},
		{"AMEERA MIKAYLA ZAHRA", "P", "Berlian 4", "", ""},
		{"LINTANG ADREENA SHEZA", "P", "Berlian 4", "", ""},
		{"M ALVANO KENZIE PRATAMA", "L", "Berlian 4", "", ""},
		{"MUHAMMAD MIFZAL RAFIF ABQARY", "L", "Berlian 4", "", ""},
		{"ORION DEWANGGA PUTRA AHMAD", "L", "Berlian 4", "", ""},
		{"THALIE PIRANTHIE CAHYANING", "P", "Berlian 4", "", ""},
		{"VIAN ARJUNA AT TSABIT", "L", "Berlian 4", "", ""},
		{"WIRDA RIZQIANA LAILATUS SURUR", "P", "Berlian 4", "", ""},
		{"RYU SATRIA PUTRA", "L", "Berlian 4", "", ""},
		{"DAIYAN AMSYAR YAFIE ZANUAN", "L", "Berlian 4", "", ""},

		// === Berlian 5 (TK B) — 11 siswa ===
		{"ALFARIZKA NUHA EL SHANUM", "P", "Berlian 5", "", ""},
		{"CLEMEIRA AYUMNA SITORUS", "P", "Berlian 5", "", ""},
		{"DZIRA NIRMALA MAULANA", "P", "Berlian 5", "", ""},
		{"MUHAMMAD ALWI PRANADIPTA", "L", "Berlian 5", "", ""},
		{"MUHAMMAD BAHRAN RIFFAT ARROFIK", "L", "Berlian 5", "", ""},
		{"MUHAMMAD HUSAIN AL HUMAID", "L", "Berlian 5", "", ""},
		{"MUHAMMAD IBRAHIM UBAIDILLAH", "L", "Berlian 5", "", ""},
		{"MUHAMMAD MICHIO DHEFIN EL FATIH", "L", "Berlian 5", "", ""},
		{"PUTRI NADHIRA AGENG RAKASIWI", "P", "Berlian 5", "", ""},
		{"SAKA NAYAKA LINGGA", "L", "Berlian 5", "", ""},
		{"SHANAYA QIEZA SUMARTA", "P", "Berlian 5", "", ""},

		// === Berlian 6 (TK B) — 11 siswa ===
		{"ALULA FARZANA AYUNINDYA", "P", "Berlian 6", "", ""},
		{"ATINA MINNATAN KAMALIYYAH", "P", "Berlian 6", "", ""},
		{"AYRA SHEZA RAFANIA", "P", "Berlian 6", "", ""},
		{"JANITRA IYYANA AZHA", "P", "Berlian 6", "", ""},
		{"KANAYA AISKA PUTRI FIYANTONI", "P", "Berlian 6", "", ""},
		{"KHABIB GHANI AL FAWWAS", "L", "Berlian 6", "", ""},
		{"MUHAMMAD FAKHRI RAMADHAN", "L", "Berlian 6", "", ""},
		{"MUHAMMAD QURAISH MUNTASHIR", "L", "Berlian 6", "", ""},
		{"SALIK KENZI AKSASUFI", "L", "Berlian 6", "", ""},
		{"SENANDUNG KINASIH ANANDYA FAZA", "P", "Berlian 6", "", ""},
		{"ARSHAKA NATAN ADITYA AKBAR", "L", "Berlian 6", "", ""},

		// === Berlian 7 (TK B) — 10 siswa ===
		{"AQILA AZZAHRA", "P", "Berlian 7", "", ""},
		{"AYRA SANSA DEWAN SYA'RONI", "P", "Berlian 7", "", ""},
		{"ELLANO SHANKARA PRASETYO", "L", "Berlian 7", "", ""},
		{"M FARHAN RAFISQY ALFAREZI", "L", "Berlian 7", "", ""},
		{"M FARREL GIBRAN PRATAMA", "L", "Berlian 7", "", ""},
		{"M IKHWAN ADAM MAULANA", "L", "Berlian 7", "", ""},
		{"NELVINO SHAQUILLE KRISDIANTO", "L", "Berlian 7", "", ""},
		{"SAYYIDAH SYARIFAH KAMILA", "P", "Berlian 7", "", ""},
		{"SHAKEEL ABHIVANDYA ROFIQI", "L", "Berlian 7", "", ""},
		{"RAMDHAN FAEZA HERMAWAN", "L", "Berlian 7", "", ""},

		// === Berlian 8 (TK B) — 11 siswa ===
		{"AISYAH HABIBILLAH", "P", "Berlian 8", "", ""},
		{"ARYASATYA ILYAS NURRACHMAN", "L", "Berlian 8", "", ""},
		{"AYNA AL ALIFIZAHRA", "P", "Berlian 8", "", ""},
		{"GHINA SAYYIDAH DZAKIYAH", "P", "Berlian 8", "", ""},
		{"KIANO AHMAD ALFARIZ", "L", "Berlian 8", "", ""},
		{"MUHAMMAD ADZRIL HAIDAR", "L", "Berlian 8", "", ""},
		{"MUHAMMAD ALTHAF ARBANI", "L", "Berlian 8", "", ""},
		{"MUHAMMAD ARSA AL HAFIDZ", "L", "Berlian 8", "", ""},
		{"MUHAMMAD RAFA NIZAM", "L", "Berlian 8", "", ""},
		{"NADIA PUTRI LESTARI", "L", "Berlian 8", "", ""},
		{"SALWA NABILA CAHYANI PUTRI", "L", "Berlian 8", "", ""},
	}
}
