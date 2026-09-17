/**
 * Satu sumber kebenaran untuk label jenis tagihan.
 *
 * Sebelumnya peta ini terduplikasi di 3 `translateType` + 2 ternary inline, dan
 * salinan yang tidak punya pemetaan `arrears`/`manual` menampilkan nilai mentah
 * (`arrears`, `monthly`, dst.) — itu yang membuat keterangan tidak terbaca.
 */
const INVOICE_TYPE_LABELS: Record<string, string> = {
	monthly: "Bulanan",
	registration: "Registrasi Tahunan",
	initial: "Biaya Awal",
	daycare_initial: "Biaya Awal Daycare",
	graduation: "Wisuda",
	incidental: "Insidental",
	arrears: "Tunggakan",
	manual: "Manual",
};

/**
 * Label jenis tagihan yang dapat dibaca manusia.
 * Jenis yang tidak dikenal dikembalikan apa adanya agar tidak menyembunyikan data.
 */
export function invoiceTypeLabel(type?: string): string {
	if (!type) return "-";
	return INVOICE_TYPE_LABELS[type] ?? type;
}

/**
 * Label kategori pos tagihan (`invoice_items.category`).
 *
 * Backend sudah mengirim nama pos yang siap tampil pada Posisi Kas & Saldo
 * (`post.name`), tetapi sebagian permukaan menerima kategori mentah — mis.
 * `by_category` laporan harian dan ringkasan `/keuangan`. Tanpa pemetaan ini,
 * tunggakan tampil sebagai kode mentah `arrears`.
 *
 * Redaksi sengaja disamakan dengan `invoiceCategoryLabels` di
 * `apps/api/service/report_service.go` agar satu kategori tidak punya dua nama.
 */
const INVOICE_CATEGORY_LABELS: Record<string, string> = {
	monthly_spp: "SPP",
	monthly_infaq: "Infaq Harian",
	arrears: "Tunggakan",
	initial: "Biaya Awal Masuk",
	registration: "Biaya Registrasi",
	pasta: "PASTA",
	calisan: "Calisan",
	ekskul: "Ekskul",
	savings_mandatory: "Tabungan Wajib",
	daycare: "Daycare (SPD)",
	daycare_meal: "Konsumsi Daycare",
	graduation: "Wisuda",
	facility: "Fasilitas",
	lainnya: "Lain-lain",
	savings_voluntary: "Tabungan Umum",
};

/**
 * Label kategori pos yang dapat dibaca manusia.
 * Kategori tak dikenal dikembalikan apa adanya agar data tidak disembunyikan.
 */
export function invoiceCategoryLabel(category?: string): string {
	if (!category) return "-";
	return INVOICE_CATEGORY_LABELS[category] ?? category;
}

/** Periode tagihan: "Bulanan 8/2026" untuk bulanan, selain itu label jenisnya. */
export function invoicePeriodOrTypeLabel(invoice: {
	type?: string;
	month?: number | null;
	year?: number | null;
}): string {
	if (invoice.type === "monthly" && invoice.month && invoice.year) {
		return `Bulanan ${invoice.month}/${invoice.year}`;
	}
	return invoiceTypeLabel(invoice.type);
}
