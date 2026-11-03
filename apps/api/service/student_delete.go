package service

import (
	"errors"
	"fmt"
	"strings"
	"time"

	"api/dto"
	"api/model"
	"api/utility"

	"gorm.io/gorm"
)

// deletePreviewRow menampung hasil satu query agregat pratinjau hapus siswa.
type deletePreviewRow struct {
	Enrollments               int64
	ActiveEnrollments         int64
	Invoices                  int64
	InvoiceTotal              float64
	InvoicePaid               float64
	InvoiceItems              int64
	InvoiceInstallments       int64
	Payments                  int64
	PaymentTotal              float64
	PaymentItems              int64
	SavingsAccounts           int64
	SavingsBalance            float64
	SavingsTransactions       int64
	Dispensations             int64
	Extracurriculars          int64
	Facilities                int64
	Exceptionalities          int64
	AcademicEvents            int64
	DaycareEnrollments        int64
	DaycareAttendances        int64
	DaycareMonthlyAttendances int64
	BillingExclusions         int64
	KoperasiSales             int64
	KoperasiTotal             float64
	KoperasiSaleItems         int64
	KoperasiPayments          int64
	KoperasiCashTransactions  int64
	CashTransactions          int64
	CashTotal                 float64
	VaultTransactions         int64
	RelatedExpenses           int64
	RelatedExpensesTotal      float64
	Guardians                 int64
}

