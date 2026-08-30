package dto

// MonthYearBrief merepresentasikan satu bulan (1-12) + tahun.
type MonthYearBrief struct {
	Month uint `json:"month"`
	Year  uint `json:"year"`
}

// ExtracurricularPreviewItem — rencana sync untuk satu enrollment PASTA/ekskul
// (dry-run; tidak ada penulisan DB).
type ExtracurricularPreviewItem struct {
	StudentID           uint             `json:"student_id"`
	StudentName         string           `json:"student_name"`
	ExtracurricularID   uint             `json:"extracurricular_id"`
	ExtracurricularName string           `json:"extracurricular_name"`
	MonthsToAdd         []MonthYearBrief `json:"months_to_add"`
	SkippedExcluded     uint             `json:"skipped_excluded"`
	SkippedExists       uint             `json:"skipped_exists"`
	SkippedNoInvoice    uint             `json:"skipped_no_invoice"`
}

// ExtracurricularPreviewResponse — ringkasan rencana sync ekstrakurikuler.
type ExtracurricularPreviewResponse struct {
	TotalEnrollments int                          `json:"total_enrollments"`
	Items            []ExtracurricularPreviewItem `json:"items"`
}

// DaycarePreviewItem — rencana sync untuk satu enrollment daycare.
type DaycarePreviewItem struct {
	StudentID   uint   `json:"student_id"`
	StudentName string `json:"student_name"`
	Category    string `json:"category"` // premium | regular
	WillSync    bool   `json:"will_sync"`
	Reason      string `json:"reason"`
}

// DaycarePreviewResponse — ringkasan rencana sync daycare.
type DaycarePreviewResponse struct {
	TotalEnrollments int                  `json:"total_enrollments"`
	Items            []DaycarePreviewItem `json:"items"`
}
