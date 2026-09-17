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
