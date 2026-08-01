/**
 * Manual API hook for Laporan Pengeluaran (per-transaction detail)
 */

import type { UseQueryOptions } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";
import { customInstance } from "../../mutator/custom-instance";

export interface PengeluaranParams {
	date_from?: string;
	date_to?: string;
	payment_method?: string;
	fee_item_ids?: string;
	expense_category_ids?: string;
	academic_year_id?: number;
}

export interface PengeluaranRow {
	date: string;
	category: string;
	description: string;
	amount: number;
}

export interface PengeluaranData {
	date_from: string;
	date_to: string;
	academic_year: string;
	rows: PengeluaranRow[];
	grand_total: number;
}

interface ApiResponse {
	data: { message: string; data: PengeluaranData };
	status: number;
}

export const getReportsPengeluaran = async (
	params: PengeluaranParams,
	options?: RequestInit,
): Promise<ApiResponse> => {
	return customInstance<ApiResponse>("/v1/reports/pengeluaran", {
		...options,
		method: "GET",
		params: params as unknown as Record<string, unknown>,
	});
};

export const getReportsPengeluaranQueryKey = (params?: PengeluaranParams) => {
	return ["/v1/reports/pengeluaran", ...(params ? [params] : [])] as const;
};

export function useGetReportsPengeluaran(
	params: PengeluaranParams,
	options?: { query?: Partial<UseQueryOptions<ApiResponse>> },
) {
	const queryKey = getReportsPengeluaranQueryKey(params);
	const queryFn = ({ signal }: { signal: AbortSignal }) =>
		getReportsPengeluaran(params, { signal });

	return useQuery({
		queryKey,
		queryFn,
		enabled: false,
		...options?.query,
	});
}
