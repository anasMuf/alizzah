package service

import (
	"api/repository"
	"io"
	"mime/multipart"
	"os"
	"path/filepath"
	"strings"
)

type SettingService interface {
	GetAll() (map[string]string, error)
	Update(settings map[string]string) error
	// Upload menyimpan file ke direktori uploads dan mengembalikan URL relatif.
	Upload(file *multipart.FileHeader, prefix string) (string, error)
}

type settingService struct {
	settingRepo repository.SettingRepository
	uploadDir   string
}

func NewSettingService(settingRepo repository.SettingRepository, uploadDir string) SettingService {
	// Buat direktori uploads jika belum ada
	os.MkdirAll(uploadDir, 0755)
	return &settingService{
		settingRepo: settingRepo,
		uploadDir:   uploadDir,
	}
}

func (s *settingService) GetAll() (map[string]string, error) {
	return s.settingRepo.GetAll()
}

func (s *settingService) Update(settings map[string]string) error {
	return s.settingRepo.SetMany(settings)
}

func (s *settingService) Upload(file *multipart.FileHeader, prefix string) (string, error) {
	src, err := file.Open()
	if err != nil {
		return "", err
	}
	defer src.Close()

	// Generate nama file: prefix + ekstensi asli
	ext := strings.ToLower(filepath.Ext(file.Filename))
	if ext != ".png" && ext != ".jpg" && ext != ".jpeg" && ext != ".gif" {
		ext = ".png"
	}
	filename := prefix + ext
	dstPath := filepath.Join(s.uploadDir, filename)

	dst, err := os.Create(dstPath)
	if err != nil {
		return "", err
	}
	defer dst.Close()

	if _, err := io.Copy(dst, src); err != nil {
		return "", err
	}

	// URL publik: /uploads/filename
	return "/uploads/" + filename, nil
}
