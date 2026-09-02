package dto

// ExtracurricularCleanupPreviewItem — satu item invoice yang AKAN diproses oleh
// aksi "Bersihkan tagihan PASTA" (dry-run; tidak ada penulisan DB).
// Action "remove" = item unpaid dihapus; "writeoff" = sisa item partial
// dibebaskan (item dipertahankan dengan nominal = yang sudah dibayar).
type ExtracurricularCleanupPreviewItem struct {
	InvoiceID uint    `json:"invoice_id"`
	Month     uint    `json:"month"`
	Year      uint    `json:"year"`
	ItemID    uint    `json:"item_id"`
	ItemName  string  `json:"item_name"`
	Action    string  `json:"action"` // "remove" | "writeoff"
	Amount    float64 `json:"amount"` // nilai yang dihapus / sisa yang dibebaskan
}

// ExtracurricularCleanupPreviewResponse — ringkasan rencana pembersihan tagihan
// PASTA: item unpaid yang akan dihapus dari invoice bulanan siswa. Dipakai UI
// untuk memverifikasi aksi sebelum dieksekusi (lihat CleanupExtracurricularInvoices).
type ExtracurricularCleanupPreviewResponse struct {
	StudentID           uint                                `json:"student_id"`
	ExtracurricularID   uint                                `json:"extracurricular_id"`
	ExtracurricularName string                              `json:"extracurricular_name"`
	StartDate           string                              `json:"start_date"`
	TotalItems          int                                 `json:"total_items"`
	TotalAmount         float64                             `json:"total_amount"`
	Items               []ExtracurricularCleanupPreviewItem `json:"items"`
}
