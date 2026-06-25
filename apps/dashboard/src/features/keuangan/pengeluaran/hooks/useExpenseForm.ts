import { useNavigate } from "@tanstack/react-router";
import { useAtom } from "jotai";
import { useMemo, useState } from "react";
import { useGetV1ExpenseCategories } from "#/api/endpoints/expense-categories/expense-categories";
import { usePostV1Expenses } from "#/api/endpoints/expenses/expenses";
import { useToast } from "#/components/ui";
import { academicYearAtom } from "@/store/global";

export function useExpenseForm() {
	const navigate = useNavigate();
	const [activeAy] = useAtom(academicYearAtom);
	const { addToast } = useToast();
	const today = new Date().toISOString().split("T")[0];

	const [expenseDate, setExpenseDate] = useState(today);
	const [parentCategoryId, setParentCategoryId] = useState("");
	const [subCategoryId, setSubCategoryId] = useState("");
	const [amount, setAmount] = useState("");
	const [description, setDescription] = useState("");
	const [_receiptFile, setReceiptFile] = useState("");
	const [formError, setFormError] = useState("");
	const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

	const { data: categoriesData } = useGetV1ExpenseCategories();
	const categories: any[] = (categoriesData?.data as any)?.data || [];

	const subCategories = useMemo(() => {
		if (!parentCategoryId) return [];
		const parent = categories.find(
			(c: any) => c.id === Number(parentCategoryId),
		);
		return parent?.children || [];
	}, [categories, parentCategoryId]);

	const createMutation = usePostV1Expenses({
		mutation: {
			onSuccess: () => {
				addToast({
					variant: "success",
					title: "Berhasil",
					message: "Pengeluaran berhasil dicatat.",
				});
				navigate({ to: "/keuangan/pengeluaran" });
			},
			onError: (err: any) => {
				const status = err?.status || err?.response?.status;
				const data = err?.response?.data || err?.data;
				if (status === 422) {
					setFormError(data?.message || "Tanggal ini sudah ditutup buku.");
					return;
				}
				if (status === 400 && data?.errors) {
					const errors: Record<string, string> = {};
					for (const [key, val] of Object.entries(data.errors) as [
						string,
						any,
					][]) {
						errors[key] = Array.isArray(val) ? val[0] : val;
					}
					setFieldErrors(errors);
					return;
				}
				setFormError(
					data?.message || err?.message || "Gagal menyimpan pengeluaran.",
				);
			},
		},
	});

	const validate = (): boolean => {
		const errors: Record<string, string> = {};
		if (!expenseDate) errors.expense_date = "Tanggal wajib diisi.";
		if (!subCategoryId)
			errors.expense_category_id = "Sub-kategori wajib dipilih.";
		if (!amount || Number(amount) <= 0)
			errors.amount = "Nominal harus lebih dari 0.";
		if (!description.trim()) errors.description = "Keterangan wajib diisi.";
		setFieldErrors(errors);
		return Object.keys(errors).length === 0;
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		setFormError("");
		if (!validate()) return;
		if (!activeAy?.id) {
			setFormError("Tahun ajaran belum dipilih.");
			return;
		}
		createMutation.mutate({
			data: {
				academic_year_id: activeAy.id,
				expense_category_id: Number(subCategoryId),
				expense_date: expenseDate,
				amount: Number(amount),
				description: description.trim(),
				receipt_url: undefined,
			},
		});
	};

	return {
		activeAy,
		categories,
		subCategories,
		expenseDate,
		setExpenseDate,
		parentCategoryId,
		setParentCategoryId,
		subCategoryId,
		setSubCategoryId,
		amount,
		setAmount,
		description,
		setDescription,
		receiptFile: _receiptFile,
		setReceiptFile,
		formError,
		setFormError,
		fieldErrors,
		setFieldErrors,
		isPending: createMutation.isPending,
		handleSubmit,
	};
}
