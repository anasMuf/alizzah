import { createFileRoute, Link } from "@tanstack/react-router";
import { useAtom } from "jotai";
import { Printer } from "lucide-react";
import { useMemo, useState } from "react";
import {
	useGetV1FeeConfigs,
	useGetV1FeeConfigsIdItems,
} from "#/api/endpoints/fee-configs/fee-configs";
import {
	type PemasukanData,
	useGetReportsPemasukan,
} from "#/api/endpoints/reports/pemasukan";
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
	"/_authenticated/keuangan/laporan/pemasukan",
)({
	component: LaporanPemasukanPage,
});

const CATEGORY_ORDER: Record<string, number> = {
	initial: 1,
	registration: 2,
	monthly_spp: 3,
	monthly_infaq: 4,
	pasta: 5,
	savings_mandatory: 6,
	daycare: 7,
	daycare_meal: 8,
	graduation: 9,
	calisan: 10,
	ekskul: 11,
};

function sortByCategory(a: any, b: any): number {
	const orderA = CATEGORY_ORDER[a.category] ?? 99;
	const orderB = CATEGORY_ORDER[b.category] ?? 99;
	if (orderA !== orderB) return orderA - orderB;
	return a.id - b.id;
}

function LaporanPemasukanPage() {
	const [activeAy] = useAtom(academicYearAtom);
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

	const feeItemGroups = useMemo((): MultiSelectGroup[] => {
		const sorted = [...feeItems].sort(sortByCategory);
		const map = new Map<string, MultiSelectGroup>();

		// Category display labels
		const categoryLabels: Record<string, string> = {
			initial: "Biaya Awal Pendidikan",
			registration: "Biaya Registrasi",
			monthly_spp: "SPP",
			monthly_infaq: "Infaq",
			pasta: "Pasta",
			savings_mandatory: "Tabungan",
			daycare: "Daycare",
			daycare_meal: "Konsumsi Daycare",
			graduation: "Wisuda",
			calisan: "Calisan",
			ekskul: "Ekskul",
		};

		for (const item of sorted) {
			const groupName = categoryLabels[item.category] || item.category;
			if (!map.has(groupName)) {
				map.set(groupName, { header: groupName, items: [] });
			}
			const label =
				item.level && item.level !== "all"
					? `${item.name} (${item.level.toUpperCase()})`
					: item.name;
			map.get(groupName)!.items.push({ id: item.id, label });
		}

		// Income categories as final group
		map.set("Penerimaan Lain", {
			header: "Penerimaan Lain",
			items: [
				{ id: -1, label: "Dana BOS" },
				{ id: -2, label: "Donasi" },
				{ id: -3, label: "Hibah" },
				{ id: -4, label: "Lainnya" },
				{ id: -5, label: "Tabungan Umum" },
			],
		});

		return [...map.values()];
	}, [feeItems]);

	// Flat options for "Semua" toggle
	const allFeeItemOptions = useMemo(
		() => feeItemGroups.flatMap((g) => g.items),
		[feeItemGroups],
	);

	const [selectedFeeItemIds, setSelectedFeeItemIds] = useState<number[]>([]);

	// Snapshots filter values only on Generate click — prevents auto-fetch on filter changes
	const [committedParams, setCommittedParams] = useState<Record<
		string,
		unknown
	> | null>(null);

	const {
		data: reportData,
		isLoading,
		isError,
	} = useGetReportsPemasukan(committedParams || {}, {
		query: { enabled: !!committedParams },
	});

	const report: PemasukanData | null = (reportData?.data as any)?.data ?? null;

	const handleGenerate = (filters: FilterBarValues) => {
		const selectedCategories = feeItems
			.filter((item: any) => selectedFeeItemIds.includes(item.id))
			.map((item: any) => item.category);

		// Map negative IDs to income category codes
		const incomeCategoryMap: Record<number, string> = {
			[-1]: "bos",
			[-2]: "donasi",
			[-3]: "hibah",
			[-4]: "lainnya",
		};
		const selectedIncomeCategories = selectedFeeItemIds
			.filter((id) => id < 0 && id >= -4)
			.map((id) => incomeCategoryMap[id])
			.filter(Boolean);
		const includeSavings = selectedFeeItemIds.includes(-5);

		setCommittedParams({
			date_from: filters.date_from,
			date_to: filters.date_to,
			payment_method: filters.payment_method || undefined,
			categories:
				selectedCategories.length > 0
					? selectedCategories.join(",")
					: undefined,
			income_categories:
				selectedIncomeCategories.length > 0
					? selectedIncomeCategories.join(",")
					: undefined,
			include_savings: includeSavings || undefined,
			academic_year_id: filters.academic_year_id,
		});
	};

	// Group rows by date
	const dateGroups = useMemo(() => {
		if (!report?.rows) return null;
		const map = new Map<string, PemasukanData["rows"]>();
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

		let html = `<h2 class="text-lg font-bold mb-2">Laporan Pemasukan</h2>`;
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
			title: "Laporan Pemasukan",
			subtitle: `Periode: ${formatDate(report.date_from)} - ${formatDate(report.date_to)}`,
		});
	};

	const infoFilters: Record<string, string> = useMemo(() => {
		if (!committedParams) return {} as Record<string, string>;
		const allNames = [
			...feeItems
				.filter((item: any) => selectedFeeItemIds.includes(item.id))
				.map((item: any) => item.name),
			...selectedFeeItemIds
				.filter((id) => id < 0)
				.map((id) => {
					const map: Record<number, string> = {
						[-1]: "Dana BOS",
						[-2]: "Donasi",
						[-3]: "Hibah",
						[-4]: "Lainnya",
						[-5]: "Tabungan Umum",
					};
					return map[id];
				})
				.filter(Boolean),
		];
		return {
			sumber: allNames.join(", ") || "Semua",
			metode: (committedParams.payment_method as string) || "Semua",
			periode: `${formatDate(committedParams.date_from as string)} - ${formatDate(committedParams.date_to as string)}`,
			ta: activeAy?.name ?? "-",
		};
	}, [committedParams, selectedFeeItemIds, feeItems, activeAy]);

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
					<h2 className="text-lg font-bold text-gray-900">Pemasukan</h2>
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
							label="Fee Item (Pemasukan)"
							options={allFeeItemOptions}
							groups={feeItemGroups}
							selected={selectedFeeItemIds}
							onChange={setSelectedFeeItemIds}
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
								Terjadi kesalahan saat memuat laporan pemasukan.
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
														<th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase w-28">
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
																<tr className="bg-gray-50 border-t border-gray-200">
																	<td
																		colSpan={2}
																		className="py-2 pl-4 pr-3 text-sm"
																	/>
																	<td className="px-3 py-2 text-sm text-right font-semibold text-gray-500">
																		Subtotal
																	</td>
																	<td className="px-3 py-2 text-sm text-right font-semibold text-gray-900 tabular-nums pr-4">
																		{formatCurrency(subtotal)}
																	</td>
																</tr>
															</>
														);
													})}
												</tbody>
												<tfoot>
													<tr className="border-t-2 border-gray-300 bg-indigo-50">
														<td
															colSpan={2}
															className="py-2.5 pl-4 pr-3 text-sm"
														/>
														<td className="px-3 py-2.5 text-sm text-right font-bold text-indigo-900">
															Grand Total
														</td>
														<td className="px-3 py-2.5 text-sm text-right font-bold text-indigo-900 tabular-nums pr-4">
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
