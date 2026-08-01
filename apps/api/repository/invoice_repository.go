package repository

import (
	"api/dto"
	"api/model"

	"gorm.io/gorm"
)

type InvoiceRepository interface {
	FindAll(params dto.InvoiceQueryParams) ([]model.Invoice, int64, float64, error)
	FindByID(id uint) (*model.Invoice, error)
	FindByIDs(ids []uint) ([]model.Invoice, error)
	FindByStudentID(studentID uint, invoiceType, status string, academicYearID uint, showAll bool) ([]model.Invoice, error)
	FindMonthlyByStudent(studentID, month, year uint) (*model.Invoice, error)
	Create(invoice *model.Invoice) error
	Update(invoice *model.Invoice) error
	UpdateStatus(id uint, status string, paidAmount float64) error
	UpdateTotalAmount(id uint, totalAmount float64) error
	UpdateNotes(id uint, notes string) error
	ExistsInitialByStudent(studentID, academicYearID uint) (bool, error)
	ExistsRegistrationByStudent(studentID, academicYearID uint) (bool, error)
	ExistsMonthlyByStudent(studentID, month, year uint) (bool, error)
	SumUnpaidByStudent(studentID uint) (float64, error)
	FindMonthlyByStudentFromMonth(studentID, fromMonth, fromYear uint) ([]model.Invoice, error)
	FindMonthlyByStudentAcademicYear(studentID, academicYearID uint) ([]model.Invoice, error)
	WithTx(tx *gorm.DB) InvoiceRepository
}

type invoiceRepository struct {
	db *gorm.DB
}

func NewInvoiceRepository(db *gorm.DB) InvoiceRepository {
	return &invoiceRepository{db: db}
}

func (r *invoiceRepository) WithTx(tx *gorm.DB) InvoiceRepository {
	return &invoiceRepository{db: tx}
}

func (r *invoiceRepository) FindAll(params dto.InvoiceQueryParams) ([]model.Invoice, int64, float64, error) {
	// applyFilters memasang semua kondisi WHERE (termasuk filter visibility bulanan)
	// ke sebuah query. Dipakai ulang untuk count, sum, dan find agar identik & konsisten.
	applyFilters := func(q *gorm.DB) *gorm.DB {
		if params.StudentID != 0 {
			q = q.Where("student_id = ?", params.StudentID)
		}
		if params.AcademicYearID != 0 {
			q = q.Where("academic_year_id = ?", params.AcademicYearID)
		}
		if params.Type != "" {
			q = q.Where("type = ?", params.Type)
		}
		if params.Status != "" {
			q = q.Where("status = ?", params.Status)
		}
		if params.Month != 0 {
			q = q.Where("month = ?", params.Month)
		}
		if params.Year != 0 {
			q = q.Where("year = ?", params.Year)
		}
		if params.ClassGroupID != 0 {
			q = q.Where("student_id IN (?)",
				r.db.Model(&model.StudentEnrollment{}).
					Select("student_id").
					Where("class_group_id = ? AND status = ?", params.ClassGroupID, "active"),
			)
		}
		if params.Search != "" {
			q = q.Where("student_id IN (?)",
				r.db.Model(&model.Student{}).
					Select("id").
					Where("full_name ILIKE ?", "%"+params.Search+"%"),
			)
		}
		// Sembunyikan tagihan bulanan untuk bulan yang belum "berjalan" (clamp ke TA).
		return q.Where(monthlyVisibilityCond("invoices"))
	}

	// Jumlah total baris (untuk pagination)
	var total int64
	if err := applyFilters(r.db.Model(&model.Invoice{})).Count(&total).Error; err != nil {
		return nil, 0, 0, err
	}

	// Total sisa tagihan untuk SELURUH hasil terfilter (abaikan pagination)
	var outstanding float64
	if err := applyFilters(r.db.Model(&model.Invoice{})).
		Select("COALESCE(SUM(total_amount - paid_amount), 0)").
		Scan(&outstanding).Error; err != nil {
		return nil, 0, 0, err
	}

	page := params.Page
	if page < 1 {
		page = 1
	}
	limit := params.Limit
	if limit < 1 {
		limit = 20
	}
	offset := (page - 1) * limit

	var invoices []model.Invoice
	q := applyFilters(r.db.Model(&model.Invoice{}).
		Preload("Student").
		Preload("Student.Enrollments", "status = ?", "active").
		Preload("Student.Enrollments.ClassGroup").
		Preload("AcademicYear"))
	if err := q.Order("created_at DESC").Offset(offset).Limit(limit).Find(&invoices).Error; err != nil {
		return nil, 0, 0, err
	}

	return invoices, total, outstanding, nil
}

func (r *invoiceRepository) FindByID(id uint) (*model.Invoice, error) {
	var invoice model.Invoice
	err := r.db.Preload("Student").
		Preload("Student.Enrollments", "status = ?", "active").
		Preload("Student.Enrollments.ClassGroup").
		Preload("AcademicYear").
		Preload("Items").
		Preload("Installments").First(&invoice, id).Error
	return &invoice, err
}

