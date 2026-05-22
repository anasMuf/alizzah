package repository

import (
	"api/model"

	"gorm.io/gorm"
)

type StudentSavingsRepository interface {
	FindByStudentID(studentID uint) ([]model.StudentSavings, error)
	FindByStudentAndType(studentID uint, savingsType string) (*model.StudentSavings, error)
	GetBalance(studentID uint, savingsType string) (float64, error)
	Create(savings *model.StudentSavings) error
	UpdateBalance(id uint, balance float64, tx *gorm.DB) error
	WithTx(tx *gorm.DB) StudentSavingsRepository
}

type studentSavingsRepository struct {
	db *gorm.DB
}

func NewStudentSavingsRepository(db *gorm.DB) StudentSavingsRepository {
	return &studentSavingsRepository{db: db}
}

func (r *studentSavingsRepository) WithTx(tx *gorm.DB) StudentSavingsRepository {
	return &studentSavingsRepository{db: tx}
}

func (r *studentSavingsRepository) FindByStudentID(studentID uint) ([]model.StudentSavings, error) {
	var savings []model.StudentSavings
	err := r.db.Where("student_id = ?", studentID).Find(&savings).Error
	return savings, err
}

func (r *studentSavingsRepository) FindByStudentAndType(studentID uint, savingsType string) (*model.StudentSavings, error) {
	var savings model.StudentSavings
	err := r.db.Where("student_id = ? AND type = ?", studentID, savingsType).First(&savings).Error
	return &savings, err
}

func (r *studentSavingsRepository) GetBalance(studentID uint, savingsType string) (float64, error) {
	savings, err := r.FindByStudentAndType(studentID, savingsType)
	if err != nil {
		return 0, err
	}
	return savings.Balance, nil
}

func (r *studentSavingsRepository) Create(savings *model.StudentSavings) error {
	return r.db.Create(savings).Error
}

func (r *studentSavingsRepository) UpdateBalance(id uint, balance float64, tx *gorm.DB) error {
	db := r.db
	if tx != nil {
		db = tx
	}
	return db.Model(&model.StudentSavings{}).Where("id = ?", id).Update("balance", balance).Error
}
