import { Link } from "@tanstack/react-router";
import { ArrowLeft, Edit, ExternalLink, Save, Trash2, X } from "lucide-react";
import {
	Alert,
	Badge,
	Button,
	ConfirmDialog,
	EmptyState,
} from "#/components/ui";
import { formatCurrency, formatDate, formatDateTime } from "@/utils/format";

interface ExpenseDetailProps {
	expense: any;
	isLoading: boolean;
	isError: boolean;
	isEditing: boolean;
	onStartEdit: () => void;
	expenseDate: string;
	onExpenseDateChange: (v: string) => void;
	categories: any[];
	parentCategoryId: string;
	onParentCategoryChange: (v: string) => void;
	subCategoryId: string;
	onSubCategoryChange: (v: string) => void;
	subCategories: any[];
	amount: string;
	onAmountChange: (v: string) => void;
	description: string;
	onDescriptionChange: (v: string) => void;
	formError: string;
	onClearError: () => void;
	categoryDisplay: { parent: string; child: string };
	isPending: boolean;
	onSave: () => void;
	onCancelEdit: () => void;
	confirmDeleteOpen: boolean;
	onOpenDelete: () => void;
	onCloseDelete: () => void;
	onConfirmDelete: () => void;
}

export function ExpenseDetail({
	expense,
	isLoading,
	isError,
	isEditing,
	onStartEdit,
	expenseDate,
	onExpenseDateChange,
	categories,
	parentCategoryId,
	onParentCategoryChange,
	subCategoryId,
	onSubCategoryChange,
	subCategories,
	amount,
	onAmountChange,
	description,
	onDescriptionChange,
	formError,
	onClearError,
	categoryDisplay,
	isPending,
	onSave,
	onCancelEdit,
	confirmDeleteOpen,
	onOpenDelete,
	onCloseDelete,
	onConfirmDelete,
}: ExpenseDetailProps) {
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

	return (
		<div className="space-y-6 max-w-3xl mx-auto">
			<div>
				<Link
					to="/keuangan/pengeluaran"
					className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
				>
					<ArrowLeft className="h-4 w-4" /> Kembali ke Daftar Pengeluaran
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
									onClick={onCancelEdit}
									disabled={isPending}
								>
									<X className="h-4 w-4 mr-1" /> Batal
								</Button>
								<Button variant="primary" onClick={onSave} disabled={isPending}>
									<Save className="h-4 w-4 mr-1" />{" "}
									{isPending ? "Menyimpan..." : "Simpan"}
								</Button>
							</>
						) : (
							<>
								<Button variant="secondary" onClick={onStartEdit}>
									<Edit className="h-4 w-4 mr-1" /> Edit
								</Button>
								<Button variant="danger" onClick={onOpenDelete}>
									<Trash2 className="h-4 w-4 mr-1" /> Hapus
								</Button>
							</>
						)}
					</div>
				</div>
			</div>

			{formError && (
				<Alert variant="error" title="Gagal" onClose={onClearError}>
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
								onChange={(e) => onExpenseDateChange(e.target.value)}
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
										onParentCategoryChange(e.target.value);
										onSubCategoryChange("");
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
									onChange={(e) => onSubCategoryChange(e.target.value)}
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
								<Badge variant="secondary">{categoryDisplay.parent}</Badge>
								<span className="text-gray-400">&gt;</span>
								<Badge variant="primary">{categoryDisplay.child}</Badge>
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
									onChange={(e) => onAmountChange(e.target.value)}
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
								onChange={(e) => onDescriptionChange(e.target.value)}
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
				onConfirm={onConfirmDelete}
				onCancel={onCloseDelete}
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
