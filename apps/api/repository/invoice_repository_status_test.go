package repository

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

type invoiceStatusRow struct {
	ID     uint `gorm:"primaryKey"`
	Status string
}

func (invoiceStatusRow) TableName() string { return "invoices" }

func setupInvoiceStatusFilterTestDB(t *testing.T) *gorm.DB {
	t.Helper()

	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	require.NoError(t, err)

	sqlDB, err := db.DB()
	require.NoError(t, err)
	sqlDB.SetMaxOpenConns(1)

	require.NoError(t, db.AutoMigrate(&invoiceStatusRow{}))
	for _, status := range []string{"unpaid", "partial", "paid"} {
		require.NoError(t, db.Create(&invoiceStatusRow{Status: status}).Error)
	}
	return db
}

func countInvoiceStatusRows(t *testing.T, db *gorm.DB, status string) int64 {
	t.Helper()

	var count int64
	q := db.Table("invoices")
	q = applyInvoiceStatusFilter(q, status)
	require.NoError(t, q.Count(&count).Error)
	return count
}

func TestApplyInvoiceStatusFilter(t *testing.T) {
	db := setupInvoiceStatusFilterTestDB(t)

	tests := []struct {
		name   string
		status string
		want   int64
	}{
		{"tanpa filter", "", 3},
		{"status tunggal", "unpaid", 1},
		{"daftar status", "unpaid,partial", 2},
		{"spasi di sekitar status", " unpaid , partial ", 2},
		{"koma di akhir", "unpaid,", 1},
		{"hanya pemisah", ",,", 0},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			assert.Equal(t, tt.want, countInvoiceStatusRows(t, db, tt.status))
		})
	}
}
