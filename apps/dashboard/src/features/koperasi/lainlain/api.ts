import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { kopGetPaged, kopSend } from "../lib/client";

export type Flow = "income" | "expense";

export interface MiscTransaction {
	id: number;
	academic_year_id: number;
	flow: Flow;
	category: string;
	amount: number;
	transaction_date: string;
	description?: string;
	created_by?: string;
	created_at: string;
}

export interface MiscInput {
	academic_year_id: number;
	flow: Flow;
	category: string;
	amount: number;
	transaction_date: string;
	description?: string;
}

export const miscKeys = {
	all: ["koperasi", "misc"] as const,
	list: (ayId: number, page: number, flow: string) =>
		["koperasi", "misc", ayId, page, flow] as const,
};

export function useMiscTransactions(
	ayId?: number,
	page = 1,
	flow = "",
	limit = 20,
) {
	return useQuery({
		queryKey: miscKeys.list(ayId ?? 0, page, flow),
		queryFn: () =>
			kopGetPaged<MiscTransaction[]>("/misc-transactions", {
				academic_year_id: ayId,
				page,
				limit,
				...(flow ? { flow } : {}),
			}),
		enabled: !!ayId,
	});
}

export function useCreateMisc() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (data: MiscInput) =>
			kopSend<MiscTransaction>("POST", "/misc-transactions", data),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: miscKeys.all });
			// Transaksi lain-lain memengaruhi kas → segarkan saldo & jurnal.
			qc.invalidateQueries({ queryKey: ["koperasi", "cash"] });
		},
	});
}
