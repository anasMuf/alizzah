package repository

import (
	"api/dto"
	"api/model"
	"time"

	"gorm.io/gorm"
)

type PaymentRepository interface {
	FindAll(params dto.PaymentQueryParams) ([]model.Payment, int64, error)
	FindByID(id uint) (*model.Payment, error)
	FindByIDUnscoped(id uint) (*model.Payment, error)
	FindByStudentID(studentID uint, params dto.StudentPaymentQueryParams) ([]model.Payment, error)
	FindByInvoiceID(invoiceID uint) ([]model.Payment, error)
	Create(payment *model.Payment) error
	Delete(id uint) error
	HardDelete(tx *gorm.DB, id uint) error
	WithTx(tx *gorm.DB) PaymentRepository
}

type paymentRepository struct {
	db *gorm.DB
}

func NewPaymentRepository(db *gorm.DB) PaymentRepository {
	return &paymentRepository{db: db}
}

func (r *paymentRepository) WithTx(tx *gorm.DB) PaymentRepository {
	return &paymentRepository{db: tx}
}

func (r *paymentRepository) FindAll(params dto.PaymentQueryParams) ([]model.Payment, int64, error) {
	var payments []model.Payment
	var total int64
	query := r.db.Model(&model.Payment{}).
		Preload("Student").
		Preload("Student.Enrollments", "status = ?", "active").
		Preload("Student.Enrollments.ClassGroup").
		Preload("Creator").
		Preload("Items.InvoiceItem.Invoice")

	if params.StudentID != 0 {
		query = query.Where("student_id = ?", params.StudentID)
	}
	if params.AcademicYearID != 0 {
		query = query.Where("academic_year_id = ?", params.AcademicYearID)
	}
	if params.Source != "" {
		query = query.Where("source = ?", params.Source)
	}
	if params.CreatedBy != 0 {
		query = query.Where("created_by = ?", params.CreatedBy)
	}
	if params.StartDate != "" {
		if d, err := time.Parse("2006-01-02", params.StartDate); err == nil {
			query = query.Where("payment_date >= ?", d)
		}
	}
	if params.EndDate != "" {
		if d, err := time.Parse("2006-01-02", params.EndDate); err == nil {
			query = query.Where("payment_date <= ?", d)
		}
	}
	if params.Search != "" {
		query = query.Where("student_id IN (?)",
			r.db.Model(&model.Student{}).
				Select("id").
				Where("full_name ILIKE ?", "%"+params.Search+"%"),
		)
	}
	// Filter jenjang/rombel lewat enrollment AKTIF siswa pada tahun ajaran terpilih
	// (jika tahun ajaran tidak di-filter, cukup cari di enrollment aktif mana pun).
	if params.Level != "" || params.ClassGroupID != 0 {
		enrQ := r.db.Model(&model.StudentEnrollment{}).
			Select("student_id").
			Where("status = ?", "active")
		if params.AcademicYearID != 0 {
			enrQ = enrQ.Where("academic_year_id = ?", params.AcademicYearID)
		}
		if params.Level != "" {
			enrQ = enrQ.
				Joins("JOIN class_groups cg ON cg.id = student_enrollments.class_group_id").
				Where("cg.level = ?", params.Level)
		}
		if params.ClassGroupID != 0 {
			enrQ = enrQ.Where("class_group_id = ?", params.ClassGroupID)
		}
		query = query.Where("student_id IN (?)", enrQ)
	}
	// Filter berdasarkan kategori item yang dibayar (payment punya setidaknya satu
	// item dengan kategori tsb) — mis. pasta, monthly_spp, dsb.
	if params.Category != "" {
		query = query.Where("id IN (?)",
			r.db.Model(&model.PaymentItem{}).
				Select("payment_items.payment_id").
				Joins("JOIN invoice_items ii ON ii.id = payment_items.invoice_item_id").
				Where("ii.category = ?", params.Category),
		)
	}
	// Filter periode tagihan yang dibayar (bulan/tahun invoice tempat item berada).
	if params.Month != 0 || params.Year != 0 {
		piQ := r.db.Model(&model.PaymentItem{}).
			Select("payment_items.payment_id").
			Joins("JOIN invoice_items ii ON ii.id = payment_items.invoice_item_id").
			Joins("JOIN invoices i ON i.id = ii.invoice_id")
		if params.Month != 0 {
			piQ = piQ.Where("i.month = ?", params.Month)
		}
		if params.Year != 0 {
			piQ = piQ.Where("i.year = ?", params.Year)
		}
		query = query.Where("id IN (?)", piQ)
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

	err := query.Order("created_at DESC").Offset((page - 1) * limit).Limit(limit).Find(&payments).Error
	return payments, total, err
}

func (r *paymentRepository) FindByID(id uint) (*model.Payment, error) {
	var payment model.Payment
	err := r.db.Preload("Student").
		Preload("Student.Enrollments", "status = ?", "active").
		Preload("Student.Enrollments.ClassGroup").
		Preload("Creator").Preload("Items").Preload("Items.InvoiceItem").Preload("Items.InvoiceItem.Invoice").First(&payment, id).Error
	return &payment, err
}

// FindByIDUnscoped sama seperti FindByID tapi mengabaikan soft-delete (deleted_at)
func (r *paymentRepository) FindByIDUnscoped(id uint) (*model.Payment, error) {
	var payment model.Payment
	err := r.db.Unscoped().Preload("Student").
		Preload("Student.Enrollments", "status = ?", "active").
		Preload("Student.Enrollments.ClassGroup").
		Preload("Creator").Preload("Items").Preload("Items.InvoiceItem").Preload("Items.InvoiceItem.Invoice").First(&payment, id).Error
	return &payment, err
}

func (r *paymentRepository) FindByStudentID(studentID uint, params dto.StudentPaymentQueryParams) ([]model.Payment, error) {
	var payments []model.Payment
	query := r.db.Preload("Student.Enrollments.ClassGroup").Preload("Creator").Where("student_id = ?", studentID)

	if params.AcademicYearID != 0 {
		query = query.Where("academic_year_id = ?", params.AcademicYearID)
	}
	if params.StartDate != "" {
		if d, err := time.Parse("2006-01-02", params.StartDate); err == nil {
			query = query.Where("payment_date >= ?", d)
		}
	}
	if params.EndDate != "" {
		if d, err := time.Parse("2006-01-02", params.EndDate); err == nil {
			query = query.Where("payment_date <= ?", d)
		}
	}

	err := query.Order("created_at DESC").Find(&payments).Error
	return payments, err
}

func (r *paymentRepository) FindByInvoiceID(invoiceID uint) ([]model.Payment, error) {
	var payments []model.Payment
	err := r.db.
		Preload("Creator").
		Preload("Items").
		Joins("JOIN payment_items pi ON pi.payment_id = payments.id").
		Joins("JOIN invoice_items ii ON ii.id = pi.invoice_item_id").
		Where("ii.invoice_id = ?", invoiceID).
		Group("payments.id").
		Order("payments.payment_date DESC").
		Find(&payments).Error
	return payments, err
}

func (r *paymentRepository) Create(payment *model.Payment) error {
	return r.db.Create(payment).Error
}

func (r *paymentRepository) Delete(id uint) error {
	return r.db.Delete(&model.Payment{}, id).Error
}

func (r *paymentRepository) HardDelete(tx *gorm.DB, id uint) error {
	return tx.Unscoped().Delete(&model.Payment{}, id).Error
}
