package repository

import (
	"api/dto"
	"api/model"

	"gorm.io/gorm"
)

type StudentRepository interface {
	FindAll(params dto.StudentQueryParams) ([]model.Student, int64, error)
	FindByID(id uint) (*model.Student, error)
	Create(student *model.Student) error
	Update(student *model.Student) error
	Delete(id uint) error
	HasActiveEnrollment(id uint) (bool, error)
	BulkCreate(students []model.Student) (int, []dto.ImportResult, error)
	// Batch 4 additions
	WithTx(tx *gorm.DB) StudentRepository
	UpdateStatus(id uint, status string) error
	FindByIDs(ids []uint) ([]model.Student, error)
}

type studentRepository struct {
	db *gorm.DB
}

func NewStudentRepository(db *gorm.DB) StudentRepository {
	return &studentRepository{db: db}
}

func (r *studentRepository) FindAll(params dto.StudentQueryParams) ([]model.Student, int64, error) {
	var students []model.Student
	var total int64

	query := r.db.Model(&model.Student{})

	if params.Search != "" {
		searchPattern := "%" + params.Search + "%"
		query = query.Where("full_name ILIKE ?", searchPattern)
	}
	if params.Status != "" {
		query = query.Where("status = ?", params.Status)
	}
	if params.IsDaycareOnly != nil {
		query = query.Where("is_daycare_only = ?", *params.IsDaycareOnly)
	}
	if params.ClassGroupID != 0 {
		query = query.Where("id IN (?)",
			r.db.Model(&model.StudentEnrollment{}).
				Select("student_id").
				Where("class_group_id = ? AND status = ?", params.ClassGroupID, "active"),
		)
	}
	if params.NoClassGroup {
		enrQuery := r.db.Model(&model.StudentEnrollment{}).
			Select("student_id").
			Where("status = ?", "active")
		if params.AcademicYearID != 0 {
			enrQuery = enrQuery.Where("academic_year_id = ?", params.AcademicYearID)
		}
		query = query.Where("id NOT IN (?)", enrQuery)
	}
	if params.AcademicYearID != 0 && !params.NoClassGroup {
		query = query.Where("id IN (?)",
			r.db.Model(&model.StudentEnrollment{}).
				Select("student_id").
				Where("academic_year_id = ? AND status = ?", params.AcademicYearID, "active"),
		)
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (params.Page - 1) * params.Limit
	if err := query.Order("created_at DESC").Offset(offset).Limit(params.Limit).Find(&students).Error; err != nil {
		return nil, 0, err
	}

	return students, total, nil
}

func (r *studentRepository) FindByID(id uint) (*model.Student, error) {
	var student model.Student
	err := r.db.Preload("Guardians").Preload("StudentGuardians").First(&student, id).Error
	return &student, err
}

func (r *studentRepository) Create(student *model.Student) error {
	// If guardians are present, this will create them and link them due to GORM's association handling
	return r.db.Create(student).Error
}

func (r *studentRepository) Update(student *model.Student) error {
	return r.db.Save(student).Error
}

func (r *studentRepository) Delete(id uint) error {
	return r.db.Delete(&model.Student{}, id).Error
}

func (r *studentRepository) HasActiveEnrollment(id uint) (bool, error) {
	var count int64
	err := r.db.Model(&model.StudentEnrollment{}).
		Where("student_id = ? AND status = ?", id, "active").
		Count(&count).Error
	return count > 0, err
}

func (r *studentRepository) BulkCreate(students []model.Student) (int, []dto.ImportResult, error) {
	var results []dto.ImportResult
	successCount := 0

	err := r.db.Transaction(func(tx *gorm.DB) error {
		for i, student := range students {
			if err := tx.Create(&student).Error; err != nil {
				results = append(results, dto.ImportResult{
					Row:     i + 2, // Assuming row 1 is header
					Name:    student.FullName,
					Success: false,
					Error:   err.Error(),
				})
			} else {
				successCount++
				results = append(results, dto.ImportResult{
					Row:     i + 2,
					Name:    student.FullName,
					Success: true,
				})
			}
		}
		return nil
	})

	return successCount, results, err
}

func (r *studentRepository) WithTx(tx *gorm.DB) StudentRepository {
	return &studentRepository{db: tx}
}

func (r *studentRepository) UpdateStatus(id uint, status string) error {
	return r.db.Model(&model.Student{}).Where("id = ?", id).Update("status", status).Error
}

func (r *studentRepository) FindByIDs(ids []uint) ([]model.Student, error) {
	var students []model.Student
	if len(ids) == 0 {
		return students, nil
	}
	err := r.db.Where("id IN ?", ids).Find(&students).Error
	return students, err
}

