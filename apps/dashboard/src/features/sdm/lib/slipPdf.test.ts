import { describe, expect, it } from "vitest";
import type { Slip } from "#/features/sdm/api";
import { renderSlipPdf } from "./slipPdf";

const sample: Slip = {
	employee_id: 1,
	nama: "Abdul Rohim, S.PdI",
	golongan_kode: "A",
	hr_pokok: 250000,
	sertifikasi: false,
	impasing: false,
	jumlah_hadir: 20,
	kehadiran: 100000,
	jumlah_siaga: 15,
	siaga: 150000,
	jumlah_piket: 2,
	piket: 30000,
	jumlah_telat: 0,
	bonus_terlambat: 100000,
	jumlah_pulang: 0,
	bonus_pulang_awal: 50000,
	subtotal_absen: 680000,
	subtotal_f: 200000,
	subtotal_t: 500000,
	subtotal_p: 0,
	subtotal_l: 0,
	angsuran: 0,
	total_gaji: 1380000,
	rincian_fungsional: [{ nama: "Ketua Yayasan", nominal: 200000 }],
	rincian_tugas_tambahan: [
		{ nama: "Bidang Sarana Prasarana", nominal: 500000 },
	],
	rincian_penanggung_jawab: [],
	rincian_lainlain: [],
};

describe("renderSlipPdf", () => {
	it("menghasilkan berkas PDF A5 yang valid", () => {
		const doc = renderSlipPdf(sample, "2026-10");
		const out = doc.output("datauristring");
		expect(out.startsWith("data:application/pdf")).toBe(true);

		// Ukuran A5 (jsPDF mengembalikan dalam satuan dokumen = mm).
		const page = doc.internal.pageSize;
		expect(Math.round(page.getWidth())).toBe(148);
		expect(Math.round(page.getHeight())).toBe(210);
	});

	it("tetap menghasilkan PDF untuk karyawan tanpa rincian", () => {
		const doc = renderSlipPdf(
			{
				...sample,
				rincian_fungsional: [],
				rincian_tugas_tambahan: [],
			},
			"2026-11",
		);
		expect(doc.output("datauristring").startsWith("data:application/pdf")).toBe(
			true,
		);
	});
});
