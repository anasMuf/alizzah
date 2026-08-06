import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, Edit, Plus, Tag, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import {
	getGetV1IncomeCategoriesQueryKey,
	useDeleteV1IncomeCategoriesId,
	useGetV1IncomeCategories,
	usePostV1IncomeCategories,
	usePutV1IncomeCategoriesId,
} from "#/api/endpoints/income-categories/income-categories";
import type { DtoIncomeCategoryResponse } from "#/api/model";
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
	"/_authenticated/keuangan/penerimaan/kategori",
)({
	component: IncomeCategoryPage,
});

function IncomeCategoryPage() {
	const queryClient = useQueryClient();
	const { addToast } = useToast();

	const [isFormOpen, setIsFormOpen] = useState(false);
	const [editingCategory, setEditingCategory] =
		useState<DtoIncomeCategoryResponse | null>(null);
	const [isDeleteOpen, setIsDeleteOpen] = useState(false);
	const [categoryToDelete, setCategoryToDelete] =
		useState<DtoIncomeCategoryResponse | null>(null);

	const { data: response, isLoading, isError } = useGetV1IncomeCategories();
	const categories: DtoIncomeCategoryResponse[] =
		((response as any)?.data as any)?.data || [];

	const invalidate = () =>
		queryClient.invalidateQueries({
			queryKey: getGetV1IncomeCategoriesQueryKey(),
		});

	const deleteMutation = useDeleteV1IncomeCategoriesId({
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
						: "Gagal menghapus kategori. Mungkin masih digunakan oleh transaksi.";
				addToast({ variant: "error", title: "Gagal", message: msg });
			},
		},
	});

	const handleAdd = () => {
		setEditingCategory(null);
		setIsFormOpen(true);
	};

	const handleEdit = (cat: DtoIncomeCategoryResponse) => {
		setEditingCategory(cat);
		setIsFormOpen(true);
	};

	const handleDelete = (cat: DtoIncomeCategoryResponse) => {
		setCategoryToDelete(cat);
		setIsDeleteOpen(true);
	};

	return (
		<div className="space-y-6">
			{/* Breadcrumb */}
			<nav className="flex items-center text-sm text-gray-500">
				<Link
					to="/keuangan/penerimaan"
					search={{} as any}
					className="hover:text-indigo-600 transition-colors"
				>
					Penerimaan
				</Link>
				<ChevronRight className="w-4 h-4 mx-1" />
				<span className="text-gray-900 font-medium">Kategori</span>
			</nav>

			<div className="sm:flex sm:items-center sm:justify-between">
				<div>
					<h1 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:tracking-tight">
						Kategori Penerimaan
					</h1>
					<p className="mt-1 text-sm text-gray-500">
						Kelola kategori penerimaan dana bantuan (Dana BOS, Donasi, Hibah,
						dll).
					</p>
				</div>
				<div className="mt-4 sm:ml-4 sm:mt-0">
					<Button onClick={handleAdd} className="flex items-center gap-2">
						<Plus className="h-4 w-4" />
						Tambah Kategori
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
					description="Tambah kategori untuk mulai mengorganisir penerimaan."
					icon={<Tag className="h-6 w-6 text-gray-500" />}
					action={
						<Button onClick={handleAdd} className="flex items-center gap-2">
							<Plus className="h-4 w-4" />
							Tambah Kategori
						</Button>
					}
				/>
			) : (
				<div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 overflow-hidden">
					<ul className="divide-y divide-gray-200">
						{categories.map((cat) => (
							<li
								key={cat.id}
								className="px-5 py-4 flex items-center justify-between hover:bg-gray-50"
							>
								<div className="flex items-center gap-3">
									<Tag className="h-5 w-5 text-indigo-400" />
									<span className="text-sm font-semibold text-gray-900">
										{cat.name}
									</span>
								</div>
								<div className="flex items-center gap-1">
									<button
										type="button"
										onClick={() => handleEdit(cat)}
										className="p-1.5 text-gray-400 hover:text-indigo-600 rounded"
										title="Edit kategori"
									>
										<Edit className="h-4 w-4" />
									</button>
									<button
										type="button"
										onClick={() => handleDelete(cat)}
										className="p-1.5 text-gray-400 hover:text-red-600 rounded"
										title="Hapus kategori"
									>
										<Trash2 className="h-4 w-4" />
									</button>
								</div>
							</li>
						))}
					</ul>
				</div>
			)}

			<CategoryFormSlideOver
				isOpen={isFormOpen}
				onClose={() => setIsFormOpen(false)}
				initialData={editingCategory}
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
				</p>
				<p className="mt-2 text-sm text-gray-500">
					Kategori yang sudah digunakan oleh transaksi tidak dapat dihapus.
				</p>
			</ConfirmDialog>
		</div>
	);
}

function CategoryFormSlideOver({
	isOpen,
	onClose,
	initialData,
	onSuccess,
}: {
	isOpen: boolean;
	onClose: () => void;
	initialData: DtoIncomeCategoryResponse | null;
	onSuccess: () => void;
}) {
	const { addToast } = useToast();
	const isEditing = !!initialData;

	const [name, setName] = useState("");

	useEffect(() => {
		if (isOpen) {
			setName(initialData?.name || "");
		}
	}, [isOpen, initialData]);

	const createMutation = usePostV1IncomeCategories({
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

	const updateMutation = usePutV1IncomeCategoriesId({
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

	const title = isEditing ? "Edit Kategori" : "Tambah Kategori";

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (!name.trim()) return;

		const payload = {
			name: name.trim(),
			// code dikosongkan — backend akan auto-generate dari name
			code: "",
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
					placeholder="Contoh: Dana BOS, Donasi"
					value={name}
					onChange={(e) => setName(e.target.value)}
					required
					maxLength={100}
				/>
			</form>
		</SlideOver>
	);
}
