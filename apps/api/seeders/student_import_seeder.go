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
		// Create student
		student := model.Student{
			FullName:      s.Name,
			BirthPlace:    "",
			BirthDate:     placeholderBirthDate,
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

		isMutation := mutationGroups[s.ClassGroup]
		enrollmentType := "new"
		if isMutation {
			enrollmentType = "mutation"
		}

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

func legacyStudentData() []legacyStudent {
	return []legacyStudent{
		// === Mutiara 1 (8 siswa) ===
		{"FATHIR AHMAD AZZAMY", "L", "Mutiara 1"},
		{"FADLAN APRILLIO ALFARIZKI", "L", "Mutiara 1"},
		{"EBRAHIM AL FARABI", "L", "Mutiara 1"},
		{"AKBAR RAYYAN ALFARIZQI", "L", "Mutiara 1"},
		{"ADZKIYA NAILA NADIRA", "P", "Mutiara 1"},
		{"SHELMA HILYA NAZIRA AFNUR", "P", "Mutiara 1"},
		{"ARETA PUTRI AYU KIRANA", "P", "Mutiara 1"},
		{"ZEA ALMAHYRA", "P", "Mutiara 1"},

		// === Mutiara 2 (9 siswa) ===
		{"MUHAMMAD ARSHAKA AZ ZAQI", "L", "Mutiara 2"},
		{"ALFAREZEL ARFAN WIRADHARMA", "L", "Mutiara 2"},
		{"KENZIE FAEYZA VICHO ALLEXA", "P", "Mutiara 2"},
		{"KENZO RIFDAN AIRLANGGA", "L", "Mutiara 2"},
		{"MUHAMMAD ZULKARNAIN ALQORNI", "L", "Mutiara 2"},
		{"AZKIA ZELINE SIFABELLA", "P", "Mutiara 2"},
		{"NAJEELA ARTANTI NURLAILA", "P", "Mutiara 2"},
		{"HILYAH AL UNTSA MURSYIDA", "P", "Mutiara 2"},
		{"AURORA BELVANIA ANTINI PUTRI", "P", "Mutiara 2"},

		// === Mutiara 3 (9 siswa) ===
		{"ULIN NUHA AHSANA TAFSIRO", "P", "Mutiara 3"},
		{"MUHAMMAD ROQI ILA ALMA'ALI", "L", "Mutiara 3"},
		{"MOCH DEVANO HARIS ALFARIZI", "L", "Mutiara 3"},
		{"MOCHAMMAD RAFIF ALFARIZI SETIAW", "L", "Mutiara 3"},
		{"MUHAMMAD ABIZAR ABQARY", "L", "Mutiara 3"},
		{"HAIDAR ASKANA ZAFRAN", "L", "Mutiara 3"},
		{"AHMAD NADHIF SAKHA EL RAFIF", "L", "Mutiara 3"},
		{"ANNISA AIRA AR RAHIM", "P", "Mutiara 3"},
		{"NAILIN NAJIYAH", "P", "Mutiara 3"},

		// === Mutiara 4 (9 siswa) ===
		{"M. HABLI HUKMA WA ILMA", "L", "Mutiara 4"},
		{"ATHALLA ZAFRAN ZAINUDIN", "L", "Mutiara 4"},
		{"ABIZARD NABIL SETIAWAN", "L", "Mutiara 4"},
		{"MUHAMMAD SATRIA NARESWARA", "L", "Mutiara 4"},
		{"GHIFARI ZAKI SYAPUTRA", "L", "Mutiara 4"},
		{"HAFIZ AL FARIZI PRATAMA", "L", "Mutiara 4"},
		{"ADZKIYA FRANSTASYA SEYNA", "P", "Mutiara 4"},
		{"OCEANA SKY AZZAHRA", "P", "Mutiara 4"},
		{"KANZA ADILA KURNIAWAN", "P", "Mutiara 4"},

		// === Mutiara 5 (10 siswa) ===
		{"KEVIN ARSENIO AL'AFNI FAHLEVI", "L", "Mutiara 5"},
		{"NAURA RAYYANI AZIS", "P", "Mutiara 5"},
		{"GIBRAN NAFIZA ALFARUQ", "L", "Mutiara 5"},
		{"HAMZAH NEAS ALHANAN", "L", "Mutiara 5"},
		{"AHMAD ZAYN ALMAHDI", "L", "Mutiara 5"},
		{"KHALISA NOURA SUBAGYO", "P", "Mutiara 5"},
		{"AKALANKA ZAHAIR SYAHPUTRA", "L", "Mutiara 5"},
		{"AQILA ZALFA SABIRA", "P", "Mutiara 5"},
		{"AQILA KHANZA ADZKIYA", "P", "Mutiara 5"},
		{"ZUNAIRA BELLVANIA SAFARAZ", "P", "Mutiara 5"},

		// === Mutiara 6 (10 siswa) ===
		{"MUHAMMAD RAFFASYA AL-FARIQ", "L", "Mutiara 6"},
		{"MUHAMMAD TITO ARRASYID", "L", "Mutiara 6"},
		{"RIO IBRAHIM ARDIANSYAH", "L", "Mutiara 6"},
		{"SYATHIR RAFINDRA ALFANI", "L", "Mutiara 6"},
		{"RABBANI FAUSTA RADITYA", "L", "Mutiara 6"},
		{"ARCELLO DAVIAN ALFARO", "L", "Mutiara 6"},
		{"AHMAD AMMAR ATHAILLAH", "L", "Mutiara 6"},
		{"ALMEERA SABHIRA NAZEEFAH", "P", "Mutiara 6"},
		{"ARSYILA YUMNA MAHESWARI", "P", "Mutiara 6"},
		{"RUMAYSA HAFSAH AL MAHIRA", "P", "Mutiara 6"},

		// === Intan 1 (11 siswa) ===
		{"SAKA NAYAKA LINGGA", "L", "Intan 1"},
		{"MUHAMMAD IBRAHIM UBAIDILLAH", "L", "Intan 1"},
		{"MUHAMMAD HUSAIN AL HUMAID", "L", "Intan 1"},
		{"MUHAMMAD BAHRAN RIFFAT ARROFIK", "L", "Intan 1"},
		{"MUHAMMAD ALWI PRANADIPTA", "L", "Intan 1"},
		{"MUHAMMAD MICHIO DHEFIN EL FATI", "L", "Intan 1"},
		{"ALFARIZKA NUHA EL SHANUM", "P", "Intan 1"},
		{"DZIRA NIRMALA MAULANA", "P", "Intan 1"},
		{"SHANAYA QIEZA SUMARTA", "P", "Intan 1"},
		{"CLEMEIRA AYUMNA SITORUS", "P", "Intan 1"},
		{"RAMDHAN FAEZA HERMAWAN", "L", "Intan 1"},

		// === Intan 2 (11 siswa) ===
		{"ALFIIN ZULFIKAR RIZKI", "L", "Intan 2"},
		{"AMEERA MIKAYLA ZAHRA", "P", "Intan 2"},
		{"ARSHAKA NATAN ADITYA AKBAR", "L", "Intan 2"},
		{"LINTANG ADREENA SHEZA", "P", "Intan 2"},
		{"M ALVANO KENZIE PRATAMA", "L", "Intan 2"},
		{"MUHAMMAD AKMAL ALFA RIZQI", "L", "Intan 2"},
		{"MUHAMMAD MIFZAL RAFIF ABQARY", "L", "Intan 2"},
		{"ORION DEWANGGA PUTRA AHMAD", "L", "Intan 2"},
		{"THALIE PIRANTHIE CAHYANING", "P", "Intan 2"},
		{"VIAN ARJUNA AT TSABIT", "L", "Intan 2"},
		{"WIRDA RIZQIANA LAILATUS SURUR", "P", "Intan 2"},

		// === Intan 3 (11 siswa) ===
		{"AKMALUDIN HAMZAH TRAFANI", "L", "Intan 3"},
		{"ALISYAH ALIFATUZ ZAHRA", "P", "Intan 3"},
		{"BINTANG PUTRA WAHYU KURNIA", "L", "Intan 3"},
		{"KAYYISAH HAWWA AZZAHRA", "L", "Intan 3"},
		{"MAHARDIKA RAESSA ANDANA", "P", "Intan 3"},
		{"MICHEL APRILIA AVANI", "L", "Intan 3"},
		{"MUHAMMAD ZAFRAN AL ARKHAN", "L", "Intan 3"},
		{"RAISSA ALYSSA ERABANI", "P", "Intan 3"},
		{"MUHAMMAD IBRAHIM HABIBULLOH", "L", "Intan 3"},
		{"ABDULLAH DANISH DHIAURRAHMAN", "L", "Intan 3"},
		{"ANINDYA KIRANA NUR ICHWAN", "P", "Intan 3"},

		// === Intan 4 (10 siswa) ===
		{"DWI ARYA MUHFIAN PUTRA", "P", "Intan 4"},
		{"ELVANO ALFAREZI REYNDRA", "L", "Intan 4"},
		{"ERLANGGA DENIZ PANCASENA", "L", "Intan 4"},
		{"GAYUH KEYSA ZAKIA", "P", "Intan 4"},
		{"NAURA ZHAFIRA RAMDHANI", "P", "Intan 4"},
		{"PUTRI AYNA AZKAYRA AL GIRI", "P", "Intan 4"},
		{"QUEENSA FINTA ALVARISQI", "P", "Intan 4"},
		{"SYAFIRA AULIA AZZAHRA", "P", "Intan 4"},
		{"ZAIDAN AL FATIH IRSYAD", "L", "Intan 4"},
		{"RAYYAN SYAUQI ALVARENDRA", "L", "Intan 4"},

		// === Intan 5 (11 siswa) ===
		{"ABIDZAR AL AFNI PRINCE R.A", "L", "Intan 5"},
		{"ALVINO ARSYA AL AKBAR", "L", "Intan 5"},
		{"ANANTARA KHAIRAN RIZQI FIRMANSYAH", "L", "Intan 5"},
		{"AZKA ZYAN ASSEGAF", "P", "Intan 5"},
		{"AZZALEA SHAQUEENA ARINDYA LATIF", "P", "Intan 5"},
		{"DELISHA ADINDA SYAFANIA", "P", "Intan 5"},
		{"EMIR DZAKY ZAKARIA", "L", "Intan 5"},
		{"JIHAN TALITHA AZZAHRA", "P", "Intan 5"},
		{"MAULANA HABIBI ABHIMATA", "L", "Intan 5"},
		{"MUHAMMAD SULTAN NARESWARA", "L", "Intan 5"},
		{"NUR LATIFAH AN NASYA", "P", "Intan 5"},

		// === Intan 6 (11 siswa) ===
		{"AQILA AZZAHRA", "P", "Intan 6"},
		{"AYRA SANSA DEWAN SYA'RONI", "P", "Intan 6"},
		{"ELLANO SHANKARA PRASETYO", "L", "Intan 6"},
		{"JABBAR FARAS CAKRAWHARDANA", "L", "Intan 6"},
		{"M FARHAN RAFISQY ALFAREZI", "L", "Intan 6"},
		{"M FARREL GIBRAN PRATAMA", "L", "Intan 6"},
		{"M IKHWAN ADAM MAULANA", "L", "Intan 6"},
		{"NELVINO SHAQUILLE KRISDIANTO", "L", "Intan 6"},
		{"RYU SATRIA PUTRA", "L", "Intan 6"},
		{"SAYYIDAH SYARIFAH KAMILA", "P", "Intan 6"},
		{"SHAKEEL ABHIVANDYA ROFIQI", "L", "Intan 6"},

		// === Intan 7 (11 siswa) ===
		{"AISYAH HABIBILLAH", "P", "Intan 7"},
		{"ARYASATYA ILYAS NURRACHMAN", "L", "Intan 7"},
		{"AYNA AL ALIFIZAHRA", "P", "Intan 7"},
		{"GHINA SAYYIDAH DZAKIYAH", "P", "Intan 7"},
		{"KIANO AHMAD ALFARIZ", "L", "Intan 7"},
		{"MUHAMMAD ADZRIL HAIDAR", "L", "Intan 7"},
		{"MUHAMMAD ALTHAF ARBANI", "L", "Intan 7"},
		{"MUHAMMAD ARSA AL HAFIDZ", "L", "Intan 7"},
		{"MUHAMMAD RAFA NIZAM", "L", "Intan 7"},
		{"NADIA PUTRI LESTARI", "P", "Intan 7"},
		{"SALWANABILA CAHYANI PUTRI", "P", "Intan 7"},

		// === Intan 8 (10 siswa) ===
		{"SENANDUNG KINASIH ANANDYA FAZA", "P", "Intan 8"},
		{"KHABIB GHANI AL-FAWWAS", "L", "Intan 8"},
		{"MUHAMMAD FAKHRI RAMADHAN", "L", "Intan 8"},
		{"DAIYAN AMSYARI YAFIE ZANUANSYAH", "L", "Intan 8"},
		{"MUHAMMAD QURAISH MUNTASHIR", "L", "Intan 8"},
		{"SALIK KENZI AKSASUFI", "L", "Intan 8"},
		{"ATINA MINNATAN KAMALIYYAH", "P", "Intan 8"},
		{"KANAYA AISKA PUTRI FIYANTONI", "P", "Intan 8"},
		{"ALULA FARZANA AYUNINDYA", "P", "Intan 8"},
		{"JANITRA IYYANA AZHA", "P", "Intan 8"},

		// === Berlian 1 (13 siswa) ===
		{"ACHMAD RIZKY ABI ASWIN", "L", "Berlian 1"},
		{"ADIBA ATLTHAFUNNISA", "P", "Berlian 1"},
		{"AFRIN FAIHA CHISSY", "P", "Berlian 1"},
		{"ALFARIZI MAHESA PUTRA", "L", "Berlian 1"},
		{"ARDIAZ MUHAMMAD FAUZI", "L", "Berlian 1"},
		{"BERYLLI BRILIAN", "P", "Berlian 1"},
		{"BILLQIS FAIHA RIFDA", "P", "Berlian 1"},
		{"HANUM CALISTA HANANIA", "P", "Berlian 1"},
		{"KAILASH RAFQI HASAN", "L", "Berlian 1"},
		{"KINARA ALZARINA RAMADHANI", "P", "Berlian 1"},
		{"MUHAMMAD FAQIHUL HAKIM", "L", "Berlian 1"},
		{"SYATIR AZFAR AL FARZANA", "L", "Berlian 1"},
		{"WILDAN HAFIZH RAFISQI HARJUNO", "L", "Berlian 1"},

		// === Berlian 2 (13 siswa) ===
		{"AISYAH PUTRI", "P", "Berlian 2"},
		{"ALFATH SYARIEF", "L", "Berlian 2"},
		{"ALISSA UFAIRASAKHI", "P", "Berlian 2"},
		{"AZKA ANUGRAH FILARDHA", "P", "Berlian 2"},
		{"AZKA RANIA ZHAFIRA", "P", "Berlian 2"},
		{"HAIKAL AZRIL EL RUMI", "L", "Berlian 2"},
		{"KHANZA SHAFEA AZZAHRA", "P", "Berlian 2"},
		{"M SULTAN OCTAVIANDI SUTRISNO", "L", "Berlian 2"},
		{"MAZIYAH KAMILAH RAMADHANI", "P", "Berlian 2"},
		{"MUHAMMAD ALFATAN LEONARDI", "L", "Berlian 2"},
		{"MUHAMMAD ARSAKHA SHIDDIQ ASSHAUQI", "L", "Berlian 2"},
		{"MUHAMMAD FAIZZUDIN ZYDAN PASHA", "L", "Berlian 2"},
		{"RAISYA ZAHRA SALSA BILLA", "P", "Berlian 2"},

		// === Berlian 3 (13 siswa) ===
		{"ABDULLAH ALKAHFI", "L", "Berlian 3"},
		{"ANAGATA LEONORA SHANUM FIRMANSYAH", "P", "Berlian 3"},
		{"DAFFA DZUHAIRI EVANO", "L", "Berlian 3"},
		{"ERLANGGA NADEO NARENDRA BARRY", "L", "Berlian 3"},
		{"GAMILA NADHIFA ZAIDA", "P", "Berlian 3"},
		{"GRIZELLA QUIENZHA PUTRI ZAKARIA", "P", "Berlian 3"},
		{"HAFIZH RAFFASYA AL FAHREZI ERDOGAN", "L", "Berlian 3"},
		{"MARYAM HANA PRANATA", "P", "Berlian 3"},
		{"MUHAMMAD ABIZAR ZAYDAN AL FATTIH", "L", "Berlian 3"},
		{"MUHAMMAD ARTA NABIL MAUZA", "L", "Berlian 3"},
		{"MUHAMMAD IRSYAD JAMALUDIN", "L", "Berlian 3"},
		{"NAFIS RASENDRIYA FAHRUDDIN", "L", "Berlian 3"},
		{"SABRINA AULIA ZAHRA", "P", "Berlian 3"},

		// === Berlian 4 (12 siswa) ===
		{"ADHWA ARZAQILLAH", "L", "Berlian 4"},
		{"ADINDA VIRLI AZZANIA", "P", "Berlian 4"},
		{"BRIGITA AULIA AZZAHRA", "P", "Berlian 4"},
		{"DAMAR ATHARAZKA AGASA", "L", "Berlian 4"},
		{"ESHAL GHANIA NAHDA", "P", "Berlian 4"},
		{"MUHAMMAD KEENAN DEVAN ARRASYA", "L", "Berlian 4"},
		{"MUHAMMAD WAHYU IRSYAD", "L", "Berlian 4"},
		{"MUHAMMAD YAHYA PITULUNGAN", "L", "Berlian 4"},
		{"MUHAMMAD ZHIAN ALI RIDHO", "L", "Berlian 4"},
		{"NALA LAILATUL AFROKHAH", "P", "Berlian 4"},
		{"YUSUF HANIF AZZAKI", "L", "Berlian 4"},
		{"ZICO ARSYA WIRATAMA", "L", "Berlian 4"},

		// === Berlian 5 (13 siswa) ===
		{"ALVINO NAUVAL MUSTOFA", "L", "Berlian 5"},
		{"AZIZAH NAYYIRA ALFIDA", "P", "Berlian 5"},
		{"ELLENA QIANZY RATU PRASETYO", "P", "Berlian 5"},
		{"FATHIAN ZIDAN ALFAREZI PRAYOGO", "L", "Berlian 5"},
		{"GAISHAN AHMED PRASETYO", "L", "Berlian 5"},
		{"MIKAYLA AZIZ AZ ZAHRA", "P", "Berlian 5"},
		{"MUHAMMAD AQIL ZHAFRAN ASSYARIF", "L", "Berlian 5"},
		{"MUHAMMAD ARKA SHAWQI FILARDHA", "L", "Berlian 5"},
		{"NADHIRA AYUNINDYA", "P", "Berlian 5"},
		{"NADIRA SHAFANA ALFARIZKY", "P", "Berlian 5"},
		{"NUR RIZQY KHOIRULLOH", "P", "Berlian 5"},
		{"RAYYI SHABILLA HILYA", "P", "Berlian 5"},
		{"ZIDNA ILMAN NAFIAH", "L", "Berlian 5"},

		// === Berlian 6 (12 siswa) ===
		{"ALEA SHANUM HUMAIRA", "P", "Berlian 6"},
		{"ARSYILA DELVIA NAURA AHMAD", "P", "Berlian 6"},
		{"CIELO VANDARA NAZEEA", "P", "Berlian 6"},
		{"IZZAN HARITH FAROKH", "L", "Berlian 6"},
		{"KAHEESHA RUBY NASYAUQI", "P", "Berlian 6"},
		{"MUHAMMAD FALIH AQMAR", "L", "Berlian 6"},
		{"MUHAMMAD UWAIS AL FARIDZI", "L", "Berlian 6"},
		{"RAFAEZA HADITAMA STYA", "P", "Berlian 6"},
		{"SAQUEENA RIZQI RAMADHANI", "P", "Berlian 6"},
		{"YURFINA ALIFA HERDRIAH", "P", "Berlian 6"},
		{"MUHAMMAD KAFA AL KASAFANI", "L", "Berlian 6"},
		{"MUHAMMAD SHOLAHUDDIN AL AYYUBI", "L", "Berlian 6"},

		// === Berlian 7 (13 siswa) ===
		{"ADILLA CAHYA KIRANA", "P", "Berlian 7"},
		{"AL ZAVAIR YUFA REZVAN", "L", "Berlian 7"},
		{"AZLAN RESCHA HIDAYAT", "L", "Berlian 7"},
		{"BENING ILLYA ALMAIS", "P", "Berlian 7"},
		{"DEAN MERU DHAFIR", "L", "Berlian 7"},
		{"KAIF HAIDAR HASAN", "L", "Berlian 7"},
		{"KAYLA RIZKI MAFAZA", "P", "Berlian 7"},
		{"KHANZA NAYLA AZZAHRA", "P", "Berlian 7"},
		{"KIREI ZEA SHANUM", "P", "Berlian 7"},
		{"KRISNA NARENDRA UTAMA", "P", "Berlian 7"},
		{"MUHAMMAD ALBI AL FARIZI", "L", "Berlian 7"},
		{"NAVAS AHMAD ASKARABIRU", "L", "Berlian 7"},
		{"QIRANIA NUHA AZ ZAHRA", "P", "Berlian 7"},

		// === Berlian 8 (12 siswa) ===
		{"GUSTI ABU BANGKIT ASTAMARUN .S", "L", "Berlian 8"},
		{"KEANO DWI ALFARIZI", "L", "Berlian 8"},
		{"KHANZA ADZKIYA KHALISA", "P", "Berlian 8"},
		{"MUHAMMAD ABIL SIDQI ARSALAN", "L", "Berlian 8"},
		{"MUHAMMAD ADZRIEL ALFARIZQI", "L", "Berlian 8"},
		{"MUHAMMAD AFIF FIRDAUS PRATAMA", "L", "Berlian 8"},
		{"MUHAMMAD HAZMI ALFARIZI", "L", "Berlian 8"},
		{"RIZKI RAMADHAN PUTRA BASUKI", "L", "Berlian 8"},
		{"RUMAISHA ARSA GAURI", "P", "Berlian 8"},
		{"SAFANIYA GHEA ARISTA", "P", "Berlian 8"},
		{"SHANUM SHEZAN AZKAYRA", "P", "Berlian 8"},
		{"SHINTA AYULIA HARIANA", "P", "Berlian 8"},
	}
}
