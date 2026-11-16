export interface ReportAcademicYear {
	id?: number;
	name: string;
	start_date: string;
	end_date: string;
}

/**
 * Memvalidasi rentang tanggal laporan terhadap tahun ajaran yang dipilih.
 * Mengembalikan pesan error, atau null jika valid.
 */
export function validateReportDateRange(
	dateFrom: string,
	dateTo: string,
	academicYear: ReportAcademicYear | null | undefined,
): string | null {
	if (dateFrom > dateTo) {
		return "Tanggal 'Dari' tidak boleh setelah tanggal 'Sampai'.";
	}
	if (!academicYear) return null;

	const start = String(academicYear.start_date).slice(0, 10);
	const end = String(academicYear.end_date).slice(0, 10);
	if (dateFrom < start || dateTo > end) {
		return `Tanggal harus berada di dalam TA ${academicYear.name} (${start} s.d. ${end}).`;
	}
	return null;
}
