package pembelian

type CreateItemRequest struct {
	ProductID uint    `json:"product_id" validate:"required"`
	Quantity  int     `json:"quantity" validate:"required,gt=0"`
	UnitPrice float64 `json:"unit_price" validate:"gte=0"`
}

type CreateRequest struct {
	AcademicYearID  uint                `json:"academic_year_id" validate:"required"`
	SupplierID      uint                `json:"supplier_id" validate:"required"`
	PurchaseDate    string              `json:"purchase_date" validate:"required,dateonly"`
	ReferenceNumber string              `json:"reference_number" validate:"omitempty,max=50"`
	Notes           string              `json:"notes" validate:"omitempty"`
	Items           []CreateItemRequest `json:"items" validate:"required,min=1,dive"`
	InitialPayment  float64             `json:"initial_payment" validate:"omitempty,gte=0"`
	PaymentMethod   string              `json:"payment_method" validate:"omitempty,oneof=cash"`
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
	Quantity    int     `json:"quantity"`
	UnitPrice   float64 `json:"unit_price"`
	Subtotal    float64 `json:"subtotal"`
}

type Response struct {
	ID              uint           `json:"id"`
	AcademicYearID  uint           `json:"academic_year_id"`
	SupplierID      uint           `json:"supplier_id"`
	SupplierName    string         `json:"supplier_name,omitempty"`
	PurchaseDate    string         `json:"purchase_date"`
	ReferenceNumber string         `json:"reference_number,omitempty"`
	TotalAmount     float64        `json:"total_amount"`
	PaidAmount      float64        `json:"paid_amount"`
	Remaining       float64        `json:"remaining"`
	Status          string         `json:"status"`
	Notes           string         `json:"notes,omitempty"`
	Items           []ItemResponse `json:"items"`
	CreatedBy       string         `json:"created_by,omitempty"`
	CreatedAt       string         `json:"created_at"`
}

type QueryParams struct {
	AcademicYearID uint
	SupplierID     uint
	Status         string
	Page           int
	Limit          int
}

func toResponse(p Purchase) Response {
	items := make([]ItemResponse, 0, len(p.Items))
	for _, it := range p.Items {
		items = append(items, ItemResponse{
			ProductID:   it.ProductID,
			ProductName: it.ProductName,
			Quantity:    it.Quantity,
			UnitPrice:   it.UnitPrice,
			Subtotal:    it.Subtotal,
		})
	}
	return Response{
		ID:              p.ID,
		AcademicYearID:  p.AcademicYearID,
		SupplierID:      p.SupplierID,
		SupplierName:    p.Supplier.Name,
		PurchaseDate:    p.PurchaseDate.Format("2006-01-02"),
		ReferenceNumber: p.ReferenceNumber,
		TotalAmount:     p.TotalAmount,
		PaidAmount:      p.PaidAmount,
		Remaining:       p.TotalAmount - p.PaidAmount,
		Status:          p.Status,
		Notes:           p.Notes,
		Items:           items,
		CreatedBy:       p.Creator.FullName,
		CreatedAt:       p.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}
}
