package repository

import (
	"api/dto"
	"api/model"
	"fmt"
	"strings"

	"gorm.io/gorm"
)

type StudentExtracurricularRepository interface {
	FindByStudentID(studentID uint, params dto.StudentExtracurricularQueryParams) ([]model.StudentExtracurricular, error)
	FindByID(id uint) (*model.StudentExtracurricular, error)
	FindActiveByStudentID(studentID, academicYearID uint) ([]model.StudentExtracurricular, error)
	FindActiveByStudentAndExtracurricular(studentID, extracurricularID, academicYearID uint) (*model.StudentExtracurricular, error)
	// FindByStudentAndExtracurricular mencari record enrollment (aktif ATAU sudah
	// nonaktif) untuk (student, ekskul, tahun ajaran) — dipakai recovery cleanup
	// invoice yang butuh start_date meskipun enrollment sudah di-unenroll.
	FindByStudentAndExtracurricular(studentID, extracurricularID, academicYearID uint) (*model.StudentExtracurricular, error)
	FindActiveByExtracurricularID(extracurricularID, academicYearID uint) ([]model.StudentExtracurricular, error)
	// FindStudentsByExtracurricularBilling mengembalikan siswa DISTINCT yang memiliki
	// item tagihan PASTA (invoice_items cocok name+category fee items) pada invoice
	// bulanan dalam rentang bulan (fromMonth..toMonth). Dipakai halaman detail PASTA
	// — filter "aktif di periode" berbasis tagihan; bulan yang di-skip otomatis tidak
	// terhitung karena item-nya dihapus.
	FindStudentsByExtracurricularBilling(academicYearID, fromMonth, fromYear, toMonth, toYear uint, feeItems []model.FeeConfigItem) ([]model.Student, error)
	FindAllActiveByAcademicYear(academicYearID uint) ([]model.StudentExtracurricular, error)
	Create(se *model.StudentExtracurricular) error
	Update(se *model.StudentExtracurricular) error
	Delete(id uint) error
	AlreadyEnrolled(studentID, extracurricularID, academicYearID uint) (bool, error)
	WithTx(tx *gorm.DB) StudentExtracurricularRepository
}

type studentExtracurricularRepository struct {
	db *gorm.DB
}

func NewStudentExtracurricularRepository(db *gorm.DB) StudentExtracurricularRepository {
	return &studentExtracurricularRepository{db: db}
}

func (r *studentExtracurricularRepository) WithTx(tx *gorm.DB) StudentExtracurricularRepository {
	if tx == nil {
		return r
	}
	return &studentExtracurricularRepository{db: tx}
}

func (r *studentExtracurricularRepository) FindByStudentID(studentID uint, params dto.StudentExtracurricularQueryParams) ([]model.StudentExtracurricular, error) {
	var ses []model.StudentExtracurricular
	query := r.db.Preload("Extracurricular").Where("student_id = ?", studentID)

	if params.AcademicYearID != 0 {
		query = query.Where("academic_year_id = ?", params.AcademicYearID)
	}

	err := query.Order("start_date DESC").Find(&ses).Error
	return ses, err
}

func (r *studentExtracurricularRepository) FindByID(id uint) (*model.StudentExtracurricular, error) {
	var se model.StudentExtracurricular
	err := r.db.Preload("Extracurricular").First(&se, id).Error
	return &se, err
}

func (r *studentExtracurricularRepository) FindActiveByStudentID(studentID, academicYearID uint) ([]model.StudentExtracurricular, error) {
	var ses []model.StudentExtracurricular
	err := r.db.Preload("Extracurricular").Where("student_id = ? AND academic_year_id = ? AND end_date IS NULL", studentID, academicYearID).Find(&ses).Error
	return ses, err
}

