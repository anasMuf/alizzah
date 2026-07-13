import { useEffect, useState } from "react";
import { ApiError } from "#/api/mutator/custom-instance";
import {
	Button,
	CurrencyFormField,
	FormField,
	SlideOver,
	useToast,
} from "#/components/ui";
import { formatCurrency } from "#/utils/format";
import { type PaymentMethod, type Sale, usePaySale } from "./api";

interface BayarFormProps {
	sale: Sale;
	isOpen: boolean;
	onClose: () => void;
}

const today = () => new Date().toISOString().slice(0, 10);

export function BayarForm({ sale, isOpen, onClose }: BayarFormProps) {
	const { addToast } = useToast();
	const [amount, setAmount] = useState(sale.remaining);
	const [paymentDate, setPaymentDate] = useState(today());
	const [method, setMethod] = useState<PaymentMethod>("cash");
	const [notes, setNotes] = useState("");

	useEffect(() => {
		if (isOpen) {
			setAmount(sale.remaining);
			setPaymentDate(today());
			setMethod("cash");
			setNotes("");
		}
	}, [isOpen, sale.remaining]);

	const payM = usePaySale(sale.id);

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (amount <= 0 || amount > sale.remaining) {
			addToast({
				variant: "error",
				title: "Gagal",
				message: `Nominal harus antara 1 dan ${formatCurrency(sale.remaining)}.`,
			});
			return;
		}
		payM.mutate(
			{ amount, payment_date: paymentDate, method, notes: notes || undefined },
			{
				onSuccess: () => {
					addToast({
						variant: "success",
						title: "Berhasil",
						message: "Pembayaran tercatat.",
					});
					onClose();
				},
				onError: (err: Error) =>
					addToast({
						variant: "error",
						title: "Gagal",
						message:
							err instanceof ApiError ? err.message : "Terjadi kesalahan",
					}),
			},
		);
	};

	return (
		<SlideOver
			isOpen={isOpen}
			onClose={onClose}
			title="Catat Pembayaran"
			footer={
				<>
					<Button
						variant="secondary"
						onClick={onClose}
						disabled={payM.isPending}
					>
						Batal
					</Button>
					<Button
						variant="primary"
						onClick={handleSubmit}
						disabled={payM.isPending}
					>
						{payM.isPending ? "Menyimpan..." : "Bayar"}
					</Button>
				</>
			}
		>
			<form onSubmit={handleSubmit} className="space-y-6">
				<p className="rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-700">
					Sisa piutang: <strong>{formatCurrency(sale.remaining)}</strong>
				</p>
				<CurrencyFormField
					id="amount"
					label="Nominal Pembayaran"
					value={amount}
					onChange={setAmount}
					required
				/>
				<FormField
					id="payment_date"
					name="payment_date"
					type="date"
					label="Tanggal"
					value={paymentDate}
					onChange={(e) => setPaymentDate(e.target.value)}
					required
				/>
				<div>
					<label
						htmlFor="method"
						className="block text-sm font-medium leading-6 text-gray-900 mb-2"
					>
						Metode Pembayaran
					</label>
					<select
						id="method"
						value={method}
						onChange={(e) => setMethod(e.target.value as PaymentMethod)}
						className="block w-full rounded-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm"
					>
						<option value="cash">Tunai</option>
					</select>
				</div>
				<div>
					<label
						htmlFor="pay_notes"
						className="block text-sm font-medium leading-6 text-gray-900 mb-2"
					>
						Catatan
					</label>
					<textarea
						id="pay_notes"
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
