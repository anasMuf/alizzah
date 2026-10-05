/**
 * Manual API client untuk per-bulan zone override fasilitas (antar jemput).
 * Endpoint baru — TIDAK di-generate Orval; pola sama seperti invoice-quantity.ts.
 */

import { customInstance } from "../../mutator/custom-instance";

// ── Types ─────────────────────────────────────────────────────────────

export interface PutFacilityMonthZoneRequest {
	month: number;
	year: number;
	/** Zona utk bulan tsb; null = "tanpa zona". Kembali ke default → pakai DELETE. */
	fee_config_item_id: number | null;
	/** true utk mengizinkan rewrite item yang sudah dibayar (selisih jadi sisa/kelebihan bayar). */
	force?: boolean;
}

export interface FacilityMonthZoneResponseData {
	month: number;
	year: number;
	fee_config_item_id: number | null;
	/** "override" | "default" */
	source: string;
	invoice_item_updated: boolean;
	item_paid_amount: number;
	/** amount - paid; negatif = kelebihan bayar. */
	remaining_or_excess: number;
}

export interface FacilityMonthZoneResponse {
	data: {
		message: string;
		data: FacilityMonthZoneResponseData;
	};
	status: number;
	headers: Headers;
}

// ── Functions ─────────────────────────────────────────────────────────

/** PUT /v1/students/{id}/facilities/{facilityId}/month-zone — set override zona utk satu bulan. */
export const putFacilityMonthZone = async (
	studentId: number,
	sfId: number,
	data: PutFacilityMonthZoneRequest,
	options?: RequestInit,
): Promise<FacilityMonthZoneResponse> => {
	return customInstance<FacilityMonthZoneResponse>(
		`/v1/students/${studentId}/facilities/${sfId}/month-zone`,
		{
			...options,
			method: "PUT",
			headers: { "Content-Type": "application/json", ...options?.headers },
			body: JSON.stringify(data),
		},
	);
};

/** DELETE /v1/students/{id}/facilities/{facilityId}/month-zone — hapus override (kembali ke default). */
export const deleteFacilityMonthZone = async (
	studentId: number,
	sfId: number,
	month: number,
	year: number,
	force: boolean,
	options?: RequestInit,
): Promise<FacilityMonthZoneResponse> => {
	return customInstance<FacilityMonthZoneResponse>(
		`/v1/students/${studentId}/facilities/${sfId}/month-zone?month=${month}&year=${year}&force=${force}`,
		{ ...options, method: "DELETE" },
	);
};
