package guru

import (
	"errors"
	"net/http"
	"testing"

	"api/internal/modules/sdm/master"
	"api/utility"

	"github.com/stretchr/testify/require"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

// newAttachmentTestDB menyiapkan DB in-memory dengan partial unique index yang
// sama seperti hasil sdm.EnsureIndexes (SQLite mendukung partial index).
func newAttachmentTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	require.NoError(t, err)

	sqlDB, err := db.DB()
	require.NoError(t, err)
	sqlDB.SetMaxOpenConns(1)

	require.NoError(t, db.AutoMigrate(
		&Employee{}, &FungsionalDetail{}, &master.Fungsional{}, &master.Golongan{},
	))
	require.NoError(t, db.Exec(
		`CREATE UNIQUE INDEX uq_fungsional_guru
		 ON sdm_fungsional_detail (fungsional_id, employee_id)
		 WHERE deleted_at IS NULL`,
	).Error)
	return db
}

// TestAttachFungsional_DetachThenReattach memastikan lampiran yang sudah
// dilepas (soft delete) bisa dipasang ulang — regresi dari bug duplicate key 500.
func TestAttachFungsional_DetachThenReattach(t *testing.T) {
	db := newAttachmentTestDB(t)

	emp := &Employee{Nama: "Karyawan A", IsActive: true}
	require.NoError(t, db.Create(emp).Error)
	fn := &master.Fungsional{Nama: "Ketua Yayasan", Nilai: 250000}
	require.NoError(t, db.Create(fn).Error)

	svc := NewService(NewRepository(db), master.NewRepository(db))
	req := AttachFungsionalRequest{FungsionalID: fn.ID}

	require.NoError(t, svc.AttachFungsional(emp.ID, req))

	// Duplikat aktif → konflik terketik (409), bukan 500.
	err := svc.AttachFungsional(emp.ID, req)
	require.Error(t, err)
	var appErr *utility.AppError
	require.True(t, errors.As(err, &appErr))
	require.Equal(t, http.StatusConflict, appErr.Code)

	var detail FungsionalDetail
	require.NoError(t, db.Where("employee_id = ? AND fungsional_id = ?", emp.ID, fn.ID).First(&detail).Error)
	require.NoError(t, svc.DetachFungsional(emp.ID, detail.ID))

	// Setelah detach, pasang ulang harus sukses.
	require.NoError(t, svc.AttachFungsional(emp.ID, req))

	var count int64
	require.NoError(t, db.Model(&FungsionalDetail{}).
		Where("employee_id = ? AND fungsional_id = ?", emp.ID, fn.ID).
		Count(&count).Error)
	require.EqualValues(t, 1, count)
}

// TestCreateFungsional_DuplicateKeyRecognized memastikan race yang lolos
// pre-check tetap terdeteksi sebagai duplicate key oleh utility.IsDuplicateKey.
func TestCreateFungsional_DuplicateKeyRecognized(t *testing.T) {
	db := newAttachmentTestDB(t)
	repo := NewRepository(db)

	require.NoError(t, repo.CreateFungsional(&FungsionalDetail{FungsionalID: 1, EmployeeID: 1}))
	err := repo.CreateFungsional(&FungsionalDetail{FungsionalID: 1, EmployeeID: 1})
	require.Error(t, err)
	require.True(t, utility.IsDuplicateKey(err))
}
