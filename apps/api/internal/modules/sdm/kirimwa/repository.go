package kirimwa

import (
	"errors"
	"time"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// Repository menyimpan & membaca status pengiriman WA.
type Repository struct {
	db *gorm.DB
}

func NewRepository(db *gorm.DB) *Repository { return &Repository{db: db} }

// Upsert menyimpan status untuk (employee_id, periode). Baris yang sudah ada
// akan diperbarui — dipakai untuk kirim ulang/retry. `row.ID` harus 0.
func (r *Repository) Upsert(row *KirimWA) error {
	return r.db.Clauses(clause.OnConflict{
		Columns: []clause.Column{{Name: "employee_id"}, {Name: "periode"}},
		DoUpdates: clause.AssignmentColumns([]string{
			"no_telp", "status", "pesan_error", "attempts", "waktu_kirim", "updated_at",
		}),
	}).Create(row).Error
}

// Save memperbarui baris berdasarkan primary key (dipakai worker setelah klaim).
func (r *Repository) Save(row *KirimWA) error { return r.db.Save(row).Error }

// ListByPeriode mengembalikan status seluruh karyawan pada satu periode.
func (r *Repository) ListByPeriode(periode time.Time) ([]KirimWA, error) {
	var rows []KirimWA
	err := r.db.Where("periode = ?", periode).Order("employee_id ASC").Find(&rows).Error
	return rows, err
}

// Pending mengambil antrian yang belum terkirim (urut id).
func (r *Repository) Pending(limit int) ([]KirimWA, error) {
	var rows []KirimWA
	err := r.db.Where("status = ?", StatusPending).Order("id ASC").Limit(limit).Find(&rows).Error
	return rows, err
}

// FindByEmployee mengembalikan status satu karyawan pada periode (bila ada).
func (r *Repository) FindByEmployee(employeeID uint, periode time.Time) (*KirimWA, error) {
	var row KirimWA
	err := r.db.Where("employee_id = ? AND periode = ?", employeeID, periode).First(&row).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &row, nil
}
