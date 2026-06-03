package service

import (
	"api/dto"
	"api/model"
	"api/repository"
	"api/utility"
	"errors"

	"gorm.io/gorm"
)

type InvoiceService interface {
	GetAll(params dto.InvoiceQueryParams) ([]dto.InvoiceListResponse, *dto.Meta, error)
	GetByID(id uint) (*dto.InvoiceDetailResponse, error)
	GetByStudentID(studentID uint, invoiceType, status string, academicYearID uint) ([]dto.InvoiceListResponse, error)
	// Item management
	AddItem(invoiceID uint, req dto.AddInvoiceItemRequest) (*dto.InvoiceItemResponse, error)
	UpdateItem(invoiceID, itemID uint, req dto.UpdateInvoiceItemRequest) (*dto.InvoiceItemResponse, error)
	DeleteItem(invoiceID, itemID uint) error
	// Installment management
	GetInstallments(invoiceID uint) ([]dto.InstallmentResponse, error)
	CreateInstallmentSchedule(invoiceID uint, req dto.CreateInstallmentScheduleRequest) ([]dto.InstallmentResponse, error)
	UpdateInstallment(invoiceID, instID uint, req dto.UpdateInstallmentRequest) (*dto.InstallmentResponse, error)
	DeleteInstallment(invoiceID, instID uint) error
	// Internal helpers (used by payment service in Batch 6)
	RecalculateTotalAmount(invoiceID uint, tx *gorm.DB) error
	UpdateInvoiceStatus(invoiceID uint, tx *gorm.DB) error
}

type invoiceService struct {
	invoiceRepo     repository.InvoiceRepository
	itemRepo        repository.InvoiceItemRepository
	installmentRepo repository.InvoiceInstallmentRepository
}

func NewInvoiceService(
	invoiceRepo repository.InvoiceRepository,
	itemRepo repository.InvoiceItemRepository,
	installmentRepo repository.InvoiceInstallmentRepository,
) InvoiceService {
	return &invoiceService{
		invoiceRepo:     invoiceRepo,
		itemRepo:        itemRepo,
		installmentRepo: installmentRepo,
	}
}

func (s *invoiceService) GetAll(params dto.InvoiceQueryParams) ([]dto.InvoiceListResponse, *dto.Meta, error) {
	invoices, total, err := s.invoiceRepo.FindAll(params)
	if err != nil {
		return nil, nil, err
	}

	var responses []dto.InvoiceListResponse
	for _, inv := range invoices {
		responses = append(responses, mapInvoiceToListResponse(inv))
	}

	page := params.Page
	if page < 1 {
		page = 1
	}
	limit := params.Limit
	if limit < 1 {
		limit = 20
	}

	meta := &dto.Meta{
		Page:  page,
		Limit: limit,
		Total: total,
	}

	return responses, meta, nil
}

func (s *invoiceService) GetByID(id uint) (*dto.InvoiceDetailResponse, error) {
	invoice, err := s.invoiceRepo.FindByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("Invoice tidak ditemukan")
		}
		return nil, err
	}
	resp := mapInvoiceToDetailResponse(*invoice)
	return &resp, nil
}

func (s *invoiceService) GetByStudentID(studentID uint, invoiceType, status string, academicYearID uint) ([]dto.InvoiceListResponse, error) {
	invoices, err := s.invoiceRepo.FindByStudentID(studentID, invoiceType, status, academicYearID)
	if err != nil {
		return nil, err
	}

	var responses []dto.InvoiceListResponse
	for _, inv := range invoices {
		responses = append(responses, mapInvoiceToListResponse(inv))
	}
	return responses, nil
}

func (s *invoiceService) AddItem(invoiceID uint, req dto.AddInvoiceItemRequest) (*dto.InvoiceItemResponse, error) {
	invoice, err := s.invoiceRepo.FindByID(invoiceID)
	if err != nil {
		return nil, errors.New("Invoice tidak ditemukan")
	}

	if invoice.Status == "paid" {
		return nil, errors.New("Tidak bisa menambahkan item ke invoice yang sudah lunas")
	}

	item := &model.InvoiceItem{
		InvoiceID:   invoiceID,
		Name:        req.Name,
		Category:    req.Category,
		Amount:      req.Amount,
		IsMandatory: false, // Item manual selalu non-mandatory
	}

	if err := s.itemRepo.Create(item); err != nil {
		return nil, err
	}

	if err := s.RecalculateTotalAmount(invoiceID, nil); err != nil {
		return nil, err
	}

	resp := mapInvoiceItemToResponse(*item)
	return &resp, nil
}

