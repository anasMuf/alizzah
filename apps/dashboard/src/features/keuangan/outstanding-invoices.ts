import { invoiceTypeLabel } from "./invoice-labels";

/**
 * Logika murni untuk section "Tunggakan Tahun Ajaran Lain" — dipisahkan dari
 * komponen agar bisa diuji tanpa DOM.
 *
 * Tunggakan di sini berarti: tagihan yang belum lunas dan dimiliki tahun ajaran
 * SELAIN tahun ajaran yang sedang dipilih. Tagihan hasil generate pada tahun
 * ajaran lain ikut muncul (bukan hanya `type=arrears`) — apa pun yang belum
 * dibayar memang tunggakan.
 */
export interface OutstandingInvoiceLike {
	id?: number;
	status?: string;
	type?: string;
	total_amount?: number;
	paid_amount?: number;
	notes?: string | null;
	academic_year?: { id?: number; name?: string } | null;
}

/** Sisa tagihan; tidak pernah negatif (dispensasi bisa membuat total < dibayar). */
export function invoiceRemaining(invoice: OutstandingInvoiceLike): number {
	const total = Number(invoice.total_amount) || 0;
	const paid = Number(invoice.paid_amount) || 0;
	return Math.max(0, total - paid);
}

export function isInvoiceOutstanding(invoice: OutstandingInvoiceLike): boolean {
	return invoice.status !== "paid";
}

/**
 * Tagihan belum lunas dari tahun ajaran selain tahun ajaran aktif, diurutkan
 * dari tahun ajaran terbaru.
 *
 * Bila `activeAcademicYearId` belum diketahui, mengembalikan daftar kosong:
 * tanpa tahun ajaran pembanding kita tidak bisa memisahkan "tahun lain" dari
 * tahun berjalan, dan menampilkan semuanya hanya akan menduplikasi daftar utama.
 *
 * Tagihan tanpa informasi tahun ajaran ikut disertakan — lebih baik menampilkan
 * kemungkinan tunggakan daripada menyembunyikan tagihan yang belum dibayar.
 */
export function otherYearOutstandingInvoices<T extends OutstandingInvoiceLike>(
	invoices: T[],
	activeAcademicYearId?: number,
): T[] {
	if (activeAcademicYearId == null) return [];

	return invoices
		.filter(
			(invoice) =>
				isInvoiceOutstanding(invoice) &&
				invoice.academic_year?.id !== activeAcademicYearId,
		)
		.sort((a, b) =>
			(b.academic_year?.name ?? "").localeCompare(a.academic_year?.name ?? ""),
		);
}

/**
 * Keterangan baris: catatan bila ada, jika tidak label jenis tagihannya.
 *
 * Wajib memakai `invoiceTypeLabel` — bukan `type` mentah — karena tagihan tahun
 * ajaran lain sering tidak punya catatan, dan nilai mentah seperti `monthly`
 * tidak terbaca oleh admin.
 */
export function invoiceDescription(invoice: OutstandingInvoiceLike): string {
	const notes = (invoice.notes ?? "").trim();
	return notes || invoiceTypeLabel(invoice.type);
}

/** Menjumlahkan sisa seluruh tagihan dalam daftar. */
export function sumOutstanding(invoices: OutstandingInvoiceLike[]): number {
	return invoices.reduce((sum, invoice) => sum + invoiceRemaining(invoice), 0);
}

export interface UnpaidSplit {
	activeYear: number;
	otherYears: number;
}

/**
 * Memecah total tunggakan siswa menjadi porsi tahun ajaran aktif dan porsi
 * tahun ajaran lain.
 *
 * `otherYears` dihitung dari daftar tagihan lintas tahun ajaran — aman, karena
 * tagihan tahun ajaran lampau tidak terpengaruh aturan visibilitas bulan berjalan.
 *
 * `activeYear` **diturunkan** sebagai `totalUnpaid - otherYears`, bukan dihitung
 * ulang dari daftar. Alasannya: `totalUnpaid` berasal dari server yang menyembunyikan
 * tagihan bulanan untuk bulan yang belum berjalan (clamp ke rentang tahun ajaran),
 * dan aturan itu tidak dapat direplikasi dengan aman di klien. Dengan menurunkannya,
 * kedua angka selalu konsisten dengan total yang ditampilkan backend.
 */
export function splitUnpaidByAcademicYear(
	invoices: OutstandingInvoiceLike[],
	activeAcademicYearId: number | undefined,
	totalUnpaid: number,
): UnpaidSplit {
	const otherYears = sumOutstanding(
		otherYearOutstandingInvoices(invoices, activeAcademicYearId),
	);
	return {
		otherYears,
		activeYear: Math.max(0, (Number(totalUnpaid) || 0) - otherYears),
	};
}
