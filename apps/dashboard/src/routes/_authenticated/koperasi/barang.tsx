import { createFileRoute } from "@tanstack/react-router";
import { Edit, Package, Plus, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import {
	Badge,
	Button,
	ConfirmDialog,
	EmptyState,
	useToast,
} from "#/components/ui";
import { formatCurrency } from "#/utils/format";
import {
	type Product,
	useDeleteProduct,
	useProducts,
} from "../../../features/koperasi/barang/api";
import { BarangForm } from "../../../features/koperasi/barang/BarangForm";

export const Route = createFileRoute("/_authenticated/koperasi/barang")({
	component: BarangPage,
});

function BarangPage() {
	const { addToast } = useToast();
	const [search, setSearch] = useState("");
	const [isFormOpen, setIsFormOpen] = useState(false);
	const [selected, setSelected] = useState<Product | null>(null);
	const [toDelete, setToDelete] = useState<Product | null>(null);

	const { data: products = [], isLoading, isError } = useProducts();
	const deleteP = useDeleteProduct();

	const filtered = useMemo(
		() =>
			products.filter((p) =>
				p.name.toLowerCase().includes(search.toLowerCase()),
			),
		[products, search],
	);

	const openCreate = () => {
		setSelected(null);
		setIsFormOpen(true);
	};
	const openEdit = (p: Product) => {
		setSelected(p);
		setIsFormOpen(true);
	};

	const handleDelete = () => {
		if (!toDelete) return;
		deleteP.mutate(toDelete.id, {
			onSuccess: () => {
				addToast({
					variant: "success",
					title: "Berhasil",
					message: "Barang dihapus.",
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
					<h1 className="text-2xl font-bold text-gray-900">Barang</h1>
					<p className="text-sm text-gray-500">
						Daftar barang dagangan koperasi. Stok dikelola oleh transaksi
						pembelian & penjualan.
					</p>
				</div>
				<Button variant="primary" onClick={openCreate}>
					<Plus className="h-4 w-4 mr-1.5" /> Tambah Barang
				</Button>
			</div>

			<div className="relative max-w-sm">
				<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
				<input
					type="text"
					placeholder="Cari nama barang..."
					value={search}
					onChange={(e) => setSearch(e.target.value)}
					className="w-full pl-9 pr-3 py-2 text-sm rounded-md border border-gray-300 focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600"
				/>
			</div>

			{isLoading ? (
				<p className="text-sm text-gray-500">Memuat data barang...</p>
			) : isError ? (
				<p className="text-sm text-red-600">Gagal memuat data barang.</p>
			) : filtered.length === 0 ? (
				<EmptyState
					icon={<Package className="h-10 w-10 text-gray-400" />}
					title="Belum ada barang"
					description="Tambahkan barang dagangan untuk mulai mencatat jual-beli koperasi."
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
									Kategori
								</th>
								<th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">
									Harga Modal
								</th>
								<th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">
									Harga Jual
								</th>
								<th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">
									Stok
								</th>
								<th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
									Status
								</th>
								<th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">
									Aksi
								</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-gray-100">
							{filtered.map((p) => (
								<tr key={p.id} className="hover:bg-gray-50">
									<td className="px-4 py-3 text-sm font-medium text-gray-900">
										{p.name}
										{p.unit ? (
											<span className="text-gray-400"> / {p.unit}</span>
										) : null}
										{p.variant_count > 1 ? (
											<span className="ml-2 align-middle">
												<Badge variant="secondary">
													{p.variant_count} varian
												</Badge>
											</span>
										) : null}
									</td>
									<td className="px-4 py-3 text-sm text-gray-600">
										{p.category || "-"}
									</td>
									<td className="px-4 py-3 text-sm text-gray-600 text-right">
										{formatCurrency(p.cost_price)}
									</td>
									<td className="px-4 py-3 text-sm text-gray-900 text-right">
										{formatCurrency(p.sale_price)}
									</td>
									<td className="px-4 py-3 text-sm text-right">
										<span
											className={
												p.stock <= 0
													? "font-semibold text-red-600"
													: "text-gray-900"
											}
										>
											{p.stock}
										</span>
									</td>
									<td className="px-4 py-3">
										<Badge variant={p.is_active ? "success" : "secondary"}>
											{p.is_active ? "Aktif" : "Nonaktif"}
										</Badge>
									</td>
									<td className="px-4 py-3 text-right">
										<div className="flex justify-end gap-2">
											<button
												type="button"
												onClick={() => openEdit(p)}
												className="text-gray-400 hover:text-indigo-600"
												title="Edit"
											>
												<Edit className="h-4 w-4" />
											</button>
											<button
												type="button"
												onClick={() => setToDelete(p)}
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

			<BarangForm
				isOpen={isFormOpen}
				onClose={() => setIsFormOpen(false)}
				initialData={selected}
			/>

			<ConfirmDialog
				open={!!toDelete}
				onCancel={() => setToDelete(null)}
				onConfirm={handleDelete}
				title="Hapus Barang"
				confirmLabel="Hapus"
				variant="danger"
			>
				<p>
					Yakin menghapus barang <strong>{toDelete?.name}</strong>?
				</p>
			</ConfirmDialog>
		</div>
	);
}
