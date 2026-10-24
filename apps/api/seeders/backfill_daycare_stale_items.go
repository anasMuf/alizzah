package seeders

import (
	"api/model"
	"fmt"
	"log"
	"strings"

	"gorm.io/gorm"
)

// BackfillDaycareStaleItems membersihkan item SPD daycare yang menumpuk pada
// invoice bulanan akibat perubahan time_slot/age_group enrollment.
//
// Bug lama: saat slot berubah, item SPD lama tidak dihapus karena pencocokan
// hanya memakai prefix nama. Item baru kemudian ditambahkan, sehingga satu
// invoice bisa punya beberapa SPD (tarif lama + tarif baru) dan total tagihan
// ikut membengkak.
//
// Seeder ini sengaja dibuat konservatif:
//   - Hanya memproses bulan yang memakai ringkasan kehadiran bulanan. Fallback
//     absensi harian multi-slot bisa menghasilkan beberapa item SPD yang sah.
//   - Hanya item yang namanya cocok dengan tarif SPD daycare yang dipertimbangkan,
//     sehingga item konsumsi/legacy berkategori "daycare" tidak ikut terhapus.
//   - Item yang sudah dibayar (paid_amount > 0) tidak pernah dihapus.
//   - Jika tarif yang diharapkan tidak ditemukan / tidak ada item yang cocok,
//     invoice di-skip dan dicatat untuk pengecekan manual.
//
// Idempotent — aman dijalankan berulang kali. Total invoice dihitung ulang oleh
// BackfillDaycareRegularCleanup yang dijalankan setelah seeder ini.
func BackfillDaycareStaleItems(db *gorm.DB) {
	log.Println("[BackfillDaycareStale] Mulai...")

	type invoiceRow struct {
		InvoiceID      uint
		StudentID      uint
		AcademicYearID uint
		Month          uint
		Year           uint
	}

	var rows []invoiceRow
	if err := db.Raw(`
		SELECT i.id AS invoice_id, i.student_id, i.academic_year_id, i.month, i.year
		FROM invoices i
		JOIN invoice_items ii
		  ON ii.invoice_id = i.id
		 AND ii.deleted_at IS NULL
		 AND ii.category = 'daycare'
		WHERE i.type = 'monthly'
		  AND i.deleted_at IS NULL
		  AND i.month IS NOT NULL
		  AND i.year IS NOT NULL
		GROUP BY i.id, i.student_id, i.academic_year_id, i.month, i.year
		HAVING COUNT(ii.id) > 1
	`).Scan(&rows).Error; err != nil {
		log.Printf("[BackfillDaycareStale] Gagal mencari invoice duplikat: %v", err)
		return
	}

	if len(rows) == 0 {
		log.Println("[BackfillDaycareStale] Tidak ada item SPD duplikat")
		return
	}

	cleaned := 0
	for _, row := range rows {
		if cleanupDaycareDuplicateItems(db, row.InvoiceID, row.StudentID, row.AcademicYearID, row.Month, row.Year) {
			cleaned++
		}
	}
	log.Printf("[BackfillDaycareStale] Selesai: %d invoice dibersihkan", cleaned)
}

func cleanupDaycareDuplicateItems(db *gorm.DB, invoiceID, studentID, academicYearID, month, year uint) bool {
	de, err := findEnrollmentForCleanup(db, studentID, academicYearID)
	if err != nil {
		log.Printf("[BackfillDaycareStale] Skip invoice=%d: enrollment daycare tidak ditemukan (%v)", invoiceID, err)
		return false
	}

	excluded, err := isDaycareMonthExcluded(db, studentID, de.ID, month, year)
	if err != nil {
		log.Printf("[BackfillDaycareStale] Skip invoice=%d: gagal cek billing exclusion (%v)", invoiceID, err)
		return false
	}

	expectedName := ""
	if !excluded {
		// Bulan dengan ringkasan kehadiran bulanan hanya mengharapkan satu item
		// SPD. Fallback absensi harian multi-slot tidak dibersihkan di sini karena
		// beberapa item SPD bisa sah.
		primary, err := hasMonthlyAttendance(db, studentID, month, year)
		if err != nil {
			log.Printf("[BackfillDaycareStale] Skip invoice=%d: gagal cek kehadiran bulanan (%v)", invoiceID, err)
			return false
		}
		if !primary {
			log.Printf("[BackfillDaycareStale] Skip invoice=%d: tidak ada ringkasan kehadiran bulanan", invoiceID)
			return false
		}

		name, err := expectedDaycareSPDName(db, *de, academicYearID)
		if err != nil {
			log.Printf("[BackfillDaycareStale] Skip invoice=%d: %v", invoiceID, err)
			return false
		}
		expectedName = name
	}

	spdNames, err := daycareSPDNames(db, academicYearID)
	if err != nil {
		log.Printf("[BackfillDaycareStale] Skip invoice=%d: %v", invoiceID, err)
		return false
	}

	var items []model.InvoiceItem
	if err := db.Where("invoice_id = ? AND category = ? AND deleted_at IS NULL", invoiceID, "daycare").
		Order("id DESC").Find(&items).Error; err != nil {
		log.Printf("[BackfillDaycareStale] Skip invoice=%d: gagal ambil item (%v)", invoiceID, err)
		return false
	}

	// Hanya item SPD yang dipertimbangkan. Item konsumsi legacy juga berkategori
	// "daycare", jadi tanpa filter ini seeder bisa menghapus tagihan konsumsi sah.
	spdItems := make([]model.InvoiceItem, 0, len(items))
	for _, item := range items {
		if matchesSeededFeeItemName(item.Name, spdNames) {
			spdItems = append(spdItems, item)
		}
	}
	if len(spdItems) == 0 {
		log.Printf("[BackfillDaycareStale] Skip invoice=%d: tidak ada item SPD yang dikenali", invoiceID)
		return false
	}

	if expectedName != "" {
		hasMatch := false
		for _, item := range spdItems {
			if matchesSeededFeeItemName(item.Name, []string{expectedName}) {
				hasMatch = true
				break
			}
		}
		if !hasMatch {
			log.Printf("[BackfillDaycareStale] ⚠️  Skip invoice=%d: tidak ada item yang cocok dengan tarif saat ini (%q). Perlu cek manual.", invoiceID, expectedName)
			return false
		}
	}

	// Pertahankan satu item SPD yang cocok (terbaru) + seluruh item yang sudah
	// dibayar. Untuk bulan yang di-skip, expectedName kosong → semua SPD unpaid
	// dihapus.
	keepID := uint(0)
	if expectedName != "" {
		for _, item := range spdItems { // sudah urut id DESC → item terbaru
			if matchesSeededFeeItemName(item.Name, []string{expectedName}) {
				keepID = item.ID
				break
			}
		}
	}

	deleted := 0
	for _, item := range spdItems {
		if item.ID == keepID || item.PaidAmount > 0 {
			continue
		}
		if err := db.Delete(&model.InvoiceItem{}, item.ID).Error; err != nil {
			log.Printf("[BackfillDaycareStale] Gagal hapus item %d: %v", item.ID, err)
			continue
		}
		log.Printf("[BackfillDaycareStale] ✓ invoice=%d hapus item SPD basi id=%d %q (Rp %.0f)",
			invoiceID, item.ID, item.Name, item.Amount)
		deleted++
	}

	return deleted > 0
}

