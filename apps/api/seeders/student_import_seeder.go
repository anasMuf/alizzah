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

	// Rombel khusus siswa pindahan/mutasi
	mutationGroups := map[string]bool{
		"Intan 1": true,
		"Intan 8": true,
	}

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
		//   - Intan 1 & 8 (siswa baru PPDB TK) → "mutation" (+ dicatat event transfer_in)
		//   - Mutiara 1-6 (siswa baru PPDB KB) → "new"
		//   - Intan 2-7 & Berlian 1-8 (siswa naik kelas) → "promotion"
		// Siswa "promotion" TIDAK dapat tagihan biaya awal: biaya awal sudah dibayar
		// saat pertama masuk di TA sebelumnya (yang tidak ikut di-seed), jadi dikosongkan.
		enrollmentType := "promotion"
		switch {
		case mutationGroups[s.ClassGroup]:
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

		// Catat event transfer_in untuk siswa pindahan
		if isMutation {
			event := model.StudentAcademicEvent{
				StudentID:        student.ID,
				AcademicYearID:   activeYear.ID,
				FromClassGroupID: nil,
				ToClassGroupID:   &cg.ID,
				EventType:        "transfer_in",
				EventDate:        enrollmentStart,
				Notes:            "Siswa pindahan (data seed)",
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

// legacyStudentData berisi data siswa TA 2026/2027, di-generate dari Excel:
//   - Siswa naik kelas (Intan 2–7, Berlian 1–8): docs/core/src/siswa naik.xlsx
//   - Siswa baru PPDB (Mutiara 1–6, Intan 1 & 8):  docs/core/src/DAFTAR PPDB 2026 - 2027.xlsx
//
// Catatan:
//   - PPDB punya tempat/tanggal lahir asli; siswa naik kosong (pakai placeholder).
//   - Jenis kelamin siswa PPDB ditebak dari nama; siswa naik mengikuti kolom L/P file.
//   - Pembagian rombel siswa PPDB dibagi merata berurutan (KB→Mutiara 1–6, TK→Intan 1 & 8).
func legacyStudentData() []legacyStudent {
	return []legacyStudent{
		// === Mutiara 1 (7 siswa) ===
		{"ROHMAT SUKAWAIDA ADSKHAN", "L", "Mutiara 1", "Mojokerto", "2022-06-22"},
		{"DERREN ATTHARAZKA IBRAHIM", "L", "Mutiara 1", "Mojokerto", "2023-02-01"},
		{"SYAKILA HUMAIRA AZZAHRA", "P", "Mutiara 1", "Mojokerto", "2023-05-18"},
		{"ARSYA KALIEF ROMADONI", "L", "Mutiara 1", "Mojokerto", "2023-04-03"},
		{"MUHAMMAD AZMI ATTHAULAH FAHMI", "L", "Mutiara 1", "Mojokerto", "2022-12-24"},
		{"MUHAMMAD ARYA WIJAYA NUR ICHWAN", "L", "Mutiara 1", "Mojokerto", "2022-08-21"},
		{"MOCH. DHOFRON AL BARRA", "L", "Mutiara 1", "Mojokerto", "2022-01-06"},

		// === Mutiara 2 (7 siswa) ===
		{"FLORETTA SYAFAZEA HARUMI PUTRI", "P", "Mutiara 2", "Mojokerto", "2022-11-27"},
		{"AHMAD GALVIN PUTRA ASWIN", "L", "Mutiara 2", "Mojokerto", "2022-07-02"},
		{"ADRIAN FARZAN GHIFARI", "L", "Mutiara 2", "Mojokerto", "2022-12-10"},
		{"QUEENA MIKAYLA", "P", "Mutiara 2", "Mojokerto", "2022-08-25"},
		{"WAHYU RADITTYA NUR AIDI", "L", "Mutiara 2", "Mojokerto", "2022-05-21"},
		{"MAHREEN SHAFANA ALMAHYRA", "P", "Mutiara 2", "Mojokerto", "2022-10-25"},
		{"NAUREEN GHANIA ALMAHYRA", "P", "Mutiara 2", "Mojokerto", "2023-02-01"},

		// === Mutiara 3 (7 siswa) ===
		{"ACHMAD ALI SALIM", "L", "Mutiara 3", "Mojokerto", "2022-06-18"},
		{"EZHAR AL FAIZAN NUGROHO", "L", "Mutiara 3", "Mojokerto", "2022-07-14"},
		{"ALMEERA SAFA FARADISA", "P", "Mutiara 3", "Mojokerto", "2023-02-13"},
		{"MUHAMMAD RAFFASYA AL FATIH", "L", "Mutiara 3", "Mojokerto", "2022-12-05"},
		{"ABBIYYA HANENDA", "P", "Mutiara 3", "Bekasi", "2022-03-18"},
		{"ARUMI HANNA YASMIN ALAYDRUS", "P", "Mutiara 3", "Mojokerto", "2022-12-23"},
		{"CEISYA ALMAHYRA RAMADHANI", "P", "Mutiara 3", "Mojokerto", "2023-04-05"},

		// === Mutiara 4 (7 siswa) ===
		{"DEOLINDA CINTA GAVAPUTRI RAHMAN", "P", "Mutiara 4", "Mojokerto", "2022-05-14"},
		{"DIVANA DANIA KHANZA", "P", "Mutiara 4", "Mojokerto", "2022-06-07"},
		{"ADIBA HAFIZAH NUR AKBAR", "P", "Mutiara 4", "Mojokerto", "2022-09-04"},
		{"DZAKIYAH RIKZATUNNISSA", "P", "Mutiara 4", "Mojokerto", "2023-01-01"},
		{"IVONNY ANASTASYA SAVITRI", "P", "Mutiara 4", "Mojokerto", "2023-07-01"},
		{"DHEFIN RADEVA FIRMANSYAH", "L", "Mutiara 4", "Jombang", "2022-06-24"},
		{"DHEFAN GHAVA FIRMANSYAH", "L", "Mutiara 4", "Jombang", "2022-06-24"},

		// === Mutiara 5 (6 siswa) ===
		{"ALEEYA KHAIRUNNISA", "P", "Mutiara 5", "Mojokerto", "2022-09-07"},
		{"MUHAMMAD FATHAN ALFARIZI", "L", "Mutiara 5", "Mojokerto", "2023-01-18"},
		{"REINA AKIARA SALSA", "P", "Mutiara 5", "Mojokerto", "2022-03-10"},
		{"MUHAMMAD NADEO BAGUS ANANTA", "L", "Mutiara 5", "Mojokerto", "2022-04-05"},
		{"AHMAD ZAYN ANAQI TAAMIR", "L", "Mutiara 5", "Mojokerto", "2022-03-31"},
		{"BARAKKA SULAIMAN", "L", "Mutiara 5", "Mojokerto", "2023-01-20"},

		// === Mutiara 6 (6 siswa) ===
		{"MUHAMMAD GIBRAN AR RASYID", "L", "Mutiara 6", "Mojokerto", "2022-09-21"},
		{"MUHAMMAD AZAM ATOULLOH MUSTOFA", "L", "Mutiara 6", "Mojokerto", "2023-01-23"},
		{"MUHAMMAD ZAVIER ALFARIZKY", "L", "Mutiara 6", "Mojokerto", "2022-11-22"},
		{"FATHAN TSAQIF ALGHIFARI", "L", "Mutiara 6", "Mojokerto", "2022-12-31"},
		{"KAYVIN AHMADSYAH", "L", "Mutiara 6", "Mojokerto", "2023-08-25"},
		{"REIGA DEAN PRATAMA", "L", "Mutiara 6", "Mojokerto", "2022-10-18"},

		// === Intan 1 (19 siswa) — PPDB TK baru (mutasi/transfer_in) ===
		{"YASMIN PUTRI SHAKAYLA ZEA", "P", "Intan 1", "Mojokerto", "2021-09-29"},
		{"MUHAMMAD HAFIY AL MUBAROK", "L", "Intan 1", "Mojokerto", "2021-07-21"},
		{"EARLYTA REYFISYA PUTRI", "P", "Intan 1", "Mojokerto", "2021-07-13"},
		{"MIRZA HANIF ALFARIZQI", "L", "Intan 1", "Mojokerto", "2021-05-07"},
		{"FIZA ZAFIA FATCHURROHMAN", "P", "Intan 1", "Mojokerto", "2021-08-10"},
		{"M ABRISAM ZHAFRAN AL KARIM", "L", "Intan 1", "Mojokerto", "2021-12-25"},
		{"AZHIFA KHALISA NAADHIRA", "P", "Intan 1", "Mojokerto", "2021-11-10"},
		{"FELIA AZZA REYNA SABRIAH", "P", "Intan 1", "Mojokerto", "2021-05-25"},
		{"RAJENDRA UTTUNGGA SISWANTO", "L", "Intan 1", "Surabaya", "2021-11-05"},
		{"AYESHA KHAIRIYAH RANNANI", "P", "Intan 1", "Mojokerto", "2021-06-25"},
		{"DZALENA HELINKA EDRIANNA", "P", "Intan 1", "Mojokerto", "2021-05-05"},
		{"BRYAN GHAVA ALRIZKY", "L", "Intan 1", "Mojokerto", "2021-11-13"},
		{"MUHAMMAD DWI RIFKI VIRENDRA", "L", "Intan 1", "Mojokerto", "2021-08-02"},
		{"ZALFA AGHNIA PUTRI ERVANDIA", "P", "Intan 1", "Surabaya", "2021-06-13"},
		{"ATAYA ZAIDAN RIZKI MUHAMMAD", "L", "Intan 1", "Mojokerto", "2021-01-01"},
		{"MUHAMMAD KENZO ALKAUTSAR", "L", "Intan 1", "Mojokerto", "2021-06-09"},
		{"RAYYA FAHIMA SALWA RAMADHANI", "P", "Intan 1", "Mojokerto", "2021-04-27"},
		{"ABRISAM AHMAD REYNAN HARTANTO", "L", "Intan 1", "Surabaya", "2021-05-25"},
		{"CIARA FREDELLA ARIANTO", "P", "Intan 1", "Mojokerto", "2021-10-19"},

		// === Intan 2 (12 siswa) ===
		{"ADZKIYA NAILA NADIRA", "P", "Intan 2", "", ""},
		{"AKBAR RAYYAN ALFARIZQI", "L", "Intan 2", "", ""},
		{"AMARA SHAZA QAMIRA", "P", "Intan 2", "", ""},
		{"ARETA PUTRI AYU KIRANA", "P", "Intan 2", "", ""},
		{"DWINDA AQILATUNNISA", "P", "Intan 2", "", ""},
		{"EBRAHIM AL FARABI", "L", "Intan 2", "", ""},
		{"FADLAN APRILLIO ALFARIZKI", "L", "Intan 2", "", ""},
		{"FATHIR AHMAD AZZAMY", "L", "Intan 2", "", ""},
		{"FEISYA ZEA ATHALIA", "P", "Intan 2", "", ""},
		{"SAYYIDAH AISYAH AL HAWARIYYUN", "P", "Intan 2", "", ""},
		{"SHELMA HILYA NAZIRA AFNUR", "P", "Intan 2", "", ""},
		{"ZEA ALMAHYRA", "P", "Intan 2", "", ""},

		// === Intan 3 (11 siswa) ===
		{"ALFAREZEL ARFAN WIRADHARMA", "L", "Intan 3", "", ""},
		{"AURORA BELVANIA ANTINI PUTRI", "P", "Intan 3", "", ""},
		{"AZKIA ZELINE SIFABELLA", "P", "Intan 3", "", ""},
		{"KENZIE FAEYZA VICHO ALLEXA", "L", "Intan 3", "", ""},
		{"KENZO RIFDAN AIRLANGGA", "L", "Intan 3", "", ""},
		{"MUHAMMAD ARSHAKA AZ ZAQI", "L", "Intan 3", "", ""},
		{"MUHAMMAD MISBAHUL ASRIF", "L", "Intan 3", "", ""},
		{"MUHAMMAD SAKDULLOH", "L", "Intan 3", "", ""},
		{"MUHAMMAD ZULKARNAIN ALQORNI", "L", "Intan 3", "", ""},
		{"NAJEELA ARTANTI NURLAILA", "P", "Intan 3", "", ""},
		{"RAFARDAN ATHALA AL FARIZKI", "L", "Intan 3", "", ""},

		// === Intan 4 (10 siswa) ===
		{"AHMAD NADHIF SAKHA EL RAFIF", "L", "Intan 4", "", ""},
		{"ANNISA AIRA AR RAHIM", "P", "Intan 4", "", ""},
		{"HAIDAR ASKANA ZAFRAN", "L", "Intan 4", "", ""},
		{"HILYAH AL UNTSA MURSYIDA", "P", "Intan 4", "", ""},
		{"MOC RAFIF ALFARIZI SETIAWAN", "L", "Intan 4", "", ""},
		{"MOCH DEVANO HARIS ALFARIZI", "L", "Intan 4", "", ""},
		{"MUHAMMAD ABIZAR ABQARY", "L", "Intan 4", "", ""},
		{"MUHAMMAD ROQI ILA ALMA'ALI", "L", "Intan 4", "", ""},
		{"NAILIN NAJIYAH", "P", "Intan 4", "", ""},
		{"ULIN NUHA AHSANA TAFSIRO", "L", "Intan 4", "", ""},

		// === Intan 5 (11 siswa) ===
		{"ABIZARD NABIL SETIAWAN", "L", "Intan 5", "", ""},
		{"ADZKIYA FRANSTASYA SEYNA", "P", "Intan 5", "", ""},
		{"ATHALLA ZAFRAN ZAINUDIN", "L", "Intan 5", "", ""},
		{"ELSHANUM BAHIRA", "P", "Intan 5", "", ""},
		{"GHIFARI ZAKI SYAPUTRA", "L", "Intan 5", "", ""},
		{"HAFIZ AL FARIZI PRATAMA", "L", "Intan 5", "", ""},
		{"KANZA ADILA KURNIAWAN", "P", "Intan 5", "", ""},
		{"MUHAMMAD HABLI HUKMA WA'ILMA", "L", "Intan 5", "", ""},
		{"MUHAMMAD SATRIA NARESWARA", "L", "Intan 5", "", ""},
		{"NAFEEZA AZZAHRA PRASANTI", "P", "Intan 5", "", ""},
		{"OCEAN SKY AZZAHRA", "P", "Intan 5", "", ""},

		// === Intan 6 (10 siswa) ===
		{"AHMAD ZAYN ALMAHDI", "L", "Intan 6", "", ""},
		{"AKALANKA ZUHAIR SYAHPUTRA", "L", "Intan 6", "", ""},
		{"AQILA KHANZA ADZKIYA", "P", "Intan 6", "", ""},
		{"AQILA ZALFA SABIRA", "P", "Intan 6", "", ""},
		{"GIBRAN NAFIZA ALFARUQ", "L", "Intan 6", "", ""},
		{"HAMZAH NEAS ALHANAN", "L", "Intan 6", "", ""},
		{"KEVIN ARSENIO AL'AFNI FAHLEVI", "L", "Intan 6", "", ""},
		{"KHALISA NOURA SUBAGYO", "P", "Intan 6", "", ""},
		{"NAURA RAYYANI AZIS", "P", "Intan 6", "", ""},
		{"ZUNAIRA BELLVANIA SAFARAZ", "P", "Intan 6", "", ""},

		// === Intan 7 (10 siswa) ===
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

		// === Intan 8 (19 siswa) — PPDB TK baru (mutasi/transfer_in) ===
		{"SHAKILA NAURA AZZAHRA", "P", "Intan 8", "Mojokerto", "2021-08-08"},
		{"AXZNU GHAZALA AKBAR", "L", "Intan 8", "Mojokerto", "2022-03-15"},
		{"KHALIESAH AZ ZAHRA HUMAIRA MAHVEEN", "P", "Intan 8", "Mojokerto", "2021-05-01"},
		{"NADYA ALISYA AZ ZAHRA", "P", "Intan 8", "Mojokerto", "2021-09-18"},
		{"CALISTA HANIN SYAHIRA", "P", "Intan 8", "Mojokerto", "2021-03-02"},
		{"MUHAMMAD ADHAM FAIQ ALFARIZQI", "L", "Intan 8", "Mojokerto", "2021-02-05"},
		{"HAYYIN ARRUMI", "P", "Intan 8", "Mojokerto", "2021-10-22"},
		{"HILYA ARRUMI", "P", "Intan 8", "Mojokerto", "2021-10-22"},
		{"MUHAMMAD DYLANYUSUF DZUHAIRI", "L", "Intan 8", "Mojokerto", "2021-10-09"},
		{"SALWA NAILUL MAGHFIROH", "P", "Intan 8", "Mojokerto", "2022-02-03"},
		{"GREESARANI ALMAHYRA MAHESWARI", "P", "Intan 8", "Mojokerto", "2022-02-07"},
		{"KEYNARRA ALLURA GISKA", "P", "Intan 8", "Mojokerto", "2022-04-16"},
		{"ANNASYA NUR ISLAMADINA", "P", "Intan 8", "Mojokerto", "2021-12-28"},
		{"MAUZA ALMEER SAVERIO", "L", "Intan 8", "Mojokerto", "2021-04-28"},
		{"ISMATUL MAULA NIHAYA", "P", "Intan 8", "Mojokerto", "2021-03-13"},
		{"NUR TINATAR AUNILLAH", "P", "Intan 8", "Mojokerto", "2022-01-31"},
		{"AMARA ZAREEN ALESHA", "P", "Intan 8", "Mojokerto", "2022-05-26"},
		{"MUHAMMAD IBRAHIM MUSA", "L", "Intan 8", "Mojokerto", "2022-04-23"},
		{"HURIN'IN TAZKIYYA NUFUS", "P", "Intan 8", "Madiun", "2022-01-18"},

		// === Berlian 1 (12 siswa) ===
		{"ALFARIZKA NUHA EL SHANUM", "P", "Berlian 1", "", ""},
		{"CLEMEIRA AYUMNA SITORUS", "P", "Berlian 1", "", ""},
		{"DZIRA NIRMALA MAULANA", "P", "Berlian 1", "", ""},
		{"MUHAMMAD ALWI PRANADIPTA", "L", "Berlian 1", "", ""},
		{"MUHAMMAD BAHRAN RIFFAT ARROFIK", "L", "Berlian 1", "", ""},
		{"MUHAMMAD HUSAIN AL HUMAID", "L", "Berlian 1", "", ""},
		{"MUHAMMAD IBRAHIM UBAIDILLAH", "L", "Berlian 1", "", ""},
		{"MUHAMMAD MICHIO DHEFIN EL FATIH", "L", "Berlian 1", "", ""},
		{"PUTRI NADHIRA AGENG RAKASIWI", "P", "Berlian 1", "", ""},
		{"RAMDHAN FAEZA HERMAWAN", "L", "Berlian 1", "", ""},
		{"SAKA NAYAKA LINGGA", "L", "Berlian 1", "", ""},
		{"SHANAYA QIEZA SUMARTA", "P", "Berlian 1", "", ""},

		// === Berlian 2 (11 siswa) ===
		{"ALFIIN ZULFIKAR RIZKI", "L", "Berlian 2", "", ""},
		{"AMEERA MIKAYLA ZAHRA", "P", "Berlian 2", "", ""},
		{"ARSHAKA NATAN ADITYA AKBAR", "L", "Berlian 2", "", ""},
		{"LINTANG ADREENA SHEZA", "P", "Berlian 2", "", ""},
		{"M ALVANO KENZIE PRATAMA", "L", "Berlian 2", "", ""},
		{"MUHAMMAD AKMAL ALFA RIZQI", "L", "Berlian 2", "", ""},
		{"MUHAMMAD MIFZAL RAFIF ABQARY", "L", "Berlian 2", "", ""},
		{"ORION DEWANGGA PUTRA AHMAD", "L", "Berlian 2", "", ""},
		{"THALIE PIRANTHIE CAHYANING", "P", "Berlian 2", "", ""},
		{"VIAN ARJUNA AT TSABIT", "L", "Berlian 2", "", ""},
		{"WIRDA RIZQIANA LAILATUS SURUR", "P", "Berlian 2", "", ""},

		// === Berlian 3 (11 siswa) ===
		{"ABDULLAH DANISH DHIAURRAHMAN", "L", "Berlian 3", "", ""},
		{"AKMALUDIN HAMZAH TRAFANI", "L", "Berlian 3", "", ""},
		{"ANINDYA KIRANA NUR ICHWAN", "P", "Berlian 3", "", ""},
		{"BINTANG PUTRA WAHYU KURNIA", "L", "Berlian 3", "", ""},
		{"CHAIRIL RAFQI ALFAREZEL", "L", "Berlian 3", "", ""},
		{"KAYYISAH HAWWA AZZAHRA", "P", "Berlian 3", "", ""},
		{"MAHARDIKA RAESSA ANDANA", "L", "Berlian 3", "", ""},
		{"MICHEL APRILIA AVANI", "P", "Berlian 3", "", ""},
		{"MUHAMMAD IBRAHIM HABIBULLOH", "L", "Berlian 3", "", ""},
		{"MUHAMMAD ZAFRAN AL ARKHAN", "L", "Berlian 3", "", ""},
		{"RAISSA ALYSSA ERABANI", "P", "Berlian 3", "", ""},

		// === Berlian 4 (11 siswa) ===
		{"ABDUL AZIZ", "L", "Berlian 4", "", ""},
		{"DWI ARYA MUHFIAN PUTRA", "L", "Berlian 4", "", ""},
		{"ELVANO ALFAREZI REYNDRA", "L", "Berlian 4", "", ""},
		{"ERLANGGA DENIZ PANCASENA", "L", "Berlian 4", "", ""},
		{"GAYUH KEYSA ZAKIA", "P", "Berlian 4", "", ""},
		{"NAURA SHAKILLA ALMAHYRA", "P", "Berlian 4", "", ""},
		{"NAURA ZHAFIRA RAMDHANI", "P", "Berlian 4", "", ""},
		{"QUEENSA FINTA ALVARISQI", "P", "Berlian 4", "", ""},
		{"RAYYAN SYAUQI ALVARENDRA", "L", "Berlian 4", "", ""},
		{"SYAFIRA AULIA AZZAHRA", "P", "Berlian 4", "", ""},
		{"ZAIDAN AL FATIH IRSYAD", "L", "Berlian 4", "", ""},

		// === Berlian 5 (11 siswa) ===
		{"ABIDZAR AL AFNI PRINCE R.A", "L", "Berlian 5", "", ""},
		{"ALVINO ARSYA AL AKBAR", "L", "Berlian 5", "", ""},
		{"ANANTARA KHAIRAN RIZQI FIRMANSYAH", "L", "Berlian 5", "", ""},
		{"AZKA ZYAN ASSEGAF", "L", "Berlian 5", "", ""},
		{"AZZALEA SHAQUEENA ARINDYA LATIF", "P", "Berlian 5", "", ""},
		{"DELISHA ADINDA SYAFANIA", "P", "Berlian 5", "", ""},
		{"EMIR DZAKY ZAKARIA", "L", "Berlian 5", "", ""},
		{"JIHAN TALITHA AZZAHRA", "P", "Berlian 5", "", ""},
		{"MAULANA HABIBI ABHIMATA", "L", "Berlian 5", "", ""},
		{"MUHAMMAD SULTAN NARESWARA", "L", "Berlian 5", "", ""},
		{"NUR LATIFAH AN NASYA", "P", "Berlian 5", "", ""},

		// === Berlian 6 (11 siswa) ===
		{"AQILA AZZAHRA", "P", "Berlian 6", "", ""},
		{"AYRA SANSA DEWAN SYA'RONI", "P", "Berlian 6", "", ""},
		{"ELLANO SHANKARA PRASETYO", "L", "Berlian 6", "", ""},
		{"JABBAR FARAS CAKRAWHARDANA", "L", "Berlian 6", "", ""},
		{"M FARHAN RAFISQY ALFAREZI", "L", "Berlian 6", "", ""},
		{"M FARREL GIBRAN PRATAMA", "L", "Berlian 6", "", ""},
		{"M IKHWAN ADAM MAULANA", "L", "Berlian 6", "", ""},
		{"NELVINO SHAQUILLE KRISDIANTO", "L", "Berlian 6", "", ""},
		{"RYU SATRIA PUTRA", "L", "Berlian 6", "", ""},
		{"SAYYIDAH SYARIFAH KAMILA", "P", "Berlian 6", "", ""}, // *
		{"SHAKEEL ABHIVANDYA ROFIQI", "L", "Berlian 6", "", ""},

		// === Berlian 7 (11 siswa) ===
		{"AISYAH HABIBILLAH", "P", "Berlian 7", "", ""},
		{"ARYASATYA ILYAS NURRACHMAN", "L", "Berlian 7", "", ""},
		{"AYNA AL ALIFIZAHRA", "P", "Berlian 7", "", ""},
		{"GHINA SAYYIDAH DZAKIYAH", "P", "Berlian 7", "", ""},
		{"KIANO AHMAD ALFARIZ", "L", "Berlian 7", "", ""},
		{"MUHAMMAD ADZRIL HAIDAR", "L", "Berlian 7", "", ""},
		{"MUHAMMAD ALTHAF ARBANI", "L", "Berlian 7", "", ""},
		{"MUHAMMAD ARSA AL HAFIDZ", "L", "Berlian 7", "", ""},
		{"MUHAMMAD RAFA NIZAM", "L", "Berlian 7", "", ""},
		{"NADIA PUTRI LESTARI", "P", "Berlian 7", "", ""},
		{"SALWANABILA CAHYANI PUTRI", "P", "Berlian 7", "", ""},

		// === Berlian 8 (11 siswa) ===
		{"ALULA FARZANA AYUNINDYA", "P", "Berlian 8", "", ""},
		{"ATINA MINNATAN KAMALIYYAH", "P", "Berlian 8", "", ""},
		{"AYRA SHEZA RAFANIA", "P", "Berlian 8", "", ""},
		{"DAIYAN AMSYAR YAFIE ZANUAN", "L", "Berlian 8", "", ""},
		{"JANITRA IYYANA AZHA", "P", "Berlian 8", "", ""},
		{"KANAYA AISKA PUTRI FIYANTONI", "P", "Berlian 8", "", ""},
		{"KHABIB GHANI AL FAWWAS", "L", "Berlian 8", "", ""},
		{"MUHAMMAD FAKHRI RAMADHAN", "L", "Berlian 8", "", ""},
		{"MUHAMMAD QURAISH MUNTASHIR", "L", "Berlian 8", "", ""},
		{"SALIK KENZI AKSASUFI", "L", "Berlian 8", "", ""},
		{"SENANDUNG KINASIH ANANDYA FAZA", "P", "Berlian 8", "", ""},
	}
}
