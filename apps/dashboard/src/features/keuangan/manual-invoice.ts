import type {
	DtoCreateInvoiceItemRequest,
	DtoCreateInvoiceRequest,
	DtoCreateInvoiceRequestType,
} from "#/api/model";
import { DtoCreateInvoiceRequestType as InvoiceType } from "#/api/model";

/**
 * Logika murni untuk form "Tambah Tagihan" — dipisahkan dari komponen agar bisa
 * diuji tanpa DOM.
 *
 * Dua mode mengikuti kecocokan tahun ajaran:
 * - `itemized` (type `manual`)  → tagihan rinci, item diambil dari tarif, total otomatis
 * - `total`    (type `arrears`) → tunggakan historis, satu nominal total tanpa rincian
 *
 * Mode ditentukan **mutlak** oleh tahun ajaran yang dipilih, bukan pilihan bebas:
 * mode rinci hanya untuk TA aktif yang sudah punya konfigurasi tarif, dan mode
 * total hanya untuk TA lain. Lihat `modeAvailability`.
 */
export type ManualInvoiceMode = "itemized" | "total";

export interface ManualInvoiceItemDraft {
	name: string;
	category: string;
	amount: number;
	quantity?: number;
	unitPrice?: number;
}

export interface ManualInvoiceFormState {
	studentId?: number;
	academicYearId?: number;
	academicYearName?: string;
	mode: ManualInvoiceMode;
	/** Dipakai pada mode `total`. */
	totalAmount: number;
	/** Dipakai pada mode `itemized`. */
	items: ManualInvoiceItemDraft[];
	notes: string;
	dueDate: string;
	/** Apakah TA terpilih adalah TA aktif — menentukan mode yang sah. */
	isActiveAcademicYear: boolean;
	/** Apakah TA terpilih sudah punya konfigurasi tarif — syarat mode rinci. */
	hasTariffConfig: boolean;
}

/** Mode default: TA aktif → rinci; TA lain (tunggakan historis) → nominal total. */
export function defaultManualInvoiceMode(
	isActiveAcademicYear: boolean,
): ManualInvoiceMode {
	return isActiveAcademicYear ? "itemized" : "total";
}

export interface ModeAvailability {
	allowed: boolean;
	reason?: string;
}

/**
 * Apakah sebuah mode sah untuk tahun ajaran terpilih.
 *
 * Aturan (menggantikan escape hatch lama — mode tidak lagi bisa dipaksa):
 * - mode `itemized` hanya sah untuk TA aktif **dan** yang sudah punya tarif,
 *   karena itemnya diambil dari tarif milik TA itu.
 * - mode `total` hanya sah untuk TA selain TA aktif.
 */
export function modeAvailability(params: {
	mode: ManualInvoiceMode;
	isActiveAcademicYear: boolean;
	hasTariffConfig: boolean;
}): ModeAvailability {
	const { mode, isActiveAcademicYear, hasTariffConfig } = params;

	if (mode === "itemized") {
		if (!isActiveAcademicYear) {
			return {
				allowed: false,
				reason: "Mode rinci hanya untuk tahun ajaran aktif.",
			};
		}
		if (!hasTariffConfig) {
			return {
				allowed: false,
				reason: "Tahun ajaran ini belum punya konfigurasi tarif.",
			};
		}
		return { allowed: true };
	}

	if (isActiveAcademicYear) {
		return {
			allowed: false,
			reason: "Tahun ajaran aktif memakai mode rinci sesuai tarif.",
		};
	}
	return { allowed: true };
}

/**
 * Apakah kombinasi tahun ajaran ini punya mode yang bisa dipakai sama sekali.
 *
 * `false` hanya terjadi pada TA aktif yang belum punya konfigurasi tarif: mode
 * rinci terhalang syarat tarif, mode total terhalang aturan TA aktif. Dalam
 * kondisi ini form memang tidak bisa dipakai sampai tarif TA tersebut diatur.
 */
export function hasUsableMode(params: {
	isActiveAcademicYear: boolean;
	hasTariffConfig: boolean;
}): boolean {
	return (
		modeAvailability({ mode: "itemized", ...params }).allowed ||
		modeAvailability({ mode: "total", ...params }).allowed
	);
}

export function manualInvoiceType(
	mode: ManualInvoiceMode,
): DtoCreateInvoiceRequestType {
	return mode === "itemized" ? InvoiceType.manual : InvoiceType.arrears;
}

export interface FeeItemLike {
	name?: string;
	amount?: number;
	category?: string;
	unit?: string;
	level?: string;
	gender?: string;
}

/**
 * Tarif yang relevan untuk seorang siswa: level & gender harus cocok.
 * Nilai kosong atau "all" pada tarif selalu dianggap cocok.
 */