func findEnrollmentForCleanup(db *gorm.DB, studentID, academicYearID uint) (*model.DaycareEnrollment, error) {
	var de model.DaycareEnrollment
	err := db.Where("student_id = ? AND academic_year_id = ? AND deleted_at IS NULL", studentID, academicYearID).
		Order("CASE WHEN status = 'active' THEN 0 ELSE 1 END, id DESC").
		First(&de).Error
	if err != nil {
		return nil, err
	}
	return &de, nil
}

func isDaycareMonthExcluded(db *gorm.DB, studentID, enrollmentID, month, year uint) (bool, error) {
	var count int64
	err := db.Model(&model.BillingMonthExclusion{}).
		Where("student_id = ? AND entity_type = ? AND entity_ref_id = ? AND month = ? AND year = ? AND deleted_at IS NULL",
			studentID, "daycare", enrollmentID, month, year).
		Count(&count).Error
	return count > 0, err
}

func hasMonthlyAttendance(db *gorm.DB, studentID, month, year uint) (bool, error) {
	var count int64
	err := db.Model(&model.DaycareMonthlyAttendance{}).
		Where("student_id = ? AND month = ? AND year = ? AND deleted_at IS NULL AND (spd_days > 0 OR meal_days > 0 OR overtime_minutes > 0)",
			studentID, month, year).
		Count(&count).Error
	return count > 0, err
}

func expectedDaycareSPDName(db *gorm.DB, de model.DaycareEnrollment, academicYearID uint) (string, error) {
	var fc model.FeeConfig
	if err := db.Where("academic_year_id = ?", academicYearID).First(&fc).Error; err != nil {
		return "", fmt.Errorf("fee config tidak ditemukan: %w", err)
	}

	slug := strings.ReplaceAll(de.TimeSlot, "-", "")
	key := fmt.Sprintf("daycare_regular_%s_%s_daily", slug, de.AgeGroup)
	if de.Category == "premium" {
		key = fmt.Sprintf("daycare_premium_%s_%s_spd", slug, de.AgeGroup)
	}

	var feeItem model.FeeConfigItem
	if err := db.Where("fee_config_id = ? AND item_key = ? AND level = 'all' AND gender = 'all'", fc.ID, key).
		First(&feeItem).Error; err != nil {
		return "", fmt.Errorf("fee item %s tidak ditemukan", key)
	}
	return feeItem.Name, nil
}

// daycareSPDNames mengembalikan seluruh nama tarif SPD daycare (regular harian &
// premium flat) pada fee config AY tersebut, termasuk yang sudah tidak aktif,
// karena item invoice lama bisa merujuk tarif lama.
func daycareSPDNames(db *gorm.DB, academicYearID uint) ([]string, error) {
	var fc model.FeeConfig
	if err := db.Where("academic_year_id = ?", academicYearID).First(&fc).Error; err != nil {
		return nil, fmt.Errorf("fee config tidak ditemukan: %w", err)
	}

	var items []model.FeeConfigItem
	if err := db.Where("fee_config_id = ? AND category = ?", fc.ID, "daycare").Find(&items).Error; err != nil {
		return nil, err
	}

	names := make([]string, 0, len(items))
	for _, item := range items {
		isRegularSPD := strings.HasPrefix(item.ItemKey, "daycare_regular_") && strings.HasSuffix(item.ItemKey, "_daily")
		isPremiumSPD := strings.HasPrefix(item.ItemKey, "daycare_premium_") && strings.HasSuffix(item.ItemKey, "_spd")
		if isRegularSPD || isPremiumSPD {
			names = append(names, item.Name)
		}
	}
	return names, nil
}

// matchesSeededFeeItemName mencocokkan nama item invoice dengan nama tarif.
// Boundary " (" mencegah tarif yang namanya menjadi prefix tarif lain ikut cocok.
func matchesSeededFeeItemName(name string, itemNames []string) bool {
	for _, itemName := range itemNames {
		if name == itemName || strings.HasPrefix(name, itemName+" (") {
			return true
		}
	}
	return false
}
