// Jendela tutup buku: absensi bulan sebelumnya diinput maksimal tanggal 5.
// Realisasi payday bisa maju ke tgl 3/4, jadi rentang 1–5 aman.
export const PAYDAY_WINDOW_END = 5;

type MonthLike = { value: string }; // YYYY-MM

// defaultPayDate — tanggal bayar default untuk periode gaji: tgl 5 bulan
// berikutnya (gaji bulan M ditransfer awal bulan M+1).
export function defaultPayDate(periode: string): string {
	const m = periode.match(/^(\d{4})-(\d{2})/);
	if (!m) return "";
	const d = new Date(Number(m[1]), Number(m[2]), 5);
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-05`;
}

// formatTanggalBayar menampilkan "YYYY-MM-DD" sebagai "3 November 2026".
export function formatTanggalBayar(value?: string): string {
	if (!value) return "";
	const [y, m, d] = value.split("-").map(Number);
	if (!y || !m || !d) return value;
	return new Intl.DateTimeFormat("id-ID", {
		day: "numeric",
		month: "long",
		year: "numeric",
	}).format(new Date(y, m - 1, d));
}

// resolveDefaultPeriode memilih periode awal halaman absensi & penggajian.
//
// Aturan (berlapis):
//  1. Bulan sebelumnya belum difinalisasi & hari ini tgl 1–5 → bulan sebelumnya
//     (jendela tutup buku; mencakup payday yang maju ke tgl 3/4).
//  2. Lewat tgl 5 tetapi payroll bulan sebelumnya masih `open` dan sudah ada
//     absensi → bulan sebelumnya (buku tertunda).
//  3. Selainnya bulan berjalan. Bila bulan berjalan di luar rentang tahun
//     ajaran, pakai bulan terdekat yang tersedia (pertama/terakhir).
export function resolveDefaultPeriode(
	months: ReadonlyArray<MonthLike>,
	now: Date,
	opts: {
		prevStatus?: "open" | "finalized";
		prevHasAbsen?: boolean;
	} = {},
): string {
	if (months.length === 0) return "";

	const curKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
	const curIdx = months.findIndex((m) => m.value === curKey);

	// Di luar rentang TA: pilih ujung terdekat, bukan selalu bulan terakhir.
	if (curIdx < 0) {
		return curKey < months[0].value
			? months[0].value
			: months[months.length - 1].value;
	}

	const prev = curIdx > 0 ? months[curIdx - 1] : undefined;
	if (prev && opts.prevStatus !== "finalized") {
		if (now.getDate() <= PAYDAY_WINDOW_END) return prev.value;
		if (opts.prevStatus === "open" && opts.prevHasAbsen) return prev.value;
	}

	return months[curIdx].value;
}
