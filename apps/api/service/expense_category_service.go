package service

import (
	"api/dto"
	"api/model"
	"api/repository"
	"errors"
)

type ExpenseCategoryService interface {
	GetAll() ([]dto.ExpenseCategoryResponse, error)
	Create(req dto.CreateExpenseCategoryRequest) (*dto.ExpenseCategoryResponse, error)
	Update(id uint, req dto.CreateExpenseCategoryRequest) (*dto.ExpenseCategoryResponse, error)
	Delete(id uint) error
}

type expenseCategoryService struct {
	repo repository.ExpenseCategoryRepository
}

func NewExpenseCategoryService(repo repository.ExpenseCategoryRepository) ExpenseCategoryService {
	return &expenseCategoryService{repo: repo}
}

func (s *expenseCategoryService) GetAll() ([]dto.ExpenseCategoryResponse, error) {
	cats, err := s.repo.FindAll()
	if err != nil {
		return nil, err
	}
	var responses []dto.ExpenseCategoryResponse
	for _, cat := range cats {
		responses = append(responses, mapExpenseCategoryToResponse(cat))
	}
	return responses, nil
}

func (s *expenseCategoryService) Create(req dto.CreateExpenseCategoryRequest) (*dto.ExpenseCategoryResponse, error) {
	if req.ParentID != nil {
		parent, err := s.repo.FindByID(*req.ParentID)
		if err != nil {
			return nil, errors.New("Kategori induk tidak ditemukan")
		}
		if parent.ParentID != nil {
			return nil, errors.New("Kategori hanya diizinkan 2 level")
		}
	}

	cat := &model.ExpenseCategory{
		Name:     req.Name,
		ParentID: req.ParentID,
	}
	if err := s.repo.Create(cat); err != nil {
		return nil, err
	}

	resp := mapExpenseCategoryToResponse(*cat)
	return &resp, nil
}

func (s *expenseCategoryService) Update(id uint, req dto.CreateExpenseCategoryRequest) (*dto.ExpenseCategoryResponse, error) {
	cat, err := s.repo.FindByID(id)
	if err != nil {
		return nil, errors.New("Kategori tidak ditemukan")
	}

	cat.Name = req.Name
	if err := s.repo.Update(cat); err != nil {
		return nil, err
	}

	resp := mapExpenseCategoryToResponse(*cat)
	return &resp, nil
}

func (s *expenseCategoryService) Delete(id uint) error {
	_, err := s.repo.FindByID(id)
	if err != nil {
		return errors.New("Kategori tidak ditemukan")
	}

	hasChildren, _ := s.repo.HasChildren(id)
	if hasChildren {
		return errors.New("Tidak bisa menghapus kategori yang memiliki sub-kategori")
	}

	hasExpenses, _ := s.repo.HasExpenses(id)
	if hasExpenses {
		return errors.New("Tidak bisa menghapus kategori yang sudah digunakan oleh pengeluaran")
	}

	return s.repo.Delete(id)
}

func mapExpenseCategoryToResponse(cat model.ExpenseCategory) dto.ExpenseCategoryResponse {
	resp := dto.ExpenseCategoryResponse{
		ID:       cat.ID,
		Name:     cat.Name,
		ParentID: cat.ParentID,
	}
	for _, child := range cat.Children {
		resp.Children = append(resp.Children, mapExpenseCategoryToResponse(child))
	}
	return resp
}
