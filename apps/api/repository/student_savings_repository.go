package repository

import (
	"api/model"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type StudentSavingsRepository interface {
	FindByStudentID(studentID uint) ([]model.StudentSavings, error)
	FindByStudentAndType(studentID uint, savingsType string) (*model.StudentSavings, error)
	FindByStudentAndTypeForUpdate(tx *gorm.DB, studentID uint, savingsType string) (*model.StudentSavings, error)
	GetBalance(studentID uint, savingsType string) (float64, error)
	SumBalanceByType(academicYearID uint, savingsType string) (float64, error)
	Create(savings *model.StudentSavings) error
	UpdateBalance(id uint, balance float64, tx *gorm.DB) error
	DebitBalance(tx *gorm.DB, id uint, amount float64) error
	CreditBalance(tx *gorm.DB, id uint, amount float64) error
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

func (r *studentSavingsRepository) FindByStudentAndTypeForUpdate(tx *gorm.DB, studentID uint, savingsType string) (*model.StudentSavings, error) {
	var savings model.StudentSavings
	err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
		Where("student_id = ? AND type = ?", studentID, savingsType).
		First(&savings).Error
	return &savings, err
}

func (r *studentSavingsRepository) GetBalance(studentID uint, savingsType string) (float64, error) {
	savings, err := r.FindByStudentAndType(studentID, savingsType)
	if err != nil {
		return 0, err
	}
	return savings.Balance, nil
}

func (r *studentSavingsRepository) SumBalanceByType(academicYearID uint, savingsType string) (float64, error) {
	var total float64
	err := r.db.Table("student_savings ss").
		Select("COALESCE(SUM(ss.balance), 0)").
		Joins("JOIN student_enrollments se ON se.student_id = ss.student_id AND se.academic_year_id = ?", academicYearID).
		Where("ss.type = ?", savingsType).
		Scan(&total).Error
	return total, err
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

func (r *studentSavingsRepository) DebitBalance(tx *gorm.DB, id uint, amount float64) error {
	result := tx.Model(&model.StudentSavings{}).
		Where("id = ? AND balance >= ?", id, amount).
		Update("balance", gorm.Expr("balance - ?", amount))
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}
	return nil
}

func (r *studentSavingsRepository) CreditBalance(tx *gorm.DB, id uint, amount float64) error {
	return tx.Model(&model.StudentSavings{}).
		Where("id = ?", id).
		Update("balance", gorm.Expr("balance + ?", amount)).Error
}
