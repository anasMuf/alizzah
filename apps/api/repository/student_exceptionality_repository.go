package repository

import (
	"api/model"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type StudentExceptionalityRepository interface {
	FindActiveByStudentID(studentID uint) (*model.StudentExceptionality, error)
	Upsert(se *model.StudentExceptionality) error
	Deactivate(studentID uint) error
	WithTx(tx *gorm.DB) StudentExceptionalityRepository
}

type studentExceptionalityRepository struct {
	db *gorm.DB
}

func NewStudentExceptionalityRepository(db *gorm.DB) StudentExceptionalityRepository {
	return &studentExceptionalityRepository{db: db}
}

func (r *studentExceptionalityRepository) FindActiveByStudentID(studentID uint) (*model.StudentExceptionality, error) {
	var se model.StudentExceptionality
	err := r.db.Where("student_id = ? AND is_active = ?", studentID, true).First(&se).Error
	if err != nil {
		return nil, err
	}
	return &se, nil
}

func (r *studentExceptionalityRepository) Upsert(se *model.StudentExceptionality) error {
	return r.db.Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "student_id"}},
		DoUpdates: clause.AssignmentColumns([]string{"description", "is_active", "updated_at"}),
	}).Create(se).Error
}

func (r *studentExceptionalityRepository) Deactivate(studentID uint) error {
	return r.db.Model(&model.StudentExceptionality{}).
		Where("student_id = ?", studentID).
		Update("is_active", false).Error
}

func (r *studentExceptionalityRepository) WithTx(tx *gorm.DB) StudentExceptionalityRepository {
	return &studentExceptionalityRepository{db: tx}
}
