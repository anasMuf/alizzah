import {
	incomeTransactionKeys,
	useDeleteIncomeTransaction,
	useGetIncomeTransactions,
} from "@alizzah/api-client/endpoints/income-transactions/income-transactions";
import {
	Alert,
	Badge,
	Button,
	ConfirmDialog,
	EmptyState,
	Pagination,
	useToast,
} from "@alizzah/ui";
import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useAtom } from "jotai";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { academicYearAtom } from "../../../../store/global";
import { formatCurrency, formatDate } from "../../../../utils/format";

export const Route = createFileRoute("/_authenticated/keuangan/penerimaan/")({
	component: PenerimaanListPage,
});

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
	{ value: "", label: "Semua Kategori" },
	{ value: "bos", label: "Dana BOS" },
	{ value: "donasi", label: "Donasi" },
	{ value: "hibah", label: "Hibah" },
	{ value: "lainnya", label: "Lainnya" },
];

function PenerimaanListPage() {
	const [activeAy] = useAtom(academicYearAtom);
	const queryClient = useQueryClient();
	const { addToast } = useToast();

	const [selectedCategory, setSelectedCategory] = useState("");
	const [dateFrom, setDateFrom] = useState("");
	const [dateTo, setDateTo] = useState("");
	const [page, setPage] = useState(1);
	const [deletingItem, setDeletingItem] = useState<any>(null);

	const {
		data: listData,
		isLoading,
		isError,
	} = useGetIncomeTransactions(
		{
			page,
			limit: 20,
			academic_year_id: activeAy?.id,
			...(selectedCategory ? { category: selectedCategory } : {}),
			...(dateFrom ? { start_date: dateFrom } : {}),
			...(dateTo ? { end_date: dateTo } : {}),
		},
		{ query: { enabled: !!activeAy?.id } },
	);

	const items: any[] = ((listData as any)?.data as any)?.data || [];
	const meta = ((listData as any)?.data as any)?.meta;

	const deleteMutation = useDeleteIncomeTransaction({
		mutation: {
			onSuccess: () => {
				addToast({
					variant: "success",
					title: "Berhasil",
					message: "Penerimaan berhasil dihapus.",
				});
				queryClient.invalidateQueries({ queryKey: incomeTransactionKeys.all });
				queryClient.invalidateQueries({ queryKey: ["/v1/cash/balance"] });
				queryClient.invalidateQueries({ queryKey: ["/v1/cash/transactions"] });
				setDeletingItem(null);
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

	// Summary
	const totalAmount = items.reduce(
		(sum: number, t: any) => sum + Number(t.amount),
		0,
	);

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:tracking-tight">
						Penerimaan Dana Bantuan
					</h2>
					<p className="mt-1 text-sm text-gray-500">
						Catat penerimaan dari BOS, donasi, hibah, dan sumber lainnya.
					</p>
				</div>
				<Link to="/keuangan/penerimaan/baru">
					<Button variant="primary">
						<Plus className="w-4 h-4 mr-2" /> Catat Penerimaan
					</Button>
				</Link>
			</div>

			{/* Filters */}
			<div className="bg-white p-4 rounded-xl shadow-sm ring-1 ring-gray-900/5">
				<div className="flex flex-wrap gap-4 items-end">
					<div>
						<label className="block text-sm font-medium text-gray-900 mb-1">
							Kategori
						</label>
						<select
							value={selectedCategory}
							onChange={(e) => {
								setSelectedCategory(e.target.value);
								setPage(1);
							}}
							className="block w-full sm:w-44 rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
						>
							{CATEGORY_OPTIONS.map((opt) => (
								<option key={opt.value} value={opt.value}>
									{opt.label}
								</option>
							))}
						</select>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-900 mb-1">
							Dari Tanggal
						</label>
						<input
							type="date"
							value={dateFrom}
							onChange={(e) => {
								setDateFrom(e.target.value);
								setPage(1);
							}}
							className="block w-full sm:w-40 rounded-md border-0 py-1.5 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
						/>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-900 mb-1">
							Sampai Tanggal
						</label>
						<input
							type="date"
							value={dateTo}
							onChange={(e) => {
								setDateTo(e.target.value);
								setPage(1);
							}}
							className="block w-full sm:w-40 rounded-md border-0 py-1.5 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
						/>
					</div>
					{(selectedCategory || dateFrom || dateTo) && (
						<button
							type="button"
							onClick={() => {
								setSelectedCategory("");
								setDateFrom("");
								setDateTo("");
								setPage(1);
							}}
							className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
						>
							Reset Filter
						</button>
					)}
				</div>
			</div>

			{/* Loading / Error */}
			{isLoading && (
				<div className="animate-pulse space-y-3">
					{[1, 2, 3].map((n) => (
						<div key={n} className="h-16 bg-gray-200 rounded-lg" />
					))}
				</div>
			)}
			{isError && (
				<Alert variant="error" title="Gagal Memuat">
					Terjadi kesalahan saat memuat data penerimaan.
				</Alert>
			)}

			{/* Table */}
			{!isLoading && !isError && (
				<>
					{items.length === 0 ? (
						<EmptyState
							title="Belum ada data penerimaan"
							description="Mulai catat penerimaan dana bantuan seperti BOS, donasi, atau hibah."
						/>
					) : (
						<div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 overflow-hidden">
							<div className="overflow-x-auto">
								<table className="min-w-full divide-y divide-gray-300">
									<thead className="bg-gray-50">
										<tr>
											<th className="py-3 pl-6 pr-3 text-left text-sm font-semibold text-gray-900">
												Tanggal
											</th>
											<th className="px-3 py-3 text-left text-sm font-semibold text-gray-900">
												Kategori
											</th>
											<th className="px-3 py-3 text-left text-sm font-semibold text-gray-900">
												Sumber / Pengirim
											</th>
											<th className="px-3 py-3 text-left text-sm font-semibold text-gray-900">
												Ref
											</th>
											<th className="px-3 py-3 text-right text-sm font-semibold text-gray-900">
												Nominal
											</th>
											<th className="px-3 py-3 text-right text-sm font-semibold text-gray-900 pr-6">
												Aksi
											</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-gray-100 bg-white">
										{items.map((item: any) => (
											<tr key={item.id} className="hover:bg-gray-50">
												<td className="py-3 pl-6 pr-3 text-sm text-gray-900 tabular-nums whitespace-nowrap">
													{formatDate(item.transaction_date)}
												</td>
												<td className="px-3 py-3 text-sm">
													<Badge
														variant={CATEGORY_VARIANTS[item.category] || "info"}
													>
														{CATEGORY_LABELS[item.category] || item.category}
													</Badge>
												</td>
												<td className="px-3 py-3 text-sm text-gray-900">
													<div>{item.source_name}</div>
													{item.notes && (
														<div className="text-xs text-gray-500 mt-0.5">
															{item.notes}
														</div>
													)}
												</td>
												<td className="px-3 py-3 text-sm text-gray-500">
													{item.reference_number || "-"}
												</td>
												<td className="px-3 py-3 text-sm text-right font-semibold text-gray-900 tabular-nums">
													{formatCurrency(Number(item.amount))}
												</td>
												<td className="px-3 py-3 text-right pr-6">
													<div className="flex gap-2 justify-end">
														<Link
															to="/keuangan/penerimaan/$id"
															params={{ id: item.id.toString() }}
															className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
														>
															Detail
														</Link>
														<button
															type="button"
															onClick={() => setDeletingItem(item)}
															className="text-xs font-medium text-rose-600 hover:text-rose-800 flex items-center"
														>
															<Trash2 className="w-3 h-3 mr-0.5" /> Hapus
														</button>
													</div>
												</td>
											</tr>
										))}
									</tbody>
									<tfoot>
										<tr className="bg-gray-50 border-t-2 border-gray-300">
											<td
												colSpan={4}
												className="py-3 pl-6 text-sm font-bold text-gray-900 text-right"
											>
												Total Halaman Ini
											</td>
											<td className="py-3 px-3 text-sm text-right font-bold text-gray-900 tabular-nums">
												{formatCurrency(totalAmount)}
											</td>
											<td />
										</tr>
									</tfoot>
								</table>
							</div>

							{meta && meta.total > meta.limit && (
								<div className="border-t border-gray-200 px-4 py-3">
									<Pagination
										page={meta.page}
										limit={meta.limit}
										total={meta.total}
										onPageChange={setPage}
									/>
								</div>
							)}
						</div>
					)}
				</>
			)}

			{/* Delete Confirm */}
			<ConfirmDialog
				open={!!deletingItem}
				onCancel={() => setDeletingItem(null)}
				onConfirm={() => {
					if (deletingItem) deleteMutation.mutate(deletingItem.id);
				}}
				title="Hapus Penerimaan"
				variant="danger"
				confirmLabel="Hapus"
			>
				<p>
					Apakah Anda yakin ingin menghapus penerimaan{" "}
					<strong>{deletingItem?.source_name}</strong> senilai{" "}
					<strong>{formatCurrency(Number(deletingItem?.amount))}</strong>?
				</p>
				<p className="mt-2 text-sm text-gray-500">
					Tindakan ini tidak dapat dibatalkan.
				</p>
			</ConfirmDialog>
		</div>
	);
}
