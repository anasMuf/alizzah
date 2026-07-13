import { useEffect, useState } from "react";
import { ApiError } from "#/api/mutator/custom-instance";
import {
	Button,
	CurrencyInput,
	FormField,
	Label,
	SlideOver,
	useToast,
} from "#/components/ui";
import { MasterSelect } from "../master/MasterSelect";
import {
	type Product,
	type ProductInput,
	useCreateProduct,
	useUpdateProduct,
	type VariantInput,
} from "./api";

interface BarangFormProps {
	isOpen: boolean;
	onClose: () => void;
	initialData?: Product | null;
}

const DEFAULT_VARIANT = "Default";

// Baris varian dalam form (id ada → varian existing; stok read-only saat edit).
interface VariantRow {
	id?: number;
	name: string;
	cost_price: number;
	sale_price: number;
	stock: number;
	is_active: boolean;
}

const emptyRow = (): VariantRow => ({
	name: "",
	cost_price: 0,
	sale_price: 0,
	stock: 0,
	is_active: true,
});

const inputClass =
	"block w-full rounded-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm";

export function BarangForm({ isOpen, onClose, initialData }: BarangFormProps) {
	const { addToast } = useToast();
	const isEditing = !!initialData;

	const [name, setName] = useState("");
	const [category, setCategory] = useState("");
	const [unit, setUnit] = useState("");
	const [isActive, setIsActive] = useState(true);

	// Mode varian. Simple = satu varian "Default" (harga & stok tunggal).
	const [hasVariants, setHasVariants] = useState(false);
	const [single, setSingle] = useState({
		cost_price: 0,
		sale_price: 0,
		stock: 0,
	});
	const [variants, setVariants] = useState<VariantRow[]>([emptyRow()]);

	useEffect(() => {
		if (!isOpen) return;
		if (initialData) {
			setName(initialData.name);
			setCategory(initialData.category ?? "");
			setUnit(initialData.unit ?? "");
			setIsActive(initialData.is_active);

			const vs = initialData.variants ?? [];
			const isSimple =
				vs.length <= 1 && (vs.length === 0 || vs[0].name === DEFAULT_VARIANT);
			setHasVariants(!isSimple);
			if (isSimple) {
				const v = vs[0];
				setSingle({
					cost_price: v?.cost_price ?? initialData.cost_price,
					sale_price: v?.sale_price ?? initialData.sale_price,
					stock: v?.stock ?? initialData.stock,
				});
				setVariants([emptyRow()]);
			} else {
				setVariants(
					vs.map((v) => ({
						id: v.id,
						name: v.name,
						cost_price: v.cost_price,
						sale_price: v.sale_price,
						stock: v.stock,
						is_active: v.is_active,
					})),
				);
			}
		} else {
			setName("");
			setCategory("");
			setUnit("");
			setIsActive(true);
			setHasVariants(false);
			setSingle({ cost_price: 0, sale_price: 0, stock: 0 });
			setVariants([emptyRow()]);
		}
	}, [isOpen, initialData]);

	const createP = useCreateProduct();
	const updateP = useUpdateProduct();
	const isPending = createP.isPending || updateP.isPending;

	// Saat mengaktifkan mode varian, bawa harga dari mode simple sebagai varian pertama.
	const toggleVariants = (on: boolean) => {
		if (on && !hasVariants) {
			setVariants([
				{
					name: "",
					cost_price: single.cost_price,
					sale_price: single.sale_price,
					stock: single.stock,
					is_active: true,
				},
			]);
		}
		setHasVariants(on);
	};

	const updateRow = (i: number, patch: Partial<VariantRow>) =>
		setVariants((rows) =>
			rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)),
		);
	const addRow = () => setVariants((rows) => [...rows, emptyRow()]);
	const removeRow = (i: number) =>
		setVariants((rows) => rows.filter((_, idx) => idx !== i));

	const buildPayload = (): ProductInput | null => {
		const base: ProductInput = {
			name: name.trim(),
			category: category || undefined,
			unit: unit || undefined,
			is_active: isActive,
		};
		if (!hasVariants) {
			return {
				...base,
				cost_price: single.cost_price,
				sale_price: single.sale_price,
				stock: single.stock,
			};
		}
		if (variants.length === 0) {
			addToast({
				variant: "error",
				title: "Varian kosong",
				message: "Tambahkan minimal satu varian.",
			});
			return null;
		}
		if (variants.some((v) => !v.name.trim())) {
			addToast({
				variant: "error",
				title: "Nama varian kosong",
				message: "Setiap varian harus punya nama (mis. S, M, L).",
			});
			return null;
		}
		const payloadVariants: VariantInput[] = variants.map((v) => ({
			...(v.id ? { id: v.id } : {}),
			name: v.name.trim(),
			cost_price: v.cost_price,
			sale_price: v.sale_price,
			...(v.id ? {} : { stock: v.stock }), // stok hanya untuk varian baru
			is_active: v.is_active,
		}));
		return { ...base, variants: payloadVariants };
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (!name.trim()) {
			addToast({
				variant: "error",
				title: "Nama wajib",
				message: "Nama barang harus diisi.",
			});
			return;
		}
		const payload = buildPayload();
		if (!payload) return;

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
			updateP.mutate({ id: initialData.id, data: payload }, cbs);
		} else {
			createP.mutate(payload, cbs);
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
					value={name}
					onChange={(e) => setName(e.target.value)}
					required
				/>

				<div className="grid grid-cols-2 gap-4">
					<MasterSelect
						id="category"
						label="Kategori"
						kind="categories"
						value={category}
						onChange={setCategory}
						placeholder="— pilih kategori —"
					/>
					<MasterSelect
						id="unit"
						label="Satuan"
						kind="units"
						value={unit}
						onChange={setUnit}
						placeholder="— pilih satuan —"
					/>
				</div>

				<label className="flex items-center gap-2 text-sm text-gray-900">
					<input
						type="checkbox"
						checked={hasVariants}
						onChange={(e) => toggleVariants(e.target.checked)}
						className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
					/>
					Barang memiliki beberapa varian (mis. ukuran S/M/L)
				</label>

				{hasVariants ? (
					<div className="space-y-3">
						<div className="hidden grid-cols-[1fr_1fr_1fr_5rem_2rem] gap-2 text-xs font-medium text-gray-500 sm:grid">
							<span>Nama varian</span>
							<span>Harga Modal</span>
							<span>Harga Jual</span>
							<span>Stok</span>
							<span />
						</div>
						{variants.map((v, i) => (
							<div
								key={i}
								className="grid grid-cols-[1fr_1fr_1fr_5rem_2rem] items-center gap-2"
							>
								<input
									aria-label="Nama varian"
									className={inputClass}
									placeholder="S / M / L"
									value={v.name}
									onChange={(e) => updateRow(i, { name: e.target.value })}
								/>
								<CurrencyInput
									aria-label="Harga modal"
									className={inputClass}
									value={v.cost_price}
									onChange={(val) => updateRow(i, { cost_price: val })}
								/>
								<CurrencyInput
									aria-label="Harga jual"
									className={inputClass}
									value={v.sale_price}
									onChange={(val) => updateRow(i, { sale_price: val })}
								/>
								{v.id ? (
									<span
										className="text-center text-sm text-gray-500"
										title="Stok dikelola transaksi"
									>
										{v.stock}
									</span>
								) : (
									<input
										aria-label="Stok awal"
										type="number"
										min={0}
										step="1"
										className={inputClass}
										value={v.stock}
										onChange={(e) =>
											updateRow(i, { stock: Number(e.target.value) || 0 })
										}
									/>
								)}
								<button
									type="button"
									onClick={() => removeRow(i)}
									disabled={variants.length === 1}
									className="text-gray-400 hover:text-red-600 disabled:opacity-30"
									title="Hapus varian"
								>
									✕
								</button>
							</div>
						))}
						<Button type="button" variant="secondary" onClick={addRow}>
							+ Tambah varian
						</Button>
						<p className="text-xs text-gray-500">
							Stok varian lama dikelola otomatis oleh transaksi pembelian &
							penjualan; isian stok hanya berlaku untuk varian baru.
						</p>
					</div>
				) : (
					<>
						<div className="grid grid-cols-2 gap-4">
							<div>
								<Label htmlFor="cost_price">Harga Modal (HPP)</Label>
								<CurrencyInput
									id="cost_price"
									className={`mt-2 ${inputClass}`}
									placeholder="0"
									value={single.cost_price}
									onChange={(val) =>
										setSingle({
											...single,
											cost_price: val,
										})
									}
								/>
							</div>
							<div>
								<Label htmlFor="sale_price">Harga Jual</Label>
								<CurrencyInput
									id="sale_price"
									className={`mt-2 ${inputClass}`}
									placeholder="0"
									value={single.sale_price}
									onChange={(val) =>
										setSingle({
											...single,
											sale_price: val,
										})
									}
								/>
							</div>
						</div>

						{isEditing ? (
							<p className="text-sm text-gray-500">
								Stok saat ini: <strong>{single.stock}</strong> — dikelola
								otomatis oleh transaksi pembelian/penjualan.
							</p>
						) : (
							<div>
								<Label htmlFor="stock">Stok Awal</Label>
								<input
									id="stock"
									type="number"
									min={0}
									step="1"
									className={`mt-2 ${inputClass}`}
									placeholder="0"
									value={single.stock}
									onChange={(e) =>
										setSingle({ ...single, stock: Number(e.target.value) || 0 })
									}
								/>
							</div>
						)}
					</>
				)}

				<label className="flex items-center gap-2 text-sm text-gray-900">
					<input
						type="checkbox"
						checked={isActive}
						onChange={(e) => setIsActive(e.target.checked)}
						className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
					/>
					Barang aktif
				</label>
			</form>
		</SlideOver>
	);
}
