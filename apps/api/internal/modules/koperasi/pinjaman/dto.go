package pinjaman

type CreateRequest struct {
	AcademicYearID  uint    `json:"academic_year_id" validate:"required"`
	MemberID        uint    `json:"member_id" validate:"required"`
	Purpose         string  `json:"purpose" validate:"required,max=255"`
	Principal       float64 `json:"principal" validate:"required,gt=0"`
	Tenor           int     `json:"tenor" validate:"required,gte=1"`
	RepaymentMethod string  `json:"repayment_method" validate:"required,oneof=potong_gaji manual"`
	LoanDate        string  `json:"loan_date" validate:"required,dateonly"`
	Notes           string  `json:"notes" validate:"omitempty"`
}

type PaymentRequest struct {
	Amount      float64 `json:"amount" validate:"required,gt=0"`
	PaymentDate string  `json:"payment_date" validate:"required,dateonly"`
	Method      string  `json:"method" validate:"omitempty,oneof=cash potong_gaji"`
	Notes       string  `json:"notes" validate:"omitempty"`
}

type InstallmentResponse struct {
	Sequence   int     `json:"sequence"`
	AmountDue  float64 `json:"amount_due"`
	AmountPaid float64 `json:"amount_paid"`
	Status     string  `json:"status"`
}

type Response struct {
	ID              uint                  `json:"id"`
	AcademicYearID  uint                  `json:"academic_year_id"`
	MemberID        uint                  `json:"member_id"`
	MemberName      string                `json:"member_name,omitempty"`
	Purpose         string                `json:"purpose"`
	Principal       float64               `json:"principal"`
	Tenor           int                   `json:"tenor"`
	RepaymentMethod string                `json:"repayment_method"`
	LoanDate        string                `json:"loan_date"`
	PaidAmount      float64               `json:"paid_amount"`
	Remaining       float64               `json:"remaining"`
	Status          string                `json:"status"`
	Notes           string                `json:"notes,omitempty"`
	Installments    []InstallmentResponse `json:"installments,omitempty"`
	CreatedBy       string                `json:"created_by,omitempty"`
	CreatedAt       string                `json:"created_at"`
}

// SummaryItem adalah rekap pinjaman per anggota (siapa berhutang berapa,
// sudah dibayar berapa, sisa berapa).
type SummaryItem struct {
	MemberID       uint    `json:"member_id"`
	MemberName     string  `json:"member_name"`
	LoanCount      int     `json:"loan_count"`
	TotalPrincipal float64 `json:"total_principal"`
	TotalPaid      float64 `json:"total_paid"`
	Remaining      float64 `json:"remaining"`
}

type QueryParams struct {
	AcademicYearID uint
	MemberID       uint
	Status         string
	Page           int
	Limit          int
}

func toResponse(l Loan, withInstallments bool) Response {
	r := Response{
		ID:              l.ID,
		AcademicYearID:  l.AcademicYearID,
		MemberID:        l.MemberID,
		MemberName:      l.Member.FullName,
		Purpose:         l.Purpose,
		Principal:       l.Principal,
		Tenor:           l.Tenor,
		RepaymentMethod: l.RepaymentMethod,
		LoanDate:        l.LoanDate.Format("2006-01-02"),
		PaidAmount:      l.PaidAmount,
		Remaining:       l.Principal - l.PaidAmount,
		Status:          l.Status,
		Notes:           l.Notes,
		CreatedBy:       l.Creator.FullName,
		CreatedAt:       l.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}
	if withInstallments {
		r.Installments = make([]InstallmentResponse, 0, len(l.Installments))
		for _, it := range l.Installments {
			r.Installments = append(r.Installments, InstallmentResponse{
				Sequence:   it.Sequence,
				AmountDue:  it.AmountDue,
				AmountPaid: it.AmountPaid,
				Status:     it.Status,
			})
		}
	}
	return r
}
