package service

import (
	"api/dto"
	"api/middleware"
	"api/model"
	"api/repository"
	"errors"
	"time"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type UserService interface {
	GetAll(params dto.UserQueryParams) ([]dto.UserResponse, *dto.Meta, error)
	GetByID(id uint) (*dto.UserResponse, error)
	Create(req dto.CreateUserRequest) (*dto.UserResponse, error)
	Update(id uint, req dto.UpdateUserRequest) (*dto.UserResponse, error)
	Delete(id, currentUserID uint) error
}

type userService struct {
	userRepo       repository.UserRepository
	userModuleRepo repository.UserModuleRepository
}

func NewUserService(userRepo repository.UserRepository, userModuleRepo repository.UserModuleRepository) UserService {
	return &userService{userRepo: userRepo, userModuleRepo: userModuleRepo}
}

// modulesForRole mengembalikan set modul yang akan disimpan: kosong untuk
// superadmin (bypass semua modul), apa adanya untuk admin.
func modulesForRole(role string, modules []string) []string {
	if role == middleware.RoleSuperadmin {
		return nil
	}
	return modules
}

func (s *userService) GetAll(params dto.UserQueryParams) ([]dto.UserResponse, *dto.Meta, error) {
	users, total, err := s.userRepo.FindAll(params.Search, params.Role, params.Page, params.Limit)
	if err != nil {
		return nil, nil, err
	}

	// Batch-fetch modules untuk semua user dalam 1 query (hindari N+1)
	userIDs := make([]uint, len(users))
	for i, user := range users {
		userIDs[i] = user.ID
	}
	modsMap, err := s.userModuleRepo.ListByUserIDs(userIDs)
	if err != nil {
		return nil, nil, err
	}

	responses := make([]dto.UserResponse, len(users))
	for i, user := range users {
		responses[i] = mapUserToResponse(user, modsMap[user.ID])
	}

	meta := &dto.Meta{
		Page:  params.Page,
		Limit: params.Limit,
		Total: total,
	}

	return responses, meta, nil
}

func (s *userService) GetByID(id uint) (*dto.UserResponse, error) {
	user, err := s.userRepo.FindByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("User tidak ditemukan")
		}
		return nil, err
	}

	mods, err := s.userModuleRepo.ListByUser(user.ID)
	if err != nil {
		return nil, err
	}
	response := mapUserToResponse(*user, mods)
	return &response, nil
}

func (s *userService) Create(req dto.CreateUserRequest) (*dto.UserResponse, error) {
	// Check email uniqueness
	_, err := s.userRepo.FindByEmail(req.Email)
	if err == nil {
		return nil, errors.New("Email sudah digunakan")
	}

	// Hash password with cost 12 (higher than DefaultCost=10 for better brute-force resistance)
	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), 12)
	if err != nil {
		return nil, errors.New("Gagal memproses password")
	}

	user := &model.User{
		FullName: req.FullName,
		Email:    req.Email,
		Password: string(hash),
		Role:     req.Role,
	}

	if err := s.userRepo.Create(user); err != nil {
		return nil, err
	}

	modules := modulesForRole(user.Role, req.Modules)
	if err := s.userModuleRepo.ReplaceForUser(user.ID, modules); err != nil {
		return nil, err
	}

	response := mapUserToResponse(*user, modules)
	return &response, nil
}

func (s *userService) Update(id uint, req dto.UpdateUserRequest) (*dto.UserResponse, error) {
	user, err := s.userRepo.FindByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("User tidak ditemukan")
		}
		return nil, err
	}

	// Check email uniqueness if changed
	if user.Email != req.Email {
		existing, err := s.userRepo.FindByEmail(req.Email)
		if err == nil && existing.ID != id {
			return nil, errors.New("Email sudah digunakan")
		}
	}

	user.FullName = req.FullName
	user.Email = req.Email
	user.Role = req.Role

	// Only update password if provided
	if req.Password != "" {
		hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), 12)
		if err != nil {
			return nil, errors.New("Gagal memproses password")
		}
		user.Password = string(hash)
	}

	if err := s.userRepo.Update(user); err != nil {
		return nil, err
	}

	modules := modulesForRole(user.Role, req.Modules)
	if err := s.userModuleRepo.ReplaceForUser(user.ID, modules); err != nil {
		return nil, err
	}

	response := mapUserToResponse(*user, modules)
	return &response, nil
}

func (s *userService) Delete(id, currentUserID uint) error {
	// Cannot delete self
	if id == currentUserID {
		return errors.New("Tidak dapat menghapus akun sendiri")
	}

	_, err := s.userRepo.FindByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("User tidak ditemukan")
		}
		return err
	}

	// Bersihkan grant modul agar tidak ada baris yatim.
	if err := s.userModuleRepo.ReplaceForUser(id, nil); err != nil {
		return err
	}

	return s.userRepo.Delete(id)
}

func mapUserToResponse(user model.User, modules []string) dto.UserResponse {
	if modules == nil {
		modules = []string{}
	}
	return dto.UserResponse{
		ID:        user.ID,
		FullName:  user.FullName,
		Email:     user.Email,
		Role:      user.Role,
		Modules:   modules,
		CreatedAt: user.CreatedAt.Format(time.RFC3339),
	}
}
