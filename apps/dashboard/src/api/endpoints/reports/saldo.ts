/**
 * Manual API hook for Saldo Per Pos / Semua Pos report
 */

import type { UseQueryOptions } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";
import { customInstance } from "../../mutator/custom-instance";

// Types
export interface SaldoParams {
	month?: number;
	year?: number;
	date_from?: string; // YYYY-MM-DD, takes priority over month/year
	date_to?: string; // YYYY-MM-DD
	category?: string; // single category (backward compatible)
	categories?: string; // comma-separated category names (takes priority)
	academic_year_id?: number;
	academic_year_ids?: string; // comma-separated IDs
}

export interface SaldoRow {
	date: string;
	penerimaan: number;
	pengeluaran: number;
	selisih: number;
	saldo: number;
}

export interface SaldoTotalBulan {
	penerimaan: number;
	pengeluaran: number;
	selisih: number;
}

export interface SaldoData {
	month: number;
	year: number;
	date_from?: string;
	date_to?: string;
	academic_year: string;
	post_name: string;
	category?: string;
	categories?: string[];
	post_list?: string[];
	saldo_sebelum: number;
	rows: SaldoRow[];
	total_bulan: SaldoTotalBulan;
	saldo_akhir: number;
}

interface ApiResponse {
	data: { message: string; data: SaldoData };
	status: number;
}

// Fetcher
export const getReportsSaldo = async (
	params: SaldoParams,
	options?: RequestInit,
): Promise<ApiResponse> => {
	return customInstance<ApiResponse>("/v1/reports/saldo", {
		...options,
		method: "GET",
		params: params as unknown as Record<string, unknown>,
	});
};

// Query key
export const getReportsSaldoQueryKey = (params?: SaldoParams) => {
	return ["/v1/reports/saldo", ...(params ? [params] : [])] as const;
};

// Hook
export function useGetReportsSaldo(
	params: SaldoParams,
	options?: { query?: Partial<UseQueryOptions<ApiResponse>> },
) {
	const queryKey = getReportsSaldoQueryKey(params);
	const queryFn = ({ signal }: { signal: AbortSignal }) =>
		getReportsSaldo(params, { signal });

	return useQuery({
		queryKey,
		queryFn,
		...options?.query,
	});
}
