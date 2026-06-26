import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useAtom } from "jotai";
import { useState } from "react";
import {
	incomeTransactionKeys,
	useCreateIncomeTransaction,
} from "#/api/endpoints/income-transactions/income-transactions";
import { useToast } from "#/components/ui";
import { academicYearAtom } from "@/store/global";

export const CATEGORY_OPTIONS = [
	{ value: "bos", label: "Dana BOS" },
	{ value: "donasi", label: "Donasi" },
	{ value: "hibah", label: "Hibah" },
	{ value: "lainnya", label: "Lainnya" },
];

export function useIncomeForm() {
	const navigate = useNavigate();
	const [activeAy] = useAtom(academicYearAtom);
	const queryClient = useQueryClient();
	const { addToast } = useToast();

	const [category, setCategory] = useState("bos");
	const [sourceName, setSourceName] = useState("");
	const [amount, setAmount] = useState("");
	const [transactionDate, setTransactionDate] = useState(
		new Date().toISOString().split("T")[0],
	);
	const [referenceNumber, setReferenceNumber] = useState("");
	const [notes, setNotes] = useState("");

	const createMutation = useCreateIncomeTransaction({
		mutation: {
			onSuccess: () => {
				addToast({
					variant: "success",
					title: "Berhasil",
					message: "Penerimaan berhasil dicatat.",
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
					message: err.message || "Gagal mencatat penerimaan.",
				});
			},
		},
	});

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		createMutation.mutate({
			academic_year_id: activeAy?.id || 0,
			category,
			source_name: sourceName,
			amount: Number(amount),
			transaction_date: transactionDate,
			reference_number: referenceNumber || undefined,
			notes: notes || undefined,
		} as any);
	};

	return {
		category,
		setCategory,
		sourceName,
		setSourceName,
		amount,
		setAmount,
		transactionDate,
		setTransactionDate,
		referenceNumber,
		setReferenceNumber,
		notes,
		setNotes,
		isPending: createMutation.isPending,
		handleSubmit,
		canSubmit: !!sourceName.trim() && Number(amount) > 0 && !!transactionDate,
	};
}
