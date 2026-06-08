import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useAtom } from "jotai";
import { ArrowLeft, Edit, ExternalLink, Save, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useGetV1ExpenseCategories } from "../../../../api/endpoints/expense-categories/expense-categories";
import {
	useDeleteV1ExpensesId,
	useGetV1ExpensesId,
	usePutV1ExpensesId,
} from "../../../../api/endpoints/expenses/expenses";
import { ApiError } from "../../../../api/mutator/custom-instance";
import { Alert } from "../../../../components/atoms/Alert";
import { Badge } from "../../../../components/atoms/Badge";
import { Button } from "../../../../components/atoms/Button";
import { ConfirmDialog } from "../../../../components/molecules/ConfirmDialog";
import { EmptyState } from "../../../../components/molecules/EmptyState";
import { useToast } from "../../../../components/molecules/Toast";
import { academicYearAtom } from "../../../../store/global";
import {
	formatCurrency,
	formatDate,
	formatDateTime,
} from "../../../../utils/format";

export const Route = createFileRoute(
	"/_authenticated/keuangan/pengeluaran/$id",
)({
	component: PengeluaranDetailPage,
});

function PengeluaranDetailPage() {
	const { id } = Route.useParams();
	const expenseId = Number(id);
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const { addToast } = useToast();
	const [activeAy] = useAtom(academicYearAtom);

	const [isEditing, setIsEditing] = useState(false);
	const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

	const [expenseDate, setExpenseDate] = useState("");
	const [parentCategoryId, setParentCategoryId] = useState("");
	const [subCategoryId, setSubCategoryId] = useState("");
	const [amount, setAmount] = useState("");
	const [description, setDescription] = useState("");
	const [formError, setFormError] = useState("");

	const {
		data: expenseResponse,
		isLoading,
		isError,
	} = useGetV1ExpensesId(expenseId);
	const expense = (expenseResponse?.data as any)?.data;

	const { data: categoriesData } = useGetV1ExpenseCategories();
	const categories: any[] = (categoriesData?.data as any)?.data || [];

	const subCategories = useMemo(() => {
		if (!parentCategoryId) return [];
		const parent = categories.find(
			(c: any) => c.id === Number(parentCategoryId),
		);
		return parent?.children || [];
	}, [categories, parentCategoryId]);

	useEffect(() => {
		if (expense && categories.length > 0) {
			setExpenseDate(expense.expense_date || "");
			setAmount(String(expense.amount || ""));
			setDescription(expense.description || "");

			const cat = expense.category;
			if (cat?.parent_name) {
				const parent = categories.find((c: any) => c.name === cat.parent_name);
				if (parent) {
					setParentCategoryId(String(parent.id));
					const child = parent.children?.find((c: any) => c.name === cat.name);
					if (child) setSubCategoryId(String(child.id));
				}
			} else if (cat?.id) {
				for (const parent of categories) {
					const child = parent.children?.find((c: any) => c.id === cat.id);
					if (child) {
						setParentCategoryId(String(parent.id));
						setSubCategoryId(String(child.id));
						break;
					}
				}
			}
		}
	}, [expense, categories]);

	const updateMutation = usePutV1ExpensesId({
		mutation: {
			onSuccess: () => {
				addToast({
					variant: "success",
					title: "Berhasil",
					message: "Pengeluaran berhasil diperbarui.",
				});
				queryClient.invalidateQueries({
					queryKey: [`/v1/expenses/${expenseId}`],
				});
				queryClient.invalidateQueries({ queryKey: ["/v1/expenses"] });
				setIsEditing(false);
			},
			onError: (error: Error) => {
				const msg =
					error instanceof ApiError
						? error.message
						: "Gagal memperbarui pengeluaran.";
				setFormError(msg);
			},
		},
	});

	const deleteMutation = useDeleteV1ExpensesId({
		mutation: {
			onSuccess: () => {
				addToast({
					variant: "success",
					title: "Berhasil",
					message: "Pengeluaran berhasil dihapus.",
				});
				navigate({ to: "/keuangan/pengeluaran" });
			},
			onError: (error: Error) => {
				const msg =
					error instanceof ApiError
						? error.message
						: "Gagal menghapus pengeluaran.";
				addToast({ variant: "error", title: "Gagal", message: msg });
				setConfirmDeleteOpen(false);
			},
		},
	});

	const handleSave = () => {
		setFormError("");
		if (
			!subCategoryId ||
			!amount ||
			Number(amount) <= 0 ||
			!description.trim()
		) {
			setFormError("Semua field wajib diisi dengan benar.");
			return;
		}
		if (!activeAy?.id) {
			setFormError("Tahun ajaran belum dipilih.");
			return;
		}
		updateMutation.mutate({
			id: expenseId,
			data: {
				academic_year_id: activeAy.id,
				expense_category_id: Number(subCategoryId),
				expense_date: expenseDate,
				amount: Number(amount),
				description: description.trim(),
			},
		});
	};

	const handleCancelEdit = () => {
		setIsEditing(false);
		setFormError("");
		if (expense) {
			setExpenseDate(expense.expense_date || "");
			setAmount(String(expense.amount || ""));
			setDescription(expense.description || "");
		}
	};

	if (isLoading) {
		return (
			<div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 h-64 animate-pulse" />
		);
	}

	if (isError || !expense) {
		return (
			<EmptyState
				title="Pengeluaran tidak ditemukan"
				description="Data pengeluaran dengan ID ini tidak ditemukan."
				action={
					<Link to="/keuangan/pengeluaran">
						<Button variant="secondary">Kembali ke Daftar</Button>
					</Link>
				}
			/>
		);
	}

	const getCategoryDisplay = () => {
		const cat = expense.category;
		if (!cat) return { parent: "-", child: "-" };
		return { parent: cat.parent_name || "-", child: cat.name || "-" };
	};

	const catDisplay = getCategoryDisplay();

	return (
		<div className="space-y-6 max-w-3xl mx-auto">
			<div>
				<Link
					to="/keuangan/pengeluaran"
					className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
				>
					<ArrowLeft className="h-4 w-4" />
					Kembali ke Daftar Pengeluaran
				</Link>

				<div className="sm:flex sm:items-center sm:justify-between">
					<div>
						<h1 className="text-2xl font-bold leading-7 text-gray-900">
							Detail Pengeluaran
						</h1>
						<p className="mt-1 text-sm text-gray-500">ID #{expense.id}</p>
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
					<Field label="Tanggal">
						{isEditing ? (
							<input
								type="date"
								value={expenseDate}
								onChange={(e) => setExpenseDate(e.target.value)}
								className="block w-full sm:w-64 rounded-md border-0 py-1.5 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm"
							/>
						) : (
							<span className="text-gray-900">
								{formatDate(expense.expense_date)}
							</span>
						)}
					</Field>

					<Field label="Kategori">
						{isEditing ? (
							<div className="grid grid-cols-2 gap-3">
								<select
									value={parentCategoryId}
									onChange={(e) => {
										setParentCategoryId(e.target.value);
										setSubCategoryId("");
									}}
									className="block w-full rounded-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm"
								>
									<option value="">Pilih Kategori</option>
									{categories.map((cat: any) => (
										<option key={cat.id} value={cat.id}>
											{cat.name}
										</option>
									))}
								</select>
								<select
									value={subCategoryId}
									onChange={(e) => setSubCategoryId(e.target.value)}
									disabled={!parentCategoryId}
									className="block w-full rounded-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm disabled:bg-gray-50 disabled:text-gray-500"
								>
									<option value="">Pilih Sub-kategori</option>
									{subCategories.map((cat: any) => (
										<option key={cat.id} value={cat.id}>
											{cat.name}
										</option>
									))}
								</select>
							</div>
						) : (
							<div className="flex gap-2 items-center">
								<Badge variant="secondary">{catDisplay.parent}</Badge>
								<span className="text-gray-400">&gt;</span>
								<Badge variant="primary">{catDisplay.child}</Badge>
							</div>
						)}
					</Field>

					<Field label="Nominal">
						{isEditing ? (
							<div className="relative w-full sm:w-64">
								<div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
									<span className="text-gray-500 sm:text-sm">Rp</span>
								</div>
								<input
									type="number"
									min="1"
									value={amount}
									onChange={(e) => setAmount(e.target.value)}
									className="block w-full rounded-md border-0 py-1.5 pl-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm"
								/>
							</div>
						) : (
							<span className="text-lg font-semibold text-gray-900">
								{formatCurrency(Number(expense.amount))}
							</span>
						)}
					</Field>

					<Field label="Keterangan">
						{isEditing ? (
							<textarea
								rows={3}
								value={description}
								onChange={(e) => setDescription(e.target.value)}
								className="block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm"
							/>
						) : (
							<span className="text-gray-900">
								{expense.description || "-"}
							</span>
						)}
					</Field>

					<Field label="Bukti">
						{expense.receipt_url ? (
							<a
								href={expense.receipt_url}
								target="_blank"
								rel="noopener noreferrer"
								className="inline-flex items-center text-indigo-600 hover:text-indigo-500"
							>
								Lihat Bukti <ExternalLink className="w-3 h-3 ml-1" />
							</a>
						) : (
							<span className="text-gray-400">Tidak ada</span>
						)}
					</Field>

					<Field label="Dicatat oleh">
						<span className="text-gray-900">
							{expense.created_by?.full_name || "-"}
						</span>
					</Field>

					<Field label="Waktu Dicatat">
						<span className="text-gray-900">
							{formatDateTime(expense.created_at)}
						</span>
					</Field>
				</dl>
			</div>

			<ConfirmDialog
				open={confirmDeleteOpen}
				title="Hapus Pengeluaran"
				description={`Apakah Anda yakin ingin menghapus pengeluaran "${expense.description}" sebesar ${formatCurrency(Number(expense.amount))}?`}
				variant="danger"
				confirmLabel="Hapus"
				cancelLabel="Batal"
				onConfirm={() => deleteMutation.mutate({ id: expenseId })}
				onCancel={() => setConfirmDeleteOpen(false)}
			/>
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
