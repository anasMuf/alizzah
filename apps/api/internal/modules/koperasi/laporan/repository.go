package laporan

import (
	"time"

	"gorm.io/gorm"
)

// Repository melakukan agregasi lintas-tabel koperasi (read-only). Karena laporan
// memang menyilang banyak entitas, query langsung ke tabel di sini dianggap wajar.
type Repository interface {
	MonthlyByCategory(ayID uint, start, end time.Time) ([]CategoryLine, error)
	ProfitLossData(ayID uint, start, end time.Time) (revenue, hpp, opex float64, err error)
	Receivables(ayID uint) ([]outRow, error)
	Payables(ayID uint) ([]outRow, error)
	Stock() ([]stockRow, error)
}

type outRow struct {
	ID     uint
	Party  string
	Date   time.Time
	Total  float64
	Paid   float64
	Status string
}

type stockRow struct {
	ProductID uint
	Name      string
	Stock     int
	CostPrice float64
	SalePrice float64
}

type repo struct{ db *gorm.DB }

func NewRepository(db *gorm.DB) Repository { return &repo{db: db} }

func (r *repo) MonthlyByCategory(ayID uint, start, end time.Time) ([]CategoryLine, error) {
	var lines []CategoryLine
	q := r.db.Table("koperasi_cash_transactions").
		Select("category, COALESCE(SUM(CASE WHEN transaction_type='credit' THEN amount ELSE 0 END),0) as credit, COALESCE(SUM(CASE WHEN transaction_type='debit' THEN amount ELSE 0 END),0) as debit").
		Where("transaction_date BETWEEN ? AND ?", start, end)
	if ayID != 0 {
		q = q.Where("academic_year_id = ?", ayID)
	}
	err := q.Group("category").Order("category ASC").Scan(&lines).Error
	return lines, err
}

func (r *repo) ProfitLossData(ayID uint, start, end time.Time) (float64, float64, float64, error) {
	var sales struct {
		Revenue float64
		Hpp     float64
	}
	sq := r.db.Table("koperasi_sale_items si").
		Select("COALESCE(SUM(si.subtotal),0) as revenue, COALESCE(SUM(si.unit_cost * si.quantity),0) as hpp").
		Joins("JOIN koperasi_sales s ON s.id = si.sale_id").
		Where("s.deleted_at IS NULL AND s.sale_date BETWEEN ? AND ?", start, end)
	if ayID != 0 {
		sq = sq.Where("s.academic_year_id = ?", ayID)
	}
	if err := sq.Scan(&sales).Error; err != nil {
		return 0, 0, 0, err
	}

	var opex float64
	eq := r.db.Table("koperasi_misc_transactions").
		Select("COALESCE(SUM(amount),0)").
		Where("deleted_at IS NULL AND flow = 'expense' AND transaction_date BETWEEN ? AND ?", start, end)
	if ayID != 0 {
		eq = eq.Where("academic_year_id = ?", ayID)
	}
	if err := eq.Scan(&opex).Error; err != nil {
		return 0, 0, 0, err
	}
	return sales.Revenue, sales.Hpp, opex, nil
}

func (r *repo) Receivables(ayID uint) ([]outRow, error) {
	var rows []outRow
	q := r.db.Table("koperasi_sales s").
		Select("s.id as id, COALESCE(NULLIF(s.buyer_name,''), st.full_name, 'Umum') as party, s.sale_date as date, s.total_amount as total, s.paid_amount as paid, s.status as status").
		Joins("LEFT JOIN students st ON st.id = s.student_id").
		Where("s.deleted_at IS NULL AND s.status <> 'paid'")
	if ayID != 0 {
		q = q.Where("s.academic_year_id = ?", ayID)
	}
	err := q.Order("s.sale_date ASC").Scan(&rows).Error
	return rows, err
}

func (r *repo) Payables(ayID uint) ([]outRow, error) {
	var rows []outRow
	q := r.db.Table("koperasi_purchases p").
		Select("p.id as id, sup.name as party, p.purchase_date as date, p.total_amount as total, p.paid_amount as paid, p.status as status").
		Joins("JOIN koperasi_suppliers sup ON sup.id = p.supplier_id").
		Where("p.deleted_at IS NULL AND p.status <> 'paid'")
	if ayID != 0 {
		q = q.Where("p.academic_year_id = ?", ayID)
	}
	err := q.Order("p.purchase_date ASC").Scan(&rows).Error
	return rows, err
}

func (r *repo) Stock() ([]stockRow, error) {
	var rows []stockRow
	err := r.db.Table("koperasi_products").
		Select("id as product_id, name, stock, cost_price, sale_price").
		Where("deleted_at IS NULL").
		Order("name ASC").Scan(&rows).Error
	return rows, err
}
