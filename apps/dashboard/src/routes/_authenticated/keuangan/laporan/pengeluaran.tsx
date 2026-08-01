import { createFileRoute, Link } from "@tanstack/react-router";
import { useAtom } from "jotai";
import { ChevronRight, Printer } from "lucide-react";
import { useMemo, useState } from "react";
import { useGetV1ExpenseCategories } from "#/api/endpoints/expense-categories/expense-categories";
import {
	useGetV1FeeConfigs,
	useGetV1FeeConfigsIdItems,
} from "#/api/endpoints/fee-configs/fee-configs";
import {
	type PengeluaranData,
	useGetReportsPengeluaran,
} from "#/api/endpoints/reports/pengeluaran";
import { Alert, Button } from "#/components/ui";
import {
	FilterBar,
	type FilterBarValues,
} from "#/features/keuangan/components/FilterBar";
import { MultiSelectCheckbox } from "#/features/keuangan/components/MultiSelectCheckbox";
import { ReportInfoCard } from "#/features/keuangan/components/ReportInfoCard";
import { academicYearAtom } from "#/store/global";
import { formatCurrency, formatDate } from "#/utils/format";
import { openPrintWindow } from "#/utils/print";

export const Route = createFileRoute(
	"/_authenticated/keuangan/laporan/pengeluaran",
)({
	component: LaporanPengeluaranPage,
});

/** Flatten expense category tree into flat options */
function flattenCategories(
	cats: any[],
	prefix = "",
): { id: number; label: string }[] {
	const result: { id: number; label: string }[] = [];
	for (const cat of cats) {
		const label = prefix ? `${prefix} > ${cat.name}` : cat.name;
		result.push({ id: cat.id, label });
		if (cat.children?.length) {
			result.push(...flattenCategories(cat.children, label));
		}
	}
	return result;
}

