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

// ─── Export ────────────────────────────────────────────────────────────

// ExtracurricularExportStudent is brief student info for export.
type ExtracurricularExportStudent struct {
	ID              uint   `json:"id"`
	FullName        string `json:"full_name"`
	Gender          string `json:"gender"`
	BirthPlace      string `json:"birth_place"`
	BirthDate       string `json:"birth_date"`
	Status          string `json:"status"`
	ClassGroupName  string `json:"class_group_name,omitempty"`
	ClassGroupLevel string `json:"class_group_level,omitempty"`
}

// ExtracurricularExportItem groups one extracurricular with its enrolled students.
type ExtracurricularExportItem struct {
	ExtracurricularID   uint                           `json:"extracurricular_id"`
	ExtracurricularName string                         `json:"extracurricular_name"`
	Students            []ExtracurricularExportStudent `json:"students"`
}