func (s *invoiceService) UpdateItem(invoiceID, itemID uint, req dto.UpdateInvoiceItemRequest) (*dto.InvoiceItemResponse, error) {
	item, err := s.itemRepo.FindByID(itemID)
	if err != nil || item.InvoiceID != invoiceID {
		return nil, errors.New("Item tidak ditemukan pada invoice ini")
	}

	if item.PaidAmount > 0 {
		return nil, errors.New("Item sudah sebagian dibayar, tidak bisa diubah")
	}

	item.Name = req.Name
	item.Amount = req.Amount
	if err := s.itemRepo.Update(item); err != nil {
		return nil, err
	}

	if err := s.RecalculateTotalAmount(invoiceID, nil); err != nil {
		return nil, err
	}

	resp := mapInvoiceItemToResponse(*item)
	return &resp, nil
}

func (s *invoiceService) DeleteItem(invoiceID, itemID uint) error {
	item, err := s.itemRepo.FindByID(itemID)
	if err != nil || item.InvoiceID != invoiceID {
		return errors.New("Item tidak ditemukan pada invoice ini")
	}

	if item.IsMandatory {
		return errors.New("Tidak bisa menghapus item mandatory")
	}

	if item.PaidAmount > 0 {
		return errors.New("Tidak bisa menghapus item yang sudah dibayar")
	}

	has, _ := s.itemRepo.HasPayments(itemID)
	if has {
		return errors.New("Tidak bisa menghapus item yang sudah memiliki riwayat pembayaran")
	}

	if err := s.itemRepo.Delete(itemID); err != nil {
		return err
	}

	return s.RecalculateTotalAmount(invoiceID, nil)
}

func (s *invoiceService) GetInstallments(invoiceID uint) ([]dto.InstallmentResponse, error) {
	installments, err := s.installmentRepo.FindByInvoiceID(invoiceID)
	if err != nil {
		return nil, err
	}

	var responses []dto.InstallmentResponse
	for _, inst := range installments {
		responses = append(responses, mapInstallmentToResponse(inst))
	}
	return responses, nil
}

func (s *invoiceService) CreateInstallmentSchedule(invoiceID uint, req dto.CreateInstallmentScheduleRequest) ([]dto.InstallmentResponse, error) {
	invoice, err := s.invoiceRepo.FindByID(invoiceID)
	if err != nil {
		return nil, errors.New("Invoice tidak ditemukan")
	}

	if invoice.Type != "registration" {
		return nil, errors.New("Jadwal cicilan hanya tersedia untuk invoice bertipe registration")
	}

	// Delete old schedule
	if err := s.installmentRepo.DeleteByInvoiceID(invoiceID); err != nil {
		return nil, err
	}

	// Create new schedule
	var installments []model.InvoiceInstallment
	for _, item := range req.Installments {
		dueDate, _ := utility.ParseDate( item.DueDate)
		installments = append(installments, model.InvoiceInstallment{
			InvoiceID:         invoiceID,
			InstallmentNumber: item.InstallmentNumber,
			DueDate:           dueDate,
			Amount:            item.Amount,
			Notes:             item.Notes,
		})
	}

	if err := s.installmentRepo.BulkCreate(installments); err != nil {
		return nil, err
	}

	// Fetch and return
	saved, _ := s.installmentRepo.FindByInvoiceID(invoiceID)
	var responses []dto.InstallmentResponse
	for _, inst := range saved {
		responses = append(responses, mapInstallmentToResponse(inst))
	}
	return responses, nil
}

func (s *invoiceService) UpdateInstallment(invoiceID, instID uint, req dto.UpdateInstallmentRequest) (*dto.InstallmentResponse, error) {
	inst, err := s.installmentRepo.FindByID(instID)
	if err != nil || inst.InvoiceID != invoiceID {
		return nil, errors.New("Cicilan tidak ditemukan pada invoice ini")
	}

	dueDate, _ := utility.ParseDate( req.DueDate)
	inst.DueDate = dueDate
	inst.Amount = req.Amount
	inst.Notes = req.Notes

	if err := s.installmentRepo.Update(inst); err != nil {
		return nil, err
	}

	resp := mapInstallmentToResponse(*inst)
	return &resp, nil
}

func (s *invoiceService) DeleteInstallment(invoiceID, instID uint) error {
	inst, err := s.installmentRepo.FindByID(instID)
	if err != nil || inst.InvoiceID != invoiceID {
		return errors.New("Cicilan tidak ditemukan pada invoice ini")
	}

	return s.installmentRepo.Delete(instID)
}

