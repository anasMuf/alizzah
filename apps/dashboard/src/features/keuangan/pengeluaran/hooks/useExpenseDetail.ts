import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useAtom } from "jotai";
import { useEffect, useMemo, useState } from "react";
import { useGetV1ExpenseCategories } from "#/api/endpoints/expense-categories/expense-categories";
import {
	useDeleteV1ExpensesId,
	useGetV1ExpensesId,
	usePutV1ExpensesId,
} from "#/api/endpoints/expenses/expenses";
import { ApiError } from "#/api/mutator/custom-instance";
import { useToast } from "#/components/ui";
import { academicYearAtom } from "@/store/global";

export function useExpenseDetail(id: number) {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const { addToast } = useToast();
	const [activeAy] = useAtom(academicYearAtom);

	const [isEditing, setIsEditing] = useState(false);
	const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

	const [expenseDate, setExpenseDate] = useState("");
	const [parentCategoryId, setParentCategoryId] = useState("");
	const [subCategoryId, setSubCategoryId] = useState("");
	const [amount, setAmount] = useState("");
	const [description, setDescription] = useState("");
	const [formError, setFormError] = useState("");

	const { data: expenseResponse, isLoading, isError } = useGetV1ExpensesId(id);
	const expense = (expenseResponse?.data as any)?.data;

	const { data: categoriesData } = useGetV1ExpenseCategories();
	const categories: any[] = (categoriesData?.data as any)?.data || [];

	const subCategories = useMemo(() => {
		if (!parentCategoryId) return [];
		const parent = categories.find(
			(c: any) => c.id === Number(parentCategoryId),
		);
		return parent?.children || [];
	}, [categories, parentCategoryId]);

	useEffect(() => {
		if (expense && categories.length > 0) {
			setExpenseDate(expense.expense_date || "");
			setAmount(String(expense.amount || ""));
			setDescription(expense.description || "");
			const cat = expense.category;
			if (cat?.parent_name) {
				const parent = categories.find((c: any) => c.name === cat.parent_name);
				if (parent) {
					setParentCategoryId(String(parent.id));
					const child = parent.children?.find((c: any) => c.name === cat.name);
					if (child) setSubCategoryId(String(child.id));
				}
			} else if (cat?.id) {
				for (const parent of categories) {
					const child = parent.children?.find((c: any) => c.id === cat.id);
					if (child) {
						setParentCategoryId(String(parent.id));
						setSubCategoryId(String(child.id));
						break;
					}
				}
			}
		}
	}, [expense, categories]);

	const updateMutation = usePutV1ExpensesId({
		mutation: {
			onSuccess: () => {
				addToast({
					variant: "success",
					title: "Berhasil",
					message: "Pengeluaran berhasil diperbarui.",
				});
				queryClient.invalidateQueries({ queryKey: [`/v1/expenses/${id}`] });
				queryClient.invalidateQueries({ queryKey: ["/v1/expenses"] });
				setIsEditing(false);
			},
			onError: (error: Error) => {
				setFormError(
					error instanceof ApiError
						? error.message
						: "Gagal memperbarui pengeluaran.",
				);
			},
		},
	});

	const deleteMutation = useDeleteV1ExpensesId({
		mutation: {
			onSuccess: () => {
				addToast({
					variant: "success",
					title: "Berhasil",
					message: "Pengeluaran berhasil dihapus.",
				});
				navigate({ to: "/keuangan/pengeluaran" });
			},
			onError: (error: Error) => {
				const msg =
					error instanceof ApiError
						? error.message
						: "Gagal menghapus pengeluaran.";
				addToast({ variant: "error", title: "Gagal", message: msg });
				setConfirmDeleteOpen(false);
			},
		},
	});

	const handleSave = () => {
		setFormError("");
		if (
			!subCategoryId ||
			!amount ||
			Number(amount) <= 0 ||
			!description.trim()
		) {
			setFormError("Semua field wajib diisi dengan benar.");
			return;
		}
		if (!activeAy?.id) {
			setFormError("Tahun ajaran belum dipilih.");
			return;
		}
		updateMutation.mutate({
			id,
			data: {
				academic_year_id: activeAy.id,
				expense_category_id: Number(subCategoryId),
				expense_date: expenseDate,
				amount: Number(amount),
				description: description.trim(),
			},
		});
	};

	const handleCancelEdit = () => {
		setIsEditing(false);
		setFormError("");
		if (expense) {
			setExpenseDate(expense.expense_date || "");
			setAmount(String(expense.amount || ""));
			setDescription(expense.description || "");
		}
	};

	const getCategoryDisplay = () => {
		const cat = expense?.category;
		if (!cat) return { parent: "-", child: "-" };
		return { parent: cat.parent_name || "-", child: cat.name || "-" };
	};

	return {
		expense,
		isLoading,
		isError,
		isEditing,
		setIsEditing,
		confirmDeleteOpen,
		setConfirmDeleteOpen,
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
		formError,
		setFormError,
		categories,
		subCategories,
		categoryDisplay: getCategoryDisplay(),
		isPending: updateMutation.isPending,
		handleSave,
		handleCancelEdit,
		handleDelete: () => deleteMutation.mutate({ id }),
	};
}
