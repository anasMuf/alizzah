package service

import (
	"api/dto"
	"api/model"
	"api/repository"
	"api/utility"
	"errors"
	"fmt"
	"regexp"
	"strconv"
	"strings"
	"time"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type InvoiceService interface {
	GetAll(params dto.InvoiceQueryParams) ([]dto.InvoiceListResponse, *dto.Meta, error)
	GetByID(id uint) (*dto.InvoiceDetailResponse, error)
	GetBatch(ids []uint) ([]dto.InvoiceDetailResponse, error)
	GetByStudentID(studentID uint, invoiceType, status string, academicYearID uint, showAll bool) ([]dto.InvoiceListResponse, error)
	// CreateManual membuat tagihan manual / tunggakan historis (total dihitung server).
	CreateManual(req dto.CreateInvoiceRequest) (*dto.InvoiceDetailResponse, error)
	// Delete menghapus (soft) tagihan manual — hanya type arrears/manual yang belum ada pembayaran.
	Delete(id uint) error
	// Update mengubah metadata invoice (notes & due_date saja).
	Update(id uint, req dto.UpdateInvoiceRequest) (*dto.InvoiceDetailResponse, error)
	// Item management
	AddItem(invoiceID uint, req dto.AddInvoiceItemRequest) (*dto.InvoiceItemResponse, error)
	UpdateItem(invoiceID, itemID uint, req dto.UpdateInvoiceItemRequest) (*dto.InvoiceItemResponse, error)
	UpdateItemQuantity(invoiceID, itemID uint, req dto.UpdateInvoiceItemQuantityRequest) (*dto.InvoiceItemResponse, error)
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
	db              *gorm.DB
	invoiceRepo     repository.InvoiceRepository
	studentRepo     repository.StudentRepository
	ayRepo          repository.AcademicYearRepository
	itemRepo        repository.InvoiceItemRepository
	feeItemRepo     repository.FeeConfigItemRepository
	installmentRepo repository.InvoiceInstallmentRepository
	paymentRepo     repository.PaymentRepository
	exclSvc         BillingExclusionService
}

func NewInvoiceService(
	db *gorm.DB,
	invoiceRepo repository.InvoiceRepository,
	studentRepo repository.StudentRepository,
	ayRepo repository.AcademicYearRepository,
	itemRepo repository.InvoiceItemRepository,
	feeItemRepo repository.FeeConfigItemRepository,
	installmentRepo repository.InvoiceInstallmentRepository,
	paymentRepo repository.PaymentRepository,
	exclSvc BillingExclusionService,
) InvoiceService {
	return &invoiceService{
		db:              db,
		invoiceRepo:     invoiceRepo,
		studentRepo:     studentRepo,
		ayRepo:          ayRepo,
		itemRepo:        itemRepo,
		feeItemRepo:     feeItemRepo,
		installmentRepo: installmentRepo,
		paymentRepo:     paymentRepo,
		exclSvc:         exclSvc,
	}
}

func (s *invoiceService) GetAll(params dto.InvoiceQueryParams) ([]dto.InvoiceListResponse, *dto.Meta, error) {
	invoices, total, outstanding, err := s.invoiceRepo.FindAll(params)
	if err != nil {
		return nil, nil, err
	}

	var responses []dto.InvoiceListResponse
	for _, inv := range invoices {
		responses = append(responses, mapInvoiceToListResponse(inv))
	}

	page, limit := utility.NormalizePagination(params.Page, params.Limit)

	meta := &dto.Meta{
		Page:             page,
		Limit:            limit,
		Total:            total,
		TotalOutstanding: &outstanding,
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

	// Attach payment history for this invoice
	if s.paymentRepo != nil {
		payments, _ := s.paymentRepo.FindByInvoiceID(id)
		for _, p := range payments {
			// Sum the payment items that belong to this invoice
			paidForInvoice := float64(0)
			for _, pi := range p.Items {
				for _, ii := range invoice.Items {
					if pi.InvoiceItemID == ii.ID {
						paidForInvoice += pi.Amount
					}
				}
			}
			resp.Payments = append(resp.Payments, dto.InvoicePaymentBrief{
				ID:          p.ID,
				PaymentDate: p.PaymentDate.Format("2006-01-02"),
				Amount:      paidForInvoice,
				Source:      p.Source,
				CreatedBy:   dto.UserBriefResponse{ID: p.Creator.ID, FullName: p.Creator.FullName},
			})
		}
	}

	return &resp, nil
}

func (s *invoiceService) GetByStudentID(studentID uint, invoiceType, status string, academicYearID uint, showAll bool) ([]dto.InvoiceListResponse, error) {
	invoices, err := s.invoiceRepo.FindByStudentID(studentID, invoiceType, status, academicYearID, showAll)
	if err != nil {
		return nil, err
	}

	var responses []dto.InvoiceListResponse
	for _, inv := range invoices {
		responses = append(responses, mapInvoiceToListResponse(inv))
	}
	return responses, nil
}

func (s *invoiceService) GetBatch(ids []uint) ([]dto.InvoiceDetailResponse, error) {
	if len(ids) == 0 {
		return nil, nil
	}
	invoices, err := s.invoiceRepo.FindByIDs(ids)
	if err != nil {
		return nil, err
	}
	responses := make([]dto.InvoiceDetailResponse, len(invoices))
	for i, inv := range invoices {
		responses[i] = mapInvoiceToDetailResponse(inv)
	}
	return responses, nil
}

func (s *invoiceService) CreateManual(req dto.CreateInvoiceRequest) (*dto.InvoiceDetailResponse, error) {
	if req.Type != "arrears" && req.Type != "manual" {
		return nil, utility.NewUnprocessableError("Jenis tagihan manual tidak valid")
	}
	if len(req.Items) == 0 {
		return nil, utility.NewUnprocessableError("Tagihan harus memiliki minimal 1 item")
	}

	// Tunggakan historis dicatat sebagai nominal total: tepat 1 item + keterangan wajib.
	if req.Type == "arrears" {
		if len(req.Items) != 1 {
			return nil, utility.NewUnprocessableError("Tagihan tunggakan harus berisi tepat 1 item")
		}
		if strings.TrimSpace(req.Notes) == "" {
			return nil, utility.NewUnprocessableError("Keterangan wajib diisi untuk tagihan tunggakan")
		}
	}

	if _, err := s.studentRepo.FindByID(req.StudentID); err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, utility.NewNotFoundError("Siswa tidak ditemukan")
		}
		return nil, err
	}
	ay, err := s.ayRepo.FindByID(req.AcademicYearID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, utility.NewNotFoundError("Tahun ajaran tidak ditemukan")
		}
		return nil, err
	}

	// Penegakan mode-vs-TA di server — pertahanan lapis kedua atas aturan yang
	// sudah ditegakkan di UI (lihat docs/epics/task-9-validasi-mode-tahun-ajaran.md).
	// Item tarif hanya dihitung untuk mode rinci; mode total tidak membutuhkannya.
	var activeTariffItemCount int64
	if req.Type == "manual" {
		activeTariffItemCount, err = s.feeItemRepo.CountActiveItemsByAcademicYear(req.AcademicYearID)
		if err != nil {
			return nil, err
		}
	}
	if reason := invoiceModeViolation(req.Type, ay.IsActive, activeTariffItemCount); reason != "" {
		return nil, utility.NewUnprocessableError(reason)
	}

	var dueDate *time.Time
	if strings.TrimSpace(req.DueDate) != "" {
		parsed, err := utility.ParseDate(req.DueDate)
		if err != nil {
			return nil, utility.NewUnprocessableError("Format jatuh tempo tidak valid (YYYY-MM-DD)")
		}
		dueDate = &parsed
	}

	items := make([]model.InvoiceItem, 0, len(req.Items))
	for _, it := range req.Items {
		name := strings.TrimSpace(it.Name)
		if name == "" {
			return nil, utility.NewUnprocessableError("Nama item wajib diisi")
		}
		if it.Amount <= 0 {
			return nil, utility.NewUnprocessableError(fmt.Sprintf("Nominal item '%s' harus lebih dari 0", name))
		}

		category := strings.TrimSpace(it.Category)
		if req.Type == "arrears" {
			category = "arrears"
		}

		items = append(items, model.InvoiceItem{
			Name:        name,
			Category:    category,
			Amount:      it.Amount,
			PaidAmount:  0,
			Status:      "unpaid",
			IsMandatory: false,
			Quantity:    it.Quantity,
			UnitPrice:   it.UnitPrice,
			Notes:       it.Notes,
		})
	}

	invoice := &model.Invoice{
		StudentID:      req.StudentID,
		AcademicYearID: req.AcademicYearID,
		Type:           req.Type,
		Status:         "unpaid",
		TotalAmount:    utility.SumInvoiceItems(items),
		PaidAmount:     0,
		DueDate:        dueDate,
		Notes:          strings.TrimSpace(req.Notes),
	}

	err = s.db.Transaction(func(tx *gorm.DB) error {
		if err := s.invoiceRepo.WithTx(tx).Create(invoice); err != nil {
			return err
		}
		for i := range items {
			items[i].InvoiceID = invoice.ID
		}
		// Item manual tidak mandatory agar admin dapat mengoreksi/menghapusnya
		// selama belum lunas.
		return s.itemRepo.WithTx(tx).BulkCreateNonMandatoryItems(items)
	})
	if err != nil {
		return nil, err
	}

	saved, err := s.invoiceRepo.FindByID(invoice.ID)
	if err != nil {
		return nil, err
	}
	resp := mapInvoiceToDetailResponse(*saved)
	return &resp, nil
}

