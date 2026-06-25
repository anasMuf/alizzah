package tutupbuku

import (
	"time"

	"gorm.io/gorm"
)

type Repository interface {
	FindAll(params QueryParams) ([]DailyClosing, int64, error)
	FindByID(id uint) (*DailyClosing, error)
	FindByDate(date time.Time) (*DailyClosing, error)
	Create(dc *DailyClosing) error
	Confirm(id uint, notes string) error
	IsDateConfirmed(date time.Time) (bool, error)
}

func NewRepository(db *gorm.DB) Repository { return &repo{db: db} }

type repo struct{ db *gorm.DB }

func (r *repo) FindAll(params QueryParams) ([]DailyClosing, int64, error) {
	var dcs []DailyClosing
	var total int64
	q := r.db.Model(&DailyClosing{}).Preload("Closer").Preload("AcademicYear")
	if params.AcademicYearID != 0 {
		q = q.Where("academic_year_id = ?", params.AcademicYearID)
	}
	if params.IsConfirmed != nil {
		q = q.Where("is_confirmed = ?", *params.IsConfirmed)
	}
	if params.StartDate != "" {
		if d, err := time.Parse("2006-01-02", params.StartDate); err == nil {
			q = q.Where("closing_date >= ?", d)
		}
	}
	if params.EndDate != "" {
		if d, err := time.Parse("2006-01-02", params.EndDate); err == nil {
			q = q.Where("closing_date <= ?", d)
		}
	}
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	page, limit := params.Page, params.Limit
	if page < 1 { page = 1 }
	if limit < 1 { limit = 20 }
	err := q.Order("closing_date DESC").Offset((page-1)*limit).Limit(limit).Find(&dcs).Error
	return dcs, total, err
}

func (r *repo) FindByID(id uint) (*DailyClosing, error) {
	var dc DailyClosing
	err := r.db.Preload("Closer").Preload("AcademicYear").First(&dc, id).Error
	return &dc, err
}

func (r *repo) FindByDate(date time.Time) (*DailyClosing, error) {
	var dc DailyClosing
	err := r.db.Preload("Closer").Preload("AcademicYear").Where("closing_date = ?", date).First(&dc).Error
	if err == gorm.ErrRecordNotFound { return nil, nil }
	return &dc, err
}

func (r *repo) Create(dc *DailyClosing) error { return r.db.Create(dc).Error }

func (r *repo) Confirm(id uint, notes string) error {
	updates := map[string]any{"is_confirmed": true}
	if notes != "" { updates["notes"] = notes }
	return r.db.Model(&DailyClosing{}).Where("id = ?", id).Updates(updates).Error
}

func (r *repo) IsDateConfirmed(date time.Time) (bool, error) {
	var c int64
	err := r.db.Model(&DailyClosing{}).Where("closing_date = ? AND is_confirmed = true", date).Count(&c).Error
	return c > 0, err
}
