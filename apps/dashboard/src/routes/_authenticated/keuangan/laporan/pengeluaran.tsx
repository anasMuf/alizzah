import { createFileRoute, Link } from "@tanstack/react-router";
import { useAtom } from "jotai";
import { ChevronRight, Printer } from "lucide-react";
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

	const { data: expenseCatData } = useGetV1ExpenseCategories({
		query: { staleTime: 5 * 60 * 1000 },
	});
	const expenseCats = ((expenseCatData?.data as any)?.data ?? []) as any[];
	const expenseCatOptions = useMemo(
		() => flattenCategories(expenseCats),
		[expenseCats],
	);

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
		for (const row of report.rows) {
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
		const catNames = expenseCatOptions
			.filter((cat) => selectedExpenseCatIds.includes(cat.id))
			.map((cat) => cat.label)
			.join(", ");
		return {
			kategori: catNames || "Semua",
			metode: (committedParams.payment_method as string) || "Semua",
			periode: `${formatDate(committedParams.date_from as string)} - ${formatDate(committedParams.date_to as string)}`,
			ta: activeAy?.name ?? "-",
		};
	}, [committedParams, selectedExpenseCatIds, expenseCatOptions, activeAy]);

	return (
		<div className="space-y-6">
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
					<h2 className="text-2xl font-bold leading-7 text-gray-900">
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

			<FilterBar onGenerate={handleGenerate} isLoading={isLoading}>
				<div className="max-w-sm">
					<MultiSelectCheckbox
						label="Kategori Pengeluaran"
						options={expenseCatOptions}
						selected={selectedExpenseCatIds}
						onChange={setSelectedExpenseCatIds}
					/>
				</div>
			</FilterBar>

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
						<div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 overflow-hidden">
							<div className="overflow-x-auto">
								<table className="min-w-full divide-y divide-gray-200">
									<thead className="bg-gray-50">
										<tr>
											<th className="py-3 pl-6 pr-3 text-left text-sm font-semibold text-gray-900 w-28">
												Tanggal
											</th>
											<th className="px-3 py-3 text-left text-sm font-semibold text-gray-900 w-36">
												Kategori
											</th>
											<th className="px-3 py-3 text-left text-sm font-semibold text-gray-900">
												Keterangan
											</th>
											<th className="px-3 py-3 text-right text-sm font-semibold text-gray-900 pr-6 w-40">
												Nominal
											</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-gray-100 bg-white">
										{[...dateGroups.entries()].map(([date, rows]) => {
											const subtotal = rows.reduce((s, r) => s + r.amount, 0);
											return (
												<>
													{rows.map((row, i) => (
														<tr key={`${date}-${row.category}-${i}`}>
															<td className="py-2.5 pl-6 pr-3 text-sm text-gray-900">
																{i === 0 ? formatDate(date) : ""}
															</td>
															<td className="px-3 py-2.5 text-sm text-gray-900">
																{row.category}
															</td>
															<td className="px-3 py-2.5 text-sm text-gray-700">
																{row.description}
															</td>
															<td className="px-3 py-2.5 text-sm text-right text-gray-900 tabular-nums pr-6">
																{formatCurrency(row.amount)}
															</td>
														</tr>
													))}
													<tr className="bg-red-50 border-t border-gray-200">
														<td
															colSpan={2}
															className="py-2 pl-6 pr-3 text-sm"
														/>
														<td className="px-3 py-2 text-sm text-right font-semibold text-red-700">
															Subtotal
														</td>
														<td className="px-3 py-2 text-sm text-right font-semibold text-red-700 tabular-nums pr-6">
															{formatCurrency(subtotal)}
														</td>
													</tr>
												</>
											);
										})}
									</tbody>
									<tfoot>
										<tr className="border-t-2 border-gray-300 bg-red-50 font-bold">
											<td
												colSpan={2}
												className="py-3 pl-6 pr-3 text-sm text-red-900"
											/>
											<td className="px-3 py-3 text-sm text-right text-red-900">
												Grand Total
											</td>
											<td className="px-3 py-3 text-sm text-right text-red-900 tabular-nums pr-6">
												{formatCurrency(report.grand_total)}
											</td>
										</tr>
									</tfoot>
								</table>
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