func (s *invoiceService) Delete(id uint) error {
	return s.db.Transaction(func(tx *gorm.DB) error {
		// Kunci baris invoice lebih dulu, lalu validasi ULANG di dalam transaksi.
		// Sebelumnya validasi berjalan di luar transaksi tanpa kunci apa pun,
		// sehingga pembayaran yang masuk di sela validasi dan penghapusan bisa
		// membuat payment_item yatim: kas tercatat, tagihannya hilang.
		// Pembayaran mengunci baris invoice yang sama (lihat paymentService.createInTx),
		// jadi kedua jalur terserialisasi pada kunci yang sama.
		if err := lockInvoiceRow(tx, id); err != nil {
			return err
		}

		invoice, err := s.invoiceRepo.WithTx(tx).FindByID(id)
		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return utility.NewNotFoundError("Invoice tidak ditemukan")
			}
			return err
		}

		// Invoice hasil generate dikelola lewat RegenerateForStudent, bukan lewat endpoint ini.
		if invoice.Type != "arrears" && invoice.Type != "manual" {
			return utility.NewConflictError("Tagihan hasil generate tidak dapat dihapus. Gunakan regenerate tagihan siswa.")
		}

		if invoice.PaidAmount != 0 {
			return utility.NewConflictError("Tagihan yang sudah memiliki pembayaran tidak dapat dihapus. Hapus pembayarannya terlebih dahulu.")
		}

		// Belt-and-braces: pastikan tidak ada payment_item yang menunjuk item invoice ini,
		// walau paid_amount sudah 0 (mis. data tidak konsisten).
		payments, err := s.paymentRepo.WithTx(tx).FindByInvoiceID(id)
		if err != nil {
			return err
		}
		if len(payments) > 0 {
			return utility.NewConflictError("Tagihan yang sudah memiliki pembayaran tidak dapat dihapus. Hapus pembayarannya terlebih dahulu.")
		}

		// Item ikut di-soft-delete: payment_service mencari item hanya by ID tanpa
		// memeriksa invoice induknya, sehingga item yatim masih berpotensi dibayar.
		if err := s.itemRepo.WithTx(tx).DeleteByInvoiceID(id); err != nil {
			return err
		}
		return s.invoiceRepo.WithTx(tx).Delete(id)
	})
}

