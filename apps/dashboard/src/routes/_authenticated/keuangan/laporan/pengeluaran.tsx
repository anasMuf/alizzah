import { createFileRoute, Link } from "@tanstack/react-router";
import { useAtom } from "jotai";
import { Printer } from "lucide-react";
import { useMemo, useState } from "react";
import { useGetV1ExpenseCategories } from "#/api/endpoints/expense-categories/expense-categories";
import {
	type PengeluaranData,
	useGetReportsPengeluaran,
} from "#/api/endpoints/reports/pengeluaran";
import { Alert, Button } from "#/components/ui";
import {
	FilterBar,
	type FilterBarValues,
} from "#/features/keuangan/components/FilterBar";
import {
	MultiSelectCheckbox,
	type MultiSelectGroup,
} from "#/features/keuangan/components/MultiSelectCheckbox";
import { ReportInfoCard } from "#/features/keuangan/components/ReportInfoCard";
import { academicYearAtom } from "#/store/global";
import { formatCurrency, formatDate } from "#/utils/format";
import { openPrintWindow } from "#/utils/print";

export const Route = createFileRoute(
	"/_authenticated/keuangan/laporan/pengeluaran",
)({
	component: LaporanPengeluaranPage,
});

function LaporanPengeluaranPage() {
	const [activeAy] = useAtom(academicYearAtom);
	const { data: expenseCatData } = useGetV1ExpenseCategories({
		query: { staleTime: 5 * 60 * 1000 },
	});
	const expenseCats = ((expenseCatData?.data as any)?.data ?? []) as any[];

	// Build grouped options: top-level categories as group headers, all descendants as items
	const { expenseCatGroups, flatExpenseCatOptions } = useMemo(() => {
		const groups: MultiSelectGroup[] = [];
		const flat: { id: number; label: string }[] = [];
		function collectDescendants(
			cat: any,
			prefix: string,
		): { id: number; label: string }[] {
			const items: { id: number; label: string }[] = [];
			const label = prefix ? `${prefix} > ${cat.name}` : cat.name;
			flat.push({ id: cat.id, label });
			items.push({ id: cat.id, label: cat.name });
			if (cat.children?.length) {
				for (const child of cat.children) {
					items.push(...collectDescendants(child, label));
				}
			}
			return items;
		}
		for (const cat of expenseCats) {
			groups.push({
				header: cat.name,
				items: collectDescendants(cat, cat.name),
			});
		}
		return { expenseCatGroups: groups, flatExpenseCatOptions: flat };
	}, [expenseCats]);

	const [selectedExpenseCatIds, setSelectedExpenseCatIds] = useState<number[]>(
		[],
	);

	const [committedParams, setCommittedParams] = useState<Record<
		string,
		unknown
	> | null>(null);

	const {
		data: reportData,
		isLoading,
		isError,
	} = useGetReportsPengeluaran(committedParams || {}, {
		query: { enabled: !!committedParams },
	});

	const report: PengeluaranData | null =
		(reportData?.data as any)?.data ?? null;

	const handleGenerate = (filters: FilterBarValues) => {
		setCommittedParams({
			date_from: filters.date_from,
			date_to: filters.date_to,
			payment_method: filters.payment_method || undefined,
			expense_category_ids:
				selectedExpenseCatIds.length > 0
					? selectedExpenseCatIds.join(",")
					: undefined,
			academic_year_id: filters.academic_year_id,
		});
	};

	const dateGroups = useMemo(() => {
		if (!report?.rows) return null;
		const map = new Map<string, PengeluaranData["rows"]>();
		for (const row of report.rows || []) {
			const existing = map.get(row.date) || [];
			existing.push(row);
			map.set(row.date, existing);
		}
		return map;
	}, [report]);

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
		html += `<p class="text-sm text-gray mb-2">Periode: ${esc(formatDate(report.date_from))} - ${esc(formatDate(report.date_to))}</p>`;
		html += `<p class="text-sm text-gray mb-4">TA ${esc(report.academic_year)}</p>`;
		html += `<table><thead><tr>
			<th>Tanggal</th><th>Kategori</th><th>Keterangan</th><th class="text-right">Nominal</th>
		</tr></thead><tbody>`;

		if (dateGroups) {
			for (const [date, rows] of dateGroups) {
				const subtotal = rows.reduce((s, r) => s + r.amount, 0);
				for (let i = 0; i < rows.length; i++) {
					const r = rows[i];
					html += `<tr>
						<td>${i === 0 ? esc(formatDate(date)) : ""}</td>
						<td>${esc(r.category)}</td>
						<td>${esc(r.description)}</td>
						<td class="text-right font-mono">${fmt(r.amount)}</td>
					</tr>`;
				}
				html += `<tr class="border-t text-gray font-bold">
					<td colspan="2"></td><td class="text-right">Subtotal</td>
					<td class="text-right font-mono">${fmt(subtotal)}</td>
				</tr>`;
			}
		}
		html += `<tr class="border-t-2 border-black font-bold text-base">
			<td colspan="2"></td><td class="text-right">Grand Total</td>
			<td class="text-right font-mono">${fmt(report.grand_total)}</td>
		</tr></tbody></table>`;

		openPrintWindow(html, {
			title: "Laporan Pengeluaran",
			subtitle: `Periode: ${formatDate(report.date_from)} - ${formatDate(report.date_to)}`,
		});
	};

	const infoFilters: Record<string, string> = useMemo(() => {
		if (!committedParams) return {} as Record<string, string>;
		const catNames = flatExpenseCatOptions
			.filter((cat) => selectedExpenseCatIds.includes(cat.id))
			.map((cat) => cat.label)
			.join(", ");
		return {
			kategori: catNames || "Semua",
			metode: (committedParams.payment_method as string) || "Semua",
			periode: `${formatDate(committedParams.date_from as string)} - ${formatDate(committedParams.date_to as string)}`,
			ta: activeAy?.name ?? "-",
		};
	}, [committedParams, selectedExpenseCatIds, flatExpenseCatOptions, activeAy]);

	return (
		<div className="h-full flex flex-col">
			{/* Top bar */}
			<div className="flex-shrink-0 bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
				<div className="flex items-center gap-4">
					<Link
						to="/keuangan/laporan"
						className="text-sm text-indigo-600 hover:text-indigo-500"
					>
						← Laporan
					</Link>
					<h2 className="text-lg font-bold text-gray-900">Pengeluaran</h2>
					<span className="text-sm text-gray-500">
						TA {activeAy?.name || "-"}
					</span>
				</div>
				{report && (
					<Button variant="secondary" onClick={handlePrint}>
						<Printer className="w-4 h-4 mr-2" />
						Cetak
					</Button>
				)}
			</div>

			{/* 2-column body */}
			<div className="flex-1 flex min-h-0">
				{/* Left: Filter */}
				<div className="w-80 flex-shrink-0 border-r border-gray-200 bg-white">
					<FilterBar onGenerate={handleGenerate} isLoading={isLoading}>
						<MultiSelectCheckbox
							label="Kategori Pengeluaran"
							options={flatExpenseCatOptions}
							groups={expenseCatGroups}
							selected={selectedExpenseCatIds}
							onChange={setSelectedExpenseCatIds}
						/>
					</FilterBar>
				</div>

				{/* Right: Preview */}
				<div className="flex-1 flex flex-col bg-gray-50 overflow-y-auto">
					<div className="p-4">
						{isLoading && (
							<div className="animate-pulse space-y-4">
								<div className="h-12 bg-gray-200 rounded-xl" />
								<div className="h-64 bg-gray-200 rounded-xl" />
							</div>
						)}

						{isError && (
							<Alert variant="error" title="Gagal Memuat">
								Terjadi kesalahan saat memuat laporan pengeluaran.
							</Alert>
						)}

						{report && !isLoading && (
							<>
								<ReportInfoCard filters={infoFilters} />

								{report.rows?.length > 0 && dateGroups ? (
									<div className="mt-4 bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 overflow-hidden">
										<div className="overflow-x-auto">
											<table className="min-w-full divide-y divide-gray-200">
												<thead className="bg-gray-50">
													<tr>
														<th className="py-2.5 pl-4 pr-3 text-left text-xs font-semibold text-gray-500 uppercase w-28">
															Tanggal
														</th>
														<th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase w-36">
															Kategori
														</th>
														<th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">
															Keterangan
														</th>
														<th className="px-3 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase pr-4 w-36">
															Nominal
														</th>
													</tr>
												</thead>
												<tbody className="divide-y divide-gray-100 bg-white">
													{[...dateGroups.entries()].map(([date, rows]) => {
														const subtotal = rows.reduce(
															(s, r) => s + r.amount,
															0,
														);
														return (
															<>
																{rows.map((row, i) => (
																	<tr key={`${date}-${row.category}-${i}`}>
																		<td className="py-2 pl-4 pr-3 text-sm text-gray-900">
																			{i === 0 ? formatDate(date) : ""}
																		</td>
																		<td className="px-3 py-2 text-sm text-gray-900">
																			{row.category}
																		</td>
																		<td className="px-3 py-2 text-sm text-gray-700">
																			{row.description}
																		</td>
																		<td className="px-3 py-2 text-sm text-right text-gray-900 tabular-nums pr-4">
																			{formatCurrency(row.amount)}
																		</td>
																	</tr>
																))}
																<tr className="bg-red-50 border-t border-gray-200">
																	<td
																		colSpan={2}
																		className="py-2 pl-4 pr-3 text-sm"
																	/>
																	<td className="px-3 py-2 text-sm text-right font-semibold text-red-700">
																		Subtotal
																	</td>
																	<td className="px-3 py-2 text-sm text-right font-semibold text-red-700 tabular-nums pr-4">
																		{formatCurrency(subtotal)}
																	</td>
																</tr>
															</>
														);
													})}
												</tbody>
												<tfoot>
													<tr className="border-t-2 border-gray-300 bg-red-50">
														<td
															colSpan={2}
															className="py-2.5 pl-4 pr-3 text-sm"
														/>
														<td className="px-3 py-2.5 text-sm text-right font-bold text-red-900">
															Grand Total
														</td>
														<td className="px-3 py-2.5 text-sm text-right font-bold text-red-900 tabular-nums pr-4">
															{formatCurrency(report.grand_total)}
														</td>
													</tr>
												</tfoot>
											</table>
										</div>
									</div>
								) : (
									<div className="mt-4 bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 p-12 text-center">
										<p className="text-sm text-gray-500">
											Tidak ada transaksi untuk filter yang dipilih.
										</p>
									</div>
								)}
							</>
						)}

						{!report && !isLoading && !isError && (
							<div className="flex items-center justify-center h-64 text-sm text-gray-500">
								Atur filter dan klik <strong className="mx-1">Generate</strong>{" "}
								untuk menampilkan laporan.
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
