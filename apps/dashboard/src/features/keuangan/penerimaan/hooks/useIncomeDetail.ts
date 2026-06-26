import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
	incomeTransactionKeys,
	useDeleteIncomeTransaction,
	useGetIncomeTransaction,
} from "#/api/endpoints/income-transactions/income-transactions";
import { useToast } from "#/components/ui";

export function useIncomeDetail(id: number) {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const { addToast } = useToast();
	const [showDelete, setShowDelete] = useState(false);

	const { data: resp, isLoading } = useGetIncomeTransaction(id);
	const item = ((resp as any)?.data as any)?.data;

	const deleteMutation = useDeleteIncomeTransaction({
		mutation: {
			onSuccess: () => {
				addToast({
					variant: "success",
					title: "Berhasil",
					message: "Penerimaan berhasil dihapus.",
				});
				queryClient.invalidateQueries({ queryKey: incomeTransactionKeys.all });
				queryClient.invalidateQueries({ queryKey: ["/v1/cash/balance"] });
				queryClient.invalidateQueries({ queryKey: ["/v1/cash/transactions"] });
				navigate({ to: "/keuangan/penerimaan" });
			},
			onError: (err: any) => {
				addToast({
					variant: "error",
					title: "Gagal",
					message: err.message || "Gagal menghapus.",
				});
			},
		},
	});

	return {
		item,
		isLoading,
		showDelete,
		setShowDelete,
		handleDelete: () => deleteMutation.mutate(id),
	};
}
