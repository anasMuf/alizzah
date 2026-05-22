package repository

import (
	"api/dto"
	"api/model"
	"time"

	"gorm.io/gorm"
)

type DailyClosingRepository interface {
	FindAll(params dto.DailyClosingQueryParams) ([]model.DailyClosing, int64, error)
	FindByID(id uint) (*model.DailyClosing, error)
	FindByDate(date time.Time) (*model.DailyClosing, error)
	GetLastConfirmed(academicYearID uint) (*model.DailyClosing, error)
	Create(dc *model.DailyClosing) error
	Confirm(id uint, notes string) error
	IsDateConfirmed(date time.Time) (bool, error)
}

type dailyClosingRepository struct {
	db *gorm.DB
}

func NewDailyClosingRepository(db *gorm.DB) DailyClosingRepository {
	return &dailyClosingRepository{db: db}
}

func (r *dailyClosingRepository) FindAll(params dto.DailyClosingQueryParams) ([]model.DailyClosing, int64, error) {
	var closings []model.DailyClosing
	var total int64
	query := r.db.Model(&model.DailyClosing{}).Preload("Closer").Preload("AcademicYear")

	if params.AcademicYearID != 0 {
		query = query.Where("academic_year_id = ?", params.AcademicYearID)
	}
	if params.IsConfirmed != nil {
		query = query.Where("is_confirmed = ?", *params.IsConfirmed)
	}
	if params.StartDate != "" {
		if d, err := time.Parse("2006-01-02", params.StartDate); err == nil {
			query = query.Where("closing_date >= ?", d)
		}
	}
	if params.EndDate != "" {
		if d, err := time.Parse("2006-01-02", params.EndDate); err == nil {
			query = query.Where("closing_date <= ?", d)
		}
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	page := params.Page
	if page < 1 {
		page = 1
	}
	limit := params.Limit
	if limit < 1 {
		limit = 20
	}

	err := query.Order("closing_date DESC").Offset((page - 1) * limit).Limit(limit).Find(&closings).Error
	return closings, total, err
}

func (r *dailyClosingRepository) FindByID(id uint) (*model.DailyClosing, error) {
	var dc model.DailyClosing
	err := r.db.Preload("Closer").Preload("AcademicYear").First(&dc, id).Error
	return &dc, err
}

func (r *dailyClosingRepository) FindByDate(date time.Time) (*model.DailyClosing, error) {
	var dc model.DailyClosing
	err := r.db.Preload("Closer").Preload("AcademicYear").Where("closing_date = ?", date).First(&dc).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		return nil, err
	}
	return &dc, nil
}

func (r *dailyClosingRepository) GetLastConfirmed(academicYearID uint) (*model.DailyClosing, error) {
	var dc model.DailyClosing
	err := r.db.Where("academic_year_id = ? AND is_confirmed = true", academicYearID).Order("closing_date DESC").First(&dc).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		return nil, err
	}
	return &dc, nil
}

func (r *dailyClosingRepository) Create(dc *model.DailyClosing) error {
	return r.db.Create(dc).Error
}

func (r *dailyClosingRepository) Confirm(id uint, notes string) error {
	updates := map[string]interface{}{
		"is_confirmed": true,
	}
	if notes != "" {
		updates["notes"] = notes
	}
	return r.db.Model(&model.DailyClosing{}).Where("id = ?", id).Updates(updates).Error
}

func (r *dailyClosingRepository) IsDateConfirmed(date time.Time) (bool, error) {
	var count int64
	err := r.db.Model(&model.DailyClosing{}).Where("closing_date = ? AND is_confirmed = true", date).Count(&count).Error
	return count > 0, err
}
