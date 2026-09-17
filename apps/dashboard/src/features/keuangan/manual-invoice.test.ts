import { describe, expect, it } from "vitest";
import {
	arrearsItemName,
	buildCreateInvoicePayload,
	calculateFeeItemAmount,
	canDeleteManualInvoice,
	defaultManualInvoiceMode,
	feeItemUnitLabel,
	filterFeeItemsForStudent,
	hasUsableMode,
	isManualInvoiceType,
	type ManualInvoiceFormState,
	manualInvoiceType,
	modeAvailability,
	studentLevelWarning,
	sumDraftAmounts,
	validateManualInvoice,
} from "./manual-invoice";

const baseState: ManualInvoiceFormState = {
	studentId: 1,
	academicYearId: 2,
	academicYearName: "2024/2025",
	mode: "total",
	totalAmount: 1_500_000,
	items: [],
	notes: "Tunggakan SPP Ganjil 2024/2025",
	dueDate: "",
	// baseState menggambarkan TA lampau: mode total sah, mode rinci tidak.
	isActiveAcademicYear: false,
	hasTariffConfig: false,
};

/** State mode rinci yang sah: TA aktif dan sudah punya konfigurasi tarif. */
const itemizedState = (
	overrides: Partial<ManualInvoiceFormState> = {},
): ManualInvoiceFormState => ({
	...baseState,
	mode: "itemized",
	isActiveAcademicYear: true,
	hasTariffConfig: true,
	notes: "",
	items: [{ name: "Seragam", category: "other", amount: 100_000 }],
	...overrides,
});

describe("defaultManualInvoiceMode", () => {
	it("memilih mode rinci untuk tahun ajaran aktif", () => {
		expect(defaultManualInvoiceMode(true)).toBe("itemized");
	});

	it("memilih mode nominal total untuk tahun ajaran lain", () => {
		expect(defaultManualInvoiceMode(false)).toBe("total");
	});
});

describe("manualInvoiceType", () => {
	it("memetakan mode ke type backend", () => {
		expect(manualInvoiceType("itemized")).toBe("manual");
		expect(manualInvoiceType("total")).toBe("arrears");
	});
});

describe("filterFeeItemsForStudent", () => {
	const items = [
		{ name: "SPP Intan L", level: "intan", gender: "L" },
		{ name: "SPP Intan P", level: "intan", gender: "P" },
		{ name: "SPP Semua", level: "all", gender: "all" },
		{ name: "SPP Mutiara", level: "mutiara", gender: "L" },
		{ name: "SPP Tanpa Level", level: "", gender: "" },
	];

	it("menyisakan tarif yang cocok dengan level & gender siswa", () => {
		const result = filterFeeItemsForStudent(items, "intan", "L").map(
			(i) => i.name,
		);
		expect(result).toEqual(["SPP Intan L", "SPP Semua", "SPP Tanpa Level"]);
	});

	it("menganggap 'all' dan nilai kosong selalu cocok", () => {
		const result = filterFeeItemsForStudent(items, "berlian", "P").map(
			(i) => i.name,
		);
		expect(result).toEqual(["SPP Semua", "SPP Tanpa Level"]);
	});
});

describe("calculateFeeItemAmount", () => {
	it("mengembalikan nominal flat untuk unit selain per_day/per_monday", () => {
		expect(calculateFeeItemAmount({ amount: 250_000, unit: "fixed" }, 5)).toBe(
			250_000,
		);
	});

	it("mengalikan nominal dengan kuantitas untuk unit per_day", () => {
		expect(
			calculateFeeItemAmount({ amount: 10_000, unit: "per_day" }, 12),
		).toBe(120_000);
	});

	it("mengalikan nominal dengan kuantitas untuk unit per_monday", () => {
		expect(
			calculateFeeItemAmount({ amount: 10_000, unit: "per_monday" }, 4),
		).toBe(40_000);
	});

	it("menghasilkan 0 bila kuantitas kosong pada unit berbasis kuantitas", () => {
		expect(calculateFeeItemAmount({ amount: 10_000, unit: "per_day" }, 0)).toBe(
			0,
		);
	});

	it("memberi label satuan yang sesuai", () => {
		expect(feeItemUnitLabel("per_monday")).toBe("Senin");
		expect(feeItemUnitLabel("per_day")).toBe("hari");
		expect(feeItemUnitLabel("fixed")).toBe("");
	});
});

