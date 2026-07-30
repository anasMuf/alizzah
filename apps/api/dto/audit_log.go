package dto

import "time"

// AuditLogQueryParams menampung seluruh filter yang bisa dikirim dari frontend
// untuk endpoint GET /v1/audit-logs. Semua field optional — bila kosong, filter
// tidak diterapkan.
type AuditLogQueryParams struct {
	Search    string `query:"search"`     // ILIKE di path, error_message, user_name
	UserID    uint   `query:"user_id"`    // filter by specific user
	Module    string `query:"module"`     // administrasi|keuangan|koperasi|laporan|pengaturan|auth
	Method    string `query:"method"`     // POST|PUT|PATCH|DELETE
	StatusMin int    `query:"status_min"` // filter status >= N (default 0 = semua)
	StatusMax int    `query:"status_max"` // filter status <= N (default 999 = semua)
	DateFrom  string `query:"date_from"`  // "2006-01-02" — created_at >= date_from 00:00:00
	DateTo    string `query:"date_to"`    // "2006-01-02" — created_at <= date_to 23:59:59
	Page      int    `query:"page"`       // default 1
	Limit     int    `query:"limit"`      // default 20
}

// AuditLogResponse adalah struktur response untuk satu entry audit log
// (digunakan di list dan detail).
type AuditLogResponse struct {
	ID           uint      `json:"id"`
	UserID       uint      `json:"user_id"`
	UserName     string    `json:"user_name"`
	Method       string    `json:"method"`
	Path         string    `json:"path"`
	Module       string    `json:"module"`
	Action       string    `json:"action"`
	RequestBody  string    `json:"request_body,omitempty"`
	StatusCode   int       `json:"status_code"`
	ErrorMessage string    `json:"error_message,omitempty"`
	IPAddress    string    `json:"ip_address"`
	LatencyMs    int       `json:"latency_ms"`
	CreatedAt    time.Time `json:"created_at"`
}
