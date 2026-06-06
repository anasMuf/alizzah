package model

import "time"

type TokenBlacklist struct {
	ID        uint      `json:"id" gorm:"primaryKey;autoIncrement"`
	TokenHash string    `json:"token_hash" gorm:"size:64;not null;uniqueIndex"`
	ExpiresAt time.Time `json:"expires_at" gorm:"not null;index"`
	CreatedAt time.Time `json:"created_at" gorm:"autoCreateTime"`
}

func (TokenBlacklist) TableName() string {
	return "token_blacklist"
}
