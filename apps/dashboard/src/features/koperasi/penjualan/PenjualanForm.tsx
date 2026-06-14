import { useAtom } from "jotai";
import { Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { ApiError } from "#/api/mutator/custom-instance";
import { Button, FormField, SlideOver, useToast } from "#/components/ui";
import { academicYearAtom } from "#/store/global";
import { formatCurrency } from "#/utils/format";
import { useProducts } from "../barang/api";
import { type PaymentMethod, type SaleInput, useCreateSale } from "./api";
import { type PickedStudent, StudentPicker } from "./StudentPicker";

interface PenjualanFormProps {
	isOpen: boolean;
	onClose: () => void;
}

interface ItemRow {
	product_id: number;
	quantity: number;
	unit_price: number;
}

const today = () => new Date().toISOString().slice(0, 10);
const emptyRow = (): ItemRow => ({ product_id: 0, quantity: 1, unit_price: 0 });

export function PenjualanForm({ isOpen, onClose }: PenjualanFormProps) {
	const { addToast } = useToast();
	const [activeAy] = useAtom(academicYearAtom);
	const { data: products = [] } = useProducts();

	const [buyerName, setBuyerName] = useState("");
	const [saleDate, setSaleDate] = useState(today());
	const [notes, setNotes] = useState("");
	const [rows, setRows] = useState<ItemRow[]>([emptyRow()]);
	const [initialPayment, setInitialPayment] = useState(0);
	const [method, setMethod] = useState<PaymentMethod>("cash");
	const [student, setStudent] = useState<PickedStudent | null>(null);

	useEffect(() => {
		if (isOpen) {
			setBuyerName("");
			setSaleDate(today());
			setNotes("");
			setRows([emptyRow()]);
			setInitialPayment(0);
			setMethod("cash");
			setStudent(null);
		}
	}, [isOpen]);

	const createS = useCreateSale();

	const setRow = (i: number, patch: Partial<ItemRow>) =>
		setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
	const addRow = () => setRows((rs) => [...rs, emptyRow()]);
	const removeRow = (i: number) =>
		setRows((rs) => (rs.length > 1 ? rs.filter((_, idx) => idx !== i) : rs));

	const onPickProduct = (i: number, productId: number) => {
		const p = products.find((x) => x.id === productId);
		setRow(i, {
			product_id: productId,
			unit_price: p ? p.sale_price : 0,
		});
	};

	const total = rows.reduce((sum, r) => sum + r.quantity * r.unit_price, 0);
	const validRows = rows.filter((r) => r.product_id > 0 && r.quantity > 0);

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (!activeAy?.id) {
			addToast({
				variant: "error",
				title: "Gagal",
				message: "Pilih tahun ajaran aktif terlebih dahulu.",
			});
			return;
		}
		if (validRows.length === 0) {
			addToast({
				variant: "error",
				title: "Gagal",
				message: "Tambahkan minimal satu barang.",
			});
			return;
		}
		if (initialPayment > total) {
			addToast({
				variant: "error",
				title: "Gagal",
				message: "Pembayaran awal melebihi total.",
			});
			return;
		}
		const payload: SaleInput = {
			academic_year_id: activeAy.id,
			student_id: student?.id,
			buyer_name: buyerName || undefined,
			sale_date: saleDate,
			notes: notes || undefined,
			items: validRows.map((r) => ({
				product_id: r.product_id,
				quantity: r.quantity,
				unit_price: r.unit_price,
			})),
			initial_payment: initialPayment > 0 ? initialPayment : undefined,
			payment_method: initialPayment > 0 ? method : undefined,
		};
		createS.mutate(payload, {
			onSuccess: () => {
				addToast({
					variant: "success",
					title: "Berhasil",
					message: "Penjualan berhasil dicatat.",
				});
				onClose();
			},
			onError: (err: Error) =>
				addToast({
					variant: "error",
					title: "Gagal",
					message: err instanceof ApiError ? err.message : "Terjadi kesalahan",
				}),
		});
	};

	return (
		<SlideOver
			isOpen={isOpen}
			onClose={onClose}
			title="Catat Penjualan"
			footer={
				<>
					<Button
						variant="secondary"
						onClick={onClose}
						disabled={createS.isPending}
					>
						Batal
					</Button>
					<Button
						variant="primary"
						onClick={handleSubmit}
						disabled={createS.isPending}
					>
						{createS.isPending ? "Menyimpan..." : "Simpan"}
					</Button>
				</>
			}
		>
			<form onSubmit={handleSubmit} className="space-y-6">
				<div>
					<span className="block text-sm font-medium leading-6 text-gray-900 mb-2">
						Siswa (opsional)
					</span>
					<StudentPicker
						selected={student}
						onSelect={setStudent}
						onClear={() => setStudent(null)}
					/>
				</div>
				<FormField
					id="buyer_name"
					name="buyer_name"
					label="Nama Pembeli (jika bukan siswa)"
					placeholder="mis. wali / umum"
					value={buyerName}
					onChange={(e) => setBuyerName(e.target.value)}
				/>
				<FormField
					id="sale_date"
					name="sale_date"
					type="date"
					label="Tanggal"
					value={saleDate}
					onChange={(e) => setSaleDate(e.target.value)}
					required
				/>

				<div className="space-y-3">
					<div className="flex items-center justify-between">
						<span className="block text-sm font-medium text-gray-900">
							Barang
						</span>
						<button
							type="button"
							onClick={addRow}
							className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-800"
						>
							<Plus className="h-4 w-4" /> Tambah item
						</button>
					</div>

					{rows.map((row, i) => {
						const subtotal = row.quantity * row.unit_price;
						return (
							<div
								key={i}
								className="rounded-md border border-gray-200 p-3 space-y-2"
							>
								<div className="flex items-center gap-2">
									<select
										value={row.product_id}
										onChange={(e) => onPickProduct(i, Number(e.target.value))}
										className="block w-full rounded-md border-0 py-1.5 text-sm text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600"
									>
										<option value={0}>Pilih barang…</option>
										{products.map((p) => (
											<option key={p.id} value={p.id}>
												{p.name} (stok {p.stock})
											</option>
										))}
									</select>
									{rows.length > 1 && (
										<button
											type="button"
											onClick={() => removeRow(i)}
											className="text-gray-400 hover:text-red-600 shrink-0"
											title="Hapus item"
										>
											<Trash2 className="h-4 w-4" />
										</button>
									)}
								</div>
								<div className="flex items-center gap-2">
									<label className="flex-1 text-xs text-gray-500">
										Qty
										<input
											type="number"
											min={1}
											value={row.quantity}
											onChange={(e) =>
												setRow(i, { quantity: Number(e.target.value) || 0 })
											}
											className="mt-1 block w-full rounded-md border-0 py-1.5 text-sm text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600"
										/>
									</label>
									<label className="flex-1 text-xs text-gray-500">
										Harga satuan
										<input
											type="number"
											min={0}
											step="any"
											value={row.unit_price}
											onChange={(e) =>
												setRow(i, { unit_price: Number(e.target.value) || 0 })
											}
											className="mt-1 block w-full rounded-md border-0 py-1.5 text-sm text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600"
										/>
									</label>
								</div>
								<p className="text-right text-sm text-gray-600">
									Subtotal: <strong>{formatCurrency(subtotal)}</strong>
								</p>
							</div>
						);
					})}
				</div>

				<div className="flex items-center justify-between rounded-md bg-gray-50 px-3 py-2">
					<span className="text-sm font-medium text-gray-700">Total</span>
					<span className="text-lg font-bold text-gray-900">
						{formatCurrency(total)}
					</span>
				</div>

				<FormField
					id="initial_payment"
					name="initial_payment"
					type="number"
					min={0}
					step="any"
					label="Pembayaran awal (opsional)"
					placeholder="0 = jadi piutang penuh"
					value={initialPayment}
					onChange={(e) => setInitialPayment(Number(e.target.value) || 0)}
				/>
				{initialPayment > 0 && (
					<div>
						<label
							htmlFor="payment_method"
							className="block text-sm font-medium leading-6 text-gray-900 mb-2"
						>
							Metode Pembayaran
						</label>
						<select
							id="payment_method"
							value={method}
							onChange={(e) => setMethod(e.target.value as PaymentMethod)}
							className="block w-full rounded-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm"
						>
							<option value="cash">Tunai</option>
							<option value="potong_gaji">Potong Gaji</option>
						</select>
					</div>
				)}

				<div>
					<label
						htmlFor="notes"
						className="block text-sm font-medium leading-6 text-gray-900 mb-2"
					>
						Catatan
					</label>
					<textarea
						id="notes"
						name="notes"
						rows={2}
						value={notes}
						onChange={(e) => setNotes(e.target.value)}
						className="block w-full rounded-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
					/>
				</div>
			</form>
		</SlideOver>
	);
}
