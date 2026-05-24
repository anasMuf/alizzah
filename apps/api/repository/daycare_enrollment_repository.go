package repository

import (
	"api/dto"
	"api/model"
	"time"

	"gorm.io/gorm"
)

type DaycareEnrollmentRepository interface {
	FindAll(params dto.DaycareEnrollmentQueryParams) ([]model.DaycareEnrollment, int64, error)
	FindByID(id uint) (*model.DaycareEnrollment, error)
	FindActiveByStudentID(studentID, academicYearID uint) (*model.DaycareEnrollment, error)
	Create(de *model.DaycareEnrollment) error
	Update(de *model.DaycareEnrollment) error
	UpdateStatus(id uint, status string, endDate *time.Time) error
}

type daycareEnrollmentRepository struct {
	db *gorm.DB
}

func NewDaycareEnrollmentRepository(db *gorm.DB) DaycareEnrollmentRepository {
	return &daycareEnrollmentRepository{db: db}
}

func (r *daycareEnrollmentRepository) FindAll(params dto.DaycareEnrollmentQueryParams) ([]model.DaycareEnrollment, int64, error) {
	var enrollments []model.DaycareEnrollment
	var total int64
	query := r.db.Model(&model.DaycareEnrollment{}).Preload("Student").Preload("AcademicYear")

	if params.AcademicYearID != 0 {
		query = query.Where("academic_year_id = ?", params.AcademicYearID)
	}
	if params.Status != "" {
		query = query.Where("status = ?", params.Status)
	}
	if params.Search != "" {
		// Join with students table to search by student name
		query = query.Joins("JOIN students ON students.id = daycare_enrollments.student_id").
			Where("students.full_name ILIKE ?", "%"+params.Search+"%")
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (params.Page - 1) * params.Limit
	if err := query.Order("start_date DESC").Offset(offset).Limit(params.Limit).Find(&enrollments).Error; err != nil {
		return nil, 0, err
	}

	return enrollments, total, nil
}

func (r *daycareEnrollmentRepository) FindByID(id uint) (*model.DaycareEnrollment, error) {
	var de model.DaycareEnrollment
	err := r.db.Preload("Student").Preload("AcademicYear").First(&de, id).Error
	return &de, err
}

func (r *daycareEnrollmentRepository) FindActiveByStudentID(studentID, academicYearID uint) (*model.DaycareEnrollment, error) {
	var de model.DaycareEnrollment
	err := r.db.Where("student_id = ? AND academic_year_id = ? AND status = 'active'", studentID, academicYearID).First(&de).Error
	if err != nil {
		return nil, err
	}
	return &de, nil
}

func (r *daycareEnrollmentRepository) Create(de *model.DaycareEnrollment) error {
	return r.db.Create(de).Error
}

func (r *daycareEnrollmentRepository) Update(de *model.DaycareEnrollment) error {
	return r.db.Save(de).Error
}

func (r *daycareEnrollmentRepository) UpdateStatus(id uint, status string, endDate *time.Time) error {
	updates := map[string]interface{}{
		"status": status,
	}
	if status == "inactive" {
		updates["end_date"] = endDate
	} else {
		updates["end_date"] = gorm.Expr("NULL")
	}

	return r.db.Model(&model.DaycareEnrollment{}).Where("id = ?", id).Updates(updates).Error
}
