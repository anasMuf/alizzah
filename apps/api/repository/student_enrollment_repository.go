package repository

import (
	"api/dto"
	"api/model"
	"time"

	"gorm.io/gorm"
)

type StudentEnrollmentRepository interface {
	FindByStudentID(studentID uint, params dto.EnrollmentQueryParams) ([]model.StudentEnrollment, error)
	FindActiveByStudentID(studentID uint) (*model.StudentEnrollment, error)
	FindActiveByClassGroupID(classGroupID uint) ([]model.StudentEnrollment, error)
	Create(enrollment *model.StudentEnrollment) error
	UpdateStatus(id uint, status string, endDate *time.Time) error
	ExistsByStudentAndYear(studentID, academicYearID uint) (bool, error)
}

type studentEnrollmentRepository struct {
	db *gorm.DB
}

func NewStudentEnrollmentRepository(db *gorm.DB) StudentEnrollmentRepository {
	return &studentEnrollmentRepository{db: db}
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
	err := r.db.Where("student_id = ? AND status = ?", studentID, "active").First(&enrollment).Error
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
	return r.db.Model(&model.StudentEnrollment{}).Where("id = ?", id).Updates(map[string]interface{}{
		"status":   status,
		"end_date": endDate,
	}).Error
}

func (r *studentEnrollmentRepository) ExistsByStudentAndYear(studentID, academicYearID uint) (bool, error) {
	var count int64
	err := r.db.Model(&model.StudentEnrollment{}).Where("student_id = ? AND academic_year_id = ?", studentID, academicYearID).Count(&count).Error
	return count > 0, err
}