describe("sumDraftAmounts", () => {
	it("menjumlahkan nominal item", () => {
		expect(sumDraftAmounts([{ amount: 100_000 }, { amount: 250_000 }])).toBe(
			350_000,
		);
	});

	it("mengembalikan 0 untuk daftar kosong", () => {
		expect(sumDraftAmounts([])).toBe(0);
	});
});

describe("validateManualInvoice", () => {
	it("menolak tanpa siswa", () => {
		expect(validateManualInvoice({ ...baseState, studentId: undefined })).toBe(
			"Siswa wajib dipilih",
		);
	});

	it("menolak tanpa tahun ajaran", () => {
		expect(
			validateManualInvoice({ ...baseState, academicYearId: undefined }),
		).toBe("Tahun ajaran wajib dipilih");
	});

	it("menerima mode total yang lengkap", () => {
		expect(validateManualInvoice(baseState)).toBeNull();
	});

	it("menolak nominal tunggakan 0 atau negatif", () => {
		expect(validateManualInvoice({ ...baseState, totalAmount: 0 })).toBe(
			"Nominal tunggakan harus lebih dari 0",
		);
		expect(validateManualInvoice({ ...baseState, totalAmount: -1 })).toBe(
			"Nominal tunggakan harus lebih dari 0",
		);
	});

	it("menolak keterangan kosong pada mode total", () => {
		expect(validateManualInvoice({ ...baseState, notes: "   " })).toBe(
			"Keterangan wajib diisi untuk tagihan tunggakan",
		);
	});

	it("tidak mewajibkan keterangan pada mode rinci", () => {
		expect(validateManualInvoice(itemizedState({ notes: "" }))).toBeNull();
	});

	it("menolak mode rinci tanpa item", () => {
		expect(validateManualInvoice(itemizedState({ items: [] }))).toBe(
			"Tambahkan minimal satu item tagihan",
		);
	});

	it("menolak item tanpa nama", () => {
		const state = itemizedState({
			items: [{ name: "  ", category: "other", amount: 100_000 }],
		});
		expect(validateManualInvoice(state)).toBe("Nama item wajib diisi");
	});

	it("menolak item dengan nominal tidak positif", () => {
		const state = itemizedState({
			items: [{ name: "Denda", category: "other", amount: 0 }],
		});
		expect(validateManualInvoice(state)).toBe(
			"Nominal item 'Denda' harus lebih dari 0",
		);
	});
});

