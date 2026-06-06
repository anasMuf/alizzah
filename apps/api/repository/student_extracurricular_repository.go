package repository

import (
	"api/dto"
	"api/model"

	"gorm.io/gorm"
)

type StudentExtracurricularRepository interface {
	FindByStudentID(studentID uint, params dto.StudentExtracurricularQueryParams) ([]model.StudentExtracurricular, error)
	FindByID(id uint) (*model.StudentExtracurricular, error)
	FindActiveByStudentID(studentID, academicYearID uint) ([]model.StudentExtracurricular, error)
	FindActiveByStudentAndExtracurricular(studentID, extracurricularID, academicYearID uint) (*model.StudentExtracurricular, error)
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
