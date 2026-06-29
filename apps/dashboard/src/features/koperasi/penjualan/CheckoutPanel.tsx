import { useAtom } from "jotai";
import { useState } from "react";
import { ApiError } from "#/api/mutator/custom-instance";
import { Button, useToast } from "#/components/ui";
import { academicYearAtom } from "#/store/global";
import { formatCurrency } from "#/utils/format";
import { type PaymentMethod, type SaleInput, useCreateSale } from "./api";
import type { CartItem } from "./Cart";
import { type PickedStudent, StudentPicker } from "./StudentPicker";

interface CheckoutPanelProps {
	items: CartItem[];
	total: number;
	onSuccess: () => void;
}

const today = () => new Date().toISOString().slice(0, 10);

export function CheckoutPanel({ items, total, onSuccess }: CheckoutPanelProps) {
	const { addToast } = useToast();
	const [activeAy] = useAtom(academicYearAtom);
	const createSale = useCreateSale();

	const [student, setStudent] = useState<PickedStudent | null>(null);
	const [buyerName, setBuyerName] = useState("");
	const [saleDate, setSaleDate] = useState(today());
	const [paymentAmount, setPaymentAmount] = useState<number | "">(0);
	const [method, setMethod] = useState<PaymentMethod>("cash");
	const [notes, setNotes] = useState("");

	const payNum = typeof paymentAmount === "number" ? paymentAmount : 0;
	const remaining = total - payNum;
	const hasOverStock = items.some((item) => item.quantity > item.stock);
	const paymentInvalid = payNum < 0 || payNum > total;

	const canSubmit =
		items.length > 0 &&
		!hasOverStock &&
		!paymentInvalid &&
		!createSale.isPending &&
		!!activeAy?.id;

	const resetForm = () => {
		setStudent(null);
		setBuyerName("");
		setSaleDate(today());
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

		if (items.length === 0) {
			addToast({
				variant: "error",
				title: "Gagal",
				message: "Keranjang masih kosong.",
			});
			return;
		}

		if (hasOverStock) {
			addToast({
				variant: "error",
				title: "Gagal",
				message:
					"Beberapa item melebihi stok tersedia. Sesuaikan qty terlebih dahulu.",
			});
			return;
		}

		if (paymentInvalid) {
			addToast({
				variant: "error",
				title: "Gagal",
				message: `Nominal pembayaran harus antara Rp0 dan ${formatCurrency(total)}.`,
			});
			return;
		}

		const payload: SaleInput = {
			academic_year_id: activeAy.id,
			student_id: student?.id,
			buyer_name: buyerName || undefined,
			sale_date: saleDate,
			notes: notes || undefined,
			items: items.map((item) => ({
				product_id: item.product_id,
				variant_id: item.variant_id,
				quantity: item.quantity,
				unit_price: item.sale_price,
			})),
			initial_payment: payNum > 0 ? payNum : undefined,
			payment_method: payNum > 0 ? method : undefined,
		};

		createSale.mutate(payload, {
			onSuccess: () => {
				addToast({
					variant: "success",
					title: "Berhasil",
					message:
						payNum >= total
							? "Penjualan berhasil dicatat — lunas."
							: `Penjualan dicatat. Sisa piutang: ${formatCurrency(remaining)}.`,
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
			{/* Buyer */}
			<div>
				<span className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
					Pembeli
				</span>
				<StudentPicker
					selected={student}
					onSelect={(s) => {
						setStudent(s);
						setBuyerName("");
					}}
					onClear={() => setStudent(null)}
				/>
				{!student && (
					<input
						type="text"
						placeholder="Atau ketik nama pembeli…"
						value={buyerName}
						onChange={(e) => setBuyerName(e.target.value)}
						className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-colors"
					/>
				)}
			</div>

			{/* Date */}
			<div>
				<label
					htmlFor="pos-sale-date"
					className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5"
				>
					Tanggal
				</label>
				<input
					id="pos-sale-date"
					type="date"
					value={saleDate}
					onChange={(e) => setSaleDate(e.target.value)}
					className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-colors"
				/>
			</div>

			{/* Payment */}
			<div>
				<label
					htmlFor="pos-payment"
					className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5"
				>
					Pembayaran
				</label>
				<div className="flex items-center gap-2">
					<span className="text-sm text-gray-400 shrink-0">Rp</span>
					<input
						id="pos-payment"
						type="number"
						min={0}
						max={total}
						step="any"
						value={paymentAmount}
						onChange={(e) => {
							const val = e.target.value;
							setPaymentAmount(val === "" ? "" : Number(val) || 0);
						}}
						onFocus={() => {
							if (paymentAmount === 0) setPaymentAmount("");
						}}
						onBlur={() => {
							if (paymentAmount === "") setPaymentAmount(0);
						}}
						className={`w-full rounded-lg border px-3 py-2 text-sm font-medium focus:ring-2 focus:outline-none transition-colors [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${
							paymentInvalid
								? "border-red-300 text-red-700 focus:border-red-500 focus:ring-red-200"
								: "border-gray-200 text-gray-900 focus:border-indigo-500 focus:ring-indigo-500/20"
						}`}
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
							Belum bayar
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
						Sisa piutang:{" "}
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
				{createSale.isPending ? (
					<>
						<span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
						Memproses…
					</>
				) : (
					`Proses Penjualan${total > 0 ? ` — ${formatCurrency(total)}` : ""}`
				)}
			</Button>
		</div>
	);
}
