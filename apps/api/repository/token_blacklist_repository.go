package repository

import (
	"api/model"
	"time"

	"gorm.io/gorm"
)

type TokenBlacklistRepository interface {
	Create(hash string, expiresAt time.Time) error
	Exists(hash string) (bool, error)
	DeleteExpired() (int64, error)
}

type tokenBlacklistRepository struct {
	db *gorm.DB
}

func NewTokenBlacklistRepository(db *gorm.DB) TokenBlacklistRepository {
	return &tokenBlacklistRepository{db: db}
}

func (r *tokenBlacklistRepository) Create(hash string, expiresAt time.Time) error {
	return r.db.Create(&model.TokenBlacklist{
		TokenHash: hash,
		ExpiresAt: expiresAt,
	}).Error
}

func (r *tokenBlacklistRepository) Exists(hash string) (bool, error) {
	var count int64
	err := r.db.Model(&model.TokenBlacklist{}).
		Where("token_hash = ? AND expires_at > ?", hash, time.Now()).
		Count(&count).Error
	return count > 0, err
}

func (r *tokenBlacklistRepository) DeleteExpired() (int64, error) {
	result := r.db.Where("expires_at < ?", time.Now()).Delete(&model.TokenBlacklist{})
	return result.RowsAffected, result.Error
}
