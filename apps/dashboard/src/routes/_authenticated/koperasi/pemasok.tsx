import { createFileRoute } from "@tanstack/react-router";
import { Edit, Plus, Search, Trash2, Truck } from "lucide-react";
import { useMemo, useState } from "react";
import { Button, ConfirmDialog, EmptyState, useToast } from "#/components/ui";
import {
	type Supplier,
	useDeleteSupplier,
	useSuppliers,
} from "../../../features/koperasi/pemasok/api";
import { PemasokForm } from "../../../features/koperasi/pemasok/PemasokForm";

export const Route = createFileRoute("/_authenticated/koperasi/pemasok")({
	component: PemasokPage,
});

function PemasokPage() {
	const { addToast } = useToast();
	const [search, setSearch] = useState("");
	const [isFormOpen, setIsFormOpen] = useState(false);
	const [selected, setSelected] = useState<Supplier | null>(null);
	const [toDelete, setToDelete] = useState<Supplier | null>(null);

	const { data: suppliers = [], isLoading, isError } = useSuppliers();
	const deleteS = useDeleteSupplier();

	const filtered = useMemo(
		() =>
			suppliers.filter((s) =>
				s.name.toLowerCase().includes(search.toLowerCase()),
			),
		[suppliers, search],
	);

	const openCreate = () => {
		setSelected(null);
		setIsFormOpen(true);
	};
	const openEdit = (s: Supplier) => {
		setSelected(s);
		setIsFormOpen(true);
	};

	const handleDelete = () => {
		if (!toDelete) return;
		deleteS.mutate(toDelete.id, {
			onSuccess: () => {
				addToast({
					variant: "success",
					title: "Berhasil",
					message: "Pemasok dihapus.",
				});
				setToDelete(null);
			},
			onError: (e: Error) => {
				addToast({ variant: "error", title: "Gagal", message: e.message });
				setToDelete(null);
			},
		});
	};

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">Pemasok</h1>
					<p className="text-sm text-gray-500">
						Daftar pemasok barang koperasi untuk pencatatan pembelian.
					</p>
				</div>
				<Button variant="primary" onClick={openCreate}>
					<Plus className="h-4 w-4 mr-1.5" /> Tambah Pemasok
				</Button>
			</div>

			<div className="relative max-w-sm">
				<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
				<input
					type="text"
					placeholder="Cari nama pemasok..."
					value={search}
					onChange={(e) => setSearch(e.target.value)}
					className="w-full pl-9 pr-3 py-2 text-sm rounded-md border border-gray-300 focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600"
				/>
			</div>

			{isLoading ? (
				<p className="text-sm text-gray-500">Memuat data pemasok...</p>
			) : isError ? (
				<p className="text-sm text-red-600">Gagal memuat data pemasok.</p>
			) : filtered.length === 0 ? (
				<EmptyState
					icon={<Truck className="h-10 w-10 text-gray-400" />}
					title="Belum ada pemasok"
					description="Tambahkan pemasok untuk mulai mencatat pembelian barang."
				/>
			) : (
				<div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
					<table className="min-w-full divide-y divide-gray-200">
						<thead className="bg-gray-50">
							<tr>
								<th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
									Nama
								</th>
								<th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
									Narahubung
								</th>
								<th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
									Telepon
								</th>
								<th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">
									Aksi
								</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-gray-100">
							{filtered.map((s) => (
								<tr key={s.id} className="hover:bg-gray-50">
									<td className="px-4 py-3 text-sm font-medium text-gray-900">
										{s.name}
									</td>
									<td className="px-4 py-3 text-sm text-gray-600">
										{s.contact_person || "-"}
									</td>
									<td className="px-4 py-3 text-sm text-gray-600">
										{s.phone || "-"}
									</td>
									<td className="px-4 py-3 text-right">
										<div className="flex justify-end gap-2">
											<button
												type="button"
												onClick={() => openEdit(s)}
												className="text-gray-400 hover:text-indigo-600"
												title="Edit"
											>
												<Edit className="h-4 w-4" />
											</button>
											<button
												type="button"
												onClick={() => setToDelete(s)}
												className="text-gray-400 hover:text-red-600"
												title="Hapus"
											>
												<Trash2 className="h-4 w-4" />
											</button>
										</div>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}

			<PemasokForm
				isOpen={isFormOpen}
				onClose={() => setIsFormOpen(false)}
				initialData={selected}
			/>

			<ConfirmDialog
				open={!!toDelete}
				onCancel={() => setToDelete(null)}
				onConfirm={handleDelete}
				title="Hapus Pemasok"
				confirmLabel="Hapus"
				variant="danger"
			>
				<p>
					Yakin menghapus pemasok <strong>{toDelete?.name}</strong>?
				</p>
			</ConfirmDialog>
		</div>
	);
}