func (s *invoiceService) RecalculateTotalAmount(invoiceID uint, tx *gorm.DB) error {
	repo := s.itemRepo
	if tx != nil {
		repo = s.itemRepo.WithTx(tx)
	}

	items, err := repo.FindByInvoiceID(invoiceID)
	if err != nil {
		return err
	}

	total := float64(0)
	paid := float64(0)
	for _, item := range items {
		total += item.Amount
		paid += item.PaidAmount
	}

	status := utility.CalculateInvoiceStatus(total, paid)
	invoiceRepo := s.invoiceRepo
	if tx != nil {
		invoiceRepo = s.invoiceRepo.WithTx(tx)
	}

	if err := invoiceRepo.UpdateTotalAmount(invoiceID, total); err != nil {
		return err
	}
	return invoiceRepo.UpdateStatus(invoiceID, status, paid)
}

func (s *invoiceService) UpdateInvoiceStatus(invoiceID uint, tx *gorm.DB) error {
	return s.RecalculateTotalAmount(invoiceID, tx)
}

// Mappers

func mapStudentBrief(s model.Student) dto.StudentBriefResponse {
	brief := dto.StudentBriefResponse{
		ID:       s.ID,
		FullName: s.FullName,
		Gender:   s.Gender,
		Status:   s.Status,
	}
	for _, enr := range s.Enrollments {
		if enr.Status == "active" {
			brief.ActiveEnrollment = &dto.EnrollmentBriefForStudent{
				ClassGroupID: enr.ClassGroupID,
				ClassGroup: dto.ClassGroupBriefResponse{
					ID:    enr.ClassGroup.ID,
					Name:  enr.ClassGroup.Name,
					Level: enr.ClassGroup.Level,
				},
			}
			break
		}
	}
	return brief
}

func mapInvoiceToListResponse(inv model.Invoice) dto.InvoiceListResponse {
	resp := dto.InvoiceListResponse{
		ID:      inv.ID,
		Student: mapStudentBrief(inv.Student),
		AcademicYear: dto.AcademicYearBriefResponse{
			ID:   inv.AcademicYear.ID,
			Name: inv.AcademicYear.Name,
		},
		Type:        inv.Type,
		Month:       inv.Month,
		Year:        inv.Year,
		Status:      inv.Status,
		TotalAmount: inv.TotalAmount,
		PaidAmount:  inv.PaidAmount,
		CreatedAt:   inv.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}
	if inv.DueDate != nil {
		formatted := inv.DueDate.Format("2006-01-02")
		resp.DueDate = &formatted
	}
	return resp
}

func mapInvoiceToDetailResponse(inv model.Invoice) dto.InvoiceDetailResponse {
	resp := dto.InvoiceDetailResponse{
		ID:      inv.ID,
		Student: mapStudentBrief(inv.Student),
		AcademicYear: dto.AcademicYearBriefResponse{
			ID:   inv.AcademicYear.ID,
			Name: inv.AcademicYear.Name,
		},
		Type:        inv.Type,
		Month:       inv.Month,
		Year:        inv.Year,
		Status:      inv.Status,
		TotalAmount: inv.TotalAmount,
		PaidAmount:  inv.PaidAmount,
		CreatedAt:   inv.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}
	if inv.DueDate != nil {
		formatted := inv.DueDate.Format("2006-01-02")
		resp.DueDate = &formatted
	}
	if inv.Notes != "" {
		resp.Notes = &inv.Notes
	}

	var items []dto.InvoiceItemResponse
	for _, item := range inv.Items {
		items = append(items, mapInvoiceItemToResponse(item))
	}
	resp.Items = items

	var installments []dto.InstallmentResponse
	for _, inst := range inv.Installments {
		installments = append(installments, mapInstallmentToResponse(inst))
	}
	resp.Installments = installments

	return resp
}

func mapInvoiceItemToResponse(item model.InvoiceItem) dto.InvoiceItemResponse {
	return dto.InvoiceItemResponse{
		ID:          item.ID,
		Name:        item.Name,
		Category:    item.Category,
		Amount:      item.Amount,
		PaidAmount:  item.PaidAmount,
		Status:      item.Status,
		IsMandatory: item.IsMandatory,
	}
}

func mapInstallmentToResponse(inst model.InvoiceInstallment) dto.InstallmentResponse {
	resp := dto.InstallmentResponse{
		ID:                inst.ID,
		InstallmentNumber: inst.InstallmentNumber,
		DueDate:           inst.DueDate.Format("2006-01-02"),
		Amount:            inst.Amount,
	}
	if inst.Notes != "" {
		resp.Notes = &inst.Notes
	}
	return resp
}
