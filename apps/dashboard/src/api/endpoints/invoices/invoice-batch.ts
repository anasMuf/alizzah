/**
 * Custom hook: batch fetch invoice details.
 * Replaces N useQueries(getGetV1InvoicesIdQueryOptions(id)) with 1 request.
 */
import { useQuery } from "@tanstack/react-query";
import type { DtoInvoiceDetailResponse } from "../../model/dtoInvoiceDetailResponse";
import { customInstance } from "../../mutator/custom-instance";

export function useGetV1InvoicesBatch(
	ids: number[],
	options?: { enabled?: boolean },
) {
	const idsStr = ids.join(",");
	return useQuery<DtoInvoiceDetailResponse[]>({
		queryKey: ["invoices-batch", idsStr],
		queryFn: async () => {
			if (ids.length === 0) return [];
			const resp = await customInstance<{ data: DtoInvoiceDetailResponse[] }>(
				`/v1/invoices/batch?ids=${idsStr}`,
			);
			return (resp.data as any)?.data || [];
		},
		enabled: options?.enabled !== false && ids.length > 0,
		staleTime: 10 * 1000,
	});
}
