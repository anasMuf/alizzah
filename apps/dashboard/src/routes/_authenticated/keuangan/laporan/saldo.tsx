import { createFileRoute, Link } from "@tanstack/react-router";
import { useAtom } from "jotai";
import { Printer } from "lucide-react";
import { useMemo, useState } from "react";
import { useGetV1AcademicYears } from "#/api/endpoints/academic-years/academic-years";
import {
	useGetV1FeeConfigs,
	useGetV1FeeConfigsIdItems,
} from "#/api/endpoints/fee-configs/fee-configs";
import {
	type SaldoData,
	useGetReportsSaldo,
} from "#/api/endpoints/reports/saldo";
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

export const Route = createFileRoute("/_authenticated/keuangan/laporan/saldo")({
	component: LaporanSaldoPage,
});

const CATEGORY_LABELS: Record<string, string> = {
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

function LaporanSaldoPage() {
	const [activeAy] = useAtom(academicYearAtom);
	// Fee configs → fee items (for pos penerimaan multi-select)
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

	// Grouped by category for pos multi-select
	const posGroups = useMemo((): MultiSelectGroup[] => {
		const sorted = [...feeItems].sort(sortByCategory);
		const map = new Map<string, MultiSelectGroup>();
		for (const item of sorted) {
			const groupName = CATEGORY_LABELS[item.category] || item.category;
			if (!map.has(groupName)) {
				map.set(groupName, { header: groupName, items: [] });
			}
			map.get(groupName)!.items.push({
				id: item.id,
				label:
					item.level && item.level !== "all"
						? `${item.name} (${item.level.toUpperCase()})`
						: item.name,
			});
		}
		return [
			...map.values(),
			{
				header: "Penerimaan Lain",
				items: [
					{ id: -1, label: "Dana BOS" },
					{ id: -2, label: "Donasi" },
					{ id: -3, label: "Hibah" },
					{ id: -4, label: "Lainnya" },
					{ id: -5, label: "Tabungan Umum" },
				],
			},
		];
	}, [feeItems]);

	const flatPosOptions = useMemo(
		() => posGroups.flatMap((g) => g.items),
		[posGroups],
	);

	// Academic years for multi-TA select
	const { data: ayData } = useGetV1AcademicYears({
		query: { staleTime: 5 * 60 * 1000 },
	});
	const academicYears = ((ayData?.data as any)?.data ?? []) as any[];
	const ayOptions = useMemo(
		() =>
			academicYears.map((ay: any) => ({
				id: ay.id,
				label: ay.name,
			})),
		[academicYears],
	);

	// Filter state
	const [selectedPosIds, setSelectedPosIds] = useState<(string | number)[]>([]);
	const [selectedAyIds, setSelectedAyIds] = useState<(string | number)[]>([]);

	const [committedParams, setCommittedParams] = useState<Record<
		string,
		unknown
	> | null>(null);

	const {
		data: reportData,
		isLoading,
		isError,
	} = useGetReportsSaldo(committedParams || {}, {
		query: { enabled: !!committedParams },
	});

	const report: SaldoData | null = (reportData?.data as any)?.data ?? null;

	const handleGenerate = (filters: FilterBarValues) => {
		const selectedCategories = feeItems
			.filter((item: any) => selectedPosIds.includes(item.id))
			.map((item: any) => item.category);
		const incomeCategoryMap: Record<number, string> = {
			[-1]: "bos",
			[-2]: "donasi",
			[-3]: "hibah",
			[-4]: "lainnya",
		};
		const selectedIncomeCategories = selectedPosIds
			.filter((id) => typeof id === "number" && id < 0 && id >= -4)
			.map((id) => incomeCategoryMap[id as number])
			.filter(Boolean);
		const includeSavings = selectedPosIds.includes(-5);
		setCommittedParams({
			date_from: filters.date_from,
			date_to: filters.date_to,
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
			academic_year_ids:
				selectedAyIds.length > 0 ? selectedAyIds.join(",") : undefined,
		});
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

		let html = `<h2 class="text-lg font-bold mb-2">Laporan Saldo</h2>`;
		html += `<p class="text-sm text-gray mb-2">Pos: ${esc(infoFilters.pos || report.post_name)}</p>`;
		html += `<p class="text-sm text-gray mb-2">TA: ${esc(report.academic_year)}</p>`;
		html += `<p class="text-sm text-gray mb-4">Saldo Sebelum: ${fmt(report.saldo_sebelum)}</p>`;

		html += `<table><thead><tr>
			<th>Tanggal</th><th class="text-right">Debit</th><th class="text-right">Kredit</th>
			<th class="text-right">Selisih</th><th class="text-right">Saldo</th>
		</tr></thead><tbody>`;

		for (const row of report.rows || []) {
			html += `<tr>
				<td>${esc(formatDate(row.date))}</td>
				<td class="text-right font-mono">${fmt(row.penerimaan)}</td>
				<td class="text-right font-mono">${fmt(row.pengeluaran)}</td>
				<td class="text-right font-mono">${fmt(row.selisih)}</td>
				<td class="text-right font-mono font-bold">${fmt(row.saldo)}</td>
			</tr>`;
		}
		html += `<tr class="border-t font-bold">
			<td>Total</td>
			<td class="text-right">${fmt(report.total_bulan.penerimaan)}</td>
			<td class="text-right">${fmt(report.total_bulan.pengeluaran)}</td>
			<td class="text-right">${fmt(report.total_bulan.selisih)}</td>
			<td class="text-right">${fmt(report.saldo_akhir)}</td>
		</tr>`;
		html += `</tbody></table>`;

		openPrintWindow(html, {
			title: `Saldo — ${infoFilters.pos || report.post_name}`,
			subtitle: `TA ${report.academic_year}`,
		});
	};

	const infoFilters: Record<string, string> = useMemo(() => {
		if (!committedParams) return {} as Record<string, string>;
		const incomeLabelMap: Record<number, string> = {
			[-1]: "Dana BOS",
			[-2]: "Donasi",
			[-3]: "Hibah",
			[-4]: "Lainnya",
			[-5]: "Tabungan Umum",
		};
		const feeNames = feeItems
			.filter((item: any) => selectedPosIds.includes(item.id))
			.map((item: any) => item.name);
		const incomeNames = selectedPosIds
			.filter((id) => typeof id === "number" && id < 0)
			.map((id) => incomeLabelMap[id as number])
			.filter(Boolean);
		const allPosNames = [...feeNames, ...incomeNames];
		const taNames = academicYears
			.filter((ay: any) => selectedAyIds.includes(ay.id))
			.map((ay: any) => ay.name)
			.join(", ");
		return {
			periode: `${formatDate(committedParams.date_from as string)} - ${formatDate(committedParams.date_to as string)}`,
			pos: allPosNames.join(", ") || "Semua",
			ta: taNames || activeAy?.name || "-",
		};
	}, [
		committedParams,
		selectedPosIds,
		selectedAyIds,
		feeItems,
		academicYears,
		activeAy,
	]);

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
					<h2 className="text-lg font-bold text-gray-900">Saldo</h2>
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
						<div className="space-y-4">
							<MultiSelectCheckbox
								label="Pos Penerimaan"
								options={flatPosOptions}
								groups={posGroups}
								selected={selectedPosIds}
								onChange={setSelectedPosIds}
							/>
							<MultiSelectCheckbox
								label="Tahun Ajaran"
								options={ayOptions}
								selected={selectedAyIds}
								onChange={setSelectedAyIds}
							/>
						</div>
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
								Terjadi kesalahan saat memuat laporan saldo.
							</Alert>
						)}

						{report && !isLoading && (
							<>
								<ReportInfoCard filters={infoFilters} />
								{report.rows?.length > 0 ? (
									<div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 overflow-hidden">
										{/* Saldo Sebelum */}
										<div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
											<span className="text-sm text-gray-600">
												Saldo Sebelum:{" "}
												<span className="font-semibold text-gray-900 tabular-nums">
													{formatCurrency(report.saldo_sebelum)}
												</span>
											</span>
										</div>

										<div className="overflow-x-auto">
											<table className="min-w-full divide-y divide-gray-200">
												<thead className="bg-gray-50">
													<tr>
														<th className="py-3 pl-6 pr-3 text-left text-sm font-semibold text-gray-900">
															Tanggal
														</th>
														<th className="px-3 py-3 text-right text-sm font-semibold text-gray-900">
															Debit
														</th>
														<th className="px-3 py-3 text-right text-sm font-semibold text-gray-900">
															Kredit
														</th>
														<th className="px-3 py-3 text-right text-sm font-semibold text-gray-900">
															Selisih
														</th>
														<th className="px-3 py-3 text-right text-sm font-semibold text-gray-900 pr-6">
															Saldo
														</th>
													</tr>
												</thead>
												<tbody className="divide-y divide-gray-100 bg-white">
													{report.rows.map((row) => (
														<tr key={row.date} className="hover:bg-gray-50">
															<td className="py-2.5 pl-6 pr-3 text-sm text-gray-900">
																{formatDate(row.date)}
															</td>
															<td className="px-3 py-2.5 text-sm text-right text-green-600 tabular-nums">
																{row.penerimaan > 0
																	? formatCurrency(row.penerimaan)
																	: "-"}
															</td>
															<td className="px-3 py-2.5 text-sm text-right text-red-600 tabular-nums">
																{row.pengeluaran > 0
																	? formatCurrency(row.pengeluaran)
																	: "-"}
															</td>
															<td
																className={`px-3 py-2.5 text-sm text-right tabular-nums ${
																	row.selisih >= 0
																		? "text-green-600"
																		: "text-red-600"
																}`}
															>
																{formatCurrency(row.selisih)}
															</td>
															<td className="px-3 py-2.5 text-sm text-right font-semibold text-gray-900 tabular-nums pr-6">
																{formatCurrency(row.saldo)}
															</td>
														</tr>
													))}
												</tbody>
												{/* Total Row */}
												<tfoot>
													<tr className="border-t-2 border-gray-300 bg-gray-50 font-bold">
														<td className="py-3 pl-6 pr-3 text-sm text-gray-900">
															Total
														</td>
														<td className="px-3 py-3 text-sm text-right text-green-600 tabular-nums">
															{formatCurrency(report.total_bulan.penerimaan)}
														</td>
														<td className="px-3 py-3 text-sm text-right text-red-600 tabular-nums">
															{formatCurrency(report.total_bulan.pengeluaran)}
														</td>
														<td className="px-3 py-3 text-sm text-right tabular-nums text-gray-900">
															{formatCurrency(report.total_bulan.selisih)}
														</td>
														<td className="px-3 py-3 text-sm text-right tabular-nums text-gray-900 pr-6">
															{formatCurrency(report.saldo_akhir)}
														</td>
													</tr>
												</tfoot>
											</table>
										</div>
									</div>
								) : (
									<div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 p-12 text-center">
										<p className="text-sm text-gray-500">
											Tidak ada data saldo untuk filter yang dipilih.
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