// lockInvoiceRow mengambil row-level lock (SELECT ... FOR UPDATE) pada satu invoice.
// No-op bila barisnya tidak ada — pemanggil tetap memvalidasi lewat query biasa
// sehingga pesan 404 tidak berubah.
//
// Dipakai berpasangan dengan penguncian yang sama di paymentService.createInTx:
// kedua jalur harus mengunci tabel `invoices` dengan urutan id menaik agar tidak
// terjadi deadlock sekaligus menutup balapan hapus-vs-bayar.
func lockInvoiceRow(tx *gorm.DB, id uint) error {
	var locked []uint
	return tx.Model(&model.Invoice{}).
		Clauses(clause.Locking{Strength: "UPDATE"}).
		Where("id = ?", id).
		Pluck("id", &locked).Error
}

func (s *invoiceService) Update(id uint, req dto.UpdateInvoiceRequest) (*dto.InvoiceDetailResponse, error) {
	invoice, err := s.invoiceRepo.FindByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, utility.NewNotFoundError("Invoice tidak ditemukan")
		}
		return nil, err
	}

	notes := strings.TrimSpace(req.Notes)
	// Keterangan adalah jejak asal tunggakan (R.3) — jangan sampai terhapus lewat edit.
	if invoice.Type == "arrears" && notes == "" {
		return nil, utility.NewUnprocessableError("Keterangan wajib diisi untuk tagihan tunggakan")
	}

	var dueDate *time.Time
	if strings.TrimSpace(req.DueDate) != "" {
		parsed, err := utility.ParseDate(req.DueDate)
		if err != nil {
			return nil, utility.NewUnprocessableError("Format jatuh tempo tidak valid (YYYY-MM-DD)")
		}
		dueDate = &parsed
	}

	if err := s.invoiceRepo.UpdateNotesAndDueDate(id, notes, dueDate); err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, utility.NewNotFoundError("Invoice tidak ditemukan")
		}
		return nil, err
	}

	saved, err := s.invoiceRepo.FindByID(id)
	if err != nil {
		return nil, err
	}
	resp := mapInvoiceToDetailResponse(*saved)
	return &resp, nil
}

