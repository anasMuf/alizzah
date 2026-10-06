package sdm

import (
	"log"

	"gorm.io/gorm"
)

// EnsureEmployeeView memastikan `koperasi_employees` adalah VIEW di atas
// `sdm_employees` — sumber kanonik karyawan adalah modul SDM (K1). Idempotent:
//
//   - `sdm_employees` belum ada → return (deploy order; dipanggil lagi oleh
//     boot cmd/sdm maupun cmd/koperasi, jadi urutan start tidak penting)
//   - `sdm_employees` masih kosong → tidak swap (hindari kehilangan data)
//   - `koperasi_employees` sudah view → skip
//   - `koperasi_employees` masih tabel fisik → lepas FK dari koperasi_members
//     (PostgreSQL tidak mengizinkan FK mereferensikan view), drop tabel, buat view
func EnsureEmployeeView(db *gorm.DB) error {
	if !db.Migrator().HasTable("sdm_employees") {
		log.Println("EnsureEmployeeView: sdm_employees belum ada, skip (deploy order)")
		return nil
	}

	var sdmCount int64
	if err := db.Table("sdm_employees").Count(&sdmCount).Error; err != nil {
		return err
	}
	if sdmCount == 0 {
		log.Println("EnsureEmployeeView: sdm_employees kosong, tidak swap (hindari kehilangan data)")
		return nil
	}

	kind, err := relkind(db, "koperasi_employees")
	if err != nil {
		return err
	}
	switch kind {
	case "v":
		log.Println("EnsureEmployeeView: koperasi_employees sudah view, skip")
		return nil
	case "r":
		// Migrasi satu arah: tabel fisik lama → view. Lepas FK dulu.
		if err := db.Exec(`DO $$ DECLARE c text; BEGIN
			FOR c IN SELECT conname FROM pg_constraint
				WHERE conrelid = 'koperasi_members'::regclass
				  AND contype = 'f'
				  AND confrelid = 'koperasi_employees'::regclass
			LOOP EXECUTE format('ALTER TABLE koperasi_members DROP CONSTRAINT %I', c); END LOOP;
		END $$;`).Error; err != nil {
			return err
		}
		if err := db.Migrator().DropTable("koperasi_employees"); err != nil {
			return err
		}
		log.Println("EnsureEmployeeView: tabel fisik koperasi_employees di-drop")
	}

	// COALESCE legacy_id → 0 agar kompatibel dgn model koperasi (int not null).
	// CREATE OR REPLACE VIEW → aman dipanggil berulang (definisi identik).
	create := `CREATE OR REPLACE VIEW koperasi_employees AS
		SELECT id, COALESCE(legacy_id, 0) AS legacy_id, nama AS full_name,
		       tgl_masuk AS join_date, is_active, created_at, updated_at, deleted_at
		FROM sdm_employees`
	if err := db.Exec(create).Error; err != nil {
		return err
	}
	log.Println("EnsureEmployeeView: koperasi_employees dibuat sebagai view atas sdm_employees")
	return nil
}

// relkind mengembalikan jenis relasi PostgreSQL ('r'=table, 'v'=view) atau
// string kosong bila tidak ada. Dipakai karena GORM HasTable hanya mendeteksi
// BASE TABLE (bukan view).
func relkind(db *gorm.DB, table string) (string, error) {
	var kind string
	err := db.Raw(`SELECT relkind FROM pg_class
		WHERE relname = ? AND relnamespace = 'public'::regnamespace`, table).Scan(&kind).Error
	if err != nil {
		return "", err
	}
	return kind, nil
}
