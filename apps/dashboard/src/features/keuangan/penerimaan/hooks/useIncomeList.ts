import { useQueryClient } from "@tanstack/react-query";
import { useAtom } from "jotai";
import { useState } from "react";
import {
	incomeTransactionKeys,
	useDeleteIncomeTransaction,
	useGetIncomeTransactions,
} from "#/api/endpoints/income-transactions/income-transactions";
import { useToast } from "#/components/ui";
import { academicYearAtom } from "@/store/global";

export const CATEGORY_LABELS: Record<string, string> = {
	bos: "Dana BOS",
	donasi: "Donasi",
	hibah: "Hibah",
	lainnya: "Lainnya",
};
export const CATEGORY_VARIANTS: Record<
	string,
	"info" | "success" | "warning" | "danger"
> = { bos: "info", donasi: "success", hibah: "warning", lainnya: "danger" };
export const CATEGORY_OPTIONS = [
	{ value: "", label: "Semua Kategori" },
	{ value: "bos", label: "Dana BOS" },
	{ value: "donasi", label: "Donasi" },
	{ value: "hibah", label: "Hibah" },
	{ value: "lainnya", label: "Lainnya" },
];

export function useIncomeList() {
	const [activeAy] = useAtom(academicYearAtom);
	const queryClient = useQueryClient();
	const { addToast } = useToast();

	const [selectedCategory, setSelectedCategory] = useState("");
	const [dateFrom, setDateFrom] = useState("");
	const [dateTo, setDateTo] = useState("");
	const [page, setPage] = useState(1);
	const [deletingItem, setDeletingItem] = useState<any>(null);

	const {
		data: listData,
		isLoading,
		isError,
	} = useGetIncomeTransactions(
		{
			page,
			limit: 20,
			academic_year_id: activeAy?.id,
			...(selectedCategory ? { category: selectedCategory } : {}),
			...(dateFrom ? { start_date: dateFrom } : {}),
			...(dateTo ? { end_date: dateTo } : {}),
		},
		{ query: { enabled: !!activeAy?.id } },
	);

	const items: any[] = ((listData as any)?.data as any)?.data || [];
	const meta = ((listData as any)?.data as any)?.meta;

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
				setDeletingItem(null);
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

	const handleReset = () => {
		setSelectedCategory("");
		setDateFrom("");
		setDateTo("");
		setPage(1);
	};
	const totalAmount = items.reduce(
		(sum: number, t: any) => sum + Number(t.amount),
		0,
	);

	return {
		items,
		meta,
		isLoading,
		isError,
		selectedCategory,
		setSelectedCategory,
		dateFrom,
		setDateFrom,
		dateTo,
		setDateTo,
		page,
		setPage,
		deletingItem,
		setDeletingItem,
		handleReset,
		totalAmount,
		handleDelete: (id: number) => deleteMutation.mutate(id),
	};
}
