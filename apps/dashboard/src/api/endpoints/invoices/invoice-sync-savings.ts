import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getGetV1InvoicesQueryKey } from "#/api/endpoints/invoices/invoices";
import { customInstance } from "#/api/mutator/custom-instance";

export interface SavingsMandatorySyncResult {
	total_students: number;
	total_invoices: number;
	total_synced: number;
	total_skipped: number;
	errors?: Array<{
		student_id: number;
		invoice_id?: number;
		message: string;
	}>;
}

const syncSavingsMandatory = () =>
	customInstance<{ data: SavingsMandatorySyncResult }>(
		"/v1/invoices/sync-savings-mandatory",
		{ method: "POST" },
	).then((res) => res.data);

export const useSyncSavingsMandatory = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: syncSavingsMandatory,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: getGetV1InvoicesQueryKey() });
		},
	});
};
