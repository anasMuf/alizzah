package repository

import (
	"api/dto"
	"api/model"

	"gorm.io/gorm"
)

type InvoiceRepository interface {
	FindAll(params dto.InvoiceQueryParams) ([]model.Invoice, int64, error)
	FindByID(id uint) (*model.Invoice, error)
	FindByStudentID(studentID uint, invoiceType, status string, academicYearID uint) ([]model.Invoice, error)
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

func (r *invoiceRepository) FindAll(params dto.InvoiceQueryParams) ([]model.Invoice, int64, error) {
	var invoices []model.Invoice
	var total int64

	query := r.db.Model(&model.Invoice{}).
		Preload("Student").
		Preload("Student.Enrollments", "status = ?", "active").
		Preload("Student.Enrollments.ClassGroup").
		Preload("AcademicYear")

	if params.StudentID != 0 {
		query = query.Where("student_id = ?", params.StudentID)
	}
	if params.AcademicYearID != 0 {
		query = query.Where("academic_year_id = ?", params.AcademicYearID)
	}
	if params.Type != "" {
		query = query.Where("type = ?", params.Type)
	}
	if params.Status != "" {
		query = query.Where("status = ?", params.Status)
	}
	if params.Month != 0 {
		query = query.Where("month = ?", params.Month)
	}
	if params.Year != 0 {
		query = query.Where("year = ?", params.Year)
	}
	if params.ClassGroupID != 0 {
		query = query.Where("student_id IN (?)",
			r.db.Model(&model.StudentEnrollment{}).
				Select("student_id").
				Where("class_group_id = ? AND status = ?", params.ClassGroupID, "active"),
		)
	}
	if params.Search != "" {
		searchPattern := "%" + params.Search + "%"
		query = query.Where("student_id IN (?)",
			r.db.Model(&model.Student{}).
				Select("id").
				Where("full_name ILIKE ?", searchPattern),
		)
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
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

	if err := query.Order("created_at DESC").Offset(offset).Limit(limit).Find(&invoices).Error; err != nil {
		return nil, 0, err
	}

	return invoices, total, nil
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

func (r *invoiceRepository) FindByStudentID(studentID uint, invoiceType, status string, academicYearID uint) ([]model.Invoice, error) {
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
	return r.db.Model(&model.Invoice{}).Where("id = ?", id).Updates(map[string]interface{}{
		"status":      status,
		"paid_amount": paidAmount,
	}).Error
}

func (r *invoiceRepository) UpdateTotalAmount(id uint, totalAmount float64) error {
	return r.db.Model(&model.Invoice{}).Where("id = ?", id).Update("total_amount", totalAmount).Error
}

func (r *invoiceRepository) UpdateNotes(id uint, notes string) error {
	return r.db.Model(&model.Invoice{}).Where("id = ?", id).Update("notes", notes).Error
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
