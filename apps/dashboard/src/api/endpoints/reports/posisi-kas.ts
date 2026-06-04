/**
 * Manual API hook for Posisi Kas report
 * (Not orval-generated — this endpoint was added after last codegen)
 */
import { useQuery } from '@tanstack/react-query';
import type { UseQueryOptions } from '@tanstack/react-query';
import { customInstance } from '../../mutator/custom-instance';

// Types
export interface PosisiKasParams {
  month: number;
  year: number;
  academic_year_id?: number;
}

export interface PosisiKasExpense {
  name: string;
  amount: number;
}

export interface PosisiKasPost {
  name: string;
  category: string;
  saldo_sebelum: number;
  penerimaan: number;
  pengeluaran: number;
  saldo_bulan: number;
  saldo_sampai: number;
  expense_details: PosisiKasExpense[] | null;
}

export interface PosisiKasTotal {
  saldo_sebelum: number;
  penerimaan: number;
  pengeluaran: number;
  saldo_bulan: number;
  saldo_sampai: number;
}

export interface PosisiKasData {
  month: number;
  year: number;
  academic_year: string;
  posts: PosisiKasPost[];
  grand_total: PosisiKasTotal;
}

interface ApiResponse {
  data: { message: string; data: PosisiKasData };
  status: number;
}

// Fetcher
export const getReportsPosisiKas = async (
  params: PosisiKasParams,
  options?: RequestInit,
): Promise<ApiResponse> => {
  return customInstance<ApiResponse>('/v1/reports/posisi-kas', {
    ...options,
    method: 'GET',
    params: params as unknown as Record<string, unknown>,
  });
};

// Query key
export const getReportsPosisiKasQueryKey = (params?: PosisiKasParams) => {
  return ['/v1/reports/posisi-kas', ...(params ? [params] : [])] as const;
};

// Hook
export function useGetReportsPosisiKas(
  params: PosisiKasParams,
  options?: { query?: Partial<UseQueryOptions<ApiResponse>> },
) {
  const queryKey = getReportsPosisiKasQueryKey(params);
  const queryFn = ({ signal }: { signal: AbortSignal }) =>
    getReportsPosisiKas(params, { signal });

  return useQuery({
    queryKey,
    queryFn,
    ...options?.query,
  });
}
