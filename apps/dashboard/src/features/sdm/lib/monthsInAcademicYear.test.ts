import { describe, expect, it } from "vitest";
import { monthsInAcademicYear } from "../api";

describe("monthsInAcademicYear", () => {
	it("menghasilkan 11 bulan untuk TA standar (Juli mulai tgl 13)", () => {
		const got = monthsInAcademicYear({
			start_date: "2026-07-13",
			end_date: "2027-06-30",
		});

		expect(got).toHaveLength(11);
		expect(got[0]?.value).toBe("2026-08");
		expect(got.at(-1)?.value).toBe("2027-06");
	});

	it("bulan pertama ikut bila TA mulai sebelum tgl 5", () => {
		const got = monthsInAcademicYear({
			start_date: "2026-07-01",
			end_date: "2027-06-30",
		});

		expect(got[0]?.value).toBe("2026-07");
	});

	it("bulan terakhir keluar bila TA berakhir sebelum tgl 5", () => {
		const got = monthsInAcademicYear({
			start_date: "2026-07-01",
			end_date: "2027-06-04",
		});

		expect(got.at(-1)?.value).toBe("2027-05");
	});
});
