package barang

import (
	"errors"

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
	stock := 0
	if req.Stock != nil {
		stock = *req.Stock
	}
	p := &Product{
		Name:      req.Name,
		Category:  req.Category,
		Unit:      req.Unit,
		CostPrice: req.CostPrice,
		SalePrice: req.SalePrice,
		Stock:     stock,
		IsActive:  active,
	}
	if err := s.repo.Create(p); err != nil {
		return nil, err
	}
	resp := toResponse(*p)
	return &resp, nil
}

// Update sengaja TIDAK mengubah Stock — stok dikelola transaksi pembelian/penjualan (8c).
func (s *service) Update(id uint, req CreateRequest) (*Response, error) {
	p, err := s.repo.FindByID(id)
	if err != nil {
		return nil, errors.New("Barang tidak ditemukan")
	}
	p.Name = req.Name
	p.Category = req.Category
	p.Unit = req.Unit
	p.CostPrice = req.CostPrice
	p.SalePrice = req.SalePrice
	if req.IsActive != nil {
		p.IsActive = *req.IsActive
	}
	if err := s.repo.Update(p); err != nil {
		return nil, err
	}
	resp := toResponse(*p)
	return &resp, nil
}

func (s *service) Delete(id uint) error {
	p, err := s.repo.FindByID(id)
	if err != nil {
		return errors.New("Barang tidak ditemukan")
	}
	if p.Stock != 0 {
		return errors.New("Tidak bisa menghapus barang yang masih memiliki stok")
	}
	return s.repo.Delete(id)
}
