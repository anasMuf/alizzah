package service

import (
	"api/dto"
	"api/middleware"
	"api/model"
	"api/repository"
	"errors"
	"os"
	"time"

	"github.com/golang-jwt/jwt"
	"golang.org/x/crypto/bcrypt"
)

type AuthService interface {
	Login(req dto.LoginRequest) (*dto.LoginResponse, error)
	GetMe(userID uint) (*dto.UserResponse, error)
}

type authService struct {
	userRepo       repository.UserRepository
	userModuleRepo repository.UserModuleRepository
}

func NewAuthService(userRepo repository.UserRepository, userModuleRepo repository.UserModuleRepository) AuthService {
	return &authService{userRepo: userRepo, userModuleRepo: userModuleRepo}
}

// userModules mengembalikan grant modul user (kosong untuk superadmin/bypass).
func (s *authService) userModules(user *model.User) []string {
	if user.Role == middleware.RoleSuperadmin {
		return []string{}
	}
	mods, err := s.userModuleRepo.ListByUser(user.ID)
	if err != nil || mods == nil {
		return []string{}
	}
	return mods
}

func (s *authService) Login(req dto.LoginRequest) (*dto.LoginResponse, error) {
	user, err := s.userRepo.FindByEmail(req.Email)
	if err != nil {
		return nil, errors.New("Email atau password salah")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)); err != nil {
		return nil, errors.New("Email atau password salah")
	}

	// Generate JWT token
	jwtSecret := os.Getenv("JWT_SECRET")
	claims := &middleware.JWTClaims{
		UserID: user.ID,
		Role:   user.Role,
		StandardClaims: jwt.StandardClaims{
			ExpiresAt: time.Now().Add(24 * time.Hour).Unix(),
			IssuedAt:  time.Now().Unix(),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString([]byte(jwtSecret))
	if err != nil {
		return nil, errors.New("Gagal generate token")
	}

	return &dto.LoginResponse{
		Token: tokenString,
		User: dto.UserResponse{
			ID:        user.ID,
			FullName:  user.FullName,
			Email:     user.Email,
			Role:      user.Role,
			Modules:   s.userModules(user),
			CreatedAt: user.CreatedAt.Format(time.RFC3339),
		},
	}, nil
}

func (s *authService) GetMe(userID uint) (*dto.UserResponse, error) {
	user, err := s.userRepo.FindByID(userID)
	if err != nil {
		return nil, errors.New("User tidak ditemukan")
	}

	return &dto.UserResponse{
		ID:        user.ID,
		FullName:  user.FullName,
		Email:     user.Email,
		Role:      user.Role,
		Modules:   s.userModules(user),
		CreatedAt: user.CreatedAt.Format(time.RFC3339),
	}, nil
}
