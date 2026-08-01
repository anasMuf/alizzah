package repository

import (
	"api/dto"
	"api/model"
	"time"

	"gorm.io/gorm"
)

type AuditEntryRepository interface {
	Create(entry *model.AuditEntry) error
	FindByID(id uint) (*model.AuditEntry, error)
	FindAll(params dto.AuditLogQueryParams) ([]model.AuditEntry, int64, error)
	DeleteOlderThan(since time.Time) (int64, error)
}

type auditEntryRepository struct {
	db *gorm.DB
}

func NewAuditEntryRepository(db *gorm.DB) AuditEntryRepository {
	return &auditEntryRepository{db: db}
}

func (r *auditEntryRepository) Create(entry *model.AuditEntry) error {
	return r.db.Create(entry).Error
}

func (r *auditEntryRepository) FindByID(id uint) (*model.AuditEntry, error) {
	var entry model.AuditEntry
	err := r.db.First(&entry, id).Error
	return &entry, err
}

func (r *auditEntryRepository) FindAll(params dto.AuditLogQueryParams) ([]model.AuditEntry, int64, error) {
	var entries []model.AuditEntry
	var total int64

	query := r.db.Model(&model.AuditEntry{})

	// Search — ILIKE di path, error_message, dan user_name
	if params.Search != "" {
		pattern := "%" + params.Search + "%"
		query = query.Where(
			"path ILIKE ? OR error_message ILIKE ? OR user_name ILIKE ? OR response_body ILIKE ?",
			pattern, pattern, pattern, pattern,
		)
	}

	if params.UserID > 0 {
		query = query.Where("user_id = ?", params.UserID)
	}
	if params.Module != "" {
		query = query.Where("module = ?", params.Module)
	}
	if params.Method != "" {
		query = query.Where("method = ?", params.Method)
	}
	if params.StatusMin > 0 {
		query = query.Where("status_code >= ?", params.StatusMin)
	}
	if params.StatusMax > 0 {
		query = query.Where("status_code <= ?", params.StatusMax)
	}
	if params.DateFrom != "" {
		if t, err := time.Parse("2006-01-02", params.DateFrom); err == nil {
			query = query.Where("created_at >= ?", t)
		}
	}
	if params.DateTo != "" {
		if t, err := time.Parse("2006-01-02", params.DateTo); err == nil {
			query = query.Where("created_at <= ?", t.Add(24*time.Hour-time.Second))
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
	offset := (page - 1) * limit

	if err := query.Order("created_at DESC").Offset(offset).Limit(limit).Find(&entries).Error; err != nil {
		return nil, 0, err
	}

	return entries, total, nil
}

// DeleteOlderThan menghapus semua entry audit yang lebih tua dari `since`.
// Mengembalikan jumlah baris yang dihapus.
func (r *auditEntryRepository) DeleteOlderThan(since time.Time) (int64, error) {
	result := r.db.Where("created_at < ?", since).Delete(&model.AuditEntry{})
	return result.RowsAffected, result.Error
}
