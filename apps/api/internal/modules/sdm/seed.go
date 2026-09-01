package sdm

import (
	"log"
	"time"

	"api/internal/modules/sdm/guru"
	"api/internal/modules/sdm/master"

	"gorm.io/gorm"
)

// Seed mengisi data master SDM (golongan, tarif, kedisiplinan, fungsional,
// tugas tambahan, penanggung jawab) dan karyawan dari dump database lama
// (`apps/old/penggajian/db/gaji.sql`). Idempotent: tiap bagian dilewati bila
// tabel terkait sudah berisi data. Transaksi (absen, pinjaman, lain-lain)
// tidak di-seed — diisi lewat UI.
func Seed(db *gorm.DB) {
	seedMasters(db)
	seedEmployees(db)
}

func ptr(v int) *int { return &v }

// seedMasters mengisi golongan A–F, tarif kehadiran, kedisiplinan, dan master
// HR bernama — identik dengan data dump lama (hanya baris valid; baris
// placeholder/orphan dari sistem lama tidak direplikasi).
func seedMasters(db *gorm.DB) {
	// Golongan (urutan id = urutan kenaikan golongan).
	var golonganCount int64
	db.Model(&master.Golongan{}).Count(&golonganCount)
	if golonganCount == 0 {
		golongans := []master.Golongan{
			{Kode: "A", FromDay: ptr(0), ToDay: ptr(730), Keterangan: "Pengabdian 0 - 2 Tahun", Nilai: 250000},
			{Kode: "B", FromDay: ptr(760), ToDay: ptr(1826), Keterangan: "Pengabdian 2,1 - 5 Tahun", Nilai: 300000},
			{Kode: "C", FromDay: ptr(1856), ToDay: ptr(3652), Keterangan: "Pengabdian 5,1 - 10 Tahun", Nilai: 350000},
			{Kode: "D", FromDay: ptr(3682), ToDay: ptr(5478), Keterangan: "Pengabdian 10,1 - 15 Tahun", Nilai: 400000},
			{Kode: "E", FromDay: ptr(5508), ToDay: ptr(7305), Keterangan: "Pengabdian 15,1 - 20 Tahun", Nilai: 450000},
			{Kode: "F", FromDay: ptr(7335), ToDay: ptr(9131), Keterangan: "Pengabdian 20,1 - 25 Tahun", Nilai: 500000},
		}
		if err := db.Create(&golongans).Error; err != nil {
			log.Printf("Seed SDM golongan gagal: %v", err)
		} else {
			log.Printf("Seed SDM: %d golongan", len(golongans))
		}
	}

	// Tarif kehadiran (single row).
	var khCount int64
	db.Model(&master.TarifKehadiran{}).Count(&khCount)
	if khCount == 0 {
		if err := db.Create(&master.TarifKehadiran{NilaiPerHari: 5000}).Error; err != nil {
			log.Printf("Seed SDM tarif kehadiran gagal: %v", err)
		}
	}

	// Kedisiplinan — kode stabil (siaga/terlambat/piket/pulang_awal).
	var ksCount int64
	db.Model(&master.Kedisiplinan{}).Count(&ksCount)
	if ksCount == 0 {
		items := []master.Kedisiplinan{
			{Kode: "siaga", Nama: "Hadir Siaga", Nilai: 10000},
			{Kode: "terlambat", Nama: "Hadir Terlambat", Nilai: 0},
			{Kode: "piket", Nama: "Hadir Piket", Nilai: 15000},
			{Kode: "pulang_awal", Nama: "Pulang Awal", Nilai: 0},
		}
		if err := db.Create(&items).Error; err != nil {
			log.Printf("Seed SDM kedisiplinan gagal: %v", err)
		}
	}

	seedNamedMaster(db, &master.Fungsional{},
		[]master.Fungsional{
			{Nama: "Ketua Yayasan", Nilai: 200000},
			{Nama: "Pengawas KB", Nilai: 250000},
			{Nama: "Kepala Sekolah TK", Nilai: 500000},
			{Nama: "Guru Kelas", Nilai: 200000},
			{Nama: "Tata Usaha", Nilai: 200000},
			{Nama: "Admin Kantor", Nilai: 200000},
			{Nama: "Pekarya", Nilai: 100000},
			{Nama: "Sub Koordinator Jenjang", Nilai: 100000},
			{Nama: "Kepala Sekolah KB", Nilai: 100000},
			{Nama: "Wakil Kepala Sekolah TK", Nilai: 100000},
			{Nama: "Koordinator", Nilai: 150000},
			{Nama: "Guru Shadow", Nilai: 300000},
			{Nama: "Kepala Daycare", Nilai: 100000},
			{Nama: "Guru Daycare", Nilai: 400000},
		})
	seedNamedMaster(db, &master.TugasTambahan{},
		[]master.TugasTambahan{
			{Nama: "Kurikulum"},
			{Nama: "Bidang Sarana Prasarana"},
			{Nama: "Bidang PTK"},
			{Nama: "Bidang Umum"},
			{Nama: "Humas & Kemitraan"},
			{Nama: "Media Sosial"},
			{Nama: "Bidang Perkantoran"},
			{Nama: "Bidang Kesiswaan"},
			{Nama: "Monev Tugas Tambahan"},
		})
	seedNamedMaster(db, &master.PenanggungJawab{},
		[]master.PenanggungJawab{
			{Nama: "PJ Calisan", Nilai: 50000},
			{Nama: "Keuangan Sekolah", Nilai: 250000},
			{Nama: "Koperasi", Nilai: 100000},
			{Nama: "Kosumsi", Nilai: 100000},
			{Nama: "Pendamping Pasta Orgen", Nilai: 50000},
			{Nama: "Pendamping Pasta Robotika", Nilai: 75000},
			{Nama: "Pasta Sempoa", Nilai: 175000},
			{Nama: "Pendamping Pasta Menari", Nilai: 50000},
			{Nama: "Pendamping Pasta Taekwondo", Nilai: 100000},
			{Nama: "Instruktur 2 pasta melukis", Nilai: 75000},
			{Nama: "Guru ASLIN", Nilai: 175000},
			{Nama: "Guru Calisan", Nilai: 100000},
			{Nama: "Coocking Class", Nilai: 100000},
			{Nama: "Resepsionis Tamu Al Izzah", Nilai: 75000},
			{Nama: "Pendamping Siswa terlambat", Nilai: 75000},
			{Nama: "Pendamping Tilawah", Nilai: 50000},
			{Nama: "Pendamping pasta melukis", Nilai: 75000},
			{Nama: "Koord Aslin Calisan Pasta", Nilai: 250000},
			{Nama: "PJ Pasta Menyanyi", Nilai: 75000},
			{Nama: "Guru Pasta Laptop Kids", Nilai: 175000},
			{Nama: "PJ Semua PASTA", Nilai: 100000},
		})
}

