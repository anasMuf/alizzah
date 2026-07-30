package repository

import (
	"api/model"
	"errors"

	"gorm.io/gorm"
)

type GuardianRepository interface {
	FindByID(id uint) (*model.Guardian, error)
	Create(guardian *model.Guardian) error
	Update(guardian *model.Guardian) error
	FindByStudentID(studentID uint) ([]model.StudentGuardian, error)
	LinkToStudent(studentID, guardianID uint, isPrimary bool) error
	UnlinkFromStudent(studentID, guardianID uint) error
	SetPrimary(studentID, guardianID uint) error
	IsLinkedToStudent(studentID, guardianID uint) (bool, error)
}

type guardianRepository struct {
	db *gorm.DB
}

func NewGuardianRepository(db *gorm.DB) GuardianRepository {
	return &guardianRepository{db: db}
}

func (r *guardianRepository) FindByID(id uint) (*model.Guardian, error) {
	var guardian model.Guardian
	err := r.db.Preload("Students").First(&guardian, id).Error
	return &guardian, err
}

func (r *guardianRepository) Create(guardian *model.Guardian) error {
	return r.db.Create(guardian).Error
}

func (r *guardianRepository) Update(guardian *model.Guardian) error {
	return r.db.Save(guardian).Error
}

func (r *guardianRepository) FindByStudentID(studentID uint) ([]model.StudentGuardian, error) {
	var sgs []model.StudentGuardian
	err := r.db.Preload("Guardian").Where("student_id = ?", studentID).Find(&sgs).Error
	return sgs, err
}

func (r *guardianRepository) LinkToStudent(studentID, guardianID uint, isPrimary bool) error {
	sg := model.StudentGuardian{
		StudentID:  studentID,
		GuardianID: guardianID,
		IsPrimary:  isPrimary,
	}
	return r.db.Create(&sg).Error
}

func (r *guardianRepository) UnlinkFromStudent(studentID, guardianID uint) error {
	return r.db.Where("student_id = ? AND guardian_id = ?", studentID, guardianID).Delete(&model.StudentGuardian{}).Error
}

func (r *guardianRepository) SetPrimary(studentID, guardianID uint) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		// Verify link exists
		var count int64
		if err := tx.Model(&model.StudentGuardian{}).Where("student_id = ? AND guardian_id = ?", studentID, guardianID).Count(&count).Error; err != nil {
			return err
		}
		if count == 0 {
			return errors.New("Wali tidak terhubung dengan siswa ini")
		}

		// Set all to false
		if result := tx.Model(&model.StudentGuardian{}).Where("student_id = ?", studentID).Update("is_primary", false); result.Error != nil {
			return result.Error
		}

		// Set target to true
		if result := tx.Model(&model.StudentGuardian{}).Where("student_id = ? AND guardian_id = ?", studentID, guardianID).Update("is_primary", true); result.Error != nil {
			return result.Error
		} else if result.RowsAffected == 0 {
			return gorm.ErrRecordNotFound
		}

		return nil
	})
}

func (r *guardianRepository) IsLinkedToStudent(studentID, guardianID uint) (bool, error) {
	var count int64
	err := r.db.Model(&model.StudentGuardian{}).Where("student_id = ? AND guardian_id = ?", studentID, guardianID).Count(&count).Error
	return count > 0, err
}
