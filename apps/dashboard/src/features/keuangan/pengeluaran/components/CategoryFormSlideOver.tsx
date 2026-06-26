import { useEffect, useState } from "react";
import {
	usePostV1ExpenseCategories,
	usePutV1ExpenseCategoriesId,
} from "#/api/endpoints/expense-categories/expense-categories";
import type { DtoExpenseCategoryResponse } from "#/api/model";
import { ApiError } from "#/api/mutator/custom-instance";
import { Button, FormField, SlideOver, useToast } from "#/components/ui";

interface CategoryFormSlideOverProps {
	isOpen: boolean;
	onClose: () => void;
	initialData: DtoExpenseCategoryResponse | null;
	parentId?: number;
	onSuccess: () => void;
}

export function CategoryFormSlideOver({
	isOpen,
	onClose,
	initialData,
	parentId,
	onSuccess,
}: CategoryFormSlideOverProps) {
	const { addToast } = useToast();
	const isEditing = !!initialData;
	const [name, setName] = useState("");

	useEffect(() => {
		if (isOpen) setName(initialData?.name || "");
	}, [isOpen, initialData]);

	const createMutation = usePostV1ExpenseCategories({
		mutation: {
			onSuccess: () => {
				addToast({
					variant: "success",
					title: "Berhasil",
					message: "Kategori berhasil ditambahkan.",
				});
				onSuccess();
				onClose();
			},
			onError: (error: Error) => {
				addToast({
					variant: "error",
					title: "Gagal",
					message:
						error instanceof ApiError
							? error.message
							: "Gagal menambahkan kategori.",
				});
			},
		},
	});
	const updateMutation = usePutV1ExpenseCategoriesId({
		mutation: {
			onSuccess: () => {
				addToast({
					variant: "success",
					title: "Berhasil",
					message: "Kategori berhasil diperbarui.",
				});
				onSuccess();
				onClose();
			},
			onError: (error: Error) => {
				addToast({
					variant: "error",
					title: "Gagal",
					message:
						error instanceof ApiError
							? error.message
							: "Gagal memperbarui kategori.",
				});
			},
		},
	});

	const isPending = createMutation.isPending || updateMutation.isPending;
	const title = isEditing
		? "Edit Kategori"
		: parentId
			? "Tambah Sub-kategori"
			: "Tambah Kategori Utama";

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (!name.trim()) return;
		if (isEditing && initialData) {
			updateMutation.mutate({
				id: initialData.id as number,
				data: {
					name: name.trim(),
					...(initialData.parent_id
						? { parent_id: initialData.parent_id }
						: {}),
				},
			});
		} else {
			createMutation.mutate({
				data: {
					name: name.trim(),
					...(parentId ? { parent_id: parentId } : {}),
				},
			});
		}
	};

	return (
		<SlideOver
			isOpen={isOpen}
			onClose={onClose}
			title={title}
			footer={
				<>
					<Button variant="secondary" onClick={onClose} disabled={isPending}>
						Batal
					</Button>
					<Button
						variant="primary"
						onClick={handleSubmit}
						disabled={isPending || !name.trim()}
					>
						{isPending ? "Menyimpan..." : "Simpan"}
					</Button>
				</>
			}
		>
			<form onSubmit={handleSubmit} className="space-y-6">
				<FormField
					id="name"
					name="name"
					label="Nama Kategori"
					placeholder={
						parentId ? "e.g. ATK, Listrik" : "e.g. Operasional, Personalia"
					}
					value={name}
					onChange={(e) => setName(e.target.value)}
					required
					maxLength={100}
				/>
				{parentId && (
					<p className="text-sm text-gray-500">
						Sub-kategori ini akan ditambahkan di bawah kategori induk yang
						dipilih.
					</p>
				)}
			</form>
		</SlideOver>
	);
}
