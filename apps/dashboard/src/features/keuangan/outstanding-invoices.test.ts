import { describe, expect, it } from "vitest";
import {
	invoiceDescription,
	invoiceRemaining,
	isInvoiceOutstanding,
	type OutstandingInvoiceLike,
	otherYearOutstandingInvoices,
	splitUnpaidByAcademicYear,
	sumOutstanding,
} from "./outstanding-invoices";

const ACTIVE_AY = 2;

const invoice = (
	overrides: Partial<OutstandingInvoiceLike> = {},
): OutstandingInvoiceLike => ({
	id: 1,
	status: "unpaid",
	type: "arrears",
	total_amount: 500_000,
	paid_amount: 0,
	notes: "Tunggakan SPP",
	academic_year: { id: 1, name: "2024/2025" },
	...overrides,
});

describe("invoiceRemaining", () => {
	it("menghitung total dikurangi terbayar", () => {
		expect(
			invoiceRemaining({ total_amount: 500_000, paid_amount: 200_000 }),
		).toBe(300_000);
	});

	it("tidak pernah negatif (dispensasi bisa membuat total < dibayar)", () => {
		expect(
			invoiceRemaining({ total_amount: 100_000, paid_amount: 150_000 }),
		).toBe(0);
	});

	it("menangani nilai yang hilang sebagai 0", () => {
		expect(invoiceRemaining({})).toBe(0);
	});
});

describe("isInvoiceOutstanding", () => {
	it("menganggap semua status selain 'paid' sebagai belum lunas", () => {
		expect(isInvoiceOutstanding({ status: "unpaid" })).toBe(true);
		expect(isInvoiceOutstanding({ status: "partial" })).toBe(true);
		expect(isInvoiceOutstanding({ status: undefined })).toBe(true);
	});

	it("menganggap 'paid' sebagai lunas", () => {
		expect(isInvoiceOutstanding({ status: "paid" })).toBe(false);
	});
});

describe("otherYearOutstandingInvoices", () => {
	it("hanya menyertakan tagihan dari tahun ajaran lain yang belum lunas", () => {
		const result = otherYearOutstandingInvoices(
			[
				invoice({ id: 1, academic_year: { id: 1, name: "2024/2025" } }),
				invoice({ id: 2, academic_year: { id: 2, name: "2025/2026" } }),
				invoice({
					id: 3,
					status: "paid",
					academic_year: { id: 1, name: "2024/2025" },
				}),
			],
			ACTIVE_AY,
		);

		expect(result.map((i) => i.id)).toEqual([1]);
	});

	it("menyertakan tagihan belum lunas dari tahun ajaran lain apa pun jenisnya", () => {
		const result = otherYearOutstandingInvoices(
			[
				invoice({ id: 1, type: "monthly" }),
				invoice({ id: 2, type: "initial" }),
				invoice({ id: 3, type: "arrears" }),
			],
			ACTIVE_AY,
		);

		expect(result.map((i) => i.id)).toEqual([1, 2, 3]);
	});

	it("menyertakan tagihan partial dari tahun ajaran lain", () => {
		const result = otherYearOutstandingInvoices(
			[invoice({ id: 1, status: "partial", paid_amount: 100_000 })],
			ACTIVE_AY,
		);

		expect(result.map((i) => i.id)).toEqual([1]);
	});

	it("mengurutkan dari tahun ajaran terbaru", () => {
		const result = otherYearOutstandingInvoices(
			[
				invoice({ id: 1, academic_year: { id: 11, name: "2023/2024" } }),
				invoice({ id: 2, academic_year: { id: 13, name: "2025/2026" } }),
				invoice({ id: 3, academic_year: { id: 12, name: "2024/2025" } }),
			],
			ACTIVE_AY,
		);

		expect(result.map((i) => i.academic_year?.name)).toEqual([
			"2025/2026",
			"2024/2025",
			"2023/2024",
		]);
	});

	it("mengembalikan daftar kosong bila tahun ajaran aktif belum diketahui", () => {
		expect(otherYearOutstandingInvoices([invoice()], undefined)).toEqual([]);
	});

	it("menyertakan tagihan tanpa informasi tahun ajaran (lebih aman daripada menyembunyikan)", () => {
		const result = otherYearOutstandingInvoices(
			[invoice({ id: 1, academic_year: null })],
			ACTIVE_AY,
		);

		expect(result.map((i) => i.id)).toEqual([1]);
	});

	it("mengembalikan daftar kosong bila semua sudah lunas", () => {
		const result = otherYearOutstandingInvoices(
			[invoice({ id: 1, status: "paid" }), invoice({ id: 2, status: "paid" })],
			ACTIVE_AY,
		);

		expect(result).toEqual([]);
	});
});

