import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useAtom } from "jotai";
import { ChevronRight } from "lucide-react";
import { useState } from "react";
import {
	getGetV1IncomeTransactionsQueryKey,
	usePostV1IncomeTransactions,
} from "#/api/endpoints/income-transactions/income-transactions";
import { Button, FormField, useToast } from "#/components/ui";
import { academicYearAtom } from "../../../../store/global";

export const Route = createFileRoute(
	"/_authenticated/keuangan/penerimaan/baru",
)({
	component: PenerimaanBaruPage,
});

const CATEGORY_OPTIONS = [
	{ value: "bos", label: "Dana BOS" },
	{ value: "donasi", label: "Donasi" },
	{ value: "hibah", label: "Hibah" },
	{ value: "lainnya", label: "Lainnya" },
];

function PenerimaanBaruPage() {
	const navigate = useNavigate();
	const [activeAy] = useAtom(academicYearAtom);
	const queryClient = useQueryClient();
	const { addToast } = useToast();

	const [category, setCategory] = useState("bos");
	const [sourceName, setSourceName] = useState("");
	const [amount, setAmount] = useState("");
	const [transactionDate, setTransactionDate] = useState(
		new Date().toISOString().split("T")[0],
	);
	const [referenceNumber, setReferenceNumber] = useState("");
	const [notes, setNotes] = useState("");

	const createMutation = usePostV1IncomeTransactions({
		mutation: {
			onSuccess: () => {
				addToast({
					variant: "success",
					title: "Berhasil",
					message: "Penerimaan berhasil dicatat.",
				});
				queryClient.invalidateQueries({
					queryKey: getGetV1IncomeTransactionsQueryKey(),
				});
				// Invalidate kas balance & transactions agar saldo kas langsung ter-update
				queryClient.invalidateQueries({ queryKey: ["/v1/cash/balance"] });
				queryClient.invalidateQueries({ queryKey: ["/v1/cash/transactions"] });
				navigate({ to: "/keuangan/penerimaan" });
			},
			onError: (err: any) => {
				addToast({
					variant: "error",
					title: "Gagal",
					message: err.message || "Gagal mencatat penerimaan.",
				});
			},
		},
	});

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		createMutation.mutate({
			academic_year_id: activeAy?.id || 0,
			category,
			source_name: sourceName,
			amount: Number(amount),
			transaction_date: transactionDate,
			reference_number: referenceNumber || undefined,
			notes: notes || undefined,
		} as any);
	};

	const canSubmit =
		!!sourceName.trim() && Number(amount) > 0 && !!transactionDate;

	return (
		<div className="space-y-6 max-w-2xl mx-auto">
			{/* Breadcrumb */}
			<nav className="flex items-center text-sm text-gray-500">
				<Link
					to="/keuangan/penerimaan"
					className="hover:text-indigo-600 transition-colors"
				>
					Penerimaan
				</Link>
				<ChevronRight className="w-4 h-4 mx-1" />
				<span className="text-gray-900 font-medium">Catat Baru</span>
			</nav>

			<div>
				<h2 className="text-2xl font-bold leading-7 text-gray-900">
					Catat Penerimaan Baru
				</h2>
				<p className="mt-1 text-sm text-gray-500">
					Catat penerimaan dana bantuan dari BOS, donasi, hibah, atau sumber
					lainnya.
				</p>
			</div>

			<form
				onSubmit={handleSubmit}
				className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl"
			>
				<div className="px-4 py-6 sm:p-8 space-y-6">
					{/* Kategori */}
					<div>
						<label className="block text-sm font-medium leading-6 text-gray-900 mb-2">
							Kategori <span className="text-red-500">*</span>
						</label>
						<select
							value={category}
							onChange={(e) => setCategory(e.target.value)}
							className="block w-full rounded-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
						>
							{CATEGORY_OPTIONS.map((opt) => (
								<option key={opt.value} value={opt.value}>
									{opt.label}
								</option>
							))}
						</select>
					</div>

					{/* Sumber */}
					<FormField
						id="sourceName"
						label="Sumber / Pengirim"
						value={sourceName}
						onChange={(e: any) => setSourceName(e.target.value)}
						required
						placeholder='Contoh: "BOS Reguler Semester 1", "Donatur Bpk. Ahmad"'
					/>

					{/* Nominal */}
					<FormField
						id="amount"
						type="number"
						label="Nominal (Rp)"
						value={amount}
						onChange={(e: any) => setAmount(e.target.value)}
						required
						min="1"
						placeholder="Masukkan nominal penerimaan"
					/>

					{/* Tanggal */}
					<FormField
						id="transactionDate"
						type="date"
						label="Tanggal Transaksi"
						value={transactionDate}
						onChange={(e: any) => setTransactionDate(e.target.value)}
						required
					/>

					{/* Nomor Referensi */}
					<FormField
						id="referenceNumber"
						label="Nomor Referensi / Dokumen"
						value={referenceNumber}
						onChange={(e: any) => setReferenceNumber(e.target.value)}
						placeholder="Opsional, contoh: BOS-2025-001"
					/>

					{/* Catatan */}
					<div>
						<label
							htmlFor="notes"
							className="block text-sm font-medium leading-6 text-gray-900 mb-2"
						>
							Catatan
						</label>
						<textarea
							id="notes"
							rows={3}
							value={notes}
							onChange={(e) => setNotes(e.target.value)}
							className="block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
							placeholder="Catatan tambahan (opsional)"
						/>
					</div>
				</div>

				{/* Actions */}
				<div className="flex items-center justify-end gap-x-4 border-t border-gray-200 px-4 py-4 sm:px-8">
					<Link to="/keuangan/penerimaan">
						<Button type="button" variant="secondary">
							Batal
						</Button>
					</Link>
					<Button
						type="submit"
						variant="primary"
						disabled={!canSubmit || createMutation.isPending}
					>
						{createMutation.isPending ? "Menyimpan..." : "Simpan Penerimaan"}
					</Button>
				</div>
			</form>
		</div>
	);
}
