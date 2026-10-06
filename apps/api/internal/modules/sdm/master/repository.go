package master

import (
	"errors"
	"strings"

	"gorm.io/gorm"
)

// Repository menyediakan operasi CRUD untuk seluruh master HR. Tabel master
// kecil dan seragam → satu struct + helper generik cukup (tanpa interface
// per-entity demi mengurangi boilerplate).
type Repository struct {
	db *gorm.DB
}

func NewRepository(db *gorm.DB) *Repository { return &Repository{db: db} }

// ── Helper generik (fungsi package-level — Go tidak izinkan type param di method) ──

func list[T any](r *Repository, dest *[]T, order string) error {
	return r.db.Order(order).Find(dest).Error
}

func find[T any](r *Repository, dest *T, id uint) error {
	err := r.db.First(dest, id).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return errors.New("data tidak ditemukan")
	}
	return err
}

func (r *Repository) create(m any) error { return r.db.Create(m).Error }

func (r *Repository) save(m any) error { return r.db.Save(m).Error }

func (r *Repository) delete(m any, id uint) error {
	return r.db.Delete(m, id).Error
}

func (r *Repository) firstOrCreate(dest any, cond ...any) error {
	return r.db.Where(cond[0], cond[1:]...).FirstOrCreate(dest).Error
}

// ── Query khusus ──

// FindGolonganByCode mengambil golongan dari kode (A–F).
func (r *Repository) FindGolonganByCode(kode string) (*Golongan, error) {
	var g Golongan
	if err := r.db.Where("kode = ?", kode).First(&g).Error; err != nil {
		return nil, err
	}
	return &g, nil
}

// FindAllGolongan mengembalikan golongan urut id (urutan kenaikan golongan).
func (r *Repository) FindAllGolongan() ([]Golongan, error) {
	var rows []Golongan
	err := r.db.Order("id ASC").Find(&rows).Error
	return rows, err
}

// GetKehadiran mengambil baris tarif kehadiran (diharapkan satu baris).
func (r *Repository) GetKehadiran() (*TarifKehadiran, error) {
	var row TarifKehadiran
	err := r.db.Order("id ASC").First(&row).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil // belum ada konfigurasi → default 0
	}
	if err != nil {
		return nil, err
	}
	return &row, nil
}

// SaveKehadiran meng-upsert baris tarif kehadiran (single-row config).
func (r *Repository) SaveKehadiran(row *TarifKehadiran) error {
	if row.ID == 0 {
		return r.db.Create(row).Error
	}
	return r.db.Save(row).Error
}

// GetAllKedisiplinanMap mengembalikan item kedisiplinan keyed by kode.
func (r *Repository) GetAllKedisiplinanMap() (map[string]Kedisiplinan, error) {
	var rows []Kedisiplinan
	if err := r.db.Find(&rows).Error; err != nil {
		return nil, err
	}
	m := make(map[string]Kedisiplinan, len(rows))
	for _, k := range rows {
		m[k.Kode] = k
	}
	return m, nil
}

// GetLainlainByNama mencari master lain-lain berdasarkan nama (case-insensitive).
func (r *Repository) GetLainlainByNama(nama string) (*Lainlain, error) {
	var row Lainlain
	err := r.db.Where("LOWER(nama) = ?", nama).First(&row).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &row, nil
}

// GetOrCreateLainlainForAttach mencari master lain-lain berdasarkan nama
// (case-insensitive); membuat bila belum ada. Dipakai saat melampirkan ke
// karyawan (pola on-the-fly aplikasi lama, kini dengan nama unik).
func (r *Repository) GetOrCreateLainlainForAttach(nama string) (*Lainlain, error) {
	nama = strings.ToLower(strings.TrimSpace(nama))
	if nama == "" {
		return nil, errors.New("Nama lain-lain wajib diisi")
	}
	existing, err := r.GetLainlainByNama(nama)
	if err != nil {
		return nil, err
	}
	if existing != nil {
		return existing, nil
	}
	row := &Lainlain{Nama: nama}
	if err := r.db.Create(row).Error; err != nil {
		if isDuplicateErr(err) {
			return r.GetLainlainByNama(nama)
		}
		return nil, err
	}
	return row, nil
}
