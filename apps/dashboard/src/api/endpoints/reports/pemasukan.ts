/**
 * Manual API hook for Laporan Pemasukan
 * Calls existing income-transactions API with date range + payment method filter,
 * then client-side groups by date.
 */

import type { UseQueryOptions } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";
import { customInstance } from "../../mutator/custom-instance";

// Types
export interface PemasukanParams {
	date_from?: string;
	date_to?: string;
	payment_method?: string;
	fee_item_ids?: string;
	academic_year_id?: number;
}

export interface PemasukanItem {
	no: number;
	category: string;
	description: string;
	amount: number;
}

export interface PemasukanTransaction {
	id: number;
	source: string;
	payment_method: string;
	terbilang: string;
	transaction_date: string;
	transaction_no: string;
	petugas: string;
	items: PemasukanItem[];
	total_amount: number;
}

export interface PemasukanDateBlock {
	date: string;
	transactions: PemasukanTransaction[];
	subtotal: number;
}

export interface PemasukanData {
	date_from: string;
	date_to: string;
	academic_year: string;
	transactions: PemasukanDateBlock[];
	grand_total: number;
}

interface ApiResponse {
	data: { message: string; data: PemasukanData };
	status: number;
}

// Fetcher — delegates to backend report endpoint if available, else combine
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
		enabled: false, // triggered manually by Generate button
		...options?.query,
	});
}
