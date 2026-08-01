import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useAtom } from "jotai";
import { ChevronRight, Save } from "lucide-react";
import { useMemo, useState } from "react";
import { useGetV1ExpenseCategories } from "#/api/endpoints/expense-categories/expense-categories";
import { usePostV1Expenses } from "#/api/endpoints/expenses/expenses";
import { Alert, Button, CurrencyInput, useToast } from "#/components/ui";
import { academicYearAtom } from "../../../../store/global";

export const Route = createFileRoute(
	"/_authenticated/keuangan/pengeluaran/baru",
)({
	component: CatatPengeluaranPage,
});

function CatatPengeluaranPage() {
	const navigate = useNavigate();
	const [activeAy] = useAtom(academicYearAtom);
	const queryClient = useQueryClient();
	const { addToast } = useToast();

	const today = new Date().toISOString().split("T")[0];

	const [expenseDate, setExpenseDate] = useState(today);
	const [parentCategoryId, setParentCategoryId] = useState("");
	const [subCategoryId, setSubCategoryId] = useState("");
	const [amount, setAmount] = useState(0);
	const [description, setDescription] = useState("");
	const [formError, setFormError] = useState("");
	const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

	const { data: categoriesData } = useGetV1ExpenseCategories();
	const categories: any[] = (categoriesData?.data as any)?.data || [];

	const subCategories = useMemo(() => {
		if (!parentCategoryId) return [];
		const parent = categories.find(
			(c: any) => c.id === Number(parentCategoryId),
		);
		return parent?.children || [];
	}, [categories, parentCategoryId]);

	const createMutation = usePostV1Expenses({
		mutation: {
			onSuccess: () => {
				addToast({
					variant: "success",
					title: "Berhasil",
					message: "Pengeluaran berhasil dicatat.",
				});
				queryClient.invalidateQueries({ queryKey: ["/v1/cash/balance"] });
				queryClient.invalidateQueries({ queryKey: ["/v1/cash/transactions"] });
				navigate({ to: "/keuangan/pengeluaran", search: {} as any });
			},
			onError: (err: any) => {
				const status = err?.status || err?.response?.status;
				const data = err?.response?.data || err?.data;

				if (status === 422) {
					const message =
						data?.message ||
						"Tanggal ini sudah ditutup buku. Tidak dapat mencatat pengeluaran pada tanggal tersebut.";
					setFormError(message);
					return;
				}

				if (status === 400 && data?.errors) {
					const errors: Record<string, string> = {};
					Object.entries(data.errors).forEach(([key, val]: [string, any]) => {
						errors[key] = Array.isArray(val) ? val[0] : val;
					});
					setFieldErrors(errors);
					return;
				}

				setFormError(
					data?.message || err?.message || "Gagal menyimpan pengeluaran.",
				);
			},
		},
	});

	const validate = (): boolean => {
		const errors: Record<string, string> = {};

		if (!expenseDate) errors.expense_date = "Tanggal wajib diisi.";
		if (!parentCategoryId) errors.parent_category = "Kategori wajib dipilih.";
		if (!subCategoryId)
			errors.expense_category_id = "Sub-kategori wajib dipilih.";
		if (amount <= 0) errors.amount = "Nominal harus lebih dari 0.";
		if (!description.trim()) errors.description = "Keterangan wajib diisi.";

		setFieldErrors(errors);
		return Object.keys(errors).length === 0;
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		setFormError("");

		if (!validate()) return;

		if (!activeAy?.id) {
			setFormError("Tahun ajaran belum dipilih.");
			return;
		}

		createMutation.mutate({
			data: {
				academic_year_id: activeAy.id,
				expense_category_id: Number(subCategoryId),
				expense_date: expenseDate,
				amount,
				description: description.trim(),
				receipt_url: undefined,
			},
		});
	};

	const handleParentChange = (val: string) => {
		setParentCategoryId(val);
		setSubCategoryId("");
		setFieldErrors((prev) => {
			const next = { ...prev };
			delete next.parent_category;
			delete next.expense_category_id;
			return next;
		});
	};

	return (
		<div className="space-y-6 max-w-3xl mx-auto">
			<div>
				<nav
					className="flex items-center text-sm text-gray-500 mb-2"
					aria-label="Breadcrumb"
				>
					<Link
						to="/keuangan/pengeluaran"
						search={{} as any}
						className="hover:text-indigo-600"
					>
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
				<Alert variant="error" title="Gagal" onClose={() => setFormError("")}>
					{formError}
				</Alert>
			)}

			<form onSubmit={handleSubmit}>
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
										setExpenseDate(e.target.value);
										setFieldErrors((prev) => {
											const n = { ...prev };
											delete n.expense_date;
											return n;
										});
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
										onChange={(e) => handleParentChange(e.target.value)}
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
											setSubCategoryId(e.target.value);
											setFieldErrors((prev) => {
												const n = { ...prev };
												delete n.expense_category_id;
												return n;
											});
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
							<div className="mt-2">
								<CurrencyInput
									id="amount"
									value={amount}
									onChange={(val) => {
										setAmount(val);
										setFieldErrors((prev) => {
											const n = { ...prev };
											delete n.amount;
											return n;
										});
									}}
									showSymbol
									placeholder="0"
									className={`sm:w-64 ${fieldErrors.amount ? "ring-1 ring-red-500" : ""}`}
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
										setDescription(e.target.value);
										setFieldErrors((prev) => {
											const n = { ...prev };
											delete n.description;
											return n;
										});
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
									onChange={() => {
										// TODO: implement file upload
									}}
									className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 file:cursor-pointer"
								/>
								<p className="mt-1 text-xs text-gray-500">
									Format: JPG, PNG, atau PDF. Fitur upload akan segera tersedia.
								</p>
							</div>
						</div>
					</div>

					<div className="flex items-center justify-end gap-x-3 border-t border-gray-200 px-4 py-4 sm:px-8">
						<Link to="/keuangan/pengeluaran" search={{} as any}>
							<Button type="button" variant="secondary">
								Batal
							</Button>
						</Link>
						<Button
							type="submit"
							variant="primary"
							disabled={createMutation.isPending}
						>
							<Save className="w-4 h-4 mr-2" />
							{createMutation.isPending ? "Menyimpan..." : "Simpan Pengeluaran"}
						</Button>
					</div>
				</div>
			</form>
		</div>
	);
}
