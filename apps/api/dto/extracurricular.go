package dto

type CreateExtracurricularRequest struct {
	Name string `json:"name" validate:"required,max=100"`
	Type string `json:"type" validate:"required,oneof=pasta calisan ekskul"`
}

type ExtracurricularResponse struct {
	ID   uint   `json:"id"`
	Name string `json:"name"`
	Type string `json:"type"`
}

type ExtracurricularQueryParams struct {
	Type string
}