describe("invoiceDescription", () => {
	it("memakai catatan bila ada", () => {
		expect(
			invoiceDescription({ notes: "  Tunggakan SPP  ", type: "arrears" }),
		).toBe("Tunggakan SPP");
	});

	it("kembali ke label jenis tagihan yang terbaca bila catatan kosong", () => {
		expect(invoiceDescription({ notes: "", type: "arrears" })).toBe(
			"Tunggakan",
		);
		expect(invoiceDescription({ notes: null, type: "monthly" })).toBe(
			"Bulanan",
		);
		expect(invoiceDescription({ notes: "   ", type: "manual" })).toBe("Manual");
		expect(invoiceDescription({ notes: "", type: "initial" })).toBe(
			"Biaya Awal",
		);
	});

	it("tidak pernah menampilkan jenis tagihan mentah", () => {
		for (const type of ["arrears", "manual", "monthly", "daycare_initial"]) {
			expect(invoiceDescription({ type })).not.toBe(type);
		}
	});

	it("memberi tanda '-' bila catatan dan jenis tidak ada", () => {
		expect(invoiceDescription({})).toBe("-");
	});
});

describe("sumOutstanding", () => {
	it("menjumlahkan sisa seluruh tagihan", () => {
		expect(
			sumOutstanding([
				{ total_amount: 500_000, paid_amount: 0 },
				{ total_amount: 300_000, paid_amount: 100_000 },
			]),
		).toBe(700_000);
	});

	it("mengembalikan 0 untuk daftar kosong", () => {
		expect(sumOutstanding([])).toBe(0);
	});
});

describe("splitUnpaidByAcademicYear", () => {
	const invoices = [
		invoice({ id: 1, academic_year: { id: 1, name: "2024/2025" } }),
		invoice({ id: 2, academic_year: { id: 1, name: "2024/2025" } }),
		invoice({ id: 3, academic_year: { id: ACTIVE_AY, name: "2025/2026" } }),
	];

	it("memisahkan porsi TA lain dan menurunkan porsi TA aktif dari total", () => {
		const split = splitUnpaidByAcademicYear(invoices, ACTIVE_AY, 1_700_000);

		expect(split.otherYears).toBe(1_000_000);
		expect(split.activeYear).toBe(700_000);
	});

	it("porsi TA aktif tidak pernah negatif", () => {
		const split = splitUnpaidByAcademicYear(invoices, ACTIVE_AY, 400_000);

		expect(split.otherYears).toBe(1_000_000);
		expect(split.activeYear).toBe(0);
	});

	it("menghitung seluruh total sebagai TA aktif bila belum ada TA lain", () => {
		const split = splitUnpaidByAcademicYear(
			[invoice({ id: 1, academic_year: { id: ACTIVE_AY, name: "2025/2026" } })],
			ACTIVE_AY,
			500_000,
		);

		expect(split.otherYears).toBe(0);
		expect(split.activeYear).toBe(500_000);
	});

	it("tanpa TA pembanding, seluruh total dianggap TA aktif", () => {
		const split = splitUnpaidByAcademicYear(invoices, undefined, 1_700_000);

		expect(split.otherYears).toBe(0);
		expect(split.activeYear).toBe(1_700_000);
	});

	it("tidak menghitung tagihan yang sudah lunas sebagai tunggakan", () => {
		const split = splitUnpaidByAcademicYear(
			[
				invoice({ id: 1, status: "paid", total_amount: 500_000 }),
				invoice({
					id: 2,
					status: "partial",
					total_amount: 500_000,
					paid_amount: 200_000,
				}),
			],
			ACTIVE_AY,
			300_000,
		);

		expect(split.otherYears).toBe(300_000);
		expect(split.activeYear).toBe(0);
	});

	it("menangani daftar kosong", () => {
		const split = splitUnpaidByAcademicYear([], ACTIVE_AY, 250_000);

		expect(split.otherYears).toBe(0);
		expect(split.activeYear).toBe(250_000);
	});
});
