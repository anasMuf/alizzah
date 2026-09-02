package anggota

// CreateRequest dipakai untuk create & update anggota.
type CreateRequest struct {
	FullName   string `json:"full_name" validate:"required,max=100"`
	MemberType string `json:"member_type" validate:"required,oneof=pegawai pengurus_yayasan pihak_luar"`
	Phone      string `json:"phone" validate:"omitempty,max=20"`
	Address    string `json:"address" validate:"omitempty"`
	IsActive   *bool  `json:"is_active"`
	EmployeeID *uint  `json:"employee_id,omitempty"`
}

type BulkCreateRequest struct {
	Members []CreateRequest `json:"members" validate:"required,min=1,dive"`
}

type Response struct {
	ID           uint   `json:"id"`
	FullName     string `json:"full_name"`
	MemberType   string `json:"member_type"`
	Phone        string `json:"phone,omitempty"`
	Address      string `json:"address,omitempty"`
	IsActive     bool   `json:"is_active"`
	EmployeeID   *uint  `json:"employee_id,omitempty"`
	EmployeeName string `json:"employee_name,omitempty"`
}

type LoanSummary struct {
	ActiveLoanCount int     `json:"active_loan_count"`
	TotalPrincipal  float64 `json:"total_principal"`
	TotalPaid       float64 `json:"total_paid"`
	TotalRemaining  float64 `json:"total_remaining"`
}

type DetailResponse struct {
	Response
	LoanSummary LoanSummary `json:"loan_summary"`
}

func toResponse(m Member) Response {
	r := Response{
		ID:           m.ID,
		FullName:     m.FullName,
		MemberType:   m.MemberType,
		Phone:        m.Phone,
		Address:      m.Address,
		IsActive:     m.IsActive,
		EmployeeID:   m.EmployeeID,
		EmployeeName: m.EmployeeName,
	}
	return r
}
