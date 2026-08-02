package repository

import (
	"api/model"

	"gorm.io/gorm"
)

type SettingRepository interface {
	Get(key string) (string, error)
	GetAll() (map[string]string, error)
	Set(key, value string) error
	SetMany(settings map[string]string) error
}

type settingRepository struct {
	db *gorm.DB
}

func NewSettingRepository(db *gorm.DB) SettingRepository {
	return &settingRepository{db: db}
}

func (r *settingRepository) Get(key string) (string, error) {
	var s model.Setting
	err := r.db.Where("key = ?", key).First(&s).Error
	if err != nil {
		return "", err
	}
	return s.Value, nil
}

func (r *settingRepository) GetAll() (map[string]string, error) {
	var settings []model.Setting
	err := r.db.Find(&settings).Error
	if err != nil {
		return nil, err
	}
	result := make(map[string]string)
	for _, s := range settings {
		result[s.Key] = s.Value
	}
	return result, nil
}

func (r *settingRepository) Set(key, value string) error {
	return r.db.Exec(`
		INSERT INTO settings (key, value, created_at, updated_at)
		VALUES (?, ?, NOW(), NOW())
		ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
	`, key, value).Error
}

func (r *settingRepository) SetMany(settings map[string]string) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		for key, value := range settings {
			if err := tx.Exec(`
				INSERT INTO settings (key, value, created_at, updated_at)
				VALUES (?, ?, NOW(), NOW())
				ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
			`, key, value).Error; err != nil {
				return err
			}
		}
		return nil
	})
}
