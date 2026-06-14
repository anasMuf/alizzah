import { useQuery } from "@tanstack/react-query";
import { kopGet, kopGetPaged } from "../lib/client";

export interface KasBalance {
	academic_year_id: number;
	balance: number;
}

export interface KasTransaction {
	id: number;
	transaction_date: string;
	transaction_type: "credit" | "debit";
	amount: number;
	source_type: string;
	source_id?: number;
	category?: string;
	description: string;
	created_by?: string;
}

export const kasKeys = {
	balance: (ayId: number) => ["koperasi", "cash", "balance", ayId] as const,
	transactions: (ayId: number, page: number) =>
		["koperasi", "cash", "transactions", ayId, page] as const,
};

export function useKasBalance(ayId?: number) {
	return useQuery({
		queryKey: kasKeys.balance(ayId ?? 0),
		queryFn: () =>
			kopGet<KasBalance>("/cash/balance", { academic_year_id: ayId }),
		enabled: !!ayId,
	});
}

export function useKasTransactions(ayId?: number, page = 1, limit = 20) {
	return useQuery({
		queryKey: kasKeys.transactions(ayId ?? 0, page),
		queryFn: () =>
			kopGetPaged<KasTransaction[]>("/cash/transactions", {
				academic_year_id: ayId,
				page,
				limit,
			}),
		enabled: !!ayId,
	});
}
