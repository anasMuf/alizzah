package dto

type AcademicEventResponse struct {
	ID             uint                       `json:"id"`
	AcademicYear   AcademicYearBriefResponse  `json:"academic_year"`
	FromClassGroup *ClassGroupBriefResponse   `json:"from_class_group"`
	ToClassGroup   *ClassGroupBriefResponse   `json:"to_class_group"`
	EventType      string                     `json:"event_type"`
	EventDate      string                     `json:"event_date"`
	Notes          *string                    `json:"notes"`
	CreatedBy      UserBriefResponse          `json:"created_by"`
	CreatedAt      string                     `json:"created_at"`
}
