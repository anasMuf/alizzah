package anggota

import "gorm.io/gorm"

type Repository interface {
	FindAll(search string, activeOnly bool) ([]Member, error)
	FindByID(id uint) (*Member, error)
	Create(m *Member) error
	BulkCreate(members []Member) error
	Update(m *Member) error
	Delete(id uint) error
	GetLoanSummary(memberID uint) (LoanSummary, error)
}

type repository struct{ db *gorm.DB }

func NewRepository(db *gorm.DB) Repository { return &repository{db: db} }

func (r *repository) FindAll(search string, activeOnly bool) ([]Member, error) {
	var members []Member
	q := r.db.Order("full_name ASC")
	if search != "" {
		q = q.Where("full_name ILIKE ?", "%"+search+"%")
	}
	if activeOnly {
		q = q.Where("is_active = ?", true)
	}
	if err := q.Find(&members).Error; err != nil {
		return nil, err
	}
	if err := r.attachEmployeeNames(members); err != nil {
		return nil, err
	}
	return members, nil
}

func (r *repository) FindByID(id uint) (*Member, error) {
	var m Member
	if err := r.db.First(&m, id).Error; err != nil {
		return nil, err
	}
	if m.EmployeeID != nil {
		names, err := r.employeeNameMap([]uint{*m.EmployeeID})
		if err != nil {
			return nil, err
		}
		m.EmployeeName = names[*m.EmployeeID]
	}
	return &m, nil
}

// attachEmployeeNames mengisi Member.EmployeeName dari `koperasi_employees`
// (view atas sdm_employees — sumber kanonik karyawan modul SDM).
func (r *repository) attachEmployeeNames(members []Member) error {
	ids := make([]uint, 0, len(members))
	for _, m := range members {
		if m.EmployeeID != nil {
			ids = append(ids, *m.EmployeeID)
		}
	}
	names, err := r.employeeNameMap(ids)
	if err != nil {
		return err
	}
	for i := range members {
		if members[i].EmployeeID != nil {
			members[i].EmployeeName = names[*members[i].EmployeeID]
		}
	}
	return nil
}

func (r *repository) employeeNameMap(ids []uint) (map[uint]string, error) {
	result := make(map[uint]string, len(ids))
	if len(ids) == 0 {
		return result, nil
	}
	var emps []Employee
	if err := r.db.Where("id IN ?", ids).Find(&emps).Error; err != nil {
		return nil, err
	}
	for _, e := range emps {
		result[e.ID] = e.FullName
	}
	return result, nil
}

func (r *repository) Create(m *Member) error { return r.db.Create(m).Error }

func (r *repository) BulkCreate(members []Member) error { return r.db.Create(&members).Error }

func (r *repository) Update(m *Member) error { return r.db.Save(m).Error }

func (r *repository) Delete(id uint) error { return r.db.Delete(&Member{}, id).Error }

func (r *repository) GetLoanSummary(memberID uint) (LoanSummary, error) {
	var summary LoanSummary
	// Aggregate from koperasi_loans where member_id = ? and status != 'paid'
	err := r.db.Table("koperasi_loans").
		Select("COUNT(*) as active_loan_count, COALESCE(SUM(principal), 0) as total_principal, COALESCE(SUM(paid_amount), 0) as total_paid").
		Where("member_id = ? AND status != 'paid' AND deleted_at IS NULL", memberID).
		Scan(&summary).Error

	if err == nil {
		summary.TotalRemaining = summary.TotalPrincipal - summary.TotalPaid
	}

	return summary, err
}
