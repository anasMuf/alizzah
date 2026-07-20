/**
 * HTML Print Utility
 *
 * Membuka jendela baru dengan HTML murni untuk dicetak,
 * bukan mencetak halaman web secara langsung (bukan window.print() di halaman utama).
 */

export interface PrintOptions {
	/** Judul dokumen (untuk <title>) */
	title?: string;
	/** URL logo (path absolut dari public/, misal "/logo192.png") */
	logo?: string;
	/** Nama sekolah / institusi di header */
	schoolName?: string;
	/** Subtitle opsional di bawah nama sekolah */
	subtitle?: string;
	/** Orientasi kertas */
	orientation?: "portrait" | "landscape";
	/** Ukuran kertas */
	pageSize?: "A4" | "A5" | "letter" | "legal";
	/** Margin halaman (CSS) */
	margin?: string;
}

const DEFAULTS: Required<Omit<PrintOptions, "subtitle">> & {
	subtitle: string;
} = {
	title: "Cetak",
	logo: "/logo192.png",
	schoolName: "PAUD UNGGULAN AL-IZZAH MOJOKERTO",
	subtitle: "",
	orientation: "portrait",
	pageSize: "A4",
	margin: "10mm",
};

/**
 * Membuka jendela print baru dengan konten HTML dan memicu dialog cetak browser.
 *
 * @param innerHtml - Konten HTML yang akan dicetak (hanya bagian body, tanpa <body> tag)
 * @param options - Konfigurasi print (logo, nama sekolah, dll)
 */
export function openPrintWindow(
	innerHtml: string,
	options: PrintOptions = {},
): void {
	const opts = { ...DEFAULTS, ...options };
	const now = new Date();
	const dateStr = now.toLocaleDateString("id-ID", {
		day: "numeric",
		month: "long",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});

	const fullHtml = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(opts.title)}</title>
