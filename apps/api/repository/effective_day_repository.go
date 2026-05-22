package repository

import (
	"api/dto"
	"api/model"

	"gorm.io/gorm"
)

type EffectiveDayRepository interface {
	FindByClassGroup(classGroupID uint, params dto.EffectiveDayQueryParams) ([]model.EffectiveDay, error)
	FindByClassGroupMonthYear(classGroupID, month, year uint) (*model.EffectiveDay, error)
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

func (r *effectiveDayRepository) FindByClassGroupMonthYear(classGroupID, month, year uint) (*model.EffectiveDay, error) {
	var ed model.EffectiveDay
	err := r.db.Preload("Creator").Where("class_group_id = ? AND month = ? AND year = ?", classGroupID, month, year).First(&ed).Error
	return &ed, err
}

func (r *effectiveDayRepository) Upsert(ed *model.EffectiveDay) error {
	return r.db.
		Where(model.EffectiveDay{
			ClassGroupID: ed.ClassGroupID,
			Month:        ed.Month,
			Year:         ed.Year,
		}).
		Assign(model.EffectiveDay{
			AcademicYearID: ed.AcademicYearID,
			TotalDays:      ed.TotalDays,
			TotalMondays:   ed.TotalMondays,
			CreatedBy:      ed.CreatedBy,
		}).
		FirstOrCreate(ed).Error
}

func (r *effectiveDayRepository) Update(ed *model.EffectiveDay) error {
	return r.db.Save(ed).Error
}
