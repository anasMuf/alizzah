package model

import "time"

// AuditEntry merekam setiap request mutasi (POST/PUT/PATCH/DELETE) untuk
// keperluan audit trail superadmin. Ditulis async oleh AuditMiddleware —
// tidak mem-blocking response ke user. Data di-retain 7 hari via cleanup cron.
type AuditEntry struct {
	ID           uint      `json:"id" gorm:"primaryKey;autoIncrement"`
	UserID       uint      `json:"user_id" gorm:"not null;index"`
	UserName     string    `json:"user_name" gorm:"size:100;not null"`
	Method       string    `json:"method" gorm:"size:10;not null"`
	Path         string    `json:"path" gorm:"size:255;not null"`
	Module       string    `json:"module" gorm:"size:50;index"`
	Action       string    `json:"action" gorm:"size:50"`
	RequestBody  string    `json:"request_body" gorm:"type:text"`
	ResponseBody string    `json:"response_body" gorm:"type:text"`
	StatusCode   int       `json:"status_code" gorm:"not null;index"`
	ErrorMessage string    `json:"error_message" gorm:"type:text"`
	IPAddress    string    `json:"ip_address" gorm:"size:45"`
	LatencyMs    int       `json:"latency_ms"`
	CreatedAt    time.Time `json:"created_at" gorm:"autoCreateTime;index:,sort:desc"`
}

func (AuditEntry) TableName() string {
	return "audit_entries"
}