<style>
	@page {
		size: ${opts.pageSize} ${opts.orientation};
		margin: ${opts.margin};
	}
	*, *::before, *::after {
		box-sizing: border-box;
		margin: 0;
		padding: 0;
	}
	body {
		font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
		font-size: 12px;
		color: #1f2937;
		line-height: 1.6;
		-webkit-print-color-adjust: exact;
		print-color-adjust: exact;
	}

	/* ===== HEADER ===== */
	.print-header {
		display: flex;
		align-items: center;
		gap: 16px;
		border-bottom: 2px solid #1f2937;
		padding-bottom: 12px;
		margin-bottom: 20px;
	}
	.print-header .logo {
		width: 56px;
		height: 56px;
		object-fit: contain;
		flex-shrink: 0;
	}
	.print-header .header-text {
		flex: 1;
	}
	.print-header h1 {
		font-size: 16px;
		font-weight: 700;
		letter-spacing: 0.5px;
		margin-bottom: 2px;
		color: #111827;
	}
	.print-header .subtitle {
		font-size: 11px;
		color: #6b7280;
		margin-top: 2px;
	}

	/* ===== TABLES ===== */
	table {
		width: 100%;
		border-collapse: collapse;
		margin-bottom: 16px;
	}
	table thead th {
		text-align: left;
		font-size: 11px;
		font-weight: 600;
		padding: 7px 8px;
		border-bottom: 2px solid #1f2937;
		background-color: #f9fafb;
		color: #111827;
		white-space: nowrap;
	}
	table tbody td {
		padding: 6px 8px;
		border-bottom: 1px solid #e5e7eb;
		font-size: 11px;
		vertical-align: top;
	}
	table tfoot td {
		padding: 8px;
		font-size: 11px;
		font-weight: 600;
	}
	table .border-t-foot {
		border-top: 2px solid #1f2937;
	}

	/* ===== UTILITIES ===== */
	.text-right  { text-align: right; }
	.text-center { text-align: center; }
	.text-left   { text-align: left; }
	.font-bold   { font-weight: 700; }
	.font-mono   { font-family: "SF Mono", "Fira Code", "Fira Mono", "Roboto Mono", monospace; }
	.text-sm     { font-size: 10px; }
	.text-base   { font-size: 12px; }
	.text-lg     { font-size: 14px; }
	.text-xl     { font-size: 16px; }
	.text-gray   { color: #6b7280; }
	.text-red    { color: #dc2626; }
	.text-green  { color: #16a34a; }
	.text-amber  { color: #d97706; }
	.bg-red-50   { background-color: #fef2f2; }
	.bg-green-50 { background-color: #f0fdf4; }
	.bg-amber-50 { background-color: #fffbeb; }
	.bg-gray-50  { background-color: #f9fafb; }
	.uppercase   { text-transform: uppercase; }
	.letter-spacing { letter-spacing: 0.5px; }

	.mb-2  { margin-bottom: 8px; }
	.mb-4  { margin-bottom: 16px; }
	.mb-6  { margin-bottom: 24px; }
	.mt-2  { margin-top: 8px; }
	.mt-4  { margin-top: 16px; }
	.mt-8  { margin-top: 32px; }
	.mr-2  { margin-right: 8px; }
	.p-2  { padding: 8px; }
	.p-4  { padding: 16px; }
	.py-2 { padding-top: 8px; padding-bottom: 8px; }
	.py-3 { padding-top: 12px; padding-bottom: 12px; }
	.px-3 { padding-left: 12px; padding-right: 12px; }

	.rounded { border-radius: 4px; }
	.border { border: 1px solid #e5e7eb; }
	.border-b { border-bottom: 1px solid #e5e7eb; }
	.border-t { border-top: 1px solid #e5e7eb; }
	.border-b-2 { border-bottom: 2px solid #1f2937; }

	.inline-block { display: inline-block; }

	.grid-2 {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 16px;
	}
	.grid-3 {
		display: grid;
		grid-template-columns: 1fr 1fr 1fr;
		gap: 12px;
	}

	.badge {
		display: inline-block;
		padding: 2px 8px;
		border-radius: 9999px;
		font-size: 10px;
		font-weight: 600;
	}
	.badge-success { background: #dcfce7; color: #166534; }
	.badge-warning { background: #fef3c7; color: #92400e; }
	.badge-danger  { background: #fee2e2; color: #991b1b; }

	.space-y-1 > * + * { margin-top: 4px; }
	.space-y-2 > * + * { margin-top: 8px; }
	.gap-x-8 > * + * { margin-left: 0; }

	/* ===== FOOTER ===== */
	.print-footer {
		margin-top: 40px;
		padding-top: 16px;
		border-top: 1px solid #d1d5db;
		text-align: center;
		font-size: 10px;
		color: #9ca3af;
	}

	/* ===== IMAGE HANDLING ===== */
	img {
		max-width: 100%;
		height: auto;
	}
	img.logo {
		/* Logo tidak boleh pecah saat print */
		image-rendering: auto;
	}

	/* ===== PAGE BREAK CONTROL ===== */
	.break-before { page-break-before: always; }
	.break-after  { page-break-after: always; }
	.break-inside-avoid { page-break-inside: avoid; }

	/* ===== RESPONSIVE PRINT ===== */
	@media print {
		body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
	}
</style>
</head>
<body>
	<!-- HEADER -->
	<div class="print-header">
		${opts.logo ? `<img src="${escapeAttr(opts.logo)}" class="logo" alt="Logo" />` : ""}
		<div class="header-text text-center">
			<h1>${escapeHtml(opts.schoolName)}</h1>
			${opts.subtitle ? `<p class="subtitle">${escapeHtml(opts.subtitle)}</p>` : ""}
		</div>
	</div>

	<!-- CONTENT -->
	${innerHtml}

	<!-- FOOTER -->
	<div class="print-footer">
		<p>Dokumen ini dicetak secara otomatis oleh sistem Alizzah Manajemen</p>
		<p>Tanggal cetak: ${dateStr}</p>
	</div>

	<script>
		// Tunggu semua gambar dimuat, lalu cetak
		var images = document.querySelectorAll('img');
		var loaded = 0;
		var total = images.length;

		function tryPrint() {
			loaded++;
			if (loaded >= total) {
				setTimeout(function() { window.print(); }, 300);
			}
		}

		if (total === 0) {
			setTimeout(function() { window.print(); }, 300);
		} else {
			images.forEach(function(img) {
				if (img.complete) {
					tryPrint();
				} else {
					img.onload = tryPrint;
					img.onerror = tryPrint;
				}
			});
		}
	</script>
</body>
</html>`;

	const printWindow = window.open("", "_blank");
	if (!printWindow) {
		alert(
			"Pop-up diblokir oleh browser. Izinkan pop-up untuk situs ini agar dapat mencetak.",
		);
		return;
	}

	printWindow.document.write(fullHtml);
	printWindow.document.close();
}

/** Escape HTML entities */
function escapeHtml(str: string): string {
	return str
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}

/** Escape attribute values */
function escapeAttr(str: string): string {
	return str
		.replace(/"/g, "&quot;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;");
}
