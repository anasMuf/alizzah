package absen

import (
	"testing"
	"time"

	"api/internal/modules/sdm/guru"

	"github.com/stretchr/testify/require"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

// TestUpsertBulk_RestoresSoftDeletedPeriod memastikan periode yang dihapus bisa
// diisi ulang: ON CONFLICT harus me-reset deleted_at, bukan menyimpan angka
// pada baris yang tetap tersembunyi.
func TestUpsertBulk_RestoresSoftDeletedPeriod(t *testing.T) {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	require.NoError(t, err)
	sqlDB, err := db.DB()
	require.NoError(t, err)
	sqlDB.SetMaxOpenConns(1)

	require.NoError(t, db.AutoMigrate(&guru.Employee{}, &Absen{}))
	repo := NewRepository(db)

	periode := time.Date(2026, 10, 5, 0, 0, 0, 0, time.UTC)
	require.NoError(t, repo.UpsertBulk(periode, []AbsenEntry{{EmployeeID: 1, Hadir: 1}}))
	require.NoError(t, repo.DeleteByPeriode(periode))

	// Simulasi input ulang lewat UI setelah periode dihapus.
	require.NoError(t, repo.UpsertBulk(periode, []AbsenEntry{{EmployeeID: 1, Hadir: 7}}))

	var rows []Absen
	require.NoError(t, db.Where("periode = ?", periode).Find(&rows).Error)
	require.Len(t, rows, 1)
	require.Equal(t, 7, rows[0].Hadir)
}
