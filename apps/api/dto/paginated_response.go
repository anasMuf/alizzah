package dto

type PaginatedResponse struct {
	Message string      `json:"message"`
	Data    interface{} `json:"data"`
	Meta    Meta        `json:"meta"`
}

type Meta struct {
	Page             int      `json:"page"`
	Limit            int      `json:"limit"`
	Total            int64    `json:"total"`
	TotalOutstanding *float64 `json:"total_outstanding,omitempty"` // sum sisa tagihan terfilter; diisi pada daftar invoice
}
