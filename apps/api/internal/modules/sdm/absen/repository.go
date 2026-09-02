package absen

import (
	"time"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type Repository struct {
	db *gorm.DB
}

func NewRepository(db *gorm.DB) *Repository { return &Repository{db: db} }

// FindByPeriode mengambil absensi satu periode, urut nama karyawan.
func (r *Repository) FindByPeriode(periode time.Time) ([]Absen, error) {
	var rows []Absen
	err := r.db.Preload("Employee").
		Where("periode = ?", periode).
		Order("employee_id ASC").
		Find(&rows).Error
	return rows, err
}

// UpsertBulk menyimpan absensi banyak karyawan untuk satu periode. Idempotent:
// kombinasi (periode, employee_id) unik → konflik di-ON CONFLICT-update.
func (r *Repository) UpsertBulk(periode time.Time, entries []AbsenEntry) error {
	if len(entries) == 0 {
		return nil
	}
	rows := make([]Absen, 0, len(entries))
	for _, e := range entries {
		rows = append(rows, Absen{
			Periode: periode, EmployeeID: e.EmployeeID,
			Hadir: e.Hadir, HadirSiaga: e.HadirSiaga, HadirTerlambat: e.HadirTerlambat,
			HadirPiket: e.HadirPiket, PulangAwal: e.PulangAwal,
		})
	}
	return r.db.Clauses(clause.OnConflict{
		Columns: []clause.Column{{Name: "periode"}, {Name: "employee_id"}},
		DoUpdates: clause.AssignmentColumns([]string{
			"hadir", "hadir_siaga", "hadir_terlambat", "hadir_piket", "pulang_awal", "updated_at",
		}),
	}).Create(&rows).Error
}

// DeleteByPeriode menghapus seluruh absensi satu periode.
func (r *Repository) DeleteByPeriode(periode time.Time) error {
	return r.db.Where("periode = ?", periode).Delete(&Absen{}).Error
}

// EmployeeExists memeriksa keberadaan karyawan.
func (r *Repository) EmployeeExists(employeeID uint) (bool, error) {
	var count int64
	if err := r.db.Table("sdm_employees").Where("id = ?", employeeID).Count(&count).Error; err != nil {
		return false, err
	}
	return count > 0, nil
}
