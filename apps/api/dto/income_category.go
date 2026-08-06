package dto

// Request
type CreateIncomeCategoryRequest struct {
	Code string `json:"code" validate:"omitempty,min=2,max=30"`
	Name string `json:"name" validate:"required,max=100"`
}

// Response
type IncomeCategoryResponse struct {
	ID        uint   `json:"id"`
	Code      string `json:"code"`
	Name      string `json:"name"`
	CreatedAt string `json:"created_at"`
}

type IncomeCategoryBriefResponse struct {
	ID   uint   `json:"id"`
	Code string `json:"code"`
	Name string `json:"name"`
}