func (r *invoiceRepository) FindByIDs(ids []uint) ([]model.Invoice, error) {
	if len(ids) == 0 {
		return nil, nil
	}
	var invoices []model.Invoice
	err := r.db.Preload("Student").
		Preload("Student.Enrollments", "status = ?", "active").
		Preload("Student.Enrollments.ClassGroup").
		Preload("AcademicYear").
		Preload("Items").
		Preload("Installments").
		Where("id IN ?", ids).
		Find(&invoices).Error
	return invoices, err
}

func (r *invoiceRepository) FindByStudentID(studentID uint, invoiceType, status string, academicYearID uint, showAll bool) ([]model.Invoice, error) {
	var invoices []model.Invoice
	query := r.db.Preload("Student").Preload("AcademicYear").Where("student_id = ?", studentID)

	if invoiceType != "" {
		query = query.Where("type = ?", invoiceType)
	}
	if status != "" {
		query = query.Where("status = ?", status)
	}
	if academicYearID != 0 {
		query = query.Where("academic_year_id = ?", academicYearID)
	}

	// Sembunyikan tagihan bulanan untuk bulan yang belum "berjalan" (clamp ke TA).
	if !showAll {
		query = query.Where(monthlyVisibilityCond("invoices"))
	}

	err := query.Order("created_at DESC").Find(&invoices).Error
	return invoices, err
}

func (r *invoiceRepository) FindMonthlyByStudent(studentID, month, year uint) (*model.Invoice, error) {
	var invoice model.Invoice
	err := r.db.Where("student_id = ? AND type = ? AND month = ? AND year = ?", studentID, "monthly", month, year).First(&invoice).Error
	return &invoice, err
}

func (r *invoiceRepository) Create(invoice *model.Invoice) error {
	return r.db.Create(invoice).Error
}

func (r *invoiceRepository) Update(invoice *model.Invoice) error {
	return r.db.Save(invoice).Error
}

func (r *invoiceRepository) UpdateStatus(id uint, status string, paidAmount float64) error {
	result := r.db.Model(&model.Invoice{}).Where("id = ?", id).Updates(map[string]interface{}{
		"status":      status,
		"paid_amount": paidAmount,
	})
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}
	return nil
}

func (r *invoiceRepository) UpdateTotalAmount(id uint, totalAmount float64) error {
	result := r.db.Model(&model.Invoice{}).Where("id = ?", id).Update("total_amount", totalAmount)
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}
	return nil
}

func (r *invoiceRepository) UpdateNotes(id uint, notes string) error {
	result := r.db.Model(&model.Invoice{}).Where("id = ?", id).Update("notes", notes)
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}
	return nil
}

func (r *invoiceRepository) ExistsInitialByStudent(studentID, academicYearID uint) (bool, error) {
	var count int64
	err := r.db.Model(&model.Invoice{}).Where("student_id = ? AND academic_year_id = ? AND type = ?", studentID, academicYearID, "initial").Count(&count).Error
	return count > 0, err
}

func (r *invoiceRepository) ExistsRegistrationByStudent(studentID, academicYearID uint) (bool, error) {
	var count int64
	err := r.db.Model(&model.Invoice{}).Where("student_id = ? AND academic_year_id = ? AND type = ?", studentID, academicYearID, "registration").Count(&count).Error
	return count > 0, err
}

func (r *invoiceRepository) ExistsMonthlyByStudent(studentID, month, year uint) (bool, error) {
	var count int64
	err := r.db.Model(&model.Invoice{}).Where("student_id = ? AND type = ? AND month = ? AND year = ?", studentID, "monthly", month, year).Count(&count).Error
	return count > 0, err
}

func (r *invoiceRepository) SumUnpaidByStudent(studentID uint) (float64, error) {
	var result struct {
		Total float64
	}
	err := r.db.Model(&model.Invoice{}).
		Select("COALESCE(SUM(total_amount - paid_amount), 0) as total").
		Where("student_id = ? AND status != ?", studentID, "paid").
		Where(monthlyVisibilityCond("invoices")). // kecualikan tagihan bulanan bulan depan
		Scan(&result).Error
	return result.Total, err
}

func (r *invoiceRepository) FindMonthlyByStudentFromMonth(studentID, fromMonth, fromYear uint) ([]model.Invoice, error) {
	var invoices []model.Invoice
	err := r.db.Where(
		"student_id = ? AND type = 'monthly' AND (year > ? OR (year = ? AND month >= ?))",
		studentID, fromYear, fromYear, fromMonth,
	).Find(&invoices).Error
	return invoices, err
}

func (r *invoiceRepository) FindMonthlyByStudentAcademicYear(studentID, academicYearID uint) ([]model.Invoice, error) {
	var invoices []model.Invoice
	err := r.db.Where(
		"student_id = ? AND academic_year_id = ? AND type = 'monthly'",
		studentID, academicYearID,
	).Order("year ASC, month ASC").Find(&invoices).Error
	return invoices, err
}
