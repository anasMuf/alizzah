package kirimwa

import (
	"testing"
	"time"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func newTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("open test db: %v", err)
	}
	if err := db.AutoMigrate(&KirimWA{}); err != nil {
		t.Fatalf("migrate: %v", err)
	}
	return db
}

// TestRepository_AntrianDanKlaim menguji siklus: upsert pending → klaim
// (processing) keluar dari antrian → recovery mengembalikannya. Sekaligus
// memastikan upsert (employee+periode) tidak menggandakan baris.
func TestRepository_AntrianDanKlaim(t *testing.T) {
	repo := NewRepository(newTestDB(t))
	p := time.Date(2026, 10, 5, 0, 0, 0, 0, time.Local)

	if err := repo.Upsert(&KirimWA{EmployeeID: 1, Periode: p, NoTelp: "6281", Status: StatusPending}); err != nil {
		t.Fatalf("upsert: %v", err)
	}

	rows, err := repo.Pending(10)
	if err != nil {
		t.Fatalf("pending: %v", err)
	}
	if len(rows) != 1 {
		t.Fatalf("pending = %d, want 1", len(rows))
	}

	// Klaim → tidak lagi muncul di antrian.
	row := rows[0]
	row.Status = StatusProcessing
	if err := repo.Save(&row); err != nil {
		t.Fatalf("save klaim: %v", err)
	}
	if more, _ := repo.Pending(10); len(more) != 0 {
		t.Fatalf("baris 'processing' masih di antrian: %d", len(more))
	}

	// Recovery → kembali ke antrian.
	n, err := repo.RecoverProcessing()
	if err != nil || n != 1 {
		t.Fatalf("RecoverProcessing = (%d,%v), want (1,nil)", n, err)
	}
	if back, _ := repo.Pending(10); len(back) != 1 {
		t.Fatalf("setelah recovery pending = %d, want 1", len(back))
	}

	// Upsert ulang (employee+periode sama) → tetap satu baris.
	if err := repo.Upsert(&KirimWA{EmployeeID: 1, Periode: p, NoTelp: "6282", Status: StatusPending}); err != nil {
		t.Fatalf("upsert kedua: %v", err)
	}
	var count int64
	repo.db.Model(&KirimWA{}).Count(&count)
	if count != 1 {
		t.Fatalf("jumlah baris = %d, want 1 (upsert tidak menggandakan)", count)
	}
}
