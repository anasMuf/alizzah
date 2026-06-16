package barang

import (
	"errors"
	"strings"

	"gorm.io/gorm"
)

type Service interface {
	List(search string, activeOnly bool) ([]Response, error)
	Get(id uint) (*Response, error)
	Create(req CreateRequest) (*Response, error)
	Update(id uint, req CreateRequest) (*Response, error)
	Delete(id uint) error
}

type service struct{ repo Repository }

func NewService(repo Repository) Service { return &service{repo: repo} }

func (s *service) List(search string, activeOnly bool) ([]Response, error) {
	products, err := s.repo.FindAll(search, activeOnly)
	if err != nil {
		return nil, err
	}
	out := make([]Response, 0, len(products))
	for _, p := range products {
		out = append(out, toResponse(p))
	}
	return out, nil
}

func (s *service) Get(id uint) (*Response, error) {
	p, err := s.repo.FindByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("Barang tidak ditemukan")
		}
		return nil, err
	}
	resp := toResponse(*p)
	return &resp, nil
}

func (s *service) Create(req CreateRequest) (*Response, error) {
	active := true
	if req.IsActive != nil {
		active = *req.IsActive
	}
	p := &Product{
		Name:     req.Name,
		Category: req.Category,
		Unit:     req.Unit,
		IsActive: active,
		Variants: buildVariants(req),
	}
	if err := s.repo.Create(p); err != nil {
		return nil, err
	}
	return s.Get(p.ID)
}

// Update memperbarui kolom barang + varian. Stok TIDAK diubah lewat sini — stok
// dikelola transaksi pembelian/penjualan (8c). Bila payload tak membawa varian
// eksplisit, harga varian "Default" diperbarui dari field legacy (form lama).
func (s *service) Update(id uint, req CreateRequest) (*Response, error) {
	p, err := s.repo.FindByID(id)
	if err != nil {
		return nil, errors.New("Barang tidak ditemukan")
	}
	p.Name = req.Name
	p.Category = req.Category
	p.Unit = req.Unit
	if req.IsActive != nil {
		p.IsActive = *req.IsActive
	}
	if err := s.repo.Update(p); err != nil {
		return nil, err
	}

	if len(req.Variants) > 0 {
		for _, vr := range req.Variants {
			if vr.ID > 0 {
				v, err := s.repo.FindVariantByID(vr.ID)
				if err != nil || v.ProductID != id {
					continue // abaikan varian yang bukan milik barang ini
				}
				if name := strings.TrimSpace(vr.Name); name != "" {
					v.Name = name
				}
				v.CostPrice = vr.CostPrice
				v.SalePrice = vr.SalePrice
				if vr.IsActive != nil {
					v.IsActive = *vr.IsActive
				}
				if err := s.repo.UpdateVariant(v); err != nil {
					return nil, err
				}
			} else {
				if err := s.repo.CreateVariant(newVariant(id, vr)); err != nil {
					return nil, err
				}
			}
		}
	} else {
		// Form lama: perbarui harga varian "Default" (stok tak diubah).
		for i := range p.Variants {
			if p.Variants[i].Name == DefaultVariantName {
				v := p.Variants[i]
				v.CostPrice = req.CostPrice
				v.SalePrice = req.SalePrice
				if err := s.repo.UpdateVariant(&v); err != nil {
					return nil, err
				}
				break
			}
		}
	}
	return s.Get(id)
}

func (s *service) Delete(id uint) error {
	p, err := s.repo.FindByID(id)
	if err != nil {
		return errors.New("Barang tidak ditemukan")
	}
	for _, v := range p.Variants {
		if v.Stock != 0 {
			return errors.New("Tidak bisa menghapus barang yang masih memiliki stok")
		}
	}
	return s.repo.Delete(id)
}

// buildVariants menyusun varian saat create: dari daftar eksplisit bila ada, atau
// satu varian "Default" dari field legacy (form barang lama).
func buildVariants(req CreateRequest) []Variant {
	if len(req.Variants) > 0 {
		out := make([]Variant, 0, len(req.Variants))
		for _, vr := range req.Variants {
			out = append(out, *newVariant(0, vr))
		}
		return out
	}
	stock := 0
	if req.Stock != nil {
		stock = *req.Stock
	}
	return []Variant{{
		Name:      DefaultVariantName,
		CostPrice: req.CostPrice,
		SalePrice: req.SalePrice,
		Stock:     stock,
		IsActive:  true,
	}}
}

func newVariant(productID uint, vr VariantRequest) *Variant {
	name := strings.TrimSpace(vr.Name)
	if name == "" {
		name = DefaultVariantName
	}
	stock := 0
	if vr.Stock != nil {
		stock = *vr.Stock
	}
	active := true
	if vr.IsActive != nil {
		active = *vr.IsActive
	}
	return &Variant{
		ProductID: productID,
		Name:      name,
		CostPrice: vr.CostPrice,
		SalePrice: vr.SalePrice,
		Stock:     stock,
		IsActive:  active,
	}
}