describe("buildCreateInvoicePayload", () => {
	it("mode total menghasilkan tepat 1 item kategori arrears dengan type arrears", () => {
		const payload = buildCreateInvoicePayload(baseState);

		expect(payload.type).toBe("arrears");
		expect(payload.student_id).toBe(1);
		expect(payload.academic_year_id).toBe(2);
		expect(payload.notes).toBe("Tunggakan SPP Ganjil 2024/2025");
		expect(payload.items).toEqual([
			{
				name: "Tunggakan TA 2024/2025",
				category: "arrears",
				amount: 1_500_000,
			},
		]);
	});

	it("tidak pernah mengirim total_amount (dihitung server)", () => {
		expect("total_amount" in buildCreateInvoicePayload(baseState)).toBe(false);
	});

	it("memakai nama generik bila nama tahun ajaran tidak tersedia", () => {
		const payload = buildCreateInvoicePayload({
			...baseState,
			academicYearName: undefined,
		});
		expect(payload.items[0].name).toBe("Tunggakan");
		expect(arrearsItemName(undefined)).toBe("Tunggakan");
	});

	it("menghilangkan due_date bila kosong dan mengisinya bila diisi", () => {
		expect("due_date" in buildCreateInvoicePayload(baseState)).toBe(false);

		const withDue = buildCreateInvoicePayload({
			...baseState,
			dueDate: "2026-10-01",
		});
		expect(withDue.due_date).toBe("2026-10-01");
	});

	it("memangkas spasi keterangan dan nama item", () => {
		const payload = buildCreateInvoicePayload({
			...baseState,
			notes: "  Tunggakan  ",
		});
		expect(payload.notes).toBe("Tunggakan");

		const itemized = buildCreateInvoicePayload(
			itemizedState({
				items: [{ name: "  Seragam  ", category: "other", amount: 100_000 }],
			}),
		);
		expect(itemized.items[0].name).toBe("Seragam");
	});

	it("mode rinci memetakan semua item", () => {
		const payload = buildCreateInvoicePayload(
			itemizedState({
				items: [
					{ name: "Seragam", category: "other", amount: 100_000 },
					{ name: "Uang Kegiatan", category: "other", amount: 250_000 },
				],
			}),
		);

		expect(payload.type).toBe("manual");
		expect(payload.items).toHaveLength(2);
		expect(payload.items.map((i) => i.amount)).toEqual([100_000, 250_000]);
	});

	it("menyertakan quantity & unit_price hanya bila ada isinya", () => {
		const payload = buildCreateInvoicePayload(
			itemizedState({
				items: [
					{
						name: "Antar Jemput",
						category: "facility",
						amount: 120_000,
						quantity: 12,
						unitPrice: 10_000,
					},
					{ name: "Seragam", category: "other", amount: 100_000 },
				],
			}),
		);

		expect(payload.items[0].quantity).toBe(12);
		expect(payload.items[0].unit_price).toBe(10_000);
		expect("quantity" in payload.items[1]).toBe(false);
		expect("unit_price" in payload.items[1]).toBe(false);
	});
});

describe("isManualInvoiceType", () => {
	it("hanya menerima tagihan yang diinput admin", () => {
		expect(isManualInvoiceType("arrears")).toBe(true);
		expect(isManualInvoiceType("manual")).toBe(true);
	});

	it("menolak tagihan hasil generate", () => {
		for (const type of [
			"monthly",
			"initial",
			"registration",
			"graduation",
			"daycare_initial",
			"incidental",
		]) {
			expect(isManualInvoiceType(type)).toBe(false);
		}
	});

	it("menolak tipe yang tidak diketahui atau kosong", () => {
		expect(isManualInvoiceType(undefined)).toBe(false);
		expect(isManualInvoiceType("")).toBe(false);
	});
});

describe("canDeleteManualInvoice", () => {
	it("mengizinkan tagihan manual yang belum dibayar", () => {
		expect(canDeleteManualInvoice("arrears", 0)).toBe(true);
		expect(canDeleteManualInvoice("manual", 0)).toBe(true);
	});

	it("menolak tagihan yang sudah ada pembayaran", () => {
		expect(canDeleteManualInvoice("arrears", 50_000)).toBe(false);
	});

	it("menolak tagihan hasil generate meski belum dibayar", () => {
		expect(canDeleteManualInvoice("monthly", 0)).toBe(false);
	});

	it("memperlakukan paid_amount yang hilang sebagai 0", () => {
		expect(canDeleteManualInvoice("manual", undefined)).toBe(true);
	});
});

describe("studentLevelWarning", () => {
	it("tidak memberi peringatan bila level siswa diketahui", () => {
		expect(studentLevelWarning("intan")).toBeNull();
	});

	it("memberi peringatan bila level siswa tidak diketahui", () => {
		for (const level of [undefined, null, ""]) {
			const warning = studentLevelWarning(level);
			expect(warning).toBeTruthy();
			expect(warning).toContain("enrollment aktif");
		}
	});
});

