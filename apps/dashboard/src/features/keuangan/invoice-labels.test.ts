import { describe, expect, it } from "vitest";
import {
	invoiceCategoryLabel,
	invoicePeriodOrTypeLabel,
	invoiceTypeLabel,
} from "./invoice-labels";

describe("invoiceTypeLabel", () => {
	it("menerjemahkan semua jenis tagihan yang dikenal", () => {
		expect(invoiceTypeLabel("monthly")).toBe("Bulanan");
		expect(invoiceTypeLabel("registration")).toBe("Registrasi Tahunan");
		expect(invoiceTypeLabel("initial")).toBe("Biaya Awal");
		expect(invoiceTypeLabel("daycare_initial")).toBe("Biaya Awal Daycare");
		expect(invoiceTypeLabel("graduation")).toBe("Wisuda");
		expect(invoiceTypeLabel("incidental")).toBe("Insidental");
		expect(invoiceTypeLabel("arrears")).toBe("Tunggakan");
		expect(invoiceTypeLabel("manual")).toBe("Manual");
	});

	it("tidak pernah mengembalikan nilai snake_case mentah untuk jenis yang dikenal", () => {
		for (const type of [
			"monthly",
			"registration",
			"initial",
			"daycare_initial",
			"graduation",
			"incidental",
			"arrears",
			"manual",
		]) {
			expect(invoiceTypeLabel(type)).not.toContain("_");
			expect(invoiceTypeLabel(type)).not.toBe(type);
		}
	});

	it("mengembalikan jenis tak dikenal apa adanya (tidak menyembunyikan data)", () => {
		expect(invoiceTypeLabel("entah_apa")).toBe("entah_apa");
	});

	it("memberi tanda '-' untuk jenis kosong", () => {
		expect(invoiceTypeLabel(undefined)).toBe("-");
		expect(invoiceTypeLabel("")).toBe("-");
	});
});

describe("invoiceCategoryLabel", () => {
	it("menerjemahkan kategori pos yang muncul di laporan", () => {
		expect(invoiceCategoryLabel("monthly_spp")).toBe("SPP");
		expect(invoiceCategoryLabel("arrears")).toBe("Tunggakan");
		expect(invoiceCategoryLabel("savings_mandatory")).toBe("Tabungan Wajib");
		expect(invoiceCategoryLabel("facility")).toBe("Fasilitas");
	});

	it("tidak pernah mengembalikan kategori mentah untuk yang dikenal", () => {
		for (const cat of [
			"monthly_spp",
			"monthly_infaq",
			"arrears",
			"initial",
			"registration",
			"pasta",
			"calisan",
			"ekskul",
			"savings_mandatory",
			"daycare",
			"daycare_meal",
			"graduation",
			"facility",
			"lainnya",
			"savings_voluntary",
		]) {
			expect(invoiceCategoryLabel(cat)).not.toBe(cat);
		}
	});

	it("mengembalikan kategori tak dikenal apa adanya (tidak menyembunyikan data)", () => {
		expect(invoiceCategoryLabel("entah_apa")).toBe("entah_apa");
	});

	it("memberi tanda '-' untuk kategori kosong", () => {
		expect(invoiceCategoryLabel(undefined)).toBe("-");
		expect(invoiceCategoryLabel("")).toBe("-");
	});
});

describe("invoicePeriodOrTypeLabel", () => {
	it("memakai periode untuk tagihan bulanan", () => {
		expect(
			invoicePeriodOrTypeLabel({ type: "monthly", month: 8, year: 2026 }),
		).toBe("Bulanan 8/2026");
	});

	it("memakai label jenis untuk selain bulanan", () => {
		expect(invoicePeriodOrTypeLabel({ type: "arrears" })).toBe("Tunggakan");
		expect(invoicePeriodOrTypeLabel({ type: "manual" })).toBe("Manual");
		expect(invoicePeriodOrTypeLabel({ type: "initial" })).toBe("Biaya Awal");
	});

	it("kembali ke label jenis bila bulanan tanpa periode", () => {
		expect(invoicePeriodOrTypeLabel({ type: "monthly" })).toBe("Bulanan");
		expect(
			invoicePeriodOrTypeLabel({ type: "monthly", month: 8, year: null }),
		).toBe("Bulanan");
	});
});