func (s *invoiceService) AddItem(invoiceID uint, req dto.AddInvoiceItemRequest) (*dto.InvoiceItemResponse, error) {
	invoice, err := s.invoiceRepo.FindByID(invoiceID)
	if err != nil {
		return nil, errors.New("Invoice tidak ditemukan")
	}

	if invoice.Status == "paid" {
		return nil, errors.New("Tidak bisa menambahkan item ke invoice yang sudah lunas")
	}

	// Cek duplikat — item dengan nama & kategori sama tidak boleh dobel
	exists, err := s.itemRepo.ExistsByNameAndCategory(invoiceID, req.Name, req.Category)
	if err != nil {
		return nil, err
	}
	if exists {
		return nil, fmt.Errorf("Item '%s' sudah ada di invoice ini. Gunakan edit untuk mengubah nominal.", req.Name)
	}

	item := &model.InvoiceItem{
		InvoiceID:   invoiceID,
		Name:        req.Name,
		Category:    req.Category,
		Amount:      req.Amount,
		IsMandatory: false,
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
	item.KoperasiVariantID = req.KoperasiVariantID
	if err := s.itemRepo.Update(item); err != nil {
		return nil, err
	}

	if err := s.RecalculateTotalAmount(invoiceID, nil); err != nil {
		return nil, err
	}

	resp := mapInvoiceItemToResponse(*item)
	return &resp, nil
}

func (s *invoiceService) UpdateItemQuantity(invoiceID, itemID uint, req dto.UpdateInvoiceItemQuantityRequest) (*dto.InvoiceItemResponse, error) {
	item, err := s.itemRepo.FindByID(itemID)
	if err != nil || item.InvoiceID != invoiceID {
		return nil, errors.New("Item tidak ditemukan pada invoice ini")
	}
	if req.Quantity == nil {
		return nil, errors.New("Jumlah hari wajib diisi")
	}

	if item.UnitPrice == nil {
		return nil, errors.New("Item ini bukan item berbasis kuantitas (per hari/per Senin)")
	}

	// Quantity 0 untuk fasilitas berarti skip bulan, bukan item invoice Rp 0.
	// Delegasikan ke BillingExclusionService agar semua jalur generate/restore
	// tetap memakai satu sumber kebenaran.
	if *req.Quantity == 0 {
		if item.Category != "facility" {
			return nil, errors.New("Jumlah 0 hanya berlaku untuk item fasilitas")
		}
		if item.PaidAmount > 0 {
			return nil, errors.New("Item fasilitas bulan ini sudah ada pembayaran — jumlah hari tidak bisa diubah")
		}
		if s.exclSvc == nil {
			return nil, errors.New("Mekanisme skip tagihan fasilitas belum tersedia")
		}
		invoice, err := s.invoiceRepo.FindByID(invoiceID)
		if err != nil || invoice.Type != "monthly" || invoice.Month == nil || invoice.Year == nil {
			return nil, errors.New("Jumlah 0 hanya berlaku untuk item fasilitas pada invoice bulanan")
		}
		if item.FacilityID == nil {
			return nil, errors.New("Item fasilitas legacy tidak memiliki relasi fasilitas")
		}
		if err := s.exclSvc.SkipFacilityMonth(invoice.StudentID, *item.FacilityID, *invoice.Month, *invoice.Year); err != nil {
			return nil, err
		}

		// Item sudah dihapus oleh mekanisme skip. Response tetap dikembalikan
		// sebagai hasil operasi agar klien tidak perlu memperlakukan 0 sebagai
		// error; status "skipped" menjelaskan bahwa item tidak lagi ada di invoice.
		zero := uint(0)
		resp := mapInvoiceItemToResponse(*item)
		resp.Amount = 0
		resp.Quantity = &zero
		resp.Skipped = true
		return &resp, nil
	}

	if item.Status == "paid" {
		return nil, errors.New("Item sudah lunas, tidak bisa diubah")
	}

	newAmount := *item.UnitPrice * float64(*req.Quantity)

	// Jika sudah ada pembayaran parsial, amount baru tidak boleh kurang dari paid_amount
	if item.PaidAmount > 0 && newAmount < item.PaidAmount {
		return nil, errors.New("Nominal baru tidak boleh kurang dari jumlah yang sudah dibayar")
	}

	quantity := *req.Quantity
	item.Quantity = &quantity
	item.Amount = newAmount

	// Update nama item agar mencerminkan jumlah baru
	item.Name = updateItemNameQuantity(item.Name, item.Category, quantity)

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
		dueDate, err := utility.ParseDate(item.DueDate)
		if err != nil {
			return nil, fmt.Errorf("Format due_date tidak valid (YYYY-MM-DD) untuk cicilan ke-%d: %w", item.InstallmentNumber, err)
		}
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

	dueDate, err := utility.ParseDate(req.DueDate)
	if err != nil {
		return nil, fmt.Errorf("Format due_date tidak valid (YYYY-MM-DD): %w", err)
	}
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
	allPaid := true
	for _, item := range items {
		total += item.Amount
		paid += item.PaidAmount
		if item.Status != "paid" {
			allPaid = false
		}
	}

	// Invoice lunas hanya jika seluruh item lunas, bukan berdasarkan jumlah.
	// Dispensasi bernilai negatif bisa membuat total invoice lebih kecil dari
	// total pembayaran meski belum semua item dibayar.
	status := "unpaid"
	if paid > 0 {
		if allPaid {
			status = "paid"
		} else {
			status = "partial"
		}
	}
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
	resp := dto.InvoiceItemResponse{
		ID:                item.ID,
		Name:              item.Name,
		Category:          item.Category,
		Amount:            item.Amount,
		PaidAmount:        item.PaidAmount,
		Status:            item.Status,
		IsMandatory:       item.IsMandatory,
		Quantity:          item.Quantity,
		UnitPrice:         item.UnitPrice,
		IsKoperasi:        item.IsKoperasi,
		KoperasiProductID: item.KoperasiProductID,
		KoperasiVariantID: item.KoperasiVariantID,
		FacilityID:        item.FacilityID,
	}
	return resp
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

// updateItemNameQuantity updates the quantity part in item names like "Infaq Harian (22 hari)" or "Tab. Wajib (4 Senin)"
func updateItemNameQuantity(name, category string, newQuantity uint) string {
	// Pattern: "Base Name (N hari)" or "Base Name (N Senin)"
	re := regexp.MustCompile(`^(.+?)\s*\(\d+\s+(hari|Senin)\)$`)
	matches := re.FindStringSubmatch(name)

	if len(matches) >= 3 {
		baseName := matches[1]
		unit := matches[2]
		return fmt.Sprintf("%s (%s %s)", baseName, strconv.FormatUint(uint64(newQuantity), 10), unit)
	}

	// Fallback: determine unit suffix from category
	switch category {
	case "monthly_infaq":
		return fmt.Sprintf("%s (%d hari)", name, newQuantity)
	case "savings_mandatory":
		return fmt.Sprintf("%s (%d Senin)", name, newQuantity)
	default:
		return name
	}
}