// studentDeletePreviewSQL menghitung seluruh data terhubung dalam satu query.
// Subquery memakai satu CTE `st` agar id siswa tidak perlu diulang puluhan kali.
const studentDeletePreviewSQL = `
WITH st AS (SELECT ? AS sid)
SELECT
  (SELECT count(*) FROM student_enrollments x JOIN st ON 1=1 WHERE x.student_id=st.sid AND x.deleted_at IS NULL) AS enrollments,
  (SELECT count(*) FROM student_enrollments x JOIN st ON 1=1 WHERE x.student_id=st.sid AND x.deleted_at IS NULL AND x.status='active') AS active_enrollments,
  (SELECT count(*) FROM invoices x JOIN st ON 1=1 WHERE x.student_id=st.sid AND x.deleted_at IS NULL) AS invoices,
  (SELECT COALESCE(SUM(x.total_amount),0) FROM invoices x JOIN st ON 1=1 WHERE x.student_id=st.sid AND x.deleted_at IS NULL) AS invoice_total,
  (SELECT COALESCE(SUM(x.paid_amount),0) FROM invoices x JOIN st ON 1=1 WHERE x.student_id=st.sid AND x.deleted_at IS NULL) AS invoice_paid,
  (SELECT count(*) FROM invoice_items ii JOIN invoices i ON i.id=ii.invoice_id JOIN st ON 1=1 WHERE i.student_id=st.sid AND i.deleted_at IS NULL AND ii.deleted_at IS NULL) AS invoice_items,
  (SELECT count(*) FROM invoice_installments ii JOIN invoices i ON i.id=ii.invoice_id JOIN st ON 1=1 WHERE i.student_id=st.sid AND i.deleted_at IS NULL AND ii.deleted_at IS NULL) AS invoice_installments,
  (SELECT count(*) FROM payments x JOIN st ON 1=1 WHERE x.student_id=st.sid AND x.deleted_at IS NULL) AS payments,
  (SELECT COALESCE(SUM(x.total_amount),0) FROM payments x JOIN st ON 1=1 WHERE x.student_id=st.sid AND x.deleted_at IS NULL) AS payment_total,
  (SELECT count(*) FROM payment_items pi JOIN payments p ON p.id=pi.payment_id JOIN st ON 1=1 WHERE p.student_id=st.sid AND p.deleted_at IS NULL AND pi.deleted_at IS NULL) AS payment_items,
  (SELECT count(*) FROM student_savings x JOIN st ON 1=1 WHERE x.student_id=st.sid AND x.deleted_at IS NULL) AS savings_accounts,
  (SELECT COALESCE(SUM(x.balance),0) FROM student_savings x JOIN st ON 1=1 WHERE x.student_id=st.sid AND x.deleted_at IS NULL) AS savings_balance,
  (SELECT count(*) FROM savings_transactions tx JOIN student_savings ss ON ss.id=tx.student_savings_id JOIN st ON 1=1 WHERE ss.student_id=st.sid AND ss.deleted_at IS NULL AND tx.deleted_at IS NULL) AS savings_transactions,
  (SELECT count(*) FROM dispensations x JOIN st ON 1=1 WHERE x.student_id=st.sid AND x.deleted_at IS NULL) AS dispensations,
  (SELECT count(*) FROM student_extracurriculars x JOIN st ON 1=1 WHERE x.student_id=st.sid AND x.deleted_at IS NULL) AS extracurriculars,
  (SELECT count(*) FROM student_facilities x JOIN st ON 1=1 WHERE x.student_id=st.sid AND x.deleted_at IS NULL) AS facilities,
  (SELECT count(*) FROM student_exceptionalities x JOIN st ON 1=1 WHERE x.student_id=st.sid AND x.deleted_at IS NULL) AS exceptionalities,
  (SELECT count(*) FROM student_academic_events x JOIN st ON 1=1 WHERE x.student_id=st.sid AND x.deleted_at IS NULL) AS academic_events,
  (SELECT count(*) FROM daycare_enrollments x JOIN st ON 1=1 WHERE x.student_id=st.sid AND x.deleted_at IS NULL) AS daycare_enrollments,
  (SELECT count(*) FROM daycare_attendances x JOIN st ON 1=1 WHERE x.student_id=st.sid AND x.deleted_at IS NULL) AS daycare_attendances,
  (SELECT count(*) FROM daycare_monthly_attendances x JOIN st ON 1=1 WHERE x.student_id=st.sid AND x.deleted_at IS NULL) AS daycare_monthly_attendances,
  (SELECT count(*) FROM billing_month_exclusions x JOIN st ON 1=1 WHERE x.student_id=st.sid AND x.deleted_at IS NULL) AS billing_exclusions,
  (SELECT count(*) FROM koperasi_sales x JOIN st ON 1=1 WHERE x.student_id=st.sid AND x.deleted_at IS NULL) AS koperasi_sales,
  (SELECT COALESCE(SUM(x.total_amount),0) FROM koperasi_sales x JOIN st ON 1=1 WHERE x.student_id=st.sid AND x.deleted_at IS NULL) AS koperasi_total,
  (SELECT count(*) FROM koperasi_sale_items si JOIN koperasi_sales s ON s.id=si.sale_id JOIN st ON 1=1 WHERE s.student_id=st.sid AND s.deleted_at IS NULL AND si.deleted_at IS NULL) AS koperasi_sale_items,
  (SELECT count(*) FROM koperasi_payments kp JOIN st ON 1=1 WHERE kp.ref_type='sale' AND kp.deleted_at IS NULL AND kp.ref_id IN (SELECT id FROM koperasi_sales s WHERE s.student_id=st.sid AND s.deleted_at IS NULL)) AS koperasi_payments,
  (SELECT count(*) FROM koperasi_cash_transactions kc JOIN st ON 1=1 WHERE kc.source_type='sale_payment' AND kc.source_id IN (SELECT id FROM koperasi_sales s WHERE s.student_id=st.sid)) AS koperasi_cash_transactions,
  (SELECT count(*) FROM cash_transactions c JOIN st ON 1=1 WHERE c.source_type IN ('payment','transfer_to_vault') AND c.source_id IN (SELECT id FROM payments p WHERE p.student_id=st.sid AND p.deleted_at IS NULL)) AS cash_transactions,
  (SELECT COALESCE(SUM(c.amount),0) FROM cash_transactions c JOIN st ON 1=1 WHERE c.source_type IN ('payment','transfer_to_vault') AND c.source_id IN (SELECT id FROM payments p WHERE p.student_id=st.sid AND p.deleted_at IS NULL)) AS cash_total,
  (SELECT count(*) FROM vault_transactions v JOIN st ON 1=1 WHERE v.source_type IN ('savings_deposit','savings_withdrawal') AND v.source_id IN (SELECT id FROM payments p WHERE p.student_id=st.sid AND p.deleted_at IS NULL)) AS vault_transactions,
  (SELECT count(*) FROM expenses e JOIN st ON 1=1 WHERE e.deleted_at IS NULL AND EXISTS (SELECT 1 FROM payments p WHERE p.student_id=st.sid AND p.deleted_at IS NULL AND e.description LIKE 'Koperasi via Pembayaran #' || p.id || '%')) AS related_expenses,
  (SELECT COALESCE(SUM(e.amount),0) FROM expenses e JOIN st ON 1=1 WHERE e.deleted_at IS NULL AND EXISTS (SELECT 1 FROM payments p WHERE p.student_id=st.sid AND p.deleted_at IS NULL AND e.description LIKE 'Koperasi via Pembayaran #' || p.id || '%')) AS related_expenses_total,
  (SELECT count(*) FROM student_guardians x JOIN st ON 1=1 WHERE x.student_id=st.sid) AS guardians
`

