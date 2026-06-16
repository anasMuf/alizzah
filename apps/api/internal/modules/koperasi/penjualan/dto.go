package penjualan

type CreateItemRequest struct {
	// Kirim variant_id (disarankan). product_id masih diterima demi kompatibilitas
	// picker lama → di-resolve ke varian "Default" barang. Minimal salah satu wajib.
	ProductID uint     `json:"product_id" validate:"omitempty"`
	VariantID *uint    `json:"variant_id" validate:"omitempty"`
	Quantity  int      `json:"quantity" validate:"required,gt=0"`
	UnitPrice *float64 `json:"unit_price" validate:"omitempty,gte=0"` // kosong → pakai harga jual varian
}

type CreateRequest struct {
	AcademicYearID uint                `json:"academic_year_id" validate:"required"`
	StudentID      *uint               `json:"student_id" validate:"omitempty"`
	BuyerName      string              `json:"buyer_name" validate:"omitempty,max=100"`
	SaleDate       string              `json:"sale_date" validate:"required,dateonly"`
	Notes          string              `json:"notes" validate:"omitempty"`
	Items          []CreateItemRequest `json:"items" validate:"required,min=1,dive"`
	InitialPayment float64             `json:"initial_payment" validate:"omitempty,gte=0"`
	PaymentMethod  string              `json:"payment_method" validate:"omitempty,oneof=cash"`
}

type PaymentRequest struct {
	Amount      float64 `json:"amount" validate:"required,gt=0"`
	PaymentDate string  `json:"payment_date" validate:"required,dateonly"`
	Method      string  `json:"method" validate:"omitempty,oneof=cash"`
	Notes       string  `json:"notes" validate:"omitempty"`
}

type ItemResponse struct {
	ProductID   uint    `json:"product_id"`
	ProductName string  `json:"product_name"`
	VariantID   uint    `json:"variant_id"`
	VariantName string  `json:"variant_name,omitempty"`
	Quantity    int     `json:"quantity"`
	UnitPrice   float64 `json:"unit_price"`
	UnitCost    float64 `json:"unit_cost"`
	Subtotal    float64 `json:"subtotal"`
}

type Response struct {
	ID             uint           `json:"id"`
	AcademicYearID uint           `json:"academic_year_id"`
	StudentID      *uint          `json:"student_id,omitempty"`
	StudentName    string         `json:"student_name,omitempty"`
	BuyerName      string         `json:"buyer_name,omitempty"`
	SaleDate       string         `json:"sale_date"`
	TotalAmount    float64        `json:"total_amount"`
	PaidAmount     float64        `json:"paid_amount"`
	Remaining      float64        `json:"remaining"`
	Status         string         `json:"status"`
	Profit         float64        `json:"profit"` // Σ (unit_price - unit_cost) × qty
	Notes          string         `json:"notes,omitempty"`
	Items          []ItemResponse `json:"items"`
	CreatedBy      string         `json:"created_by,omitempty"`
	CreatedAt      string         `json:"created_at"`
}

type QueryParams struct {
	AcademicYearID uint
	StudentID      uint
	Status         string
	Page           int
	Limit          int
}

func toResponse(s Sale) Response {
	items := make([]ItemResponse, 0, len(s.Items))
	var profit float64
	for _, it := range s.Items {
		items = append(items, ItemResponse{
			ProductID:   it.ProductID,
			ProductName: it.ProductName,
			VariantID:   it.VariantID,
			VariantName: it.VariantName,
			Quantity:    it.Quantity,
			UnitPrice:   it.UnitPrice,
			UnitCost:    it.UnitCost,
			Subtotal:    it.Subtotal,
		})
		profit += (it.UnitPrice - it.UnitCost) * float64(it.Quantity)
	}
	studentName := ""
	if s.Student != nil {
		studentName = s.Student.FullName
	}
	return Response{
		ID:             s.ID,
		AcademicYearID: s.AcademicYearID,
		StudentID:      s.StudentID,
		StudentName:    studentName,
		BuyerName:      s.BuyerName,
		SaleDate:       s.SaleDate.Format("2006-01-02"),
		TotalAmount:    s.TotalAmount,
		PaidAmount:     s.PaidAmount,
		Remaining:      s.TotalAmount - s.PaidAmount,
		Status:         s.Status,
		Profit:         profit,
		Notes:          s.Notes,
		Items:          items,
		CreatedBy:      s.Creator.FullName,
		CreatedAt:      s.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}
}
