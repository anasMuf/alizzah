package pinjam

import (
	"testing"

	"api/internal/modules/sdm/guru"

	"github.com/stretchr/testify/require"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

// TestCreate_RestoresDeletedLoan memastikan karyawan yang pinjamannya pernah
// dihapus bisa meminjam lagi: baris akumulatif dipulihkan, bukan menabrak
// unique employee_id (500).
func TestCreate_RestoresDeletedLoan(t *testing.T) {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	require.NoError(t, err)
	sqlDB, err := db.DB()
	require.NoError(t, err)
	sqlDB.SetMaxOpenConns(1)

	require.NoError(t, db.AutoMigrate(&guru.Employee{}, &Pinjam{}, &PinjamDetail{}))
	require.NoError(t, db.Create(&guru.Employee{Nama: "Karyawan A", IsActive: true}).Error)

	svc := NewService(NewRepository(db))
	first, err := svc.Create(CreateRequest{EmployeeID: 1, Jumlah: 100})
	require.NoError(t, err)
	require.NoError(t, svc.Delete(first.ID))

	second, err := svc.Create(CreateRequest{EmployeeID: 1, Jumlah: 50})
	require.NoError(t, err)
	require.Equal(t, 150, second.Jumlah)
	require.Equal(t, 150, second.Sisa)

	var count int64
	require.NoError(t, db.Model(&Pinjam{}).Where("employee_id = ?", 1).Count(&count).Error)
	require.EqualValues(t, 1, count)
}
