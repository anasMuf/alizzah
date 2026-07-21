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
	SumBalanceByTypeAndLevel(academicYearID uint, savingsType string, level string) (float64, error)
	Create(savings *model.StudentSavings) error
	UpdateBalance(id uint, balance float64, tx *gorm.DB) error
	SubtractBalance(tx *gorm.DB, id uint, amount float64) error
	AddBalance(tx *gorm.DB, id uint, amount float64) error
	WithTx(tx *gorm.DB) StudentSavingsRepository
}

type studentSavingsRepository struct {
	db *gorm.DB
}

func NewStudentSavingsRepository(db *gorm.DB) StudentSavingsRepository {
	return &studentSavingsRepository{db: db}
}

func (r *studentSavingsRepository) WithTx(tx *gorm.DB) StudentSavingsRepository {
	if tx == nil {
		return r
	}
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
	query := r.db.Table("student_savings ss").
		Select("COALESCE(SUM(ss.balance), 0)").
		Where("ss.type = ?", savingsType)

	if academicYearID != 0 {
		// Gunakan subquery untuk menghindari duplikasi SUM jika student punya
		// multiple enrollments untuk tahun ajaran yang sama.
		query = query.Where("ss.student_id IN (?)",
			r.db.Table("student_enrollments").
				Select("student_id").
				Where("academic_year_id = ?", academicYearID),
		)
	}

	err := query.Scan(&total).Error
	return total, err
}

func (r *studentSavingsRepository) SumBalanceByTypeAndLevel(academicYearID uint, savingsType string, level string) (float64, error) {
	var total float64
	query := r.db.Table("student_savings ss").
		Select("COALESCE(SUM(ss.balance), 0)").
		Where("ss.type = ?", savingsType)

	// Filter by enrollment level via class_groups
	levelSubquery := r.db.Table("student_enrollments se").
		Select("se.student_id").
		Joins("JOIN class_groups cg ON cg.id = se.class_group_id").
		Where("cg.level = ?", level)

	if academicYearID != 0 {
		levelSubquery = levelSubquery.Where("se.academic_year_id = ?", academicYearID)
	}

	query = query.Where("ss.student_id IN (?)", levelSubquery)

	err := query.Scan(&total).Error
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

func (r *studentSavingsRepository) SubtractBalance(tx *gorm.DB, id uint, amount float64) error {
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

func (r *studentSavingsRepository) AddBalance(tx *gorm.DB, id uint, amount float64) error {
	return tx.Model(&model.StudentSavings{}).
		Where("id = ?", id).
		Update("balance", gorm.Expr("balance + ?", amount)).Error
}
