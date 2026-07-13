import { useAtom } from "jotai";
import { useState } from "react";
import { ApiError } from "#/api/mutator/custom-instance";
import { Button, CurrencyInput, useToast } from "#/components/ui";
import { academicYearAtom } from "#/store/global";
import { formatCurrency } from "#/utils/format";
import { useSuppliers } from "../pemasok/api";
import {
	type PaymentMethod,
	type PurchaseInput,
	useCreatePurchase,
} from "./api";
import type { CartItemPembelian } from "./CartPembelian";

interface CheckoutPanelPembelianProps {
	items: CartItemPembelian[];
	total: number;
	onSuccess: () => void;
}

const today = () => new Date().toISOString().slice(0, 10);

export function CheckoutPanelPembelian({
	items,
	total,
	onSuccess,
}: CheckoutPanelPembelianProps) {
	const { addToast } = useToast();
	const [activeAy] = useAtom(academicYearAtom);
	const createPurchase = useCreatePurchase();
	const { data: suppliers = [] } = useSuppliers();

	const [supplierId, setSupplierId] = useState<number>(0);
	const [purchaseDate, setPurchaseDate] = useState(today());
	const [reference, setReference] = useState("");
	const [paymentAmount, setPaymentAmount] = useState(0);
	const [method, setMethod] = useState<PaymentMethod>("cash");
	const [notes, setNotes] = useState("");

	const payNum = paymentAmount;
	const remaining = total - payNum;
	const paymentInvalid = payNum < 0 || payNum > total;

	const canSubmit =
		items.length > 0 &&
		supplierId > 0 &&
		!paymentInvalid &&
		!createPurchase.isPending &&
		!!activeAy?.id;

	const resetForm = () => {
		setSupplierId(0);
		setPurchaseDate(today());
		setReference("");
		setPaymentAmount(0);
		setMethod("cash");
		setNotes("");
	};

	const handleSubmit = () => {
		if (!activeAy?.id) {
			addToast({
				variant: "error",
				title: "Gagal",
				message: "Pilih tahun ajaran aktif terlebih dahulu.",
			});
			return;
		}

		if (supplierId <= 0) {
			addToast({
				variant: "error",
				title: "Gagal",
				message: "Pilih pemasok terlebih dahulu.",
			});
			return;
		}

		if (items.length === 0) {
			addToast({
				variant: "error",
				title: "Gagal",
				message: "Keranjang masih kosong.",
			});
			return;
		}

		if (paymentInvalid) {
			addToast({
				variant: "error",
				title: "Gagal",
				message: `Nominal pembayaran awal harus antara Rp0 dan ${formatCurrency(total)}.`,
			});
			return;
		}

		const payload: PurchaseInput = {
			academic_year_id: activeAy.id,
			supplier_id: supplierId,
			purchase_date: purchaseDate,
			reference_number: reference || undefined,
			notes: notes || undefined,
			items: items.map((item) => ({
				product_id: item.product_id,
				variant_id: item.variant_id,
				quantity: item.quantity,
				unit_price: item.cost_price,
			})),
			initial_payment: payNum > 0 ? payNum : undefined,
			payment_method: payNum > 0 ? method : undefined,
		};

		createPurchase.mutate(payload, {
			onSuccess: () => {
				addToast({
					variant: "success",
					title: "Berhasil",
					message:
						payNum >= total
							? "Restok barang berhasil dicatat — lunas."
							: `Restok dicatat. Sisa hutang: ${formatCurrency(remaining)}.`,
				});
				resetForm();
				onSuccess();
			},
			onError: (err: Error) =>
				addToast({
					variant: "error",
					title: "Gagal",
					message:
						err instanceof ApiError
							? err.message
							: "Terjadi kesalahan saat menyimpan.",
				}),
		});
	};

	return (
		<div className="space-y-4 border-t border-gray-100 pt-4">
			{/* Supplier */}
			<div>
				<label
					htmlFor="pos-supplier"
					className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5"
				>
					Pemasok
				</label>
				<select
					id="pos-supplier"
					value={supplierId}
					onChange={(e) => setSupplierId(Number(e.target.value))}
					className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-colors"
					required
				>
					<option value={0}>Pilih pemasok…</option>
					{suppliers.map((s) => (
						<option key={s.id} value={s.id}>
							{s.name}
						</option>
					))}
				</select>
			</div>

			{/* Date & Ref */}
			<div className="grid grid-cols-2 gap-3">
				<div>
					<label
						htmlFor="pos-purchase-date"
						className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5"
					>
						Tanggal
					</label>
					<input
						id="pos-purchase-date"
						type="date"
						value={purchaseDate}
						onChange={(e) => setPurchaseDate(e.target.value)}
						className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-colors"
					/>
				</div>
				<div>
					<label
						htmlFor="pos-reference"
						className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5"
					>
						No. Nota
					</label>
					<input
						id="pos-reference"
						type="text"
						placeholder="Opsional"
						value={reference}
						onChange={(e) => setReference(e.target.value)}
						className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-colors"
					/>
				</div>
			</div>

			{/* Payment */}
			<div>
				<label
					htmlFor="pos-payment"
					className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5"
				>
					Pembayaran Awal
				</label>
				<div>
					<CurrencyInput
						id="pos-payment"
						className={`w-full rounded-lg border px-3 py-2 text-sm font-medium focus:ring-2 focus:outline-none transition-colors ${
							paymentInvalid
								? "border-red-300 text-red-700 focus:border-red-500 focus:ring-red-200"
								: "border-gray-200 text-gray-900 focus:border-indigo-500 focus:ring-indigo-500/20"
						}`}
						value={paymentAmount}
						onChange={setPaymentAmount}
					/>
				</div>
				{paymentInvalid && (
					<p className="mt-1 text-xs text-red-600">
						Nominal harus antara Rp0 dan {formatCurrency(total)}.
					</p>
				)}

				{/* Quick buttons */}
				{total > 0 && (
					<div className="mt-2 flex gap-2">
						<button
							type="button"
							onClick={() => setPaymentAmount(total)}
							className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
								payNum === total
									? "bg-indigo-100 text-indigo-700"
									: "bg-gray-100 text-gray-600 hover:bg-gray-200"
							}`}
						>
							Lunas
						</button>
						<button
							type="button"
							onClick={() => setPaymentAmount(0)}
							className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
								payNum === 0
									? "bg-indigo-100 text-indigo-700"
									: "bg-gray-100 text-gray-600 hover:bg-gray-200"
							}`}
						>
							Belum bayar (Hutang Penuh)
						</button>
					</div>
				)}
			</div>

			{/* Payment method */}
			{payNum > 0 && (
				<div>
					<label
						htmlFor="pos-method"
						className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5"
					>
						Metode
					</label>
					<select
						id="pos-method"
						value={method}
						onChange={(e) => setMethod(e.target.value as PaymentMethod)}
						className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-colors"
					>
						<option value="cash">Tunai</option>
					</select>
				</div>
			)}

			{/* Remaining */}
			{total > 0 && payNum < total && payNum >= 0 && (
				<div className="rounded-lg bg-amber-50 px-3.5 py-2.5 border border-amber-200/60">
					<p className="text-xs text-amber-700">
						Sisa Hutang:{" "}
						<span className="font-bold">{formatCurrency(remaining)}</span>
					</p>
				</div>
			)}

			{/* Notes */}
			<div>
				<label
					htmlFor="pos-notes"
					className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5"
				>
					Catatan
				</label>
				<textarea
					id="pos-notes"
					rows={2}
					value={notes}
					onChange={(e) => setNotes(e.target.value)}
					placeholder="Opsional…"
					className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-colors resize-none"
				/>
			</div>

			{/* Submit */}
			<Button
				variant="primary"
				onClick={handleSubmit}
				disabled={!canSubmit}
				className="w-full justify-center py-3 text-base"
			>
				{createPurchase.isPending ? (
					<>
						<span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
						Memproses…
					</>
				) : (
					`Proses Restok${total > 0 ? ` — ${formatCurrency(total)}` : ""}`
				)}
			</Button>
		</div>
	);
}