function LaporanPengeluaranPage() {
	const [activeAy] = useAtom(academicYearAtom);

	// Fetch fee configs
	const { data: feeConfigsData } = useGetV1FeeConfigs({
		query: { staleTime: 5 * 60 * 1000 },
	});
	const feeConfigs = ((feeConfigsData?.data as any)?.data ?? []) as any[];
	const activeFeeConfig = feeConfigs.find(
		(fc: any) => fc.academic_year?.is_active,
	);
	const feeConfigId = activeFeeConfig?.id ?? feeConfigs[0]?.id;

	const { data: feeItemsData } = useGetV1FeeConfigsIdItems(
		feeConfigId,
		undefined,
		{ query: { enabled: !!feeConfigId, staleTime: 5 * 60 * 1000 } },
	);
	const feeItems = ((feeItemsData?.data as any)?.data ?? []) as any[];

	const feeItemOptions = useMemo(
		() =>
			feeItems.map((item: any) => ({
				id: item.id,
				label: `${item.name} (${item.category})`,
			})),
		[feeItems],
	);

	// Fetch expense categories
	const { data: expenseCatData } = useGetV1ExpenseCategories({
		query: { staleTime: 5 * 60 * 1000 },
	});
	const expenseCats = ((expenseCatData?.data as any)?.data ?? []) as any[];
	const expenseCatOptions = useMemo(
		() => flattenCategories(expenseCats),
		[expenseCats],
	);

	// Filter state
	const [selectedFeeItemIds, setSelectedFeeItemIds] = useState<number[]>([]);
	const [selectedExpenseCatIds, setSelectedExpenseCatIds] = useState<number[]>(
		[],
	);
	const [generatedFilters, setGeneratedFilters] =
		useState<FilterBarValues | null>(null);

	const queryParams = useMemo(() => {
		if (!generatedFilters) return {};
		return {
			date_from: generatedFilters.date_from,
			date_to: generatedFilters.date_to,
			payment_method: generatedFilters.payment_method || undefined,
			fee_item_ids:
				selectedFeeItemIds.length > 0
					? selectedFeeItemIds.join(",")
					: undefined,
			expense_category_ids:
				selectedExpenseCatIds.length > 0
					? selectedExpenseCatIds.join(",")
					: undefined,
			academic_year_id: generatedFilters.academic_year_id,
		};
	}, [generatedFilters, selectedFeeItemIds, selectedExpenseCatIds]);

	const {
		data: reportData,
		isLoading,
		isError,
	} = useGetReportsPengeluaran(queryParams, {
		query: { enabled: !!generatedFilters },
	});

	const report: PengeluaranData | null =
		(reportData?.data as any)?.data ?? null;

	const handleGenerate = (filters: FilterBarValues) => {
		setGeneratedFilters(filters);
	};

	const handlePrint = () => {
		if (!report) return;
		const esc = (s: string) =>
			s
				.replace(/&/g, "&amp;")
				.replace(/</g, "&lt;")
				.replace(/>/g, "&gt;")
				.replace(/"/g, "&quot;");
		const fmt = (n: number) => esc(formatCurrency(n));

		let html = `<h2 class="text-lg font-bold mb-2">Laporan Pengeluaran</h2>`;
		html += `<p class="text-gray mb-2">Periode: ${esc(formatDate(report.date_from))} - ${esc(formatDate(report.date_to))}</p>`;
		html += `<p class="text-gray mb-4">TA ${esc(report.academic_year)}</p>`;

		for (const block of report.transactions) {
			html += `<div class="border p-4 rounded mb-4">`;
			html += `<p class="text-sm font-bold mb-2">${esc(formatDate(block.date))} — Subtotal: ${fmt(block.subtotal)}</p>`;
			for (const txn of block.transactions) {
				html += `<div class="border-t pt-2 mt-2">`;
				html += `<table class="mb-1"><tbody>`;
				html += `<tr><td class="text-sm text-gray">Sumber:</td><td class="text-sm">${esc(txn.source)}</td></tr>`;
				html += `<tr><td class="text-sm text-gray">Metode:</td><td class="text-sm">${esc(txn.payment_method)}</td></tr>`;
				html += `<tr><td class="text-sm text-gray">Terbilang:</td><td class="text-sm">${esc(txn.terbilang)}</td></tr>`;
				html += `<tr><td class="text-sm text-gray">Tgl:</td><td class="text-sm">${esc(formatDate(txn.transaction_date))}</td></tr>`;
				html += ``;
				html += `<tr><td class="text-sm text-gray">Petugas:</td><td class="text-sm">${esc(txn.petugas)}</td></tr>`;
				html += `</tbody></table>`;
				html += `<table><thead><tr><th>No</th><th>Kategori</th><th>Deskripsi</th><th class="text-right">Nominal</th></tr></thead><tbody>`;
				for (const item of txn.items) {
					html += `<tr><td>${item.no}</td><td>${esc(item.expense_category)}</td><td>${esc(item.description || "-")}</td><td class="text-right font-mono">${fmt(item.amount)}</td></tr>`;
				}
				html += `</tbody></table></div>`;
			}
			html += `</div>`;
		}
		html += `<div class="border-t-2 border-black pt-2 font-bold text-right text-base">Grand Total: ${fmt(report.grand_total)}</div>`;

		openPrintWindow(html, {
			title: "Laporan Pengeluaran",
			subtitle: `Periode: ${formatDate(report.date_from)} - ${formatDate(report.date_to)}`,
		});
	};

	const infoFilters: Record<string, string> = useMemo(() => {
		if (!generatedFilters) return {} as Record<string, string>;
		const feeNames = feeItems
			.filter((item: any) => selectedFeeItemIds.includes(item.id))
			.map((item: any) => item.name)
			.join(", ");
		const catNames = expenseCatOptions
			.filter((cat) => selectedExpenseCatIds.includes(cat.id))
			.map((cat) => cat.label)
			.join(", ");
		return {
			sumber: feeNames || "Semua",
			kategori: catNames || "Semua",
			metode: generatedFilters.payment_method || "Semua",
			periode: `${formatDate(generatedFilters.date_from)} - ${formatDate(generatedFilters.date_to)}`,
			ta: activeAy?.name ?? "-",
		};
	}, [
		generatedFilters,
		selectedFeeItemIds,
		selectedExpenseCatIds,
		feeItems,
		expenseCatOptions,
		activeAy,
	]);

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-start justify-between">
				<div>
					<nav className="flex items-center text-sm text-gray-500 mb-2">
						<Link
							to="/keuangan/laporan"
							className="hover:text-indigo-600 transition-colors"
						>
							Laporan
						</Link>
						<ChevronRight className="w-4 h-4 mx-1" />
						<span className="text-gray-900 font-medium">Pengeluaran</span>
					</nav>
					<h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:tracking-tight">
						Laporan Pengeluaran
					</h2>
					<p className="mt-1 text-sm text-gray-500">
						TA {activeAy?.name || "-"}
					</p>
				</div>
				{report && (
					<Button variant="secondary" onClick={handlePrint}>
						<Printer className="w-4 h-4 mr-2" />
						Cetak
					</Button>
				)}
			</div>

			{/* Filter */}
			<FilterBar onGenerate={handleGenerate} isLoading={isLoading}>
				<div className="flex flex-wrap gap-6">
					<div className="max-w-sm">
						<MultiSelectCheckbox
							label="Fee Item (Pemasukan)"
							options={feeItemOptions}
							selected={selectedFeeItemIds}
							onChange={setSelectedFeeItemIds}
						/>
					</div>
					<div className="max-w-sm">
						<MultiSelectCheckbox
							label="Kategori Pengeluaran"
							options={expenseCatOptions}
							selected={selectedExpenseCatIds}
							onChange={setSelectedExpenseCatIds}
						/>
					</div>
				</div>
			</FilterBar>

			{/* Loading */}
			{isLoading && (
				<div className="animate-pulse space-y-4">
					<div className="h-12 bg-gray-200 rounded-xl" />
					<div className="h-64 bg-gray-200 rounded-xl" />
				</div>
			)}

			{/* Error */}
			{isError && (
				<Alert variant="error" title="Gagal Memuat">
					Terjadi kesalahan saat memuat laporan pengeluaran.
				</Alert>
			)}

			{/* Report */}
			{report && !isLoading && (
				<>
					<ReportInfoCard filters={infoFilters} />

					{report.transactions?.length > 0 ? (
						<div className="space-y-6">
							{report.transactions.map((block) => (
								<div key={block.date}>
									<div className="flex items-center gap-2 mb-3">
										<h3 className="text-sm font-semibold text-gray-900">
											{formatDate(block.date)}
										</h3>
										<span className="text-xs text-gray-500">
											Subtotal: {formatCurrency(block.subtotal)}
										</span>
									</div>

									<div className="space-y-4">
										{block.transactions.map((txn) => (
											<div
												key={txn.id}
												className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 overflow-hidden"
											>
												<div className="p-4 bg-gray-50 border-b border-gray-100">
													<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 text-sm">
														<div>
															<span className="text-gray-500">Sumber:</span>{" "}
															<span className="font-medium">{txn.source}</span>
														</div>
														<div>
															<span className="text-gray-500">Metode:</span>{" "}
															<span className="font-medium">
																{txn.payment_method}
															</span>
														</div>
														<div>
															<span className="text-gray-500">Terbilang:</span>{" "}
															<span className="font-medium">
																{txn.terbilang}
															</span>
														</div>
														<div>
															<span className="text-gray-500">Tgl:</span>{" "}
															<span className="font-medium">
																{formatDate(txn.transaction_date)}
															</span>
														</div>
														<div>
															<span className="text-gray-500">No:</span>{" "}
															<span className="font-medium">
																{txn.transaction_no}
															</span>
														</div>
														<div>
															<span className="text-gray-500">Petugas:</span>{" "}
															<span className="font-medium">{txn.petugas}</span>
														</div>
													</div>
												</div>

												<div className="overflow-x-auto">
													<table className="min-w-full divide-y divide-gray-200">
														<thead className="bg-white">
															<tr>
																<th className="py-2 pl-4 pr-3 text-left text-xs font-semibold text-gray-500 uppercase w-12">
																	No
																</th>
																<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">
																	Dari Kategori Pengeluaran
																</th>
																<th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase pr-4">
																	Nominal
																</th>
															</tr>
														</thead>
														<tbody className="divide-y divide-gray-100">
															{txn.items.map((item) => (
																<tr key={item.no}>
																	<td className="py-2 pl-4 pr-3 text-sm text-gray-500">
																		{item.no}
																	</td>
																	<td className="px-3 py-2 text-sm text-gray-900">
																		{item.expense_category}
																	</td>
																	<td className="px-3 py-2 text-sm text-right text-gray-900 tabular-nums pr-4">
																		{formatCurrency(item.amount)}
																	</td>
																</tr>
															))}
														</tbody>
													</table>
												</div>
											</div>
										))}
									</div>
								</div>
							))}

							<div className="bg-red-50 rounded-xl border border-red-100 p-4 flex justify-between items-center">
								<span className="text-sm font-semibold text-red-900">
									Grand Total
								</span>
								<span className="text-lg font-bold text-red-900 tabular-nums">
									{formatCurrency(report.grand_total)}
								</span>
							</div>
						</div>
					) : (
						<div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 p-12 text-center">
							<p className="text-sm text-gray-500">
								Tidak ada transaksi pengeluaran untuk filter yang dipilih.
							</p>
						</div>
					)}
				</>
			)}

			{!report && !isLoading && !isError && (
				<div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 p-12 text-center">
					<p className="text-sm text-gray-500">
						Atur filter dan klik <strong>Generate</strong> untuk menampilkan
						laporan.
					</p>
				</div>
			)}
		</div>
	);
}
