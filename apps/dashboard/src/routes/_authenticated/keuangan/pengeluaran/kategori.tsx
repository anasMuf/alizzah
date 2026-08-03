import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { ChevronRight, Edit, FolderTree, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import {
	getGetV1ExpenseCategoriesQueryKey,
	useDeleteV1ExpenseCategoriesId,
	useGetV1ExpenseCategories,
	usePostV1ExpenseCategories,
	usePutV1ExpenseCategoriesId,
} from "#/api/endpoints/expense-categories/expense-categories";
import type { DtoExpenseCategoryResponse } from "#/api/model";
import { ApiError } from "#/api/mutator/custom-instance";
import {
	Button,
	ConfirmDialog,
	EmptyState,
	FormField,
	SlideOver,
	useToast,
} from "#/components/ui";

export const Route = createFileRoute(
	"/_authenticated/keuangan/pengeluaran/kategori",
)({
	component: ExpenseCategoryPage,
});

function ExpenseCategoryPage() {
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
						: "Gagal menghapus kategori. Mungkin masih digunakan oleh pengeluaran.";
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
					<Button onClick={handleAddRoot} className="flex items-center gap-2">
						<Plus className="h-4 w-4" />
						Tambah Kategori Utama
					</Button>
				</div>
			</div>

			{isLoading ? (
				<div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 h-64 animate-pulse" />
			) : isError ? (
				<div className="bg-red-50 p-4 rounded-md text-red-800">
					Gagal memuat data kategori.
				</div>
			) : categories.length === 0 ? (
				<EmptyState
					title="Belum ada kategori"
					description="Tambah kategori utama untuk mulai mengorganisir pengeluaran."
					icon={<FolderTree className="h-6 w-6 text-gray-500" />}
					action={
						<Button onClick={handleAddRoot} className="flex items-center gap-2">
							<Plus className="h-4 w-4" />
							Tambah Kategori
						</Button>
					}
				/>
			) : (
				<div className="space-y-4">
					{categories.map((parent) => (
						<div
							key={parent.id}
							className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 overflow-hidden"
						>
							{/* Parent category header */}
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
										onClick={() => handleAddChild(parent.id as number)}
										className="p-1.5 text-gray-400 hover:text-indigo-600 rounded"
										title="Tambah sub-kategori"
									>
										<Plus className="h-4 w-4" />
									</button>
									<button
										onClick={() => handleEdit(parent)}
										className="p-1.5 text-gray-400 hover:text-indigo-600 rounded"
										title="Edit kategori"
									>
										<Edit className="h-4 w-4" />
									</button>
									<button
										onClick={() => handleDelete(parent)}
										className="p-1.5 text-gray-400 hover:text-red-600 rounded"
										title="Hapus kategori"
									>
										<Trash2 className="h-4 w-4" />
									</button>
								</div>
							</div>

							{/* Children */}
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
													onClick={() => handleEdit(child)}
													className="p-1.5 text-gray-400 hover:text-indigo-600 rounded"
												>
													<Edit className="h-4 w-4" />
												</button>
												<button
													onClick={() => handleDelete(child)}
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
			)}

			<CategoryFormSlideOver
				isOpen={isFormOpen}
				onClose={() => setIsFormOpen(false)}
				initialData={editingCategory}
				parentId={parentIdForNew}
				onSuccess={invalidate}
			/>

			<ConfirmDialog
				open={isDeleteOpen}
				onCancel={() => setIsDeleteOpen(false)}
				onConfirm={() =>
					categoryToDelete &&
					deleteMutation.mutate({ id: categoryToDelete.id as number })
				}
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
		</div>
	);
}

// Valid invoice_category values yang bisa dipilih untuk parent kategori.
// Mencakup seluruh fee_config_items.category + income_transactions.category.
const INVOICE_CATEGORY_OPTIONS = [
	{ value: "", label: "(Tidak terkait income tertentu)" },
	// Fee item categories
	{ value: "initial", label: "Biaya Awal (initial)" },
	{ value: "registration", label: "Biaya Registrasi (registration)" },
	{ value: "monthly_spp", label: "SPP (monthly_spp)" },
	{ value: "monthly_infaq", label: "Infaq Harian (monthly_infaq)" },
	{ value: "pasta", label: "Pasta & Ekskul (pasta)" },
	{ value: "savings_mandatory", label: "Tabungan Wajib (savings_mandatory)" },
	{ value: "daycare", label: "Daycare (daycare)" },
	{ value: "graduation", label: "Wisuda (graduation)" },
	{ value: "facility", label: "Fasilitas (facility)" },
	// Income transaction categories (dana bantuan)
	{ value: "bos", label: "Dana BOS (bos)" },
	{ value: "donasi", label: "Donasi (donasi)" },
	{ value: "hibah", label: "Hibah (hibah)" },
	{ value: "lainnya", label: "Penerimaan Lainnya (lainnya)" },
];

function CategoryFormSlideOver({
	isOpen,
	onClose,
	initialData,
	parentId,
	onSuccess,
}: {
	isOpen: boolean;
	onClose: () => void;
	initialData: DtoExpenseCategoryResponse | null;
	parentId?: number;
	onSuccess: () => void;
}) {
	const { addToast } = useToast();
	const isEditing = !!initialData;
	const isParent = !parentId && (!initialData || !initialData.parent_id);

	const [name, setName] = useState("");
	const [invoiceCategory, setInvoiceCategory] = useState("");

	useEffect(() => {
		if (isOpen) {
			setName(initialData?.name || "");
			setInvoiceCategory(initialData?.invoice_category || "");
		}
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
				const msg =
					error instanceof ApiError
						? error.message
						: "Gagal menambahkan kategori.";
				addToast({ variant: "error", title: "Gagal", message: msg });
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
				const msg =
					error instanceof ApiError
						? error.message
						: "Gagal memperbarui kategori.";
				addToast({ variant: "error", title: "Gagal", message: msg });
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

		const payload = {
			name: name.trim(),
			...(parentId ? { parent_id: parentId } : {}),
			// Hanya kirim invoice_category untuk parent (bukan sub-kategori)
			...(isParent && invoiceCategory
				? { invoice_category: invoiceCategory }
				: {}),
		};

		if (isEditing && initialData) {
			updateMutation.mutate({
				id: initialData.id as number,
				data: payload,
			});
		} else {
			createMutation.mutate({ data: payload });
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
						parentId
							? "e.g. ATK, Listrik, dll."
							: "e.g. Operasional, Personalia, dll."
					}
					value={name}
					onChange={(e) => setName(e.target.value)}
					required
					maxLength={100}
				/>

				{/* Invoice category — hanya untuk parent (bukan sub-kategori) */}
				{isParent && (
					<div>
						<label
							htmlFor="invoiceCategory"
							className="block text-sm font-medium leading-6 text-gray-900 mb-2"
						>
							Kategori Pendapatan Terkait
						</label>
						<select
							id="invoiceCategory"
							value={invoiceCategory}
							onChange={(e) => setInvoiceCategory(e.target.value)}
							className="block w-full rounded-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
						>
							{INVOICE_CATEGORY_OPTIONS.map((opt) => (
								<option key={opt.value} value={opt.value}>
									{opt.label}
								</option>
							))}
						</select>
						<p className="mt-2 text-sm text-gray-500">
							Pilih kategori pendapatan yang terkait untuk laporan posisi kas.
							Biarkan kosong jika tidak terkait pendapatan tertentu.
						</p>
					</div>
				)}

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
