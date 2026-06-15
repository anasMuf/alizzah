import { useAtom } from "jotai";
import { useEffect, useState } from "react";
import { ApiError } from "#/api/mutator/custom-instance";
import { Button, FormField, SlideOver, useToast } from "#/components/ui";
import { academicYearAtom } from "#/store/global";
import { type Flow, type MiscInput, useCreateMisc } from "./api";

interface LainLainFormProps {
	isOpen: boolean;
	onClose: () => void;
}

const today = () => new Date().toISOString().slice(0, 10);

export function LainLainForm({ isOpen, onClose }: LainLainFormProps) {
	const { addToast } = useToast();
	const [activeAy] = useAtom(academicYearAtom);

	const [flow, setFlow] = useState<Flow>("income");
	const [category, setCategory] = useState("");
	const [amount, setAmount] = useState(0);
	const [transactionDate, setTransactionDate] = useState(today());
	const [description, setDescription] = useState("");

	useEffect(() => {
		if (isOpen) {
			setFlow("income");
			setCategory("");
			setAmount(0);
			setTransactionDate(today());
			setDescription("");
		}
	}, [isOpen]);

	const createM = useCreateMisc();

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
		if (!category.trim() || amount <= 0) {
			addToast({
				variant: "error",
				title: "Gagal",
				message: "Lengkapi kategori dan nominal (> 0).",
			});
			return;
		}
		const payload: MiscInput = {
			academic_year_id: activeAy.id,
			flow,
			category: category.trim(),
			amount,
			transaction_date: transactionDate,
			description: description || undefined,
		};
		createM.mutate(payload, {
			onSuccess: () => {
				addToast({
					variant: "success",
					title: "Berhasil",
					message: "Transaksi lain-lain dicatat.",
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
			title="Catat Transaksi Lain-lain"
			footer={
				<>
					<Button
						variant="secondary"
						onClick={onClose}
						disabled={createM.isPending}
					>
						Batal
					</Button>
					<Button
						variant="primary"
						onClick={handleSubmit}
						disabled={createM.isPending}
					>
						{createM.isPending ? "Menyimpan..." : "Simpan"}
					</Button>
				</>
			}
		>
			<form onSubmit={handleSubmit} className="space-y-6">
				<div>
					<label
						htmlFor="flow"
						className="block text-sm font-medium leading-6 text-gray-900 mb-2"
					>
						Jenis
					</label>
					<select
						id="flow"
						value={flow}
						onChange={(e) => setFlow(e.target.value as Flow)}
						className="block w-full rounded-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm"
					>
						<option value="income">Pemasukan</option>
						<option value="expense">Pengeluaran</option>
					</select>
				</div>

				<FormField
					id="category"
					name="category"
					label="Kategori"
					placeholder="mis. donasi / biaya admin"
					value={category}
					onChange={(e) => setCategory(e.target.value)}
					required
				/>

				<FormField
					id="amount"
					name="amount"
					type="number"
					min={1}
					step="any"
					label="Nominal"
					placeholder="0"
					value={amount}
					onChange={(e) => setAmount(Number(e.target.value) || 0)}
					required
				/>

				<FormField
					id="transaction_date"
					name="transaction_date"
					type="date"
					label="Tanggal"
					value={transactionDate}
					onChange={(e) => setTransactionDate(e.target.value)}
					required
				/>

				<div>
					<label
						htmlFor="description"
						className="block text-sm font-medium leading-6 text-gray-900 mb-2"
					>
						Keterangan
					</label>
					<textarea
						id="description"
						name="description"
						rows={2}
						value={description}
						onChange={(e) => setDescription(e.target.value)}
						className="block w-full rounded-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
					/>
				</div>
			</form>
		</SlideOver>
	);
}
