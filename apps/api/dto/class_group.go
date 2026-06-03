package dto

// ScheduleBlock represents the time in/out for specific days.
type ScheduleBlock struct {
	Days           []string `json:"days"`
	TimeIn         string   `json:"time_in"`
	TimeOut        string   `json:"time_out"`
	TimeOutCalisan *string  `json:"time_out_calisan"`
}

// ClassGroupSchedule represents the full schedule JSON for a class group.
type ClassGroupSchedule struct {
	Weekdays ScheduleBlock `json:"weekdays"`
	Weekend  ScheduleBlock `json:"weekend"`
}

// CreateClassGroupRequest is the request body for POST/PUT class groups.
type CreateClassGroupRequest struct {
	AcademicYearID uint               `json:"academic_year_id" validate:"required"`
	Name           string             `json:"name" validate:"required,max=50"`
	Level          string             `json:"level" validate:"required,oneof=mutiara intan berlian"`
	Schedule       ClassGroupSchedule `json:"schedule" validate:"required"`
}

// ClassGroupResponse is the standard class group response.
type ClassGroupResponse struct {
	ID             uint               `json:"id"`
	AcademicYearID uint               `json:"academic_year_id"`
	Name           string             `json:"name"`
	Level          string             `json:"level"`
	Schedule       ClassGroupSchedule `json:"schedule"`
	StudentCount   int                `json:"student_count"`
}

// ClassGroupQueryParams holds query parameters for listing class groups.
type ClassGroupQueryParams struct {
	AcademicYearID uint
	Level          string
}

// CloneClassGroupsRequest clones all class groups from one academic year to another.
type CloneClassGroupsRequest struct {
	FromAcademicYearID uint `json:"from_academic_year_id" validate:"required"`
	ToAcademicYearID   uint `json:"to_academic_year_id" validate:"required"`
}

// CloneClassGroupsResult is the response from cloning class groups.
type CloneClassGroupsResult struct {
	Created int                  `json:"created"`
	Skipped int                  `json:"skipped"`
	Groups  []ClassGroupResponse `json:"groups"`
}