describe("modeAvailability", () => {
	const matrix = [
		{
			name: "mode rinci pada TA aktif dengan tarif",
			mode: "itemized" as const,
			isActiveAcademicYear: true,
			hasTariffConfig: true,
			allowed: true,
		},
		{
			name: "mode rinci pada TA aktif tanpa tarif",
			mode: "itemized" as const,
			isActiveAcademicYear: true,
			hasTariffConfig: false,
			allowed: false,
		},
		{
			name: "mode rinci pada TA lain",
			mode: "itemized" as const,
			isActiveAcademicYear: false,
			hasTariffConfig: true,
			allowed: false,
		},
		{
			name: "mode total pada TA lain",
			mode: "total" as const,
			isActiveAcademicYear: false,
			hasTariffConfig: false,
			allowed: true,
		},
		{
			name: "mode total pada TA aktif",
			mode: "total" as const,
			isActiveAcademicYear: true,
			hasTariffConfig: true,
			allowed: false,
		},
	];

	for (const row of matrix) {
		it(`${row.allowed ? "mengizinkan" : "menolak"} ${row.name}`, () => {
			const result = modeAvailability({
				mode: row.mode,
				isActiveAcademicYear: row.isActiveAcademicYear,
				hasTariffConfig: row.hasTariffConfig,
			});

			expect(result.allowed).toBe(row.allowed);
			if (!row.allowed) {
				expect(result.reason).toBeTruthy();
			}
		});
	}

	it("menyebut item tarif sebagai sebab saat TA aktif belum punya item tarif", () => {
		const result = modeAvailability({
			mode: "itemized",
			isActiveAcademicYear: true,
			hasTariffConfig: false,
		});
		expect(result.reason).toContain("item tarif");
	});

	it("menyebut tahun ajaran aktif sebagai sebab untuk mode total", () => {
		const result = modeAvailability({
			mode: "total",
			isActiveAcademicYear: true,
			hasTariffConfig: true,
		});
		expect(result.reason).toContain("aktif");
	});
});

describe("hasUsableMode", () => {
	it("true untuk TA aktif yang punya tarif", () => {
		expect(
			hasUsableMode({ isActiveAcademicYear: true, hasTariffConfig: true }),
		).toBe(true);
	});

	it("true untuk TA lain", () => {
		expect(
			hasUsableMode({ isActiveAcademicYear: false, hasTariffConfig: false }),
		).toBe(true);
	});

	it("false hanya untuk TA aktif tanpa tarif", () => {
		expect(
			hasUsableMode({ isActiveAcademicYear: true, hasTariffConfig: false }),
		).toBe(false);
	});
});

describe("validateManualInvoice — kesesuaian mode dengan tahun ajaran", () => {
	it("menolak mode total pada TA aktif", () => {
		const state: ManualInvoiceFormState = {
			...baseState,
			mode: "total",
			isActiveAcademicYear: true,
			hasTariffConfig: true,
		};
		expect(validateManualInvoice(state)).toContain("aktif");
	});

	it("menolak mode rinci pada TA lain", () => {
		const state = itemizedState({ isActiveAcademicYear: false });
		expect(validateManualInvoice(state)).toContain("aktif");
	});

	it("menolak mode rinci pada TA aktif tanpa tarif", () => {
		const state = itemizedState({ hasTariffConfig: false });
		expect(validateManualInvoice(state)).toContain("item tarif");
	});

	it("memeriksa kesesuaian mode sebelum memeriksa isian", () => {
		// Meski tanpa item, pesannya soal mode — bukan soal item.
		const state = itemizedState({ isActiveAcademicYear: false, items: [] });
		expect(validateManualInvoice(state)).not.toBe(
			"Tambahkan minimal satu item tagihan",
		);
	});
});
