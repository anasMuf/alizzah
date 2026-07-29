import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useAtom } from "jotai";
import { ArrowLeft, Edit, Save, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import {
	getGetV1IncomeTransactionsQueryKey,
	useDeleteV1IncomeTransactionsId,
	useGetV1IncomeTransactionsId,
	usePutV1IncomeTransactionsId,
} from "#/api/endpoints/income-transactions/income-transactions";
import type { DtoCreateIncomeTransactionRequestCategory } from "#/api/model";
import {
	Alert,
	Badge,
	Button,
	ConfirmDialog,
	CurrencyInput,
	EmptyState,
	useToast,
} from "#/components/ui";
import { academicYearAtom } from "../../../../store/global";
import { formatCurrency, formatDate } from "../../../../utils/format";

export const Route = createFileRoute("/_authenticated/keuangan/penerimaan/$id")(
	{
		component: PenerimaanDetailPage,
	},
);

const CATEGORY_LABELS: Record<string, string> = {
	bos: "Dana BOS",
	donasi: "Donasi",
	hibah: "Hibah",
	lainnya: "Lainnya",
};

const CATEGORY_VARIANTS: Record<
	string,
	"info" | "success" | "warning" | "danger"
> = {
	bos: "info",
	donasi: "success",
	hibah: "warning",
	lainnya: "danger",
};

const CATEGORY_OPTIONS = [
	{ value: "bos", label: "Dana BOS" },
	{ value: "donasi", label: "Donasi" },
	{ value: "hibah", label: "Hibah" },
	{ value: "lainnya", label: "Lainnya" },
];

function PenerimaanDetailPage() {
	const { id } = Route.useParams();
	const incomeId = Number(id);
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const { addToast } = useToast();
	const [activeAy] = useAtom(academicYearAtom);

	const [isEditing, setIsEditing] = useState(false);
	const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

	const [category, setCategory] =
		useState<DtoCreateIncomeTransactionRequestCategory>("bos");
	const [sourceName, setSourceName] = useState("");
	const [amount, setAmount] = useState<number>(0);
	const [transactionDate, setTransactionDate] = useState("");
	const [referenceNumber, setReferenceNumber] = useState("");
	const [notes, setNotes] = useState("");
	const [formError, setFormError] = useState("");
	const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

	const {
		data: resp,
		isLoading,
		isError,
	} = useGetV1IncomeTransactionsId(incomeId);
	const item = ((resp as any)?.data as any)?.data;

	// Sync edit form state when item loads
	useEffect(() => {
		if (item) {
			setCategory(
				(item.category as DtoCreateIncomeTransactionRequestCategory) || "bos",
			);
			setSourceName(item.source_name || "");
			setAmount(Number(item.amount) || 0);
			setTransactionDate(item.transaction_date || "");
			setReferenceNumber(item.reference_number || "");
			setNotes(item.notes || "");
		}
	}, [item]);

	const updateMutation = usePutV1IncomeTransactionsId({
		mutation: {
			onSuccess: () => {
				addToast({
					variant: "success",
					title: "Berhasil",
					message: "Penerimaan berhasil diperbarui.",
				});
				queryClient.invalidateQueries({
					queryKey: [`/v1/income-transactions/${incomeId}`],
				});
				queryClient.invalidateQueries({
					queryKey: getGetV1IncomeTransactionsQueryKey(),
				});
				queryClient.invalidateQueries({ queryKey: ["/v1/cash/balance"] });
				queryClient.invalidateQueries({ queryKey: ["/v1/cash/transactions"] });
				setIsEditing(false);
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
					setFormError(data?.message || "Tanggal ini sudah ditutup buku.");
					return;
				}

				setFormError(
					data?.message || err?.message || "Gagal memperbarui penerimaan.",
				);
			},
		},
	});

	const deleteMutation = useDeleteV1IncomeTransactionsId({
		mutation: {
			onSuccess: () => {
				addToast({
					variant: "success",
					title: "Berhasil",
					message: "Penerimaan berhasil dihapus.",
				});
				queryClient.invalidateQueries({
					queryKey: getGetV1IncomeTransactionsQueryKey(),
				});
				queryClient.invalidateQueries({ queryKey: ["/v1/cash/balance"] });
				queryClient.invalidateQueries({ queryKey: ["/v1/cash/transactions"] });
				navigate({ to: "/keuangan/penerimaan", search: {} as any });
			},
			onError: (err: any) => {
				addToast({
					variant: "error",
					title: "Gagal",
					message: err.message || "Gagal menghapus.",
				});
			},
		},
	});

	const validate = (): boolean => {
		const errors: Record<string, string> = {};

		if (!activeAy?.id) errors.academic_year_id = "Tahun ajaran belum dipilih.";
		if (!sourceName.trim())
			errors.source_name = "Sumber / pengirim wajib diisi.";
		if (amount <= 0) errors.amount = "Nominal harus lebih dari 0.";
		if (!transactionDate)
			errors.transaction_date = "Tanggal transaksi wajib diisi.";

		setFieldErrors(errors);
		return Object.keys(errors).length === 0;
	};

	const handleSave = () => {
		setFormError("");
		if (!validate()) return;

		updateMutation.mutate({
			id: incomeId,
			data: {
				academic_year_id: activeAy?.id || 0,
				category,
				source_name: sourceName.trim(),
				amount,
				transaction_date: transactionDate,
				reference_number: referenceNumber.trim() || undefined,
				notes: notes.trim() || undefined,
			},
		});
	};

	const handleCancelEdit = () => {
		setIsEditing(false);
		setFormError("");
		setFieldErrors({});
		// Reset to original values
		if (item) {
			setCategory(
				(item.category as DtoCreateIncomeTransactionRequestCategory) || "bos",
			);
			setSourceName(item.source_name || "");
			setAmount(Number(item.amount) || 0);
			setTransactionDate(item.transaction_date || "");
			setReferenceNumber(item.reference_number || "");
			setNotes(item.notes || "");
		}
	};

	if (isLoading) {
		return (
			<div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 h-64 animate-pulse" />
		);
	}

	if (isError || !item) {
		return (
			<EmptyState
				title="Penerimaan tidak ditemukan"
				description="Data penerimaan dengan ID ini tidak ditemukan."
				action={
					<Link to="/keuangan/penerimaan" search={{} as any}>
						<Button variant="secondary">Kembali ke Daftar</Button>
					</Link>
				}
			/>
		);
	}

	return (
		<div className="space-y-6 max-w-3xl mx-auto">
			<div>
				<Link
					to="/keuangan/penerimaan"
					search={{} as any}
					className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
				>
					<ArrowLeft className="h-4 w-4" />
					Kembali ke Daftar Penerimaan
				</Link>

				<div className="sm:flex sm:items-center sm:justify-between">
					<div>
						<h1 className="text-2xl font-bold leading-7 text-gray-900">
							Detail Penerimaan
						</h1>
						<p className="mt-1 text-sm text-gray-500">ID #{item.id}</p>
					</div>
					<div className="mt-4 sm:mt-0 flex gap-2">
						{isEditing ? (
							<>
								<Button
									variant="secondary"
									onClick={handleCancelEdit}
									disabled={updateMutation.isPending}
								>
									<X className="h-4 w-4 mr-1" /> Batal
								</Button>
								<Button
									variant="primary"
									onClick={handleSave}
									disabled={updateMutation.isPending}
								>
									<Save className="h-4 w-4 mr-1" />{" "}
									{updateMutation.isPending ? "Menyimpan..." : "Simpan"}
								</Button>
							</>
						) : (
							<>
								<Button variant="secondary" onClick={() => setIsEditing(true)}>
									<Edit className="h-4 w-4 mr-1" /> Edit
								</Button>
								<Button
									variant="danger"
									onClick={() => setConfirmDeleteOpen(true)}
								>
									<Trash2 className="h-4 w-4 mr-1" /> Hapus
								</Button>
							</>
						)}
					</div>
				</div>
			</div>

			{formError && (
				<Alert variant="error" title="Gagal" onClose={() => setFormError("")}>
					{formError}
				</Alert>
			)}

			<div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl overflow-hidden">
				<dl className="divide-y divide-gray-200">
					<Field label="Kategori">
						{isEditing ? (
							<select
								value={category}
								onChange={(e) => {
									setCategory(
										e.target.value as DtoCreateIncomeTransactionRequestCategory,
									);
									setFieldErrors((prev) => {
										const next = { ...prev };
										delete next.category;
										return next;
									});
								}}
								className={`block w-full sm:w-64 rounded-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ${fieldErrors.category ? "ring-red-300 focus:ring-red-500" : "ring-gray-300 focus:ring-indigo-600"} focus:ring-2 sm:text-sm`}
							>
								{CATEGORY_OPTIONS.map((opt) => (
									<option key={opt.value} value={opt.value}>
										{opt.label}
									</option>
								))}
							</select>
						) : (
							<Badge variant={CATEGORY_VARIANTS[item.category] || "info"}>
								{CATEGORY_LABELS[item.category] || item.category}
							</Badge>
						)}
					</Field>

					<Field label="Sumber / Pengirim">
						{isEditing ? (
							<div>
								<input
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
									className={`block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 ring-1 ring-inset ${fieldErrors.source_name ? "ring-red-300 focus:ring-red-500" : "ring-gray-300 focus:ring-indigo-600"} focus:ring-2 sm:text-sm`}
								/>
								{fieldErrors.source_name && (
									<p className="mt-1 text-sm text-red-600">
										{fieldErrors.source_name}
									</p>
								)}
							</div>
						) : (
							<span className="text-gray-900 font-semibold">
								{item.source_name}
							</span>
						)}
					</Field>

					<Field label="Nominal">
						{isEditing ? (
							<div>
								<CurrencyInput
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
									placeholder="0"
									className={`${fieldErrors.amount ? "ring-1 ring-red-500" : ""}`}
								/>
								{fieldErrors.amount && (
									<p className="mt-1 text-sm text-red-600">
										{fieldErrors.amount}
									</p>
								)}
							</div>
						) : (
							<span className="text-lg font-bold text-green-600">
								{formatCurrency(Number(item.amount))}
							</span>
						)}
					</Field>

					<Field label="Tanggal Transaksi">
						{isEditing ? (
							<div>
								<input
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
									className={`block w-full sm:w-64 rounded-md border-0 py-1.5 px-3 text-gray-900 ring-1 ring-inset ${fieldErrors.transaction_date ? "ring-red-300 focus:ring-red-500" : "ring-gray-300 focus:ring-indigo-600"} focus:ring-2 sm:text-sm`}
								/>
								{fieldErrors.transaction_date && (
									<p className="mt-1 text-sm text-red-600">
										{fieldErrors.transaction_date}
									</p>
								)}
							</div>
						) : (
							<span className="text-gray-900">
								{formatDate(item.transaction_date)}
							</span>
						)}
					</Field>

					<Field label="Nomor Referensi">
						{isEditing ? (
							<input
								type="text"
								value={referenceNumber}
								onChange={(e) => setReferenceNumber(e.target.value)}
								placeholder="Opsional, contoh: BOS-2025-001"
								className="block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-600 sm:text-sm"
							/>
						) : (
							<span className="text-gray-900">
								{item.reference_number || "-"}
							</span>
						)}
					</Field>

					<Field label="Catatan">
						{isEditing ? (
							<textarea
								rows={3}
								value={notes}
								onChange={(e) => setNotes(e.target.value)}
								placeholder="Catatan tambahan (opsional)"
								className="block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-600 sm:text-sm"
							/>
						) : (
							<span className="text-gray-900">{item.notes || "-"}</span>
						)}
					</Field>

					<Field label="Tahun Ajaran">
						<span className="text-gray-900">
							{item.academic_year?.name || "-"}
						</span>
					</Field>

					<Field label="Dicatat Oleh">
						<span className="text-gray-900">
							{item.created_by?.full_name || "-"}
						</span>
					</Field>

					<Field label="Tanggal Input">
						<span className="text-gray-900">{formatDate(item.created_at)}</span>
					</Field>
				</dl>
			</div>

			<ConfirmDialog
				open={confirmDeleteOpen}
				title="Hapus Penerimaan"
				variant="danger"
				confirmLabel="Hapus"
				cancelLabel="Batal"
				onConfirm={() => deleteMutation.mutate({ id: incomeId })}
				onCancel={() => setConfirmDeleteOpen(false)}
			>
				<p>
					Apakah Anda yakin ingin menghapus penerimaan{" "}
					<strong>{item.source_name}</strong> senilai{" "}
					<strong>{formatCurrency(Number(item.amount))}</strong>?
				</p>
			</ConfirmDialog>
		</div>
	);
}

function Field({
	label,
	children,
}: {
	label: string;
	children: React.ReactNode;
}) {
	return (
		<div className="px-4 py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
			<dt className="text-sm font-medium text-gray-500">{label}</dt>
			<dd className="mt-1 text-sm sm:col-span-2 sm:mt-0">{children}</dd>
		</div>
	);
}
