/**
 * Manual API hook for Laporan Pemasukan (per-transaction detail)
 */

import type { UseQueryOptions } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";
import { customInstance } from "../../mutator/custom-instance";

export interface PemasukanParams {
	date_from?: string;
	date_to?: string;
	payment_method?: string;
	fee_item_ids?: string;
	categories?: string;
	academic_year_id?: number;
}

export interface PemasukanRow {
	date: string;
	category: string;
	description: string; // e.g. "Ahmad - SPP Juli 2026"
	amount: number;
}

export interface PemasukanData {
	date_from: string;
	date_to: string;
	academic_year: string;
	rows: PemasukanRow[];
	grand_total: number;
}

interface ApiResponse {
	data: { message: string; data: PemasukanData };
	status: number;
}

export const getReportsPemasukan = async (
	params: PemasukanParams,
	options?: RequestInit,
): Promise<ApiResponse> => {
	return customInstance<ApiResponse>("/v1/reports/pemasukan", {
		...options,
		method: "GET",
		params: params as unknown as Record<string, unknown>,
	});
};

export const getReportsPemasukanQueryKey = (params?: PemasukanParams) => {
	return ["/v1/reports/pemasukan", ...(params ? [params] : [])] as const;
};

export function useGetReportsPemasukan(
	params: PemasukanParams,
	options?: { query?: Partial<UseQueryOptions<ApiResponse>> },
) {
	const queryKey = getReportsPemasukanQueryKey(params);
	const queryFn = ({ signal }: { signal: AbortSignal }) =>
		getReportsPemasukan(params, { signal });

	return useQuery({
		queryKey,
		queryFn,
		enabled: false,
		...options?.query,
	});
}
