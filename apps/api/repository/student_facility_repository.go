package repository

import (
	"api/dto"
	"api/model"

	"gorm.io/gorm"
)

type StudentFacilityRepository interface {
	FindByStudentID(studentID uint, params dto.StudentFacilityQueryParams) ([]model.StudentFacility, error)
	FindByID(id uint) (*model.StudentFacility, error)
	FindByFacilityID(facilityID uint, params dto.FacilityStudentQueryParams) ([]model.StudentFacility, int64, error)
	FindActiveByStudentID(studentID, academicYearID uint) ([]model.StudentFacility, error)
	FindAllActiveByAcademicYear(academicYearID uint) ([]model.StudentFacility, error)
	Create(sf *model.StudentFacility) error
	Update(sf *model.StudentFacility) error
	Delete(id uint) error
	AlreadyEnrolled(studentID, facilityID, academicYearID uint) (bool, error)
}

type studentFacilityRepository struct {
	db *gorm.DB
}

func NewStudentFacilityRepository(db *gorm.DB) StudentFacilityRepository {
	return &studentFacilityRepository{db: db}
}

func (r *studentFacilityRepository) FindByStudentID(studentID uint, params dto.StudentFacilityQueryParams) ([]model.StudentFacility, error) {
	var sfs []model.StudentFacility
	query := r.db.Preload("Facility").Where("student_id = ?", studentID)
	if params.AcademicYearID != 0 {
		query = query.Where("academic_year_id = ?", params.AcademicYearID)
	}
	err := query.Order("start_date DESC").Find(&sfs).Error
	return sfs, err
}

func (r *studentFacilityRepository) FindByID(id uint) (*model.StudentFacility, error) {
	var sf model.StudentFacility
	err := r.db.Preload("Facility").First(&sf, id).Error
	return &sf, err
}

func (r *studentFacilityRepository) FindActiveByStudentID(studentID, academicYearID uint) ([]model.StudentFacility, error) {
	var sfs []model.StudentFacility
	err := r.db.Preload("Facility").
		Where("student_id = ? AND academic_year_id = ? AND end_date IS NULL", studentID, academicYearID).
		Find(&sfs).Error
	return sfs, err
}

func (r *studentFacilityRepository) FindAllActiveByAcademicYear(academicYearID uint) ([]model.StudentFacility, error) {
	var sfs []model.StudentFacility
	err := r.db.Preload("Facility").Preload("Student").Preload("AcademicYear").
		Where("academic_year_id = ? AND end_date IS NULL", academicYearID).
		Find(&sfs).Error
	return sfs, err
}

func (r *studentFacilityRepository) Create(sf *model.StudentFacility) error {
	return r.db.Create(sf).Error
}

func (r *studentFacilityRepository) Update(sf *model.StudentFacility) error {
	return r.db.Save(sf).Error
}

func (r *studentFacilityRepository) Delete(id uint) error {
	return r.db.Delete(&model.StudentFacility{}, id).Error
}

func (r *studentFacilityRepository) AlreadyEnrolled(studentID, facilityID, academicYearID uint) (bool, error) {
	var count int64
	err := r.db.Model(&model.StudentFacility{}).
		Where("student_id = ? AND facility_id = ? AND academic_year_id = ? AND end_date IS NULL", studentID, facilityID, academicYearID).
		Count(&count).Error
	return count > 0, err
}

func (r *studentFacilityRepository) FindByFacilityID(facilityID uint, params dto.FacilityStudentQueryParams) ([]model.StudentFacility, int64, error) {
	var sfs []model.StudentFacility
	var total int64

	query := r.db.Model(&model.StudentFacility{}).
		Preload("Student").
		Preload("FeeConfigItem").
		Where("facility_id = ?", facilityID)

	if params.AcademicYearID != 0 {
		query = query.Where("academic_year_id = ?", params.AcademicYearID)
	}

	if params.Search != "" {
		searchPattern := "%" + params.Search + "%"
		query = query.Where(
			"student_id IN (SELECT id FROM students WHERE name ILIKE ? OR nis ILIKE ?)",
			searchPattern, searchPattern,
		)
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Default pagination
	page := params.Page
	if page < 1 {
		page = 1
	}
	limit := params.Limit
	if limit < 1 {
		limit = 20
	}
	offset := (page - 1) * limit

	err := query.Order("start_date DESC").Offset(offset).Limit(limit).Find(&sfs).Error
	return sfs, total, err
}
