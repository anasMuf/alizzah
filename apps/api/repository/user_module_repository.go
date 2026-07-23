package repository

import (
	"api/model"

	"gorm.io/gorm"
)

// UserModuleRepository mengelola grant akses modul per-user (tabel user_modules).
type UserModuleRepository interface {
	// ListByUser mengembalikan daftar modul yang di-grant ke user (urut a-z).
	ListByUser(userID uint) ([]string, error)
	// ListByUserIDs batch version — returns map[userID][]modules.
	ListByUserIDs(userIDs []uint) (map[uint][]string, error)
	// ReplaceForUser mengganti seluruh grant user dengan set baru (delete-then-insert).
	ReplaceForUser(userID uint, modules []string) error
	// HasAnyModule = true bila user punya minimal satu dari modules yang diminta.
	HasAnyModule(userID uint, modules []string) (bool, error)
}

type userModuleRepository struct {
	db *gorm.DB
}

func NewUserModuleRepository(db *gorm.DB) UserModuleRepository {
	return &userModuleRepository{db: db}
}

func (r *userModuleRepository) ListByUser(userID uint) ([]string, error) {
	var modules []string
	err := r.db.Model(&model.UserModule{}).
		Where("user_id = ?", userID).
		Order("module ASC").
		Pluck("module", &modules).Error
	return modules, err
}

// ListByUserIDs batch-fetches modules for multiple users in a single query.
func (r *userModuleRepository) ListByUserIDs(userIDs []uint) (map[uint][]string, error) {
	if len(userIDs) == 0 {
		return map[uint][]string{}, nil
	}
	type row struct {
		UserID uint   `gorm:"column:user_id"`
		Module string `gorm:"column:module"`
	}
	var rows []row
	err := r.db.Model(&model.UserModule{}).
		Where("user_id IN ?", userIDs).
		Order("module ASC").
		Find(&rows).Error
	if err != nil {
		return nil, err
	}
	result := make(map[uint][]string, len(userIDs))
	for _, r := range rows {
		result[r.UserID] = append(result[r.UserID], r.Module)
	}
	return result, nil
}

func (r *userModuleRepository) ReplaceForUser(userID uint, modules []string) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("user_id = ?", userID).Delete(&model.UserModule{}).Error; err != nil {
			return err
		}
		rows := make([]model.UserModule, 0, len(modules))
		seen := make(map[string]bool, len(modules))
		for _, m := range modules {
			if m == "" || seen[m] {
				continue
			}
			seen[m] = true
			rows = append(rows, model.UserModule{UserID: userID, Module: m})
		}
		if len(rows) == 0 {
			return nil
		}
		return tx.Create(&rows).Error
	})
}

func (r *userModuleRepository) HasAnyModule(userID uint, modules []string) (bool, error) {
	if len(modules) == 0 {
		return false, nil
	}
	var count int64
	err := r.db.Model(&model.UserModule{}).
		Where("user_id = ? AND module IN ?", userID, modules).
		Limit(1).Count(&count).Error
	return count > 0, err
}
