package laporan

// Laporan bulanan: arus kas dikelompokkan per kategori.
type CategoryLine struct {
	Category string  `json:"category"`
	Credit   float64 `json:"credit"`
	Debit    float64 `json:"debit"`
	Net      float64 `json:"net"`
}

type MonthlyReport struct {
	Month       int            `json:"month"`
	Year        int            `json:"year"`
	Categories  []CategoryLine `json:"categories"`
	TotalCredit float64        `json:"total_credit"`
	TotalDebit  float64        `json:"total_debit"`
	Net         float64        `json:"net"`
}

// Laba-rugi (akrual berbasis penjualan).
type ProfitLoss struct {
	StartDate        string  `json:"start_date,omitempty"`
	EndDate          string  `json:"end_date,omitempty"`
	Revenue          float64 `json:"revenue"`
	CostOfGoods      float64 `json:"cost_of_goods"`
	GrossProfit      float64 `json:"gross_profit"`
	OperatingExpense float64 `json:"operating_expense"`
	NetProfit        float64 `json:"net_profit"`
}

// Piutang (penjualan) / Hutang (pembelian) yang belum lunas.
type OutstandingItem struct {
	ID        uint    `json:"id"`
	Party     string  `json:"party"`
	Date      string  `json:"date"`
	Total     float64 `json:"total_amount"`
	Paid      float64 `json:"paid_amount"`
	Remaining float64 `json:"remaining"`
	Status    string  `json:"status"`
}

type OutstandingReport struct {
	Items          []OutstandingItem `json:"items"`
	TotalRemaining float64           `json:"total_remaining"`
}

// Stok & nilai persediaan — satu baris per varian barang (B1).
type StockItem struct {
	ProductID   uint    `json:"product_id"`
	Name        string  `json:"name"`
	VariantID   uint    `json:"variant_id"`
	VariantName string  `json:"variant_name,omitempty"`
	Stock       int     `json:"stock"`
	CostPrice   float64 `json:"cost_price"`
	SalePrice   float64 `json:"sale_price"`
	StockValue  float64 `json:"stock_value"`
}

type StockReport struct {
	Items           []StockItem `json:"items"`
	TotalStockValue float64     `json:"total_stock_value"`
}
