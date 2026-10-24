import { describe, expect, it } from "vitest";
import {
	buildDispensationTargets,
	computeInvoicePaymentTotal,
	dispensationTargetCategory,
	isDispensationApplicable,
} from "./dispensation";

const invoiceItems = [
	{ id: 1, invoice_id: 100, category: "daycare" },
	{ id: 2, invoice_id: 100, category: "daycare_meal" },
	{
		id: 3,
		invoice_id: 100,
		category: "dispensation",
		is_dispensation: true,
		dispensation_target_category: "daycare_meal",
	},
];

const fullAmounts = { 1: 30000, 2: 40000, 3: -20000 };

describe("dispensationTargetCategory", () => {
	it("memetakan dispensasi daycare ke item konsumsi", () => {
		expect(dispensationTargetCategory("daycare")).toBe("daycare_meal");
	});

	it("memakai kategori apa adanya untuk non-daycare", () => {
		expect(dispensationTargetCategory("monthly_spp")).toBe("monthly_spp");
		expect(dispensationTargetCategory(undefined)).toBeUndefined();
	});
});

describe("buildDispensationTargets", () => {
	it("mengumpulkan kategori target per invoice", () => {
		const targets = buildDispensationTargets([
			{
				id: 100,
				items: [
					{ category: "dispensation", offset_category: "daycare" },
					{ category: "dispensation", offset_category: "monthly_spp" },
					{ category: "daycare", offset_category: "" },
				],
			},
		]);

		expect([...(targets.get(100) ?? [])].sort()).toEqual([
			"daycare_meal",
			"monthly_spp",
		]);
	});
});

describe("computeInvoicePaymentTotal", () => {
	it("menerapkan dispensasi daycare jika konsumsi ikut dibayar", () => {
		expect(computeInvoicePaymentTotal(invoiceItems, fullAmounts, [])).toBe(
			50000,
		);
	});

	it("tidak menerapkan dispensasi jika item targetnya dikeluarkan", () => {
		expect(computeInvoicePaymentTotal(invoiceItems, fullAmounts, [2])).toBe(
			30000,
		);
	});

	it("mengabaikan dispensasi yang nominal sisanya nol", () => {
		const items = [
			{ id: 10, invoice_id: 200, category: "monthly_spp" },
			{
				id: 11,
				invoice_id: 200,
				category: "dispensation",
				is_dispensation: true,
				dispensation_target_category: "monthly_spp",
			},
		];
		expect(computeInvoicePaymentTotal(items, { 10: 150000, 11: 0 }, [])).toBe(
			150000,
		);
	});
});

describe("isDispensationApplicable", () => {
	it("fallback ke item positif apa pun saat offset_category kosong", () => {
		const legacyDispensation = {
			id: 4,
			invoice_id: 300,
			category: "dispensation",
			is_dispensation: true,
		};
		const items = [
			legacyDispensation,
			{ id: 5, invoice_id: 300, category: "monthly_spp" },
		];
		expect(
			isDispensationApplicable(legacyDispensation, items, { 5: 1000 }, []),
		).toBe(true);
	});

	it("tidak berlaku jika tidak ada item positif yang dibayar", () => {
		expect(
			isDispensationApplicable(invoiceItems[2], invoiceItems, {}, []),
		).toBe(false);
	});
});
