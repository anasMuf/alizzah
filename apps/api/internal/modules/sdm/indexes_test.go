package sdm

import (
	"testing"

	"api/internal/modules/sdm/guru"
	"api/internal/modules/sdm/master"

	"github.com/stretchr/testify/require"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

// TestEnsureIndexes_PartialUniqueAndIdempotent memastikan index lampiran
// mengabaikan baris soft-deleted, menolak duplikat aktif, dan aman dijalankan
// berulang kali.
func TestEnsureIndexes_PartialUniqueAndIdempotent(t *testing.T) {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	require.NoError(t, err)
	sqlDB, err := db.DB()
	require.NoError(t, err)
	sqlDB.SetMaxOpenConns(1)

	require.NoError(t, db.AutoMigrate(
		&guru.FungsionalDetail{}, &guru.TugasTambahanDetail{},
		&guru.PenanggungJawabDetail{}, &guru.LainlainDetail{},
		&master.Fungsional{}, &master.TugasTambahan{},
		&master.PenanggungJawab{}, &master.Lainlain{},
	))

	// Idempotent: dipanggil dua kali seperti restart berikutnya.
	require.NoError(t, EnsureIndexes(db))
	require.NoError(t, EnsureIndexes(db))

	old := &guru.FungsionalDetail{FungsionalID: 1, EmployeeID: 1}
	require.NoError(t, db.Create(old).Error)
	require.NoError(t, db.Delete(old).Error)

	// Pasangan yang sama dengan baris lama soft-deleted harus diizinkan.
	require.NoError(t, db.Create(&guru.FungsionalDetail{FungsionalID: 1, EmployeeID: 1}).Error)

	// Duplikat aktif tetap ditolak.
	require.Error(t, db.Create(&guru.FungsionalDetail{FungsionalID: 1, EmployeeID: 1}).Error)
}
