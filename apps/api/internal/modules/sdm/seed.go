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

// seedEmployees mengisi karyawan sesuai data terkini: dump `guru` lama + dua
// karyawan baru yang ditambah lewat UI (LegacyID nil). `GolonganID` dipetakan
// dari kode golongan; `NoTelp` sudah format ternormalisasi (+62…).
func seedEmployees(db *gorm.DB) {
	var count int64
	db.Model(&guru.Employee{}).Count(&count)
	if count > 0 {
		return
	}

	// Peta kode golongan (A–F) → id baru.
	var golongans []master.Golongan
	if err := db.Find(&golongans).Error; err != nil {
		log.Printf("Seed SDM karyawan gagal (golongan): %v", err)
		return
	}
	kodeToID := map[string]uint{}
	for _, g := range golongans {
		kodeToID[g.Kode] = g.ID
	}

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

	// (legacy_id, nama, no_telp, tgl_masuk, kode golongan, sertifikasi, impasing)
	// legacy_id = id_guru lama; nil untuk karyawan yang ditambah lewat UI.
	type row struct {
		legacyID    *int
		nama        string
		noTelp      string
		tgl         string
		golongan    string
		sertifikasi bool
		impasing    bool
	}
	rows := []row{
		{ptr(1), "Abdul Rohim, S.PdI", "+6285852665153", "2005-11-15", "F", false, false},
		{ptr(2), "Khoirul Izzah, S.Pd AUD", "+6285856181318", "2005-11-15", "F", false, true},
		{ptr(3), "Miftahul Jannah, S.Pd", "+6285730499275", "2005-11-15", "F", true, false},
		{ptr(4), "Fatimah Zahroh, S.Pd", "+6285646518778", "2005-11-15", "F", true, false},
		{ptr(5), "Umami Faizah, SE, S.Pd", "+6282233637848", "2005-11-15", "F", false, true},
		{ptr(7), "Iin Mayasari, S.Pd", "+6285851100016", "2007-03-01", "E", true, false},
		{ptr(8), "Indah Susanti, S.Pd", "+6285604452548", "2008-06-02", "E", true, false},
		{ptr(9), "Sri Wahyudati, S.Pd", "+6285648975887", "2011-07-01", "D", true, false},
		{ptr(10), "Maratul Mufidah, S.Pd", "+6285871281390", "2012-07-01", "D", true, false},
		{ptr(11), "Siti Zulaikhah, S.Pd", "+6281935438554", "2013-06-01", "D", false, false},
		{ptr(12), "Khafidhotul Mushonnifah", "+6285804425092", "2013-07-01", "D", true, false},
		{ptr(13), "Heni Khumaaidah, S.Pd", "+6285732519859", "2014-09-01", "D", false, false},
		{ptr(15), "Choirul Ummah", "+6285645480020", "2015-02-01", "D", true, false},
		{ptr(16), "Elis Masrikhah, S.Pd", "+6285707019842", "2015-07-01", "D", false, false},
		{ptr(17), "Fitriyah Hanim, S.Pd", "+6285731830420", "2015-11-01", "D", false, false},
		{ptr(19), "Nur Fadilah, S.Pd", "+6285755144227", "2016-06-01", "C", true, false},
		{ptr(20), "Dini Mayasusanti, S.Pd", "+628993592261", "2016-07-07", "C", true, false},
		{ptr(22), "Husnul Khotimah", "+6281234027634", "2017-03-27", "C", false, false},
		{ptr(23), "Triana Septi Anifah", "+6285706199197", "2017-03-27", "C", false, false},
		{ptr(24), "Ifatin Nikmah, S.Pd", "+6285536483099", "2018-03-12", "C", true, false},
		{ptr(25), "Mei Nur Firdaus, S.S", "+6283849045315", "2019-06-01", "C", true, false},
		{ptr(27), "Nur Sa'diyah", "+6281231447396", "", "A", false, false},
		{ptr(28), "Faizatur Rohmah", "+6289699070503", "2021-11-22", "B", true, false},
		{ptr(30), "Anita Khoirina, S.Pd", "+6285755482109", "2021-10-22", "B", false, false},
		{ptr(31), "Dhiayu Choirun Nisak, S.Pd", "+62895337475148", "2022-06-06", "B", false, false},
		{ptr(32), "Qurrotul Azizah", "+6285755255694", "2022-08-26", "B", false, false},
		{ptr(33), "Ika Nur Istiqomah", "+6285815180424", "2022-10-25", "B", false, false},
		{ptr(36), "Rizky Nurus Shobah", "+6285854070131", "2023-09-04", "B", false, false},
		{ptr(38), "Nadlifatul Faniyah", "+6285704163511", "2023-08-15", "B", false, false},
		{ptr(39), "Khiqma Liatul Khoirina", "+6282231670185", "2025-09-15", "A", false, false},
		{ptr(40), "Anindya Margaretha Setya Winara", "+6287843907711", "2025-09-15", "A", false, false},
		{nil, "Sugiyanto", "+6285648533884", "2026-06-09", "A", false, false},
		{nil, "Adila Farah Aulia", "+6282234062893", "2026-08-17", "A", false, false},
	}

	employees := make([]guru.Employee, 0, len(rows))
	for _, r := range rows {
		var golonganID *uint
		if id, ok := kodeToID[r.golongan]; ok {
			g := id
			golonganID = &g
		}
		employees = append(employees, guru.Employee{
			LegacyID:    r.legacyID,
			Nama:        r.nama,
			NoTelp:      r.noTelp,
			TglMasuk:    parse(r.tgl),
			GolonganID:  golonganID,
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
