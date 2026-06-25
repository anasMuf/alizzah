import { Link } from "@tanstack/react-router";
import { ChevronRight, Save } from "lucide-react";
import { Alert, Button } from "#/components/ui";

interface ExpenseFormProps {
	categories: any[];
	subCategories: any[];
	expenseDate: string;
	onExpenseDateChange: (v: string) => void;
	parentCategoryId: string;
	onParentCategoryChange: (v: string) => void;
	subCategoryId: string;
	onSubCategoryChange: (v: string) => void;
	amount: string;
	onAmountChange: (v: string) => void;
	description: string;
	onDescriptionChange: (v: string) => void;
	onReceiptChange: (v: string) => void;
	formError: string;
	onClearError: () => void;
	fieldErrors: Record<string, string>;
	onClearFieldError: (field: string) => void;
	isPending: boolean;
	onSubmit: (e: React.FormEvent) => void;
}

export function ExpenseForm({
	categories,
	subCategories,
	expenseDate,
	onExpenseDateChange,
	parentCategoryId,
	onParentCategoryChange,
	subCategoryId,
	onSubCategoryChange,
	amount,
	onAmountChange,
	description,
	onDescriptionChange,
	onReceiptChange,
	formError,
	onClearError,
	fieldErrors,
	onClearFieldError,
	isPending,
	onSubmit,
}: ExpenseFormProps) {
	return (
		<div className="space-y-6 max-w-3xl mx-auto">
			<div>
				<nav
					className="flex items-center text-sm text-gray-500 mb-2"
					aria-label="Breadcrumb"
				>
					<Link to="/keuangan/pengeluaran" className="hover:text-indigo-600">
						Pengeluaran
					</Link>
					<ChevronRight className="w-4 h-4 mx-1" />
					<span className="text-gray-900 font-medium">Catat Baru</span>
				</nav>
				<h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:tracking-tight">
					Catat Pengeluaran
				</h2>
				<p className="mt-1 text-sm text-gray-500">
					Catat pengeluaran operasional baru.
				</p>
			</div>

			{formError && (
				<Alert variant="error" title="Gagal" onClose={onClearError}>
					{formError}
				</Alert>
			)}

			<form onSubmit={onSubmit}>
				<div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl">
					<div className="px-4 py-6 sm:p-8 space-y-6">
						<div>
							<label
								htmlFor="expense_date"
								className="block text-sm font-medium leading-6 text-gray-900"
							>
								Tanggal <span className="text-red-500">*</span>
							</label>
							<div className="mt-2">
								<input
									id="expense_date"
									type="date"
									value={expenseDate}
									onChange={(e) => {
										onExpenseDateChange(e.target.value);
										onClearFieldError("expense_date");
									}}
									className={`block w-full sm:w-64 rounded-md border-0 py-1.5 px-3 text-gray-900 ring-1 ring-inset ${fieldErrors.expense_date ? "ring-red-300 focus:ring-red-500" : "ring-gray-300 focus:ring-indigo-600"} focus:ring-2 focus:ring-inset sm:text-sm sm:leading-6`}
								/>
								{fieldErrors.expense_date && (
									<p className="mt-1 text-sm text-red-600">
										{fieldErrors.expense_date}
									</p>
								)}
							</div>
						</div>

						<div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
							<div>
								<label
									htmlFor="parent_category"
									className="block text-sm font-medium leading-6 text-gray-900"
								>
									Kategori <span className="text-red-500">*</span>
								</label>
								<div className="mt-2">
									<select
										id="parent_category"
										value={parentCategoryId}
										onChange={(e) => {
											onParentCategoryChange(e.target.value);
											onClearFieldError("parent_category");
										}}
										className={`block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ${fieldErrors.parent_category ? "ring-red-300 focus:ring-red-500" : "ring-gray-300 focus:ring-indigo-600"} focus:ring-2 sm:text-sm sm:leading-6`}
									>
										<option value="">Pilih Kategori</option>
										{categories.map((cat: any) => (
											<option key={cat.id} value={cat.id}>
												{cat.name}
											</option>
										))}
									</select>
									{fieldErrors.parent_category && (
										<p className="mt-1 text-sm text-red-600">
											{fieldErrors.parent_category}
										</p>
									)}
								</div>
							</div>

							<div>
								<label
									htmlFor="sub_category"
									className="block text-sm font-medium leading-6 text-gray-900"
								>
									Sub-kategori <span className="text-red-500">*</span>
								</label>
								<div className="mt-2">
									<select
										id="sub_category"
										value={subCategoryId}
										onChange={(e) => {
											onSubCategoryChange(e.target.value);
											onClearFieldError("expense_category_id");
										}}
										disabled={!parentCategoryId}
										className={`block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ${fieldErrors.expense_category_id ? "ring-red-300 focus:ring-red-500" : "ring-gray-300 focus:ring-indigo-600"} focus:ring-2 sm:text-sm sm:leading-6 disabled:bg-gray-50 disabled:text-gray-500`}
									>
										<option value="">
											{parentCategoryId
												? "Pilih Sub-kategori"
												: "Pilih kategori terlebih dahulu"}
										</option>
										{subCategories.map((cat: any) => (
											<option key={cat.id} value={cat.id}>
												{cat.name}
											</option>
										))}
									</select>
									{fieldErrors.expense_category_id && (
										<p className="mt-1 text-sm text-red-600">
											{fieldErrors.expense_category_id}
										</p>
									)}
								</div>
							</div>
						</div>

						<div>
							<label
								htmlFor="amount"
								className="block text-sm font-medium leading-6 text-gray-900"
							>
								Nominal <span className="text-red-500">*</span>
							</label>
							<div className="relative mt-2 rounded-md shadow-sm">
								<div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
									<span className="text-gray-500 sm:text-sm">Rp</span>
								</div>
								<input
									id="amount"
									type="number"
									min="1"
									step="1"
									value={amount}
									onChange={(e) => {
										onAmountChange(e.target.value);
										onClearFieldError("amount");
									}}
									placeholder="0"
									className={`block w-full sm:w-64 rounded-md border-0 py-1.5 pl-10 pr-3 text-gray-900 ring-1 ring-inset ${fieldErrors.amount ? "ring-red-300 focus:ring-red-500" : "ring-gray-300 focus:ring-indigo-600"} placeholder:text-gray-400 focus:ring-2 focus:ring-inset sm:text-sm sm:leading-6`}
								/>
							</div>
							{fieldErrors.amount && (
								<p className="mt-1 text-sm text-red-600">
									{fieldErrors.amount}
								</p>
							)}
						</div>

						<div>
							<label
								htmlFor="description"
								className="block text-sm font-medium leading-6 text-gray-900"
							>
								Keterangan <span className="text-red-500">*</span>
							</label>
							<div className="mt-2">
								<textarea
									id="description"
									rows={3}
									value={description}
									onChange={(e) => {
										onDescriptionChange(e.target.value);
										onClearFieldError("description");
									}}
									placeholder="Jelaskan detail pengeluaran..."
									className={`block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 ring-1 ring-inset ${fieldErrors.description ? "ring-red-300 focus:ring-red-500" : "ring-gray-300 focus:ring-indigo-600"} placeholder:text-gray-400 focus:ring-2 focus:ring-inset sm:text-sm sm:leading-6`}
								/>
								{fieldErrors.description && (
									<p className="mt-1 text-sm text-red-600">
										{fieldErrors.description}
									</p>
								)}
							</div>
						</div>

						<div>
							<label
								htmlFor="receipt"
								className="block text-sm font-medium leading-6 text-gray-900"
							>
								Bukti Pengeluaran{" "}
								<span className="text-gray-400">(opsional)</span>
							</label>
							<div className="mt-2">
								<input
									id="receipt"
									type="file"
									accept="image/*,.pdf"
									onChange={(e) =>
										onReceiptChange(e.target.files?.[0]?.name || "")
									}
									className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 file:cursor-pointer"
								/>
								<p className="mt-1 text-xs text-gray-500">
									Format: JPG, PNG, atau PDF.
								</p>
							</div>
						</div>
					</div>

					<div className="flex items-center justify-end gap-x-3 border-t border-gray-200 px-4 py-4 sm:px-8">
						<Link to="/keuangan/pengeluaran">
							<Button type="button" variant="secondary">
								Batal
							</Button>
						</Link>
						<Button type="submit" variant="primary" disabled={isPending}>
							<Save className="w-4 h-4 mr-2" />
							{isPending ? "Menyimpan..." : "Simpan Pengeluaran"}
						</Button>
					</div>
				</div>
			</form>
		</div>
	);
}
