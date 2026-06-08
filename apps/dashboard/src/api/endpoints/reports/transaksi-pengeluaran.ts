/**
 * Manual API hook for Transaksi Pengeluaran report
 */

import type { UseQueryOptions } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";
import { customInstance } from "../../mutator/custom-instance";

// Types
export interface TransaksiPengeluaranParams {
	month: number;
	year: number;
	academic_year_id?: number;
}

export interface TransaksiPengeluaranItem {
	no: number;
	category_name: string;
	description: string;
	amount: number;
}

export interface TransaksiPengeluaranBlock {
	id: number;
	transaction_date: string;
	source: string;
	total_amount: number;
	total_terbilang: string;
	description: string;
	category_name: string;
	created_by_name: string;
	created_at: string;
	items: TransaksiPengeluaranItem[];
}

export interface TransaksiPengeluaranData {
	month: number;
	year: number;
	academic_year: string;
	transactions: TransaksiPengeluaranBlock[];
	grand_total: number;
}

interface ApiResponse {
	data: { message: string; data: TransaksiPengeluaranData };
	status: number;
}

// Fetcher
export const getReportsTransaksiPengeluaran = async (
	params: TransaksiPengeluaranParams,
	options?: RequestInit,
): Promise<ApiResponse> => {
	return customInstance<ApiResponse>("/v1/reports/transaksi-pengeluaran", {
		...options,
		method: "GET",
		params: params as unknown as Record<string, unknown>,
	});
};

// Query key
export const getReportsTransaksiPengeluaranQueryKey = (
	params?: TransaksiPengeluaranParams,
) => {
	return [
		"/v1/reports/transaksi-pengeluaran",
		...(params ? [params] : []),
	] as const;
};

// Hook
export function useGetReportsTransaksiPengeluaran(
	params: TransaksiPengeluaranParams,
	options?: { query?: Partial<UseQueryOptions<ApiResponse>> },
) {
	const queryKey = getReportsTransaksiPengeluaranQueryKey(params);
	const queryFn = ({ signal }: { signal: AbortSignal }) =>
		getReportsTransaksiPengeluaran(params, { signal });

	return useQuery({
		queryKey,
		queryFn,
		...options?.query,
	});
}
