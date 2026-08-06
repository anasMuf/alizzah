import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useAtom } from "jotai";
import { ChevronRight } from "lucide-react";
import { useState } from "react";
import { useGetV1IncomeCategories } from "#/api/endpoints/income-categories/income-categories";
import {
	getGetV1IncomeTransactionsQueryKey,
	usePostV1IncomeTransactions,
} from "#/api/endpoints/income-transactions/income-transactions";
import type { DtoIncomeCategoryResponse } from "#/api/model";
import { Alert, Button, CurrencyInput, useToast } from "#/components/ui";
import { academicYearAtom } from "../../../../store/global";

export const Route = createFileRoute(
	"/_authenticated/keuangan/penerimaan/baru",
)({
	component: PenerimaanBaruPage,
});

function PenerimaanBaruPage() {
	const navigate = useNavigate();
	const [activeAy] = useAtom(academicYearAtom);
	const queryClient = useQueryClient();
	const { addToast } = useToast();

	// Fetch income categories from API
	const { data: catResp } = useGetV1IncomeCategories();
	const categories: DtoIncomeCategoryResponse[] =
		((catResp as any)?.data as any)?.data || [];

	const [categoryId, setCategoryId] = useState<number>(0);
	const [sourceName, setSourceName] = useState("");
	const [amount, setAmount] = useState<number>(0);
	const [transactionDate, setTransactionDate] = useState(
		new Date().toISOString().split("T")[0],
	);
	const [referenceNumber, setReferenceNumber] = useState("");
	const [notes, setNotes] = useState("");
	const [formError, setFormError] = useState("");
	const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

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
				navigate({ to: "/keuangan/penerimaan", search: {} as any });
			},
			onError: (err: any) => {
				const status = err?.status || err?.response?.status;
				const data = err?.response?.data || err?.data;

				if (status === 400 && data?.errors) {
					const errors: Record<string, string> = {};
					for (const [key, val] of Object.entries(
						data.errors as Record<string, unknown>,
					)) {
						errors[key] = Array.isArray(val) ? String(val[0]) : String(val);
					}
					setFieldErrors(errors);
					return;
				}

				if (status === 422) {
					setFormError(
						data?.message ||
							"Tanggal ini sudah ditutup buku. Tidak dapat mencatat penerimaan pada tanggal tersebut.",
					);
					return;
				}

				setFormError(
					data?.message || err?.message || "Gagal mencatat penerimaan.",
				);
			},
		},
	});

	const validate = (): boolean => {
		const errors: Record<string, string> = {};

		if (!activeAy?.id) errors.academic_year_id = "Tahun ajaran belum dipilih.";
		if (categoryId === 0) errors.income_category_id = "Kategori wajib dipilih.";
		if (!sourceName.trim())
			errors.source_name = "Sumber / pengirim wajib diisi.";
		if (amount <= 0) errors.amount = "Nominal harus lebih dari 0.";
		if (!transactionDate)
			errors.transaction_date = "Tanggal transaksi wajib diisi.";

		setFieldErrors(errors);
		return Object.keys(errors).length === 0;
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		setFormError("");

		if (!validate()) return;

		createMutation.mutate({
			data: {
				academic_year_id: activeAy?.id || 0,
				income_category_id: categoryId,
				source_name: sourceName.trim(),
				amount: amount,
				transaction_date: transactionDate,
				reference_number: referenceNumber.trim() || undefined,
				notes: notes.trim() || undefined,
			},
		});
	};

	const canSubmit =
		categoryId > 0 && !!sourceName.trim() && amount > 0 && !!transactionDate;

	return (
		<div className="space-y-6 max-w-2xl mx-auto">
			{/* Breadcrumb */}
			<nav className="flex items-center text-sm text-gray-500">
				<Link
					to="/keuangan/penerimaan"
					search={{} as any}
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

			{formError && (
				<Alert variant="error" title="Gagal" onClose={() => setFormError("")}>
					{formError}
				</Alert>
			)}

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
							value={categoryId}
							onChange={(e) => {
								setCategoryId(Number(e.target.value));
								setFieldErrors((prev) => {
									const next = { ...prev };
									delete next.income_category_id;
									return next;
								});
							}}
							className={`block w-full rounded-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ${fieldErrors.income_category_id ? "ring-red-300 focus:ring-red-500" : "ring-gray-300 focus:ring-indigo-600"} focus:ring-2 focus:ring-inset sm:text-sm sm:leading-6`}
						>
							<option value={0} disabled>
								{categories.length === 0 ? "Memuat..." : "Pilih Kategori"}
							</option>
							{categories.map((cat) => (
								<option key={cat.id} value={cat.id}>
									{cat.name}
								</option>
							))}
						</select>
						{fieldErrors.income_category_id && (
							<p className="mt-1 text-sm text-red-600">
								{fieldErrors.income_category_id}
							</p>
						)}
					</div>

					{/* Sumber */}
					<div>
						<label
							htmlFor="sourceName"
							className="block text-sm font-medium leading-6 text-gray-900 mb-2"
						>
							Sumber / Pengirim <span className="text-red-500">*</span>
						</label>
						<input
							id="sourceName"
							type="text"
							value={sourceName}
							onChange={(e) => {
								setSourceName(e.target.value);
								setFieldErrors((prev) => {
									const next = { ...prev };
									delete next.source_name;
									return next;
								});
							}}
							placeholder='Contoh: "BOS Reguler Semester 1", "Donatur Bpk. Ahmad"'
							className={`block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 ring-1 ring-inset ${fieldErrors.source_name ? "ring-red-300 focus:ring-red-500" : "ring-gray-300 focus:ring-indigo-600"} placeholder:text-gray-400 focus:ring-2 focus:ring-inset sm:text-sm sm:leading-6`}
						/>
						{fieldErrors.source_name && (
							<p className="mt-1 text-sm text-red-600">
								{fieldErrors.source_name}
							</p>
						)}
					</div>

					{/* Nominal */}
					<div>
						<label
							htmlFor="amount"
							className="block text-sm font-medium leading-6 text-gray-900 mb-2"
						>
							Nominal (Rp) <span className="text-red-500">*</span>
						</label>
						<CurrencyInput
							id="amount"
							value={amount}
							onChange={(val) => {
								setAmount(val);
								setFieldErrors((prev) => {
									const next = { ...prev };
									delete next.amount;
									return next;
								});
							}}
							showSymbol
							placeholder="Masukkan nominal penerimaan"
							className={`${fieldErrors.amount ? "ring-1 ring-red-500" : ""}`}
						/>
						{fieldErrors.amount && (
							<p className="mt-1 text-sm text-red-600">{fieldErrors.amount}</p>
						)}
					</div>

					{/* Tanggal */}
					<div>
						<label
							htmlFor="transactionDate"
							className="block text-sm font-medium leading-6 text-gray-900 mb-2"
						>
							Tanggal Transaksi <span className="text-red-500">*</span>
						</label>
						<input
							id="transactionDate"
							type="date"
							value={transactionDate}
							onChange={(e) => {
								setTransactionDate(e.target.value);
								setFieldErrors((prev) => {
									const next = { ...prev };
									delete next.transaction_date;
									return next;
								});
							}}
							className={`block w-full sm:w-64 rounded-md border-0 py-1.5 px-3 text-gray-900 ring-1 ring-inset ${fieldErrors.transaction_date ? "ring-red-300 focus:ring-red-500" : "ring-gray-300 focus:ring-indigo-600"} focus:ring-2 focus:ring-inset sm:text-sm sm:leading-6`}
						/>
						{fieldErrors.transaction_date && (
							<p className="mt-1 text-sm text-red-600">
								{fieldErrors.transaction_date}
							</p>
						)}
					</div>

					{/* Nomor Referensi */}
					<div>
						<label
							htmlFor="referenceNumber"
							className="block text-sm font-medium leading-6 text-gray-900 mb-2"
						>
							Nomor Referensi / Dokumen
						</label>
						<input
							id="referenceNumber"
							type="text"
							value={referenceNumber}
							onChange={(e) => setReferenceNumber(e.target.value)}
							placeholder="Opsional, contoh: BOS-2025-001"
							className="block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
						/>
					</div>

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
					<Link to="/keuangan/penerimaan" search={{} as any}>
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
