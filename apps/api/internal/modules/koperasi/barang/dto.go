package barang

type CreateRequest struct {
	Name      string  `json:"name" validate:"required,max=100"`
	Category  string  `json:"category" validate:"omitempty,max=50"`
	Unit      string  `json:"unit" validate:"omitempty,max=20"`
	CostPrice float64 `json:"cost_price" validate:"gte=0"`
	SalePrice float64 `json:"sale_price" validate:"gte=0"`
	Stock     *int    `json:"stock" validate:"omitempty,gte=0"` // hanya dipakai saat create (stok awal)
	IsActive  *bool   `json:"is_active"`
}

type Response struct {
	ID        uint    `json:"id"`
	Name      string  `json:"name"`
	Category  string  `json:"category,omitempty"`
	Unit      string  `json:"unit,omitempty"`
	CostPrice float64 `json:"cost_price"`
	SalePrice float64 `json:"sale_price"`
	Stock     int     `json:"stock"`
	IsActive  bool    `json:"is_active"`
}

func toResponse(p Product) Response {
	return Response{
		ID:        p.ID,
		Name:      p.Name,
		Category:  p.Category,
		Unit:      p.Unit,
		CostPrice: p.CostPrice,
		SalePrice: p.SalePrice,
		Stock:     p.Stock,
		IsActive:  p.IsActive,
	}
}
