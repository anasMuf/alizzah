import { useAtom } from "jotai";
import { useEffect, useState } from "react";
import { ApiError } from "#/api/mutator/custom-instance";
import { Button, FormField, SlideOver, useToast } from "#/components/ui";
import { academicYearAtom } from "#/store/global";
import { useCreateCapitalInjection } from "./api";

interface ModalFormProps {
	isOpen: boolean;
	onClose: () => void;
}

const today = () => new Date().toISOString().slice(0, 10);

export function ModalForm({ isOpen, onClose }: ModalFormProps) {
	const { addToast } = useToast();
	const [activeAy] = useAtom(academicYearAtom);
	const [injectionDate, setInjectionDate] = useState(today());
	const [amount, setAmount] = useState(0);
	const [notes, setNotes] = useState("");

	useEffect(() => {
		if (isOpen) {
			setInjectionDate(today());
			setAmount(0);
			setNotes("");
		}
	}, [isOpen]);

	const createM = useCreateCapitalInjection();

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
		createM.mutate(
			{
				academic_year_id: activeAy.id,
				injection_date: injectionDate,
				amount,
				notes: notes || undefined,
			},
			{
				onSuccess: () => {
					addToast({
						variant: "success",
						title: "Berhasil",
						message: "Modal berhasil disalurkan ke kas koperasi.",
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
			title="Salurkan Modal ke Koperasi"
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
						{createM.isPending ? "Menyimpan..." : "Salurkan"}
					</Button>
				</>
			}
		>
			<form onSubmit={handleSubmit} className="space-y-6">
				<p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
					Dana akan <strong>keluar dari kas sekolah</strong> (debit) dan{" "}
					<strong>masuk ke kas koperasi</strong> (kredit) untuk tahun ajaran{" "}
					<strong>{activeAy?.name ?? "—"}</strong>.
				</p>

				<FormField
					id="injection_date"
					name="injection_date"
					type="date"
					label="Tanggal Penyaluran"
					value={injectionDate}
					onChange={(e) => setInjectionDate(e.target.value)}
					required
				/>

				<FormField
					id="amount"
					name="amount"
					type="number"
					min={1}
					step="any"
					label="Nominal Modal"
					placeholder="0"
					value={amount}
					onChange={(e) => setAmount(Number(e.target.value) || 0)}
					required
				/>

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
						rows={3}
						value={notes}
						onChange={(e) => setNotes(e.target.value)}
						placeholder="mis. modal awal tahun ajaran"
						className="block w-full rounded-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
					/>
				</div>
			</form>
		</SlideOver>
	);
}
