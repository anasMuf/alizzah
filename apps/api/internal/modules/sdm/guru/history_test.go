package guru

import (
	"testing"
	"time"

	"api/internal/modules/sdm/master"

	"github.com/stretchr/testify/require"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

// TestUpsertHistory_RestoresSoftDeletedDate memastikan riwayat golongan yang
// pernah dihapus bisa ditulis ulang pada tanggal efektif yang sama tanpa
// tertinggal dalam status soft-deleted.
func TestUpsertHistory_RestoresSoftDeletedDate(t *testing.T) {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	require.NoError(t, err)
	sqlDB, err := db.DB()
	require.NoError(t, err)
	sqlDB.SetMaxOpenConns(1)

	require.NoError(t, db.AutoMigrate(&GolonganHistory{}, &master.Golongan{}))
	repo := NewRepository(db)

	tgl := time.Date(2026, 1, 5, 0, 0, 0, 0, time.UTC)
	require.NoError(t, repo.UpsertHistory(&GolonganHistory{
		EmployeeID: 1, GolonganID: 1, EffectiveDate: tgl,
	}))

	rows, err := repo.FindHistory(1)
	require.NoError(t, err)
	require.Len(t, rows, 1)
	require.NoError(t, repo.DeleteHistory(rows[0].ID, 1))

	rows, err = repo.FindHistory(1)
	require.NoError(t, err)
	require.Empty(t, rows)

	// Tulis ulang pada tanggal yang sama → baris lama dipulihkan & diperbarui.
	require.NoError(t, repo.UpsertHistory(&GolonganHistory{
		EmployeeID: 1, GolonganID: 2, EffectiveDate: tgl,
	}))

	rows, err = repo.FindHistory(1)
	require.NoError(t, err)
	require.Len(t, rows, 1)
	require.EqualValues(t, 2, rows[0].GolonganID)
}
