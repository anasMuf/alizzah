package dto

// StudentDeleteItem — satu kategori data terhubung yang akan ikut terhapus.
type StudentDeleteItem struct {
	Key    string  `json:"key"`
	Label  string  `json:"label"`
	Count  int64   `json:"count"`
	Amount float64 `json:"amount,omitempty"`
	Note   string  `json:"note,omitempty"`
}

// StudentDeleteFinancial — ringkasan dampak finansial penghapusan siswa.
type StudentDeleteFinancial struct {
	TotalPayments     float64 `json:"total_payments"`
	TotalInvoices     float64 `json:"total_invoices"`
	PaidInvoices      float64 `json:"paid_invoices"`
	Outstanding       float64 `json:"outstanding"`
	SavingsBalance    float64 `json:"savings_balance"`
	KoperasiSales     float64 `json:"koperasi_sales"`
	CashTransactions  int64   `json:"cash_transactions"`
	VaultTransactions int64   `json:"vault_transactions"`
	RelatedExpenses   int64   `json:"related_expenses"`
}

// StudentDeletePreviewResponse — pratinjau data terhubung sebelum siswa dihapus.
// RequiresForce true berarti ada data finansial: hapus wajib memakai force=true
// dan nama siswa harus diketik ulang untuk konfirmasi.
type StudentDeletePreviewResponse struct {
	StudentID     uint                   `json:"student_id"`
	FullName      string                 `json:"full_name"`
	Status        string                 `json:"status"`
	Items         []StudentDeleteItem    `json:"items"`
	Financial     StudentDeleteFinancial `json:"financial"`
	RequiresForce bool                   `json:"requires_force"`
}
