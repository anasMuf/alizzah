import { ChevronRight, Edit, FolderTree, Plus, Trash2 } from "lucide-react";
import type { DtoExpenseCategoryResponse } from "#/api/model";
import { Button, ConfirmDialog, EmptyState } from "#/components/ui";

interface CategoryListProps {
	categories: DtoExpenseCategoryResponse[];
	isLoading: boolean;
	isError: boolean;
	onAddRoot: () => void;
	onAddChild: (parentId: number) => void;
	onEdit: (cat: DtoExpenseCategoryResponse) => void;
	onDelete: (cat: DtoExpenseCategoryResponse) => void;
	isDeleteOpen: boolean;
	onCloseDelete: () => void;
	categoryToDelete: DtoExpenseCategoryResponse | null;
	onConfirmDelete: () => void;
}

export function CategoryList({
	categories,
	isLoading,
	isError,
	onAddRoot,
	onAddChild,
	onEdit,
	onDelete,
	isDeleteOpen,
	onCloseDelete,
	categoryToDelete,
	onConfirmDelete,
}: CategoryListProps) {
	if (isLoading)
		return (
			<div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 h-64 animate-pulse" />
		);
	if (isError)
		return (
			<div className="bg-red-50 p-4 rounded-md text-red-800">
				Gagal memuat data kategori.
			</div>
		);
	if (categories.length === 0) {
		return (
			<EmptyState
				title="Belum ada kategori"
				description="Tambah kategori utama untuk mulai mengorganisir pengeluaran."
				icon={<FolderTree className="h-6 w-6 text-gray-500" />}
				action={
					<Button onClick={onAddRoot} className="flex items-center gap-2">
						<Plus className="h-4 w-4" />
						Tambah Kategori
					</Button>
				}
			/>
		);
	}

	return (
		<>
			<div className="space-y-4">
				{categories.map((parent) => (
					<div
						key={parent.id}
						className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 overflow-hidden"
					>
						<div className="px-5 py-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
							<div className="flex items-center gap-3">
								<FolderTree className="h-5 w-5 text-gray-400" />
								<h3 className="text-sm font-semibold text-gray-900">
									{parent.name}
								</h3>
								<span className="text-xs text-gray-500">
									{parent.children?.length || 0} sub-kategori
								</span>
							</div>
							<div className="flex items-center gap-1">
								<button
									type="button"
									onClick={() => onAddChild(parent.id as number)}
									className="p-1.5 text-gray-400 hover:text-indigo-600 rounded"
									title="Tambah sub-kategori"
								>
									<Plus className="h-4 w-4" />
								</button>
								<button
									type="button"
									onClick={() => onEdit(parent)}
									className="p-1.5 text-gray-400 hover:text-indigo-600 rounded"
									title="Edit kategori"
								>
									<Edit className="h-4 w-4" />
								</button>
								<button
									type="button"
									onClick={() => onDelete(parent)}
									className="p-1.5 text-gray-400 hover:text-red-600 rounded"
									title="Hapus kategori"
								>
									<Trash2 className="h-4 w-4" />
								</button>
							</div>
						</div>
						{parent.children && parent.children.length > 0 ? (
							<ul className="divide-y divide-gray-100">
								{parent.children.map((child) => (
									<li
										key={child.id}
										className="px-5 py-3 flex items-center justify-between hover:bg-gray-50"
									>
										<div className="flex items-center gap-2 pl-6">
											<ChevronRight className="h-3 w-3 text-gray-300" />
											<span className="text-sm text-gray-700">
												{child.name}
											</span>
										</div>
										<div className="flex items-center gap-1">
											<button
												type="button"
												onClick={() => onEdit(child)}
												className="p-1.5 text-gray-400 hover:text-indigo-600 rounded"
											>
												<Edit className="h-4 w-4" />
											</button>
											<button
												type="button"
												onClick={() => onDelete(child)}
												className="p-1.5 text-gray-400 hover:text-red-600 rounded"
											>
												<Trash2 className="h-4 w-4" />
											</button>
										</div>
									</li>
								))}
							</ul>
						) : (
							<div className="px-5 py-4 text-sm text-gray-400 italic pl-11">
								Belum ada sub-kategori.
							</div>
						)}
					</div>
				))}
			</div>
			<ConfirmDialog
				open={isDeleteOpen}
				onCancel={onCloseDelete}
				onConfirm={onConfirmDelete}
				title="Hapus Kategori"
				variant="danger"
				confirmLabel="Hapus"
				cancelLabel="Batal"
			>
				<p>
					Anda yakin ingin menghapus kategori{" "}
					<strong>{categoryToDelete?.name}</strong>?
					{(categoryToDelete?.children?.length ?? 0) > 0 && (
						<> Kategori yang memiliki sub-kategori tidak dapat dihapus.</>
					)}
				</p>
			</ConfirmDialog>
		</>
	);
}
