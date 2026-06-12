package modal

import (
	"errors"
	"time"

	"api/internal/modules/koperasi/kas"
	"api/repository"
	"api/service"

	"gorm.io/gorm"
)

type Service interface {
	Create(req CreateRequest, createdBy uint) (*Response, error)
	List(academicYearID uint) ([]Response, error)
	Get(id uint) (*Response, error)
}

type svc struct {
	db             *gorm.DB
	repo           Repository
	schoolWriter   service.TransactionWriterService // menulis kas SEKOLAH (cash_transactions)
	koperasiWriter kas.Writer                       // menulis kas KOPERASI
	ayRepo         repository.AcademicYearRepository
}

func NewService(
	db *gorm.DB,
	repo Repository,
	schoolWriter service.TransactionWriterService,
	koperasiWriter kas.Writer,
	ayRepo repository.AcademicYearRepository,
) Service {
	return &svc{db: db, repo: repo, schoolWriter: schoolWriter, koperasiWriter: koperasiWriter, ayRepo: ayRepo}
}

// Create adalah seam lintas-modul (ADR koperasi D1): satu transaksi DB menulis
// debit kas sekolah + record modal + credit kas koperasi. Karena DB tunggal
// (ADR-002), seluruhnya atomik tanpa distributed transaction.
func (s *svc) Create(req CreateRequest, createdBy uint) (*Response, error) {
	if _, err := s.ayRepo.FindByID(req.AcademicYearID); err != nil {
		return nil, errors.New("Tahun ajaran tidak ditemukan")
	}
	date, err := time.Parse("2006-01-02", req.InjectionDate)
	if err != nil {
		return nil, errors.New("Format injection_date tidak valid (YYYY-MM-DD)")
	}

	var ci CapitalInjection
	err = s.db.Transaction(func(tx *gorm.DB) error {
		// 1. Catat record penyaluran modal (dapat ID untuk referensi kedua sisi)
		ci = CapitalInjection{
			AcademicYearID: req.AcademicYearID,
			InjectionDate:  date,
			Amount:         req.Amount,
			Notes:          req.Notes,
			CreatedBy:      createdBy,
		}
		if err := s.repo.CreateWithTx(&ci, tx); err != nil {
			return err
		}
		// 2. Debit kas SEKOLAH (uang keluar dari keuangan sekolah)
		if err := s.schoolWriter.WriteCashDebit(req.AcademicYearID, date, req.Amount, "koperasi_modal", &ci.ID, "Penyaluran modal koperasi", createdBy, tx); err != nil {
			return err
		}
		// 3. Credit kas KOPERASI (modal masuk)
		if _, err := s.koperasiWriter.WriteCredit(req.AcademicYearID, date, req.Amount, "capital_injection", &ci.ID, "modal", "Modal dari keuangan sekolah", createdBy, tx); err != nil {
			return err
		}
		return nil
	})
	if err != nil {
		return nil, err
	}

	saved, err := s.repo.FindByID(ci.ID)
	if err != nil {
		return nil, err
	}
	resp := toResponse(*saved)
	return &resp, nil
}

func (s *svc) List(academicYearID uint) ([]Response, error) {
	items, err := s.repo.FindAll(academicYearID)
	if err != nil {
		return nil, err
	}
	out := make([]Response, 0, len(items))
	for _, ci := range items {
		out = append(out, toResponse(ci))
	}
	return out, nil
}

func (s *svc) Get(id uint) (*Response, error) {
	ci, err := s.repo.FindByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("Penyaluran modal tidak ditemukan")
		}
		return nil, err
	}
	resp := toResponse(*ci)
	return &resp, nil
}