func (s *studentService) DeletePreview(id uint) (*dto.StudentDeletePreviewResponse, error) {
	student, err := s.studentRepo.FindByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, utility.NewNotFoundError("Siswa tidak ditemukan")
		}
		return nil, err
	}

	var row deletePreviewRow
	if err := s.db.Raw(studentDeletePreviewSQL, id).Scan(&row).Error; err != nil {
		return nil, err
	}

	items := make([]dto.StudentDeleteItem, 0, 24)
	add := func(key, label string, count int64, amount float64, note string) {
		if count == 0 && amount == 0 {
			return
		}
		items = append(items, dto.StudentDeleteItem{
			Key: key, Label: label, Count: count, Amount: amount, Note: note,
		})
	}

	enrollNote := ""
	if row.ActiveEnrollments > 0 {
		enrollNote = fmt.Sprintf("%d pendaftaran aktif", row.ActiveEnrollments)
	}
	add("enrollments", "Pendaftaran / riwayat kelas", row.Enrollments, 0, enrollNote)
	add("invoices", "Tagihan", row.Invoices, row.InvoiceTotal, "")
	add("invoice_items", "Item tagihan", row.InvoiceItems, 0, "")
	add("invoice_installments", "Cicilan tagihan", row.InvoiceInstallments, 0, "")
	add("payments", "Pembayaran", row.Payments, row.PaymentTotal, "")
	add("payment_items", "Item pembayaran", row.PaymentItems, 0, "")
	add("savings_accounts", "Rekening tabungan", row.SavingsAccounts, row.SavingsBalance, "")
	add("savings_transactions", "Mutasi tabungan", row.SavingsTransactions, 0, "")
	add("dispensations", "Dispensasi", row.Dispensations, 0, "")
	add("extracurriculars", "Ekstrakurikuler", row.Extracurriculars, 0, "")
	add("facilities", "Fasilitas", row.Facilities, 0, "")
	add("exceptionalities", "Data ABK", row.Exceptionalities, 0, "")
	add("academic_events", "Riwayat akademik", row.AcademicEvents, 0, "")
	add("daycare_enrollments", "Pendaftaran daycare", row.DaycareEnrollments, 0, "")
	add("daycare_attendances", "Absensi daycare harian", row.DaycareAttendances, 0, "")
	add("daycare_monthly_attendances", "Absensi daycare bulanan", row.DaycareMonthlyAttendances, 0, "")
	add("billing_exclusions", "Pengecualian tagihan bulanan", row.BillingExclusions, 0, "")
	add("koperasi_sales", "Penjualan koperasi", row.KoperasiSales, row.KoperasiTotal, "")
	add("koperasi_sale_items", "Item penjualan koperasi", row.KoperasiSaleItems, 0, "")
	add("koperasi_payments", "Pembayaran koperasi", row.KoperasiPayments, 0, "")
	add("koperasi_cash_transactions", "Kas koperasi", row.KoperasiCashTransactions, 0, "")
	add("cash_transactions", "Transaksi kas", row.CashTransactions, row.CashTotal, "")
	add("vault_transactions", "Transaksi berangkas", row.VaultTransactions, 0, "")
	add("related_expenses", "Pengeluaran terkait pembayaran", row.RelatedExpenses, row.RelatedExpensesTotal, "")
	add("guardians", "Tautan wali", row.Guardians, 0, "Wali tanpa siswa lain akan ikut dihapus")

	requiresForce := row.Payments > 0 || row.Invoices > 0 || row.SavingsTransactions > 0 ||
		row.KoperasiSales > 0 || row.CashTransactions > 0 || row.VaultTransactions > 0 ||
		row.RelatedExpenses > 0

	return &dto.StudentDeletePreviewResponse{
		StudentID: student.ID,
		FullName:  student.FullName,
		Status:    student.Status,
		Items:     items,
		Financial: dto.StudentDeleteFinancial{
			TotalPayments:     row.PaymentTotal,
			TotalInvoices:     row.InvoiceTotal,
			PaidInvoices:      row.InvoicePaid,
			Outstanding:       row.InvoiceTotal - row.InvoicePaid,
			SavingsBalance:    row.SavingsBalance,
			KoperasiSales:     row.KoperasiTotal,
			CashTransactions:  row.CashTransactions,
			VaultTransactions: row.VaultTransactions,
			RelatedExpenses:   row.RelatedExpenses,
		},
		RequiresForce: requiresForce,
	}, nil
}

