package absen

import (
	"errors"
	"net/http"
	"testing"
	"time"

	"api/internal/modules/sdm/guru"
	"api/internal/modules/sdm/periode"
	"api/utility"

	"github.com/stretchr/testify/require"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

// payrollPeriodeStub — versi minimal tabel sdm_payroll_periode untuk menguji
// guard tanpa meng-import package penggajian (package tsb meng-import absen,
// sehingga import balik akan membentuk siklus).
type payrollPeriodeStub struct {
	ID        uint `gorm:"primaryKey"`
	Periode   time.Time
	Status    string
	DeletedAt gorm.DeletedAt `gorm:"index"`
}

func (payrollPeriodeStub) TableName() string { return "sdm_payroll_periode" }

func newLockTestService(t *testing.T) (*Service, *gorm.DB) {
	t.Helper()
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	require.NoError(t, err)
	sqlDB, err := db.DB()
	require.NoError(t, err)
	sqlDB.SetMaxOpenConns(1)

	require.NoError(t, db.AutoMigrate(&guru.Employee{}, &Absen{}, &payrollPeriodeStub{}))
	require.NoError(t, db.Create(&guru.Employee{Nama: "Karyawan Uji"}).Error)

	return NewService(NewRepository(db)), db
}

func requireConflict(t *testing.T, err error) {
	t.Helper()
	require.Error(t, err)
	var appErr *utility.AppError
	require.True(t, errors.As(err, &appErr), "expected *utility.AppError, got %T", err)
	require.Equal(t, http.StatusConflict, appErr.Code)
}

// TestUpsert_RejectsFinalizedPeriode memastikan absensi periode yang gajinya
// sudah difinalisasi tidak bisa diubah tanpa Unlock.
func TestUpsert_RejectsFinalizedPeriode(t *testing.T) {
	svc, db := newLockTestService(t)
	p := periode.MustParse("2026-10")
	require.NoError(t, db.Create(&payrollPeriodeStub{Periode: p, Status: "finalized"}).Error)

	_, err := svc.Upsert(UpsertRequest{
		Periode: "2026-10",
		Items:   []AbsenEntry{{EmployeeID: 1, Hadir: 1}},
	})
	requireConflict(t, err)

	var count int64
	require.NoError(t, db.Model(&Absen{}).Count(&count).Error)
	require.Zero(t, count, "baris absensi tidak boleh tersimpan saat periode terkunci")
}

// TestDelete_RejectsFinalizedPeriode memastikan hapus massal periode terkunci
// juga ditolak dan data lama tetap aktif.
func TestDelete_RejectsFinalizedPeriode(t *testing.T) {
	svc, db := newLockTestService(t)
	p := periode.MustParse("2026-10")
	require.NoError(t, db.Create(&Absen{Periode: p, EmployeeID: 1, Hadir: 3}).Error)
	require.NoError(t, db.Create(&payrollPeriodeStub{Periode: p, Status: "finalized"}).Error)

	requireConflict(t, svc.Delete("2026-10"))

	var row Absen
	require.NoError(t, db.Where("periode = ? AND employee_id = ?", p, 1).First(&row).Error)
	require.False(t, row.DeletedAt.Valid, "baris tidak boleh ter-soft-delete saat periode terkunci")
}

// TestUpsert_AllowsWhenNotFinalized memastikan guard tidak over-blocking:
// periode open / belum punya header payroll tetap bisa disimpan.
func TestUpsert_AllowsWhenNotFinalized(t *testing.T) {
	svc, db := newLockTestService(t)
	p := periode.MustParse("2026-10")
	require.NoError(t, db.Create(&payrollPeriodeStub{Periode: p, Status: "open"}).Error)

	n, err := svc.Upsert(UpsertRequest{
		Periode: "2026-10",
		Items:   []AbsenEntry{{EmployeeID: 1, Hadir: 5}},
	})
	require.NoError(t, err)
	require.Equal(t, 1, n)

	var row Absen
	require.NoError(t, db.Where("periode = ? AND employee_id = ?", p, 1).First(&row).Error)
	require.Equal(t, 5, row.Hadir)
}
