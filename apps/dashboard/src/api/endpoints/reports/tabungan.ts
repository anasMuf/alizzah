/**
 * Manual API hook for Tabungan (Savings) report
 */
import { useQuery } from '@tanstack/react-query';
import type { UseQueryOptions } from '@tanstack/react-query';
import { customInstance } from '../../mutator/custom-instance';

// Types
export interface TabunganReportParams {
  month: number;
  year: number;
  type?: string; // general | mandatory | kosong = semua
}

export interface TabunganReportRow {
  date: string;
  penerimaan: number;
  pengeluaran: number;
  selisih: number;
  saldo: number;
}

export interface TabunganTotalBulan {
  penerimaan: number;
  pengeluaran: number;
  selisih: number;
}

export interface TabunganReportData {
  month: number;
  year: number;
  type_label: string;
  type?: string;
  saldo_sebelum: number;
  rows: TabunganReportRow[];
  total_bulan: TabunganTotalBulan;
  saldo_akhir: number;
}

interface ApiResponse {
  data: { message: string; data: TabunganReportData };
  status: number;
}

// Fetcher
export const getReportsTabungan = async (
  params: TabunganReportParams,
  options?: RequestInit,
): Promise<ApiResponse> => {
  return customInstance<ApiResponse>('/v1/reports/tabungan', {
    ...options,
    method: 'GET',
    params: params as unknown as Record<string, unknown>,
  });
};

// Query key
export const getReportsTabunganQueryKey = (params?: TabunganReportParams) => {
  return ['/v1/reports/tabungan', ...(params ? [params] : [])] as const;
};

// Hook
export function useGetReportsTabungan(
  params: TabunganReportParams,
  options?: { query?: Partial<UseQueryOptions<ApiResponse>> },
) {
  const queryKey = getReportsTabunganQueryKey(params);
  const queryFn = ({ signal }: { signal: AbortSignal }) =>
    getReportsTabungan(params, { signal });

  return useQuery({
    queryKey,
    queryFn,
    ...options?.query,
  });
}
