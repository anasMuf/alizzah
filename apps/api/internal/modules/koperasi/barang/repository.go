package barang

import (
	"errors"

	"gorm.io/gorm"
)

type Repository interface {
	FindAll(search string, activeOnly bool) ([]Product, error)
	FindByID(id uint) (*Product, error)
	Create(p *Product) error
	Update(p *Product) error
	Delete(id uint) error

	CreateVariant(v *Variant) error
	UpdateVariant(v *Variant) error
	FindVariantByID(id uint) (*Variant, error)

	// Dipakai fitur transaksi (penjualan/pembelian) di dalam satu transaksi DB.
	FindByIDWithTx(tx *gorm.DB, id uint) (*Product, error)
	FindVariantByIDWithTx(tx *gorm.DB, id uint) (*Variant, error)
	DefaultVariantWithTx(tx *gorm.DB, productID uint) (*Variant, error)
	AdjustVariantStockWithTx(tx *gorm.DB, variantID uint, delta int) error
}

type repository struct{ db *gorm.DB }

func NewRepository(db *gorm.DB) Repository { return &repository{db: db} }

func (r *repository) FindAll(search string, activeOnly bool) ([]Product, error) {
	var products []Product
	q := r.db.Preload("Variants", orderVariants).Order("name ASC")
	if search != "" {
		q = q.Where("name ILIKE ?", "%"+search+"%")
	}
	if activeOnly {
		q = q.Where("is_active = ?", true)
	}
	err := q.Find(&products).Error
	return products, err
}

func (r *repository) FindByID(id uint) (*Product, error) {
	var p Product
	err := r.db.Preload("Variants", orderVariants).First(&p, id).Error
	return &p, err
}

func orderVariants(db *gorm.DB) *gorm.DB { return db.Order("id ASC") }

func (r *repository) Create(p *Product) error { return r.db.Create(p).Error }

// Update menyimpan kolom barang saja; varian dikelola eksplisit oleh service.
func (r *repository) Update(p *Product) error { return r.db.Omit("Variants").Save(p).Error }

func (r *repository) Delete(id uint) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("product_id = ?", id).Delete(&Variant{}).Error; err != nil {
			return err
		}
		return tx.Delete(&Product{}, id).Error
	})
}

func (r *repository) CreateVariant(v *Variant) error { return r.db.Create(v).Error }

func (r *repository) UpdateVariant(v *Variant) error { return r.db.Save(v).Error }

func (r *repository) FindVariantByID(id uint) (*Variant, error) {
	var v Variant
	err := r.db.First(&v, id).Error
	return &v, err
}

func (r *repository) FindByIDWithTx(tx *gorm.DB, id uint) (*Product, error) {
	var p Product
	err := tx.First(&p, id).Error
	return &p, err
}

func (r *repository) FindVariantByIDWithTx(tx *gorm.DB, id uint) (*Variant, error) {
	var v Variant
	err := tx.First(&v, id).Error
	return &v, err
}

// DefaultVariantWithTx mengembalikan varian acuan suatu barang: varian bernama
// "Default" bila ada, kalau tidak varian dengan id terkecil. Dipakai saat transaksi
// hanya mengirim product_id (kompatibilitas dengan picker lama).
func (r *repository) DefaultVariantWithTx(tx *gorm.DB, productID uint) (*Variant, error) {
	var v Variant
	err := tx.Where("product_id = ?", productID).
		Order("(name = '" + DefaultVariantName + "') DESC").
		Order("id ASC").
		First(&v).Error
	return &v, err
}

func (r *repository) AdjustVariantStockWithTx(tx *gorm.DB, variantID uint, delta int) error {
	query := tx.Model(&Variant{}).Where("id = ?", variantID)
	if delta < 0 {
		// Guard optimistik: klaim stok hanya jika mencukupi. Mencegah stok
		// negatif saat ada penjualan bersamaan (race check-then-update).
		query = query.Where("stock >= ?", -delta)
	}
	result := query.UpdateColumn("stock", gorm.Expr("stock + ?", delta))
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return errors.New("stok varian tidak mencukupi atau varian tidak ditemukan")
	}
	return nil
}
