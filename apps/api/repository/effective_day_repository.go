package repository

import (
	"api/dto"
	"api/model"
	"errors"

	"gorm.io/gorm"
)

type EffectiveDayRepository interface {
	FindByClassGroup(classGroupID uint, params dto.EffectiveDayQueryParams) ([]model.EffectiveDay, error)
	FindByLevel(level string, params dto.EffectiveDayQueryParams) ([]model.EffectiveDay, error)
	FindByClassGroupMonthYear(classGroupID, month, year uint) (*model.EffectiveDay, error)
	FindByLevelMonthYear(level string, month, year uint) (*model.EffectiveDay, error)
	Upsert(ed *model.EffectiveDay) error
	Update(ed *model.EffectiveDay) error
	DeleteByClassGroupMonthYear(classGroupID, month, year uint) error
}

type effectiveDayRepository struct {
	db *gorm.DB
}

func NewEffectiveDayRepository(db *gorm.DB) EffectiveDayRepository {
	return &effectiveDayRepository{db: db}
}

func (r *effectiveDayRepository) FindByClassGroup(classGroupID uint, params dto.EffectiveDayQueryParams) ([]model.EffectiveDay, error) {
	var eds []model.EffectiveDay
	query := r.db.Preload("Creator").Where("class_group_id = ?", classGroupID)

	if params.AcademicYearID != 0 {
		query = query.Where("academic_year_id = ?", params.AcademicYearID)
	}
	if params.Year != 0 {
		query = query.Where("year = ?", params.Year)
	}

	err := query.Order("year DESC, month DESC").Find(&eds).Error
	return eds, err
}

func (r *effectiveDayRepository) FindByLevel(level string, params dto.EffectiveDayQueryParams) ([]model.EffectiveDay, error) {
	var eds []model.EffectiveDay
	query := r.db.Preload("Creator").Where("level = ? AND class_group_id = 0", level)

	if params.AcademicYearID != 0 {
		query = query.Where("academic_year_id = ?", params.AcademicYearID)
	}
	if params.Year != 0 {
		query = query.Where("year = ?", params.Year)
	}

	err := query.Order("year DESC, month DESC").Find(&eds).Error
	return eds, err
}

func (r *effectiveDayRepository) FindByClassGroupMonthYear(classGroupID, month, year uint) (*model.EffectiveDay, error) {
	var ed model.EffectiveDay
	err := r.db.Preload("Creator").Where("class_group_id = ? AND month = ? AND year = ?", classGroupID, month, year).First(&ed).Error
	return &ed, err
}

func (r *effectiveDayRepository) FindByLevelMonthYear(level string, month, year uint) (*model.EffectiveDay, error) {
	var ed model.EffectiveDay
	err := r.db.Preload("Creator").Where("level = ? AND class_group_id = 0 AND month = ? AND year = ?", level, month, year).First(&ed).Error
	return &ed, err
}

func (r *effectiveDayRepository) Upsert(ed *model.EffectiveDay) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		var existing model.EffectiveDay
		var err error

		// Cari record yang sudah ada berdasarkan mode (per-rombel atau per-jenjang)
		if ed.Level != "" {
			err = tx.Where("level = ? AND class_group_id = 0 AND month = ? AND year = ?", ed.Level, ed.Month, ed.Year).First(&existing).Error
		} else {
			err = tx.Where("class_group_id = ? AND month = ? AND year = ?", ed.ClassGroupID, ed.Month, ed.Year).First(&existing).Error
		}

		if err == nil {
			// Update record yang sudah ada
			existing.AcademicYearID = ed.AcademicYearID
			existing.TotalDays = ed.TotalDays
			existing.TotalMondays = ed.TotalMondays
			existing.CreatedBy = ed.CreatedBy
			return tx.Save(&existing).Error
		}

		if errors.Is(err, gorm.ErrRecordNotFound) {
			// Insert baru
			return tx.Create(ed).Error
		}

		return err
	})
}

func (r *effectiveDayRepository) Update(ed *model.EffectiveDay) error {
	return r.db.Save(ed).Error
}

func (r *effectiveDayRepository) DeleteByClassGroupMonthYear(classGroupID, month, year uint) error {
	return r.db.Where("class_group_id = ? AND month = ? AND year = ?", classGroupID, month, year).Delete(&model.EffectiveDay{}).Error
}
