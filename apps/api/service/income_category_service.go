package service

import (
	"api/dto"
	"api/model"
	"api/repository"
	"errors"
	"fmt"
	"regexp"
	"strings"
	"unicode"
)

var incomeCategoryCodeRegex = regexp.MustCompile(`^[a-z][a-z0-9_]*$`)

type IncomeCategoryService interface {
	GetAll() ([]dto.IncomeCategoryResponse, error)
	Create(req dto.CreateIncomeCategoryRequest) (*dto.IncomeCategoryResponse, error)
	Update(id uint, req dto.CreateIncomeCategoryRequest) (*dto.IncomeCategoryResponse, error)
	Delete(id uint) error
}

type incomeCategoryService struct {
	repo repository.IncomeCategoryRepository
}

func NewIncomeCategoryService(repo repository.IncomeCategoryRepository) IncomeCategoryService {
	return &incomeCategoryService{repo: repo}
}

func (s *incomeCategoryService) GetAll() ([]dto.IncomeCategoryResponse, error) {
	cats, err := s.repo.FindAll()
	if err != nil {
		return nil, err
	}
	var responses []dto.IncomeCategoryResponse
	for _, cat := range cats {
		responses = append(responses, dto.IncomeCategoryResponse{
			ID:        cat.ID,
			Code:      cat.Code,
			Name:      cat.Name,
			CreatedAt: cat.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		})
	}
	return responses, nil
}

func (s *incomeCategoryService) Create(req dto.CreateIncomeCategoryRequest) (*dto.IncomeCategoryResponse, error) {
	// Auto-generate code dari name jika tidak diberikan
	code := req.Code
	if code == "" {
		code = generateCode(req.Name)
	}
	if !incomeCategoryCodeRegex.MatchString(code) {
		return nil, fmt.Errorf("Kode kategori harus lowercase, diawali huruf, hanya mengandung huruf kecil, angka, dan underscore")
	}

	cat := &model.IncomeCategory{
		Code: code,
		Name: req.Name,
	}
	if err := s.repo.Create(cat); err != nil {
		return nil, err
	}

	return &dto.IncomeCategoryResponse{
		ID:        cat.ID,
		Code:      cat.Code,
		Name:      cat.Name,
		CreatedAt: cat.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}, nil
}

func (s *incomeCategoryService) Update(id uint, req dto.CreateIncomeCategoryRequest) (*dto.IncomeCategoryResponse, error) {
	cat, err := s.repo.FindByID(id)
	if err != nil {
		return nil, errors.New("Kategori tidak ditemukan")
	}

	cat.Name = req.Name
	if err := s.repo.Update(cat); err != nil {
		return nil, err
	}

	return &dto.IncomeCategoryResponse{
		ID:        cat.ID,
		Code:      cat.Code,
		Name:      cat.Name,
		CreatedAt: cat.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}, nil
}

func (s *incomeCategoryService) Delete(id uint) error {
	_, err := s.repo.FindByID(id)
	if err != nil {
		return errors.New("Kategori tidak ditemukan")
	}

	hasTxn, _ := s.repo.HasTransactions(id)
	if hasTxn {
		return errors.New("Tidak bisa menghapus kategori yang sudah digunakan oleh transaksi penerimaan")
	}

	return s.repo.Delete(id)
}

// generateCode membuat kode dari nama: lowercase, spasi → underscore, hanya alphanumeric + underscore
func generateCode(name string) string {
	var b strings.Builder
	for _, r := range strings.ToLower(name) {
		if unicode.IsLetter(r) || unicode.IsDigit(r) {
			b.WriteRune(r)
		} else if r == ' ' || r == '-' {
			b.WriteRune('_')
		}
	}
	code := b.String()
	// Collapse multiple underscores
	code = regexp.MustCompile(`_+`).ReplaceAllString(code, "_")
	// Trim leading/trailing underscores
	code = strings.Trim(code, "_")
	if code == "" {
		code = "kategori"
	}
	return code
}
