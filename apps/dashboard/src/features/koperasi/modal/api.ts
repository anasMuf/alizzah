import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { kopGet, kopSend } from "../lib/client";

export interface CapitalInjection {
	id: number;
	academic_year_id: number;
	injection_date: string;
	amount: number;
	notes?: string;
	created_by?: string;
	created_at: string;
}

export interface CapitalInjectionInput {
	academic_year_id: number;
	injection_date: string;
	amount: number;
	notes?: string;
}

export const modalKeys = {
	all: ["koperasi", "capital-injections"] as const,
	list: (ayId: number) => ["koperasi", "capital-injections", ayId] as const,
};

export function useCapitalInjections(ayId?: number) {
	return useQuery({
		queryKey: modalKeys.list(ayId ?? 0),
		queryFn: () =>
			kopGet<CapitalInjection[]>("/capital-injections", {
				academic_year_id: ayId,
			}),
		enabled: !!ayId,
	});
}

export function useCreateCapitalInjection() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (data: CapitalInjectionInput) =>
			kopSend<CapitalInjection>("POST", "/capital-injections", data),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: modalKeys.all });
			// Penyaluran modal mengkredit kas koperasi → segarkan saldo & jurnal.
			qc.invalidateQueries({ queryKey: ["koperasi", "cash"] });
		},
	});
}
