package repository

import (
	"api/dto"
	"api/model"
	"time"

	"gorm.io/gorm"
)

type StudentEnrollmentRepository interface {
	FindByID(id uint) (*model.StudentEnrollment, error)
	FindByStudentID(studentID uint, params dto.EnrollmentQueryParams) ([]model.StudentEnrollment, error)
	FindActiveByStudentID(studentID uint) (*model.StudentEnrollment, error)
	FindActiveByClassGroupID(classGroupID uint) ([]model.StudentEnrollment, error)
	Create(enrollment *model.StudentEnrollment) error
	UpdateStatus(id uint, status string, endDate *time.Time) error
	ExistsByStudentAndYear(studentID, academicYearID uint) (bool, error)
	// Batch 4 additions
	WithTx(tx *gorm.DB) StudentEnrollmentRepository
	FindAllActiveByAcademicYear(academicYearID uint) ([]model.StudentEnrollment, error)
	FindAllActiveByLevel(academicYearID uint, level string) ([]model.StudentEnrollment, error)
	CloseEnrollment(id uint, endDate time.Time, status string) error
	BulkCreate(enrollments []model.StudentEnrollment) error
	UpdateEnrollmentType(id uint, enrollmentType string) error
}

type studentEnrollmentRepository struct {
	db *gorm.DB
}

func NewStudentEnrollmentRepository(db *gorm.DB) StudentEnrollmentRepository {
	return &studentEnrollmentRepository{db: db}
}

func (r *studentEnrollmentRepository) FindByID(id uint) (*model.StudentEnrollment, error) {
	var enrollment model.StudentEnrollment
	err := r.db.Preload("ClassGroup").Preload("AcademicYear").Preload("Student").First(&enrollment, id).Error
	return &enrollment, err
}

func (r *studentEnrollmentRepository) FindByStudentID(studentID uint, params dto.EnrollmentQueryParams) ([]model.StudentEnrollment, error) {
	var enrollments []model.StudentEnrollment
	query := r.db.Preload("AcademicYear").Preload("ClassGroup").Where("student_id = ?", studentID)

	if params.AcademicYearID != 0 {
		query = query.Where("academic_year_id = ?", params.AcademicYearID)
	}

	err := query.Order("start_date DESC").Find(&enrollments).Error
	return enrollments, err
}

func (r *studentEnrollmentRepository) FindActiveByStudentID(studentID uint) (*model.StudentEnrollment, error) {
	var enrollment model.StudentEnrollment
	err := r.db.Preload("ClassGroup").Preload("AcademicYear").Where("student_id = ? AND status = ?", studentID, "active").First(&enrollment).Error
	return &enrollment, err
}

func (r *studentEnrollmentRepository) FindActiveByClassGroupID(classGroupID uint) ([]model.StudentEnrollment, error) {
	var enrollments []model.StudentEnrollment
	err := r.db.Preload("Student").Preload("ClassGroup").Preload("AcademicYear").Where("class_group_id = ? AND status = ?", classGroupID, "active").Find(&enrollments).Error
	return enrollments, err
}

func (r *studentEnrollmentRepository) Create(enrollment *model.StudentEnrollment) error {
	return r.db.Create(enrollment).Error
}

func (r *studentEnrollmentRepository) UpdateStatus(id uint, status string, endDate *time.Time) error {
	result := r.db.Model(&model.StudentEnrollment{}).Where("id = ?", id).Updates(map[string]interface{}{
		"status":   status,
		"end_date": endDate,
	})
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}
	return nil
}

func (r *studentEnrollmentRepository) ExistsByStudentAndYear(studentID, academicYearID uint) (bool, error) {
	var count int64
	err := r.db.Model(&model.StudentEnrollment{}).Where("student_id = ? AND academic_year_id = ? AND status = ?", studentID, academicYearID, "active").Count(&count).Error
	return count > 0, err
}

func (r *studentEnrollmentRepository) WithTx(tx *gorm.DB) StudentEnrollmentRepository {
	return &studentEnrollmentRepository{db: tx}
}

func (r *studentEnrollmentRepository) FindAllActiveByAcademicYear(academicYearID uint) ([]model.StudentEnrollment, error) {
	var enrollments []model.StudentEnrollment
	err := r.db.Preload("Student").Preload("ClassGroup").Preload("AcademicYear").
		Where("academic_year_id = ? AND status = ?", academicYearID, "active").
		Find(&enrollments).Error
	return enrollments, err
}

func (r *studentEnrollmentRepository) FindAllActiveByLevel(academicYearID uint, level string) ([]model.StudentEnrollment, error) {
	var enrollments []model.StudentEnrollment
	err := r.db.Preload("Student").Preload("ClassGroup").Preload("AcademicYear").
		Joins("JOIN class_groups ON class_groups.id = student_enrollments.class_group_id").
		Where("student_enrollments.academic_year_id = ? AND student_enrollments.status = ? AND class_groups.level = ?", academicYearID, "active", level).
		Find(&enrollments).Error
	return enrollments, err
}

func (r *studentEnrollmentRepository) CloseEnrollment(id uint, endDate time.Time, status string) error {
	result := r.db.Model(&model.StudentEnrollment{}).Where("id = ?", id).Updates(map[string]interface{}{
		"status":   status,
		"end_date": endDate,
	})
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}
	return nil
}

func (r *studentEnrollmentRepository) BulkCreate(enrollments []model.StudentEnrollment) error {
	if len(enrollments) == 0 {
		return nil
	}
	return r.db.Create(&enrollments).Error
}

func (r *studentEnrollmentRepository) UpdateEnrollmentType(id uint, enrollmentType string) error {
	result := r.db.Model(&model.StudentEnrollment{}).Where("id = ?", id).Update("enrollment_type", enrollmentType)
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}
	return nil
}
