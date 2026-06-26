import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { Button } from "#/components/ui";
import { CategoryFormSlideOver } from "#/features/keuangan/pengeluaran/components/CategoryFormSlideOver";
import { CategoryList } from "#/features/keuangan/pengeluaran/components/CategoryList";
import { useCategoryList } from "#/features/keuangan/pengeluaran/hooks/useCategoryList";

export const Route = createFileRoute(
	"/_authenticated/keuangan/pengeluaran/kategori",
)({
	component: ExpenseCategoryPage,
});

function ExpenseCategoryPage() {
	const cat = useCategoryList();

	return (
		<div className="space-y-6">
			<div className="sm:flex sm:items-center sm:justify-between">
				<div>
					<h1 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:tracking-tight">
						Kategori Pengeluaran
					</h1>
					<p className="mt-1 text-sm text-gray-500">
						Kelola kategori dan sub-kategori pengeluaran operasional (maksimal 2
						level).
					</p>
				</div>
				<div className="mt-4 sm:ml-4 sm:mt-0">
					<Button
						onClick={cat.handleAddRoot}
						className="flex items-center gap-2"
					>
						<Plus className="h-4 w-4" />
						Tambah Kategori Utama
					</Button>
				</div>
			</div>

			<CategoryList
				categories={cat.categories}
				isLoading={cat.isLoading}
				isError={cat.isError}
				onAddRoot={cat.handleAddRoot}
				onAddChild={cat.handleAddChild}
				onEdit={cat.handleEdit}
				onDelete={cat.handleDelete}
				isDeleteOpen={cat.isDeleteOpen}
				onCloseDelete={() => cat.setIsDeleteOpen(false)}
				categoryToDelete={cat.categoryToDelete}
				onConfirmDelete={cat.handleConfirmDelete}
			/>

			<CategoryFormSlideOver
				isOpen={cat.isFormOpen}
				onClose={() => cat.setIsFormOpen(false)}
				initialData={cat.editingCategory}
				parentId={cat.parentIdForNew}
				onSuccess={cat.invalidate}
			/>
		</div>
	);
}
