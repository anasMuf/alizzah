import { describe, expect, it } from "vitest";
import {
	defaultPayDate,
	formatTanggalBayar,
	resolveDefaultPeriode,
} from "./periode";

const months = [
	{ value: "2026-08" },
	{ value: "2026-09" },
	{ value: "2026-10" },
	{ value: "2026-11" },
];

describe("resolveDefaultPeriode", () => {
	it("memilih bulan sebelumnya pada jendela tgl 1–5 (payday bisa maju 3/4)", () => {
		expect(
			resolveDefaultPeriode(months, new Date(2026, 10, 3), {
				prevStatus: "open",
			}),
		).toBe("2026-10");
	});

	it("tetap bulan sebelumnya saat status belum diketahui pada tgl 1–5", () => {
		expect(resolveDefaultPeriode(months, new Date(2026, 10, 4))).toBe(
			"2026-10",
		);
	});

	it("memilih bulan berjalan bila payroll bulan sebelumnya sudah finalized", () => {
		expect(
			resolveDefaultPeriode(months, new Date(2026, 10, 3), {
				prevStatus: "finalized",
			}),
		).toBe("2026-11");
	});

	it("memilih bulan berjalan setelah tgl 5 bila bulan sebelumnya tanpa absensi", () => {
		expect(
			resolveDefaultPeriode(months, new Date(2026, 10, 10), {
				prevStatus: "open",
				prevHasAbsen: false,
			}),
		).toBe("2026-11");
	});

	it("memilih bulan sebelumnya setelah tgl 5 bila buku belum ditutup & ada absensi", () => {
		expect(
			resolveDefaultPeriode(months, new Date(2026, 10, 10), {
				prevStatus: "open",
				prevHasAbsen: true,
			}),
		).toBe("2026-10");
	});

	it("memakai bulan pertama bila hari ini sebelum rentang TA", () => {
		expect(resolveDefaultPeriode(months, new Date(2026, 5, 20))).toBe(
			"2026-08",
		);
	});

	it("memakai bulan terakhir bila hari ini setelah rentang TA", () => {
		expect(resolveDefaultPeriode(months, new Date(2027, 0, 10))).toBe(
			"2026-11",
		);
	});

	it("mengembalikan string kosong tanpa bulan", () => {
		expect(resolveDefaultPeriode([], new Date())).toBe("");
	});
});

describe("defaultPayDate", () => {
	it("memakai tgl 5 bulan berikutnya", () => {
		expect(defaultPayDate("2026-10")).toBe("2026-11-05");
	});

	it("menangani pergantian tahun", () => {
		expect(defaultPayDate("2026-12")).toBe("2027-01-05");
	});
});

describe("formatTanggalBayar", () => {
	it("memformat tanggal Indonesia", () => {
		expect(formatTanggalBayar("2026-11-03")).toBe("3 November 2026");
	});

	it("mengembalikan string kosong bila tidak ada nilai", () => {
		expect(formatTanggalBayar()).toBe("");
	});
});
