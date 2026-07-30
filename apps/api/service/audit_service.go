package service

import (
	"api/dto"
	"api/middleware"
	"api/model"
	"api/repository"
	"log"
	"time"
)

type AuditService interface {
	LogAsync(entry model.AuditEntry)
	GetAll(params dto.AuditLogQueryParams) ([]dto.AuditLogResponse, *dto.Meta, error)
	GetByID(id uint) (*dto.AuditLogResponse, error)
	Cleanup(retentionDays int) (int64, error)
}

type auditService struct {
	repo repository.AuditEntryRepository
}

func NewAuditService(repo repository.AuditEntryRepository) AuditService {
	return &auditService{repo: repo}
}

// LogAsync menulis audit entry ke database secara async (goroutine) agar tidak
// mem-blocking response ke user. Jika write gagal, error di-log ke console.
func (s *auditService) LogAsync(entry model.AuditEntry) {
	go func(e model.AuditEntry) {
		if err := s.repo.Create(&e); err != nil {
			log.Printf("[audit] gagal menulis audit entry: %v", err)
		}
	}(entry)
}

// Compile-time check: AuditService implements middleware.AuditWriter
var _ middleware.AuditWriter = (*auditService)(nil)

func (s *auditService) GetAll(params dto.AuditLogQueryParams) ([]dto.AuditLogResponse, *dto.Meta, error) {
	entries, total, err := s.repo.FindAll(params)
	if err != nil {
		return nil, nil, err
	}

	responses := make([]dto.AuditLogResponse, len(entries))
	for i, entry := range entries {
		responses[i] = mapEntryToResponse(entry)
	}

	meta := &dto.Meta{
		Page:  params.Page,
		Limit: params.Limit,
		Total: total,
	}

	return responses, meta, nil
}

func (s *auditService) GetByID(id uint) (*dto.AuditLogResponse, error) {
	entry, err := s.repo.FindByID(id)
	if err != nil {
		return nil, err
	}
	resp := mapEntryToResponse(*entry)
	return &resp, nil
}

// Cleanup menghapus entry yang lebih tua dari retentionDays hari.
func (s *auditService) Cleanup(retentionDays int) (int64, error) {
	since := time.Now().Add(-time.Duration(retentionDays) * 24 * time.Hour)
	return s.repo.DeleteOlderThan(since)
}

func mapEntryToResponse(entry model.AuditEntry) dto.AuditLogResponse {
	return dto.AuditLogResponse{
		ID:           entry.ID,
		UserID:       entry.UserID,
		UserName:     entry.UserName,
		Method:       entry.Method,
		Path:         entry.Path,
		Module:       entry.Module,
		Action:       entry.Action,
		RequestBody:  entry.RequestBody,
		ResponseBody: entry.ResponseBody,
		StatusCode:   entry.StatusCode,
		ErrorMessage: entry.ErrorMessage,
		IPAddress:    entry.IPAddress,
		LatencyMs:    entry.LatencyMs,
		CreatedAt:    entry.CreatedAt,
	}
}
