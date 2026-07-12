package repository

import (
	"api/dto"
	"api/model"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type EffectiveDayRepository interface {
	FindByClassGroup(classGroupID uint, params dto.EffectiveDayQueryParams) ([]model.EffectiveDay, error)
	FindByLevel(level string, params dto.EffectiveDayQueryParams) ([]model.EffectiveDay, error)
	FindByClassGroupMonthYear(classGroupID, month, year uint) (*model.EffectiveDay, error)
	FindByLevelMonthYear(level string, month, year uint) (*model.EffectiveDay, error)
	Upsert(ed *model.EffectiveDay) error
	Update(ed *model.EffectiveDay) error
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
	// Build conflict columns based on mode
	conflictCols := []clause.Column{{Name: "class_group_id"}, {Name: "month"}, {Name: "year"}}
	if ed.Level != "" {
		conflictCols = []clause.Column{{Name: "level"}, {Name: "month"}, {Name: "year"}}
	}

	return r.db.Clauses(clause.OnConflict{
		Columns:   conflictCols,
		DoUpdates: clause.AssignmentColumns([]string{"academic_year_id", "total_days", "total_mondays", "created_by", "updated_at"}),
	}).Create(ed).Error
}

func (r *effectiveDayRepository) Update(ed *model.EffectiveDay) error {
	return r.db.Save(ed).Error
}
