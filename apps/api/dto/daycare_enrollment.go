package dto

type CreateDaycareEnrollmentRequest struct {
	StudentID      uint   `json:"student_id" validate:"required"`
	AcademicYearID uint   `json:"academic_year_id" validate:"required"`
	Category       string `json:"category" validate:"required,oneof=premium regular"`
	TimeSlot       string `json:"time_slot" validate:"required,oneof=07-15 10-15 10-13"`
	AgeGroup       string `json:"age_group" validate:"required,oneof=kbtk under3"`
	StartDate      string `json:"start_date" validate:"required"`
}

type UpsertDaycareAttendanceRequest struct {
	StudentID      uint   `json:"student_id" validate:"required"`
	AcademicYearID uint   `json:"academic_year_id" validate:"required"`
	Date           string `json:"date" validate:"required"`
	TimeSlot       string `json:"time_slot"` // empty = absent
	WithMeal       bool   `json:"with_meal"` // hadir + paket konsumsi
	WithTpq        bool   `json:"with_tpq"`  // hadir + lanjut TPQ
}

type UpdateDaycareStatusRequest struct {
	Status  string `json:"status" validate:"required,oneof=active inactive"`
	EndDate string `json:"end_date" validate:"required_if=Status inactive,omitempty"`
}

type DaycareEnrollmentResponse struct {
	ID           uint                      `json:"id"`
	Student      StudentBriefResponse      `json:"student"`
	AcademicYear AcademicYearBriefResponse `json:"academic_year"`
	Category     string                    `json:"category"`
	TimeSlot     string                    `json:"time_slot"`
	AgeGroup     string                    `json:"age_group"`
	PackageType  string                    `json:"package_type"`
	StartDate    string                    `json:"start_date"`
	EndDate      *string                   `json:"end_date"`
	Status       string                    `json:"status"`
}

type DaycareAttendanceResponse struct {
	ID        uint   `json:"id"`
	StudentID uint   `json:"student_id"`
	Date      string `json:"date"`
	TimeSlot  string `json:"time_slot"`
	WithMeal  bool   `json:"with_meal"`
	WithTpq   bool   `json:"with_tpq"`
}

type DaycareEnrollmentQueryParams struct {
	AcademicYearID uint
	Status         string
	Search         string
	Page           int
	Limit          int
}

type GenerateDaycareMonthlyParams struct {
	StudentID      uint
	AcademicYearID uint
	Month          uint
	Year           uint
	CreatedBy      uint
}

type GenerateDaycareMonthlyRequest struct {
	StudentID      uint `json:"student_id" validate:"required"`
	AcademicYearID uint `json:"academic_year_id" validate:"required"`
	Month          uint `json:"month" validate:"required,min=1,max=12"`
	Year           uint `json:"year" validate:"required"`
}

type GenerateDaycareMonthlyBulkRequest struct {
	AcademicYearID uint `json:"academic_year_id" validate:"required"`
	Month          uint `json:"month" validate:"required,min=1,max=12"`
	Year           uint `json:"year" validate:"required"`
}

// ─── Monthly Attendance ──────────────────────────────────────

type UpsertDaycareMonthlyAttendanceRequest struct {
	StudentID      uint `json:"student_id" validate:"required"`
	AcademicYearID uint `json:"academic_year_id" validate:"required"`
	Month          uint `json:"month" validate:"required,min=1,max=12"`
	Year           uint `json:"year" validate:"required"`
	SPDDays        uint `json:"spd_days" validate:"max=30"`
	MealDays       uint `json:"meal_days" validate:"max=30"`
}

type DaycareMonthlyAttendanceResponse struct {
	ID             uint   `json:"id"`
	StudentID      uint   `json:"student_id"`
	StudentName    string `json:"student_name"`
	AcademicYearID uint   `json:"academic_year_id"`
	Month          uint   `json:"month"`
	Year           uint   `json:"year"`
	SPDDays        uint   `json:"spd_days"`
	MealDays       uint   `json:"meal_days"`
}
