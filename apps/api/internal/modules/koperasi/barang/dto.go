package barang

// VariantRequest adalah satu varian pada payload create/update barang. ID>0 berarti
// memperbarui varian yang sudah ada (saat edit); ID==0 berarti varian baru.
type VariantRequest struct {
	ID        uint    `json:"id"`
	Name      string  `json:"name" validate:"omitempty,max=50"`
	CostPrice float64 `json:"cost_price" validate:"gte=0"`
	SalePrice float64 `json:"sale_price" validate:"gte=0"`
	Stock     *int    `json:"stock" validate:"omitempty,gte=0"` // stok awal varian baru; update diabaikan
	IsActive  *bool   `json:"is_active"`
}

type CreateRequest struct {
	Name     string `json:"name" validate:"required,max=100"`
	Category string `json:"category" validate:"omitempty,max=50"`
	Unit     string `json:"unit" validate:"omitempty,max=20"`
	IsActive *bool  `json:"is_active"`

	// Varian eksplisit (form barang ber-varian). Bila kosong, field legacy di bawah
	// dipakai untuk membuat/memperbarui satu varian "Default" (kompatibilitas form lama).
	Variants []VariantRequest `json:"variants" validate:"omitempty,dive"`

	// Legacy single-variant (form barang lama): harga & stok satu varian default.
	CostPrice float64 `json:"cost_price" validate:"gte=0"`
	SalePrice float64 `json:"sale_price" validate:"gte=0"`
	Stock     *int    `json:"stock" validate:"omitempty,gte=0"`
}

type VariantResponse struct {
	ID        uint    `json:"id"`
	Name      string  `json:"name"`
	CostPrice float64 `json:"cost_price"`
	SalePrice float64 `json:"sale_price"`
	Stock     int     `json:"stock"`
	IsActive  bool    `json:"is_active"`
}

type Response struct {
	ID       uint   `json:"id"`
	Name     string `json:"name"`
	Category string `json:"category,omitempty"`
	Unit     string `json:"unit,omitempty"`
	IsActive bool   `json:"is_active"`

	Variants     []VariantResponse `json:"variants"`
	VariantCount int               `json:"variant_count"`

	// Agregat kompatibilitas (sampai FE varian): harga varian default/pertama &
	// total stok seluruh varian — agar tabel & picker lama tetap berfungsi.
	CostPrice float64 `json:"cost_price"`
	SalePrice float64 `json:"sale_price"`
	Stock     int     `json:"stock"`
}

func toResponse(p Product) Response {
	variants := make([]VariantResponse, 0, len(p.Variants))
	totalStock := 0
	var costAgg, saleAgg float64
	defaultPicked := false
	for i, v := range p.Variants {
		variants = append(variants, VariantResponse{
			ID:        v.ID,
			Name:      v.Name,
			CostPrice: v.CostPrice,
			SalePrice: v.SalePrice,
			Stock:     v.Stock,
			IsActive:  v.IsActive,
		})
		totalStock += v.Stock
		// Agregat harga: varian "Default" bila ada, kalau tidak varian pertama.
		if !defaultPicked && (i == 0 || v.Name == DefaultVariantName) {
			costAgg, saleAgg = v.CostPrice, v.SalePrice
			if v.Name == DefaultVariantName {
				defaultPicked = true
			}
		}
	}
	return Response{
		ID:           p.ID,
		Name:         p.Name,
		Category:     p.Category,
		Unit:         p.Unit,
		IsActive:     p.IsActive,
		Variants:     variants,
		VariantCount: len(variants),
		CostPrice:    costAgg,
		SalePrice:    saleAgg,
		Stock:        totalStock,
	}
}
