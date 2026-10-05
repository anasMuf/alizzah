import { jsPDF } from "jspdf";
import autoTable, { type CellInput } from "jspdf-autotable";
import { formatPeriode, type Slip } from "#/features/sdm/api";

// ── Helpers ──

function rp(n: number | null | undefined): string {
	if (!n) return "";
	return `Rp ${new Intl.NumberFormat("id-ID").format(n)}`;
}

/** Baca nama & jabatan penanda tangan dari cache pengaturan aplikasi. */
function readSignatory(): { name: string; title: string } {
	try {
		const raw = localStorage.getItem("app_settings");
		if (!raw) return { name: "", title: "" };
		const s = JSON.parse(raw);
		return { name: s.signatory_name || "", title: s.signatory_title || "" };
	} catch {
		return { name: "", title: "" };
	}
}

function todayID(): string {
	return new Intl.DateTimeFormat("id-ID", {
		day: "numeric",
		month: "long",
		year: "numeric",
	}).format(new Date());
}

function slug(s: string): string {
	return s
		.trim()
		.replace(/[^a-zA-Z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
}

// Baris tabel autoTable — sel boleh string atau objek {content, colSpan, styles}.
type Row = CellInput[];

function sectionHeader(no: string, title: string): Row {
	return [
		{ content: no, styles: { fontStyle: "bold", halign: "center" } },
		{ content: title, colSpan: 4, styles: { fontStyle: "bold" } },
	];
}

/** Susun baris tabel slip mengikuti aplikasi lama (Dokumen 03 / gaji_print.php). */
function buildBody(s: Slip, golonganKeterangan?: string): Row[] {
	const rows: Row[] = [];

	rows.push([
		{ content: "1", styles: { fontStyle: "bold", halign: "center" } },
		{
			content: `HR Pokok Golongan ${s.golongan_kode}`,
			styles: { fontStyle: "bold" },
		},
		rp(s.hr_pokok),
		rp(s.hr_pokok),
		s.sertifikasi
			? "sertifikasi (50%)"
			: s.impasing
				? "sertifikasi+impasing (100%)"
				: (golonganKeterangan ?? ""),
	]);

	const khRate = s.jumlah_hadir ? Math.round(s.kehadiran / s.jumlah_hadir) : 0;
	rows.push([
		{ content: "2", styles: { fontStyle: "bold", halign: "center" } },
		`HR Kehadiran — Kehadiran: ${s.jumlah_hadir}`,
		rp(khRate),
		rp(s.kehadiran),
		"",
	]);

	rows.push(sectionHeader("3", "HR Kedisiplinan"));
	const sgRate = s.jumlah_siaga ? Math.round(s.siaga / s.jumlah_siaga) : 0;
	rows.push([
		"",
		`a. Hadir Siaga: ${s.jumlah_siaga}`,
		rp(sgRate),
		rp(s.siaga),
		"",
	]);
	rows.push([
		"",
		`b. Hadir Terlambat: ${s.jumlah_telat}`,
		"",
		s.bonus_terlambat ? rp(s.bonus_terlambat) : "",
		s.bonus_terlambat ? "bonus tidak terlambat" : "",
	]);
	const pkRate = s.jumlah_piket ? Math.round(s.piket / s.jumlah_piket) : 0;
	rows.push([
		"",
		`c. Hadir Piket: ${s.jumlah_piket}`,
		rp(pkRate),
		rp(s.piket),
		"",
	]);
	rows.push([
		"",
		`d. Pulang Awal: ${s.jumlah_pulang}`,
		"",
		s.bonus_pulang_awal ? rp(s.bonus_pulang_awal) : "",
		s.bonus_pulang_awal ? "bonus tidak pulang awal" : "",
	]);

	const section = (
		no: string,
		title: string,
		items: Array<{ nama: string; nominal: number }>,
	) => {
		rows.push(sectionHeader(no, title));
		for (const it of items) rows.push(["", it.nama, "", rp(it.nominal), ""]);
	};
	section("4", "HR Fungsional", s.rincian_fungsional);
	section("5", "HR Tugas Tambahan", s.rincian_tugas_tambahan);
	section("6", "HR Penanggung Jawab", s.rincian_penanggung_jawab);
	section("7", "Lain-lain", s.rincian_lainlain);

	rows.push([
		{ content: "8", styles: { fontStyle: "bold", halign: "center" } },
		{ content: "Angsuran Pinjaman (-)", styles: { fontStyle: "bold" } },
		rp(s.angsuran),
		rp(s.angsuran),
		"",
	]);

	return rows;
}

/**
 * downloadSlipPdf — hasilkan & unduh slip gaji PDF (A5) satu karyawan,
 * mengikuti desain aplikasi lama (gaji_print.php).
 */
export function renderSlipPdf(
	slip: Slip,
	periode: string,
	opts: { golonganKeterangan?: string } = {},
): jsPDF {
	const doc = new jsPDF({ unit: "mm", format: "a5" });
	const pageW = doc.internal.pageSize.getWidth();
	const margin = 8;

	// Header: doa + identitas periode.
	doc.setFont("helvetica", "normal");
	doc.setFontSize(10);
	doc.text(
		"Alhamdulillah… Alloh Ar Rozzaq memberikan Rizki Halal melalui PAUD Unggulan AL IZZAH. Semoga Barokah & membawa banyak manfaat.",
		pageW / 2,
		11,
		{ align: "center", maxWidth: pageW - margin * 2 },
	);
	doc.setFont("helvetica", "bold");
	doc.setFontSize(12);
	doc.text(`${slip.nama}  ||  ${formatPeriode(periode)}`, pageW / 2, 20, {
		align: "center",
	});

	autoTable(doc, {
		startY: 25,
		margin: { left: margin, right: margin },
		theme: "grid",
		head: [["No", "Jenis HR", "Nominal", "Subtotal", "Ket"]],
		body: buildBody(slip, opts.golonganKeterangan),
		foot: [
			[
				{
					content: "Total",
					colSpan: 3,
					styles: { halign: "center", fontStyle: "bold" },
				},
				{
					content: rp(slip.total_gaji),
					colSpan: 2,
					styles: { fontStyle: "bold" },
				},
			],
		],
		styles: {
			font: "helvetica",
			fontSize: 9,
			cellPadding: 2,
			lineColor: [150, 150, 150],
			lineWidth: 0.1,
			textColor: [20, 20, 20],
			valign: "middle",
		},
		headStyles: {
			fillColor: [240, 240, 240],
			textColor: [20, 20, 20],
			fontStyle: "bold",
			fontSize: 9,
			halign: "center",
		},
		footStyles: {
			fillColor: [245, 245, 245],
			textColor: [20, 20, 20],
			fontSize: 9,
		},
		columnStyles: {
			0: { cellWidth: 8, halign: "center" },
			1: { cellWidth: "auto" },
			2: { cellWidth: 27, halign: "right" },
			3: { cellWidth: 27, halign: "right" },
			4: { cellWidth: 30 },
		},
	});

	const finalY =
		(doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable
			?.finalY ?? 120;

	// Tanda tangan.
	const sig = readSignatory();
	const rightX = pageW - margin;
	let y = finalY + 8;
	doc.setFont("helvetica", "normal");
	doc.setFontSize(9);
	doc.text(`Mojokerto, ${todayID()}`, rightX, y, { align: "right" });
	y += 5;
	doc.text(sig.title || "Kepala Sekolah", rightX, y, { align: "right" });
	y += 16;
	if (sig.name) {
		doc.setFont("helvetica", "bold");
		doc.text(sig.name, rightX, y, { align: "right" });
		y += 4;
		doc.setFont("helvetica", "normal");
	}
	doc.setDrawColor(20, 20, 20);
	doc.line(rightX - 45, y, rightX, y);

	return doc;
}

/** downloadSlipPdf — hasilkan & unduh slip gaji PDF (A5). */
export function downloadSlipPdf(
	slip: Slip,
	periode: string,
	opts: { golonganKeterangan?: string } = {},
): void {
	renderSlipPdf(slip, periode, opts).save(
		`slip-gaji-${slug(slip.nama)}-${periode}.pdf`,
	);
}