func (r *studentExtracurricularRepository) FindActiveByStudentAndExtracurricular(studentID, extracurricularID, academicYearID uint) (*model.StudentExtracurricular, error) {
	var se model.StudentExtracurricular
	err := r.db.Preload("Extracurricular").
		Where("student_id = ? AND extracurricular_id = ? AND academic_year_id = ? AND end_date IS NULL", studentID, extracurricularID, academicYearID).
		First(&se).Error
	if err != nil {
		return nil, err
	}
	return &se, nil
}

func (r *studentExtracurricularRepository) FindByStudentAndExtracurricular(studentID, extracurricularID, academicYearID uint) (*model.StudentExtracurricular, error) {
	var se model.StudentExtracurricular
	err := r.db.Preload("Extracurricular").
		Where("student_id = ? AND extracurricular_id = ? AND academic_year_id = ?", studentID, extracurricularID, academicYearID).
		Order("start_date DESC").
		First(&se).Error
	if err != nil {
		return nil, err
	}
	return &se, nil
}

func (r *studentExtracurricularRepository) FindActiveByExtracurricularID(extracurricularID, academicYearID uint) ([]model.StudentExtracurricular, error) {
	var ses []model.StudentExtracurricular
	err := r.db.Preload("Student").
		Where("extracurricular_id = ? AND academic_year_id = ? AND end_date IS NULL", extracurricularID, academicYearID).
		Order("start_date DESC").
		Find(&ses).Error
	return ses, err
}

func (r *studentExtracurricularRepository) FindStudentsByExtracurricularBilling(academicYearID, fromMonth, fromYear, toMonth, toYear uint, feeItems []model.FeeConfigItem) ([]model.Student, error) {
	if len(feeItems) == 0 {
		return []model.Student{}, nil
	}

	// Kondisi (name, category) cocok fee item PASTA — dirangkai OR eksplisit agar
	// portabel (sqlite & postgres) dan bebas dari ambiguitas grouping GORM.
	var conds []string
	var args []interface{}
	for _, fi := range feeItems {
		conds = append(conds, "(ii.name = ? AND ii.category = ?)")
		args = append(args, fi.Name, fi.Category)
	}
	nameCond := fmt.Sprintf("(%s)", strings.Join(conds, " OR "))

	var students []model.Student
	err := r.db.Distinct("students.*").
		Joins("JOIN invoices i ON i.student_id = students.id AND i.type = 'monthly' AND i.academic_year_id = ? AND i.deleted_at IS NULL", academicYearID).
		Joins("JOIN invoice_items ii ON ii.invoice_id = i.id AND ii.deleted_at IS NULL").
		Where(nameCond, args...).
		Where("(i.year > ? OR (i.year = ? AND i.month >= ?))", fromYear, fromYear, fromMonth).
		Where("(i.year < ? OR (i.year = ? AND i.month <= ?))", toYear, toYear, toMonth).
		Order("students.full_name ASC").
		Find(&students).Error
	return students, err
}

func (r *studentExtracurricularRepository) FindAllActiveByAcademicYear(academicYearID uint) ([]model.StudentExtracurricular, error) {
	var ses []model.StudentExtracurricular
	err := r.db.Preload("Extracurricular").Preload("Student").Preload("AcademicYear").
		Where("academic_year_id = ? AND end_date IS NULL", academicYearID).
		Find(&ses).Error
	return ses, err
}

func (r *studentExtracurricularRepository) Create(se *model.StudentExtracurricular) error {
	return r.db.Create(se).Error
}

func (r *studentExtracurricularRepository) Update(se *model.StudentExtracurricular) error {
	return r.db.Save(se).Error
}

func (r *studentExtracurricularRepository) Delete(id uint) error {
	return r.db.Delete(&model.StudentExtracurricular{}, id).Error
}

func (r *studentExtracurricularRepository) AlreadyEnrolled(studentID, extracurricularID, academicYearID uint) (bool, error) {
	var count int64
	err := r.db.Model(&model.StudentExtracurricular{}).
		Where("student_id = ? AND extracurricular_id = ? AND academic_year_id = ? AND end_date IS NULL", studentID, extracurricularID, academicYearID).
		Count(&count).Error
	return count > 0, err
}
