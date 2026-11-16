import { describe, expect, it } from "vitest";
import { validateReportDateRange } from "./report-date-range";

const ay = {
	id: 2,
	name: "2025/2026",
	start_date: "2025-07-14",
	end_date: "2026-06-30",
};

describe("validateReportDateRange", () => {
	it("menerima rentang tepat di batas TA", () => {
		expect(validateReportDateRange("2025-07-14", "2026-06-30", ay)).toBeNull();
	});

	it("menerima rentang di dalam TA", () => {
		expect(validateReportDateRange("2025-08-01", "2026-05-31", ay)).toBeNull();
	});

	it("menolak tanggal mulai sebelum TA", () => {
		expect(validateReportDateRange("2025-07-13", "2026-06-30", ay)).toContain(
			"di dalam TA 2025/2026",
		);
	});

	it("menolak tanggal selesai setelah TA", () => {
		expect(validateReportDateRange("2025-07-14", "2026-07-01", ay)).toContain(
			"di dalam TA 2025/2026",
		);
	});

	it("menolak rentang terbalik", () => {
		expect(validateReportDateRange("2026-05-01", "2026-04-01", ay)).toContain(
			"tidak boleh setelah",
		);
	});

	it("hanya memvalidasi urutan jika TA belum tersedia", () => {
		expect(
			validateReportDateRange("2026-01-01", "2026-01-31", null),
		).toBeNull();
	});
});