// seedNamedMaster mengisi master bernama (fungsional/tugas tambahan/PJ) bila
// tabel masih kosong.
func seedNamedMaster[T any](db *gorm.DB, _ *T, rows []T) {
	var count int64
	db.Model(new(T)).Count(&count)
	if count > 0 {
		return
	}
	if err := db.Create(&rows).Error; err != nil {
		log.Printf("Seed SDM master %T gagal: %v", *new(T), err)
		return
	}
	log.Printf("Seed SDM: %d %T", len(rows), *new(T))
}

// seedEmployees mengisi karyawan dari dump `guru` lama (31 baris valid).
// `LegacyID` = id_guru lama; `GolonganID` dipetakan dari kode golongan.
func seedEmployees(db *gorm.DB) {
	var count int64
	db.Model(&guru.Employee{}).Count(&count)
	if count > 0 {
		return
	}

	// Peta kode golongan (id_pk lama 1–6 = A–F) → id baru.
	var golongans []master.Golongan
	if err := db.Find(&golongans).Error; err != nil {
		log.Printf("Seed SDM karyawan gagal (golongan): %v", err)
		return
	}
	kodeToID := map[string]uint{}
	for _, g := range golongans {
		kodeToID[g.Kode] = g.ID
	}
	legacyGolongan := map[int]string{1: "A", 2: "B", 3: "C", 4: "D", 5: "E", 6: "F"}

	parse := func(s string) *time.Time {
		if s == "" {
			return nil
		}
		t, err := time.Parse("2006-01-02", s)
		if err != nil {
			return nil
		}
		return &t
	}

	// (legacy_id, nama, tgl_masuk, id_pk lama, sertifikasi, impasing)
	type row struct {
		legacyID    int
		nama        string
		tgl         string
		idPK        int
		sertifikasi bool
		impasing    bool
	}
	rows := []row{
		{1, "Abdul Rohim, S.PdI", "2005-11-15", 6, false, false},
		{2, "Khoirul Izzah, S.Pd AUD", "2005-11-15", 6, false, true},
		{3, "Miftahul Jannah, S.Pd", "2005-11-15", 6, true, false},
		{4, "Fatimah Zahroh, S.Pd", "2005-11-15", 6, true, false},
		{5, "Umami Faizah, SE, S.Pd", "2005-11-15", 6, false, true},
		{7, "Iin Mayasari, S.Pd", "2007-03-01", 5, true, false},
		{8, "Indah Susanti, S.Pd", "2008-06-02", 5, true, false},
		{9, "Sri Wahyudati, S.Pd", "2011-07-01", 4, true, false},
		{10, "Maratul Mufidah, S.Pd", "2012-07-01", 4, true, false},
		{11, "Siti Zulaikhah, S.Pd", "2013-06-01", 4, false, false},
		{12, "Khafidhotul Mushonnifah", "2013-07-01", 4, true, false},
		{13, "Heni Khumaaidah, S.Pd", "2014-09-01", 4, false, false},
		{15, "Choirul Ummah", "2015-02-01", 4, true, false},
		{16, "Elis Masrikhah, S.Pd", "2015-07-01", 4, false, false},
		{17, "Fitriyah Hanim, S.Pd", "2015-11-01", 4, false, false},
		{19, "Nur Fadilah, S.Pd", "2016-06-01", 3, true, false},
		{20, "Dini Mayasusanti, S.Pd", "2016-07-07", 3, true, false},
		{22, "Husnul Khotimah", "2017-03-27", 3, false, false},
		{23, "Triana Septi Anifah", "2017-03-27", 3, false, false},
		{24, "Ifatin Nikmah, S.Pd", "2018-03-12", 3, true, false},
		{25, "Mei Nur Firdaus, S.S", "2019-06-01", 3, true, false},
		{27, "Nur Sa'diyah", "", 1, false, false},
		{28, "Faizatur Rohmah", "2021-11-22", 2, true, false},
		{30, "Anita Khoirina, S.Pd", "2021-10-22", 2, false, false},
		{31, "Dhiayu Choirun Nisak, S.Pd", "2022-06-06", 2, false, false},
		{32, "Qurrotul Azizah", "2022-08-26", 2, false, false},
		{33, "Ika Nur Istiqomah", "2022-10-25", 2, false, false},
		{36, "Rizky Nurus Shobah", "2023-09-04", 2, false, false},
		{38, "Nadlifatul Faniyah", "2023-08-15", 2, false, false},
		{39, "Khiqma Liatul Khoirina", "2025-09-15", 1, false, false},
		{40, "Anindya Margaretha Setya Winara", "2025-09-15", 1, false, false},
	}

	employees := make([]guru.Employee, 0, len(rows))
	for _, r := range rows {
		legacy := r.legacyID
		golonganID := kodeToID[legacyGolongan[r.idPK]]
		employees = append(employees, guru.Employee{
			LegacyID:    &legacy,
			Nama:        r.nama,
			TglMasuk:    parse(r.tgl),
			GolonganID:  &golonganID,
			Sertifikasi: r.sertifikasi,
			Impasing:    r.impasing,
			IsActive:    true,
		})
	}
	if err := db.Create(&employees).Error; err != nil {
		log.Printf("Seed SDM karyawan gagal: %v", err)
		return
	}
	log.Printf("Seed SDM: %d karyawan", len(employees))
}