export function filterFeeItemsForStudent<T extends FeeItemLike>(
	items: T[],
	studentLevel?: string | null,
	studentGender?: string | null,
): T[] {
	return items.filter((item) => {
		const levelMatch =
			!item.level || item.level === "all" || item.level === studentLevel;
		const genderMatch =
			!item.gender || item.gender === "all" || item.gender === studentGender;
		return levelMatch && genderMatch;
	});
}

/** Tarif berbasis kuantitas (mis. fasilitas per hari, tabungan wajib per Senin). */
export function isQuantityBasedUnit(unit?: string): boolean {
	return unit === "per_day" || unit === "per_monday";
}

export function feeItemUnitLabel(unit?: string): string {
	if (unit === "per_monday") return "Senin";
	if (unit === "per_day") return "hari";
	return "";
}

/** Nominal tarif: unit berbasis kuantitas dikalikan kuantitas, selain itu flat. */
export function calculateFeeItemAmount(
	item: FeeItemLike,
	quantity: number,
): number {
	const base = Number(item.amount) || 0;
	if (isQuantityBasedUnit(item.unit)) {
		return base * (Number(quantity) || 0);
	}
	return base;
}

export function sumDraftAmounts(items: { amount: number }[]): number {
	return items.reduce((total, item) => total + (Number(item.amount) || 0), 0);
}

/** Mengembalikan pesan kesalahan pertama, atau `null` bila valid. */
export function validateManualInvoice(
	state: ManualInvoiceFormState,
): string | null {
	if (!state.studentId) return "Siswa wajib dipilih";
	if (!state.academicYearId) return "Tahun ajaran wajib dipilih";

	// Mode harus sah untuk TA terpilih — mencegah state basi ikut tersubmit.
	const availability = modeAvailability({
		mode: state.mode,
		isActiveAcademicYear: state.isActiveAcademicYear,
		hasTariffConfig: state.hasTariffConfig,
	});
	if (!availability.allowed) {
		return availability.reason ?? "Mode tagihan tidak sesuai tahun ajaran";
	}

	if (state.mode === "total") {
		if (!(state.totalAmount > 0)) return "Nominal tunggakan harus lebih dari 0";
		if (!state.notes.trim()) {
			return "Keterangan wajib diisi untuk tagihan tunggakan";
		}
		return null;
	}

	if (state.items.length === 0) return "Tambahkan minimal satu item tagihan";
	for (const item of state.items) {
		if (!item.name.trim()) return "Nama item wajib diisi";
		if (!(item.amount > 0)) {
			return `Nominal item '${item.name}' harus lebih dari 0`;
		}
	}
	return null;
}

/** Nama item tunggakan, mis. "Tunggakan TA 2024/2025". */
export function arrearsItemName(academicYearName?: string): string {
	return academicYearName ? `Tunggakan TA ${academicYearName}` : "Tunggakan";
}

/**
 * Tagihan yang diinput admin (bukan hasil generate) — hanya jenis ini yang boleh
 * diubah/dihapus lewat UI. Backend menegakkan hal yang sama pada `DELETE`.
 */
export function isManualInvoiceType(type?: string): boolean {
	return type === "arrears" || type === "manual";
}

/**
 * Boleh dihapus dari UI: tagihan manual yang belum dibayar.
 *
 * Server juga menolak bila masih ada `payment_item` meski `paid_amount == 0`
 * (409) — kasus itu tidak dapat diketahui dari data yang ada di klien, sehingga
 * pesan dari API ditampilkan apa adanya.
 */
export function canDeleteManualInvoice(
	type?: string,
	paidAmount?: number,
): boolean {
	return isManualInvoiceType(type) && (Number(paidAmount) || 0) === 0;
}

/**
 * Membentuk payload `POST /v1/invoices`. `total_amount` tidak pernah dikirim —
 * server menghitungnya dari item.
 */
export function buildCreateInvoicePayload(
	state: ManualInvoiceFormState,
): DtoCreateInvoiceRequest {
	const items: DtoCreateInvoiceItemRequest[] =
		state.mode === "total"
			? [
					{
						name: arrearsItemName(state.academicYearName),
						category: "arrears",
						amount: state.totalAmount,
					},
				]
			: state.items.map((item) => ({
					name: item.name.trim(),
					category: item.category,
					amount: item.amount,
					...(item.quantity != null ? { quantity: item.quantity } : {}),
					...(item.unitPrice != null ? { unit_price: item.unitPrice } : {}),
				}));

	return {
		student_id: state.studentId as number,
		academic_year_id: state.academicYearId as number,
		type: manualInvoiceType(state.mode),
		notes: state.notes.trim(),
		...(state.dueDate ? { due_date: state.dueDate } : {}),
		items,
	};
}
