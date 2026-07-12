package dto

type CreateExtracurricularRequest struct {
	Name   string `json:"name" validate:"required,max=100"`
	Type   string `json:"type" validate:"required,oneof=pasta"`
	Levels string `json:"levels"` // comma-separated: "intan,berlian". "" = all
}

type ExtracurricularResponse struct {
	ID          uint   `json:"id"`
	Name        string `json:"name"`
	Type        string `json:"type"`
	Levels      string `json:"levels,omitempty"`
	IsMandatory bool   `json:"is_mandatory"`
}

type ExtracurricularQueryParams struct {
	Type  string
	Level string // filter by student level for enrollment
}
