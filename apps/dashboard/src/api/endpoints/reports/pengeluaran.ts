/**
 * Manual API hook for Laporan Pengeluaran
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

export interface PengeluaranItem {
	no: number;
	expense_category: string;
	description: string;
	amount: number;
}

export interface PengeluaranTransaction {
	id: number;
	source: string;
	payment_method: string;
	terbilang: string;
	transaction_date: string;
	transaction_no: string;
	petugas: string;
	items: PengeluaranItem[];
	total_amount: number;
}

export interface PengeluaranDateBlock {
	date: string;
	transactions: PengeluaranTransaction[];
	subtotal: number;
}

export interface PengeluaranData {
	date_from: string;
	date_to: string;
	academic_year: string;
	transactions: PengeluaranDateBlock[];
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
		enabled: false, // triggered manually by Generate button
		...options?.query,
	});
}
