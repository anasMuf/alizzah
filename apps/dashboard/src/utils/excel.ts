/**
 * Excel export utilities.
 * Uses lazy-loaded xlsx to avoid bloating initial route bundles.
 */

/**
 * Represents a column definition for Excel export.
 */
export interface ExcelColumn {
	/** Column header text */
	header: string;
	/** Key in the data object to extract value from */
	key: string;
	/** Optional width (approximate character count) */
	width?: number;
	/** Optional formatter function */
	format?: (value: unknown, row: Record<string, unknown>) => string;
}

/**
 * Represents a sheet definition for multi-sheet Excel export.
 */
export interface ExcelSheet {
	/** Sheet name (max 31 chars per Excel spec) */
	name: string;
	/** Column definitions */
	columns: ExcelColumn[];
	/** Row data */
	data: Record<string, unknown>[];
}

/**
 * Generate and download an Excel file from sheet definitions.
 * Dynamically imports xlsx (SheetJS) only when called to keep bundle sizes small.
 */
export async function downloadExcel(
	sheets: ExcelSheet[],
	filename: string,
): Promise<void> {
	// Dynamic import ESM build xlsx — lebih kompatibel dengan Vite
	const XLSX = await import("xlsx/xlsx.mjs");

	const workbook = XLSX.utils.book_new();

	for (const sheet of sheets) {
		// Build header row and data rows
		const headers = sheet.columns.map((col) => col.header);
		const rows = sheet.data.map((row) =>
			sheet.columns.map((col) => {
				const raw = row[col.key];
				if (col.format) return col.format(raw, row);
				return raw ?? "";
			}),
		);

		// Prepend headers to rows
		const sheetData = [headers, ...rows];

		// Create worksheet
		const worksheet = XLSX.utils.aoa_to_sheet(sheetData);

		// Set column widths if provided
		if (sheet.columns.some((c) => c.width)) {
			worksheet["!cols"] = sheet.columns.map((col) => ({
				wch: col.width ?? 15,
			}));
		}

		// Sanitize sheet name (max 31 chars)
		const safeName = sheet.name.slice(0, 31);

		XLSX.utils.book_append_sheet(workbook, worksheet, safeName);
	}

	// Trigger download
	XLSX.writeFile(workbook, `${filename}.xlsx`, {
		bookType: "xlsx",
		type: "binary",
	});
}

/**
 * Format a date string (ISO) for Excel display in Indonesian locale.
 */
export function formatDateId(dateStr: unknown): string {
	if (!dateStr) return "-";
	try {
		const d = new Date(dateStr as string);
		if (Number.isNaN(d.getTime())) return String(dateStr);
		return d.toLocaleDateString("id-ID", {
			day: "numeric",
			month: "long",
			year: "numeric",
		});
	} catch {
		return String(dateStr);
	}
}

/**
 * Map gender code to readable label.
 */
export function formatGender(g: unknown): string {
	if (g === "L") return "Laki-laki";
	if (g === "P") return "Perempuan";
	return String(g ?? "-");
}

/**
 * Map status code to readable label.
 */
export function formatStatus(s: unknown): string {
	const map: Record<string, string> = {
		active: "Aktif",
		graduated: "Lulus",
		transferred: "Pindah",
		dropped: "Keluar",
	};
	return map[String(s)] ?? String(s ?? "-");
}