// Delete menghapus siswa beserta SELURUH data terhubung (soft-delete cascade).
// Data finansial hanya dihapus bila force=true; nama siswa wajib diketik ulang
// sebagai konfirmasi. Ledger kas/berangkas (tanpa kolom deleted_at) dihapus
// permanen karena memang tidak mendukung soft delete.
func (s *studentService) Delete(id uint, confirmName string, force bool) error {
	student, err := s.studentRepo.FindByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return utility.NewNotFoundError("Siswa tidak ditemukan")
		}
		return err
	}

	if strings.TrimSpace(strings.ToLower(confirmName)) != strings.TrimSpace(strings.ToLower(student.FullName)) {
		return utility.NewValidationError("Nama konfirmasi tidak cocok dengan nama siswa")
	}

	preview, err := s.DeletePreview(id)
	if err != nil {
		return err
	}
	if preview.RequiresForce && !force {
		return utility.NewConflictError("Siswa memiliki data finansial. Konfirmasi ulang dengan force=true untuk menghapus data keuangan terkait.")
	}

	return s.db.Transaction(func(tx *gorm.DB) error {
		return cascadeDeleteStudent(tx, id)
	})
}

func cascadeDeleteStudent(tx *gorm.DB, id uint) error {
	now := time.Now()

	var paymentIDs []uint
	if err := tx.Model(&model.Payment{}).Where("student_id = ?", id).Pluck("id", &paymentIDs).Error; err != nil {
		return fmt.Errorf("gagal membaca pembayaran: %w", err)
	}

	var guardianIDs []uint
	if err := tx.Model(&model.StudentGuardian{}).Where("student_id = ?", id).Pluck("guardian_id", &guardianIDs).Error; err != nil {
		return fmt.Errorf("gagal membaca wali: %w", err)
	}

	// Ledger kas/berangkas tidak punya deleted_at → hapus permanen.
	if len(paymentIDs) > 0 {
		if err := tx.Where("source_type IN ? AND source_id IN ?",
			[]string{"payment", "transfer_to_vault"}, paymentIDs).
			Delete(&model.CashTransaction{}).Error; err != nil {
			return fmt.Errorf("gagal hapus transaksi kas: %w", err)
		}
		if err := tx.Where("source_type IN ? AND source_id IN ?",
			[]string{"savings_deposit", "savings_withdrawal"}, paymentIDs).
			Delete(&model.VaultTransaction{}).Error; err != nil {
			return fmt.Errorf("gagal hapus transaksi berangkas: %w", err)
		}

		// Pengeluaran koperasi yang dibuat dari pembayaran siswa ini.
		var expenseIDs []uint
		if err := tx.Table("expenses").
			Where("deleted_at IS NULL").
			Where(`EXISTS (SELECT 1 FROM payments p WHERE p.id IN ? AND expenses.description LIKE 'Koperasi via Pembayaran #' || p.id || '%')`, paymentIDs).
			Pluck("id", &expenseIDs).Error; err != nil {
			return fmt.Errorf("gagal membaca pengeluaran terkait: %w", err)
		}
		if len(expenseIDs) > 0 {
			if err := tx.Where("source_type = ? AND source_id IN ?", "expense", expenseIDs).
				Delete(&model.CashTransaction{}).Error; err != nil {
				return fmt.Errorf("gagal hapus kas pengeluaran: %w", err)
			}
			if err := tx.Where("source_type = ? AND source_id IN ?", "expense", expenseIDs).
				Delete(&model.VaultTransaction{}).Error; err != nil {
				return fmt.Errorf("gagal hapus berangkas pengeluaran: %w", err)
			}
			if err := tx.Where("id IN ?", expenseIDs).Delete(&model.Expense{}).Error; err != nil {
				return fmt.Errorf("gagal hapus pengeluaran: %w", err)
			}
		}
	}

	// Kas koperasi (immutable) untuk penjualan siswa.
	if err := tx.Exec(
		"DELETE FROM koperasi_cash_transactions WHERE source_type = ? AND source_id IN (SELECT id FROM koperasi_sales WHERE student_id = ?)",
		"sale_payment", id,
	).Error; err != nil {
		return fmt.Errorf("gagal hapus kas koperasi: %w", err)
	}

	// Anak-anak sebelum header.
	if err := tx.Where("payment_id IN (?)",
		tx.Model(&model.Payment{}).Select("id").Where("student_id = ?", id)).
		Delete(&model.PaymentItem{}).Error; err != nil {
		return fmt.Errorf("gagal hapus item pembayaran: %w", err)
	}
	if err := tx.Where("student_id = ?", id).Delete(&model.Payment{}).Error; err != nil {
		return fmt.Errorf("gagal hapus pembayaran: %w", err)
	}
	if err := tx.Where("student_savings_id IN (?)",
		tx.Model(&model.StudentSavings{}).Select("id").Where("student_id = ?", id)).
		Delete(&model.SavingsTransaction{}).Error; err != nil {
		return fmt.Errorf("gagal hapus mutasi tabungan: %w", err)
	}
	if err := tx.Where("student_id = ?", id).Delete(&model.StudentSavings{}).Error; err != nil {
		return fmt.Errorf("gagal hapus tabungan: %w", err)
	}
	if err := tx.Where("invoice_id IN (?)",
		tx.Model(&model.Invoice{}).Select("id").Where("student_id = ?", id)).
		Delete(&model.InvoiceInstallment{}).Error; err != nil {
		return fmt.Errorf("gagal hapus cicilan tagihan: %w", err)
	}
	if err := tx.Where("invoice_id IN (?)",
		tx.Model(&model.Invoice{}).Select("id").Where("student_id = ?", id)).
		Delete(&model.InvoiceItem{}).Error; err != nil {
		return fmt.Errorf("gagal hapus item tagihan: %w", err)
	}
	if err := tx.Where("student_id = ?", id).Delete(&model.Invoice{}).Error; err != nil {
		return fmt.Errorf("gagal hapus tagihan: %w", err)
	}

	// Koperasi: item → pembayaran → header.
	if err := tx.Exec(
		"UPDATE koperasi_sale_items SET deleted_at = ?, updated_at = ? WHERE deleted_at IS NULL AND sale_id IN (SELECT id FROM koperasi_sales WHERE student_id = ?)",
		now, now, id,
	).Error; err != nil {
		return fmt.Errorf("gagal hapus item koperasi: %w", err)
	}
	if err := tx.Exec(
		"UPDATE koperasi_payments SET deleted_at = ?, updated_at = ? WHERE deleted_at IS NULL AND ref_type = ? AND ref_id IN (SELECT id FROM koperasi_sales WHERE student_id = ?)",
		now, now, "sale", id,
	).Error; err != nil {
		return fmt.Errorf("gagal hapus pembayaran koperasi: %w", err)
	}
	if err := tx.Exec(
		"UPDATE koperasi_sales SET deleted_at = ?, updated_at = ? WHERE deleted_at IS NULL AND student_id = ?",
		now, now, id,
	).Error; err != nil {
		return fmt.Errorf("gagal hapus penjualan koperasi: %w", err)
	}

	// Data operasional langsung per student_id.
	direct := []any{
		&model.DaycareAttendance{},
		&model.DaycareMonthlyAttendance{},
		&model.DaycareEnrollment{},
		&model.BillingMonthExclusion{},
		&model.StudentExtracurricular{},
		&model.StudentFacility{},
		&model.Dispensation{},
		&model.StudentExceptionality{},
		&model.StudentAcademicEvent{},
		&model.StudentEnrollment{},
	}
	for _, dest := range direct {
		if err := tx.Where("student_id = ?", id).Delete(dest).Error; err != nil {
			return fmt.Errorf("gagal hapus data terkait: %w", err)
		}
	}

	if err := tx.Delete(&model.Student{}, id).Error; err != nil {
		return fmt.Errorf("gagal hapus siswa: %w", err)
	}

	// Wali: tautan dihapus permanen (tabel tanpa deleted_at); master guardian
	// hanya dihapus bila tidak lagi dipakai siswa lain yang masih aktif.
	if err := tx.Where("student_id = ?", id).Delete(&model.StudentGuardian{}).Error; err != nil {
		return fmt.Errorf("gagal hapus tautan wali: %w", err)
	}
	if len(guardianIDs) > 0 {
		if err := tx.Model(&model.Guardian{}).
			Where("id IN ? AND deleted_at IS NULL", guardianIDs).
			Where("NOT EXISTS (SELECT 1 FROM student_guardians sg JOIN students s ON s.id = sg.student_id AND s.deleted_at IS NULL WHERE sg.guardian_id = guardians.id)").
			Update("deleted_at", now).Error; err != nil {
			return fmt.Errorf("gagal hapus wali tanpa siswa lain: %w", err)
		}
	}

	return nil
}
