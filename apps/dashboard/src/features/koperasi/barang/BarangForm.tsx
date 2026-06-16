import { useEffect, useState } from "react";
import { ApiError } from "#/api/mutator/custom-instance";
import { Button, FormField, SlideOver, useToast } from "#/components/ui";
import { MasterSelect } from "../master/MasterSelect";
import {
	type Product,
	type ProductInput,
	useCreateProduct,
	useUpdateProduct,
} from "./api";

interface BarangFormProps {
	isOpen: boolean;
	onClose: () => void;
	initialData?: Product | null;
}

const EMPTY: ProductInput = {
	name: "",
	category: "",
	unit: "",
	cost_price: 0,
	sale_price: 0,
	stock: 0,
	is_active: true,
};

export function BarangForm({ isOpen, onClose, initialData }: BarangFormProps) {
	const { addToast } = useToast();
	const isEditing = !!initialData;
	const [form, setForm] = useState<ProductInput>(EMPTY);

	useEffect(() => {
		if (!isOpen) return;
		if (initialData) {
			setForm({
				name: initialData.name,
				category: initialData.category ?? "",
				unit: initialData.unit ?? "",
				cost_price: initialData.cost_price,
				sale_price: initialData.sale_price,
				is_active: initialData.is_active,
			});
		} else {
			setForm(EMPTY);
		}
	}, [isOpen, initialData]);

	const createP = useCreateProduct();
	const updateP = useUpdateProduct();
	const isPending = createP.isPending || updateP.isPending;

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		const cbs = {
			onSuccess: () => {
				addToast({
					variant: "success",
					title: "Berhasil",
					message: `Barang berhasil ${isEditing ? "diperbarui" : "ditambahkan"}.`,
				});
				onClose();
			},
			onError: (err: Error) =>
				addToast({
					variant: "error",
					title: "Gagal",
					message: err instanceof ApiError ? err.message : "Terjadi kesalahan",
				}),
		};
		if (isEditing && initialData) {
			updateP.mutate({ id: initialData.id, data: form }, cbs);
		} else {
			createP.mutate(form, cbs);
		}
	};

	return (
		<SlideOver
			isOpen={isOpen}
			onClose={onClose}
			title={isEditing ? "Edit Barang" : "Tambah Barang"}
			footer={
				<>
					<Button variant="secondary" onClick={onClose} disabled={isPending}>
						Batal
					</Button>
					<Button variant="primary" onClick={handleSubmit} disabled={isPending}>
						{isPending ? "Menyimpan..." : "Simpan"}
					</Button>
				</>
			}
		>
			<form onSubmit={handleSubmit} className="space-y-6">
				<FormField
					id="name"
					name="name"
					label="Nama Barang"
					placeholder="e.g. Seragam Batik"
					value={form.name}
					onChange={(e) => setForm({ ...form, name: e.target.value })}
					required
				/>

				<div className="grid grid-cols-2 gap-4">
					<MasterSelect
						id="category"
						label="Kategori"
						kind="categories"
						value={form.category ?? ""}
						onChange={(v) => setForm({ ...form, category: v })}
						placeholder="— pilih kategori —"
					/>
					<MasterSelect
						id="unit"
						label="Satuan"
						kind="units"
						value={form.unit ?? ""}
						onChange={(v) => setForm({ ...form, unit: v })}
						placeholder="— pilih satuan —"
					/>
				</div>

				<div className="grid grid-cols-2 gap-4">
					<FormField
						id="cost_price"
						name="cost_price"
						type="number"
						min={0}
						step="any"
						label="Harga Modal (HPP)"
						placeholder="0"
						value={form.cost_price}
						onChange={(e) =>
							setForm({ ...form, cost_price: Number(e.target.value) || 0 })
						}
						required
					/>
					<FormField
						id="sale_price"
						name="sale_price"
						type="number"
						min={0}
						step="any"
						label="Harga Jual"
						placeholder="0"
						value={form.sale_price}
						onChange={(e) =>
							setForm({ ...form, sale_price: Number(e.target.value) || 0 })
						}
						required
					/>
				</div>

				{isEditing ? (
					<p className="text-sm text-gray-500">
						Stok saat ini: <strong>{initialData?.stock}</strong> — dikelola
						otomatis oleh transaksi pembelian/penjualan.
					</p>
				) : (
					<FormField
						id="stock"
						name="stock"
						type="number"
						min={0}
						step="1"
						label="Stok Awal"
						placeholder="0"
						value={form.stock ?? 0}
						onChange={(e) =>
							setForm({ ...form, stock: Number(e.target.value) || 0 })
						}
					/>
				)}

				<label className="flex items-center gap-2 text-sm text-gray-900">
					<input
						type="checkbox"
						checked={form.is_active ?? true}
						onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
						className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
					/>
					Barang aktif
				</label>
			</form>
		</SlideOver>
	);
}
