import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
	getGetV1ExpenseCategoriesQueryKey,
	useDeleteV1ExpenseCategoriesId,
	useGetV1ExpenseCategories,
} from "#/api/endpoints/expense-categories/expense-categories";
import type { DtoExpenseCategoryResponse } from "#/api/model";
import { ApiError } from "#/api/mutator/custom-instance";
import { useToast } from "#/components/ui";

export function useCategoryList() {
	const queryClient = useQueryClient();
	const { addToast } = useToast();

	const [isFormOpen, setIsFormOpen] = useState(false);
	const [editingCategory, setEditingCategory] =
		useState<DtoExpenseCategoryResponse | null>(null);
	const [parentIdForNew, setParentIdForNew] = useState<number | undefined>(
		undefined,
	);
	const [isDeleteOpen, setIsDeleteOpen] = useState(false);
	const [categoryToDelete, setCategoryToDelete] =
		useState<DtoExpenseCategoryResponse | null>(null);

	const { data: response, isLoading, isError } = useGetV1ExpenseCategories();
	const categories: DtoExpenseCategoryResponse[] =
		(response?.data as any)?.data || [];

	const invalidate = () =>
		queryClient.invalidateQueries({
			queryKey: getGetV1ExpenseCategoriesQueryKey(),
		});

	const deleteMutation = useDeleteV1ExpenseCategoriesId({
		mutation: {
			onSuccess: () => {
				addToast({
					variant: "success",
					title: "Berhasil",
					message: "Kategori berhasil dihapus.",
				});
				invalidate();
				setIsDeleteOpen(false);
				setCategoryToDelete(null);
			},
			onError: (error: Error) => {
				const msg =
					error instanceof ApiError
						? error.message
						: "Gagal menghapus kategori.";
				addToast({ variant: "error", title: "Gagal", message: msg });
				setIsDeleteOpen(false);
			},
		},
	});

	const handleAddRoot = () => {
		setEditingCategory(null);
		setParentIdForNew(undefined);
		setIsFormOpen(true);
	};
	const handleAddChild = (parentId: number) => {
		setEditingCategory(null);
		setParentIdForNew(parentId);
		setIsFormOpen(true);
	};
	const handleEdit = (cat: DtoExpenseCategoryResponse) => {
		setEditingCategory(cat);
		setParentIdForNew(undefined);
		setIsFormOpen(true);
	};
	const handleDelete = (cat: DtoExpenseCategoryResponse) => {
		setCategoryToDelete(cat);
		setIsDeleteOpen(true);
	};
	const handleConfirmDelete = () => {
		if (categoryToDelete)
			deleteMutation.mutate({ id: categoryToDelete.id as number });
	};

	return {
		categories,
		isLoading,
		isError,
		isFormOpen,
		setIsFormOpen,
		editingCategory,
		parentIdForNew,
		isDeleteOpen,
		setIsDeleteOpen,
		categoryToDelete,
		handleAddRoot,
		handleAddChild,
		handleEdit,
		handleDelete,
		handleConfirmDelete,
		invalidate,
	};
}
