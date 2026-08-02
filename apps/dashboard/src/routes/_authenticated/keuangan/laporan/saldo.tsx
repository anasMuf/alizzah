import { createFileRoute, Link } from "@tanstack/react-router";
import { useAtom } from "jotai";
import { ChevronRight, Printer } from "lucide-react";
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
import { MultiSelectCheckbox } from "#/features/keuangan/components/MultiSelectCheckbox";
import { ReportInfoCard } from "#/features/keuangan/components/ReportInfoCard";
import { academicYearAtom } from "#/store/global";
import { formatCurrency, formatDate } from "#/utils/format";
import { openPrintWindow } from "#/utils/print";

export const Route = createFileRoute("/_authenticated/keuangan/laporan/saldo")({
	component: LaporanSaldoPage,
});

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

	// Deduplicate by category for pos multi-select
	const posOptions = useMemo(() => {
		const seen = new Set<string>();
		return feeItems
			.slice()
			.sort((a: any, b: any) => a.id - b.id)
			.filter((item: any) => {
				if (seen.has(item.category)) return false;
				seen.add(item.category);
				return true;
			})
			.map((item: any) => ({
				id: item.id,
				label: item.name,
			}));
	}, [feeItems]);

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
	const [selectedPosIds, setSelectedPosIds] = useState<number[]>([]);
	const [selectedAyIds, setSelectedAyIds] = useState<number[]>([]);

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
		setCommittedParams({
			date_from: filters.date_from,
			date_to: filters.date_to,
			categories:
				selectedCategories.length > 0
					? selectedCategories.join(",")
					: undefined,
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
		html += `<p class="text-sm text-gray mb-2">Pos: ${esc(report.post_name)}</p>`;
		html += `<p class="text-sm text-gray mb-2">TA: ${esc(report.academic_year)}</p>`;
		html += `<p class="text-sm text-gray mb-4">Saldo Sebelum: ${fmt(report.saldo_sebelum)}</p>`;

		html += `<table><thead><tr>
			<th>Tanggal</th><th class="text-right">Debit</th><th class="text-right">Kredit</th>
			<th class="text-right">Selisih</th><th class="text-right">Saldo</th>
		</tr></thead><tbody>`;

		for (const row of report.rows) {
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
			title: `Saldo — ${report.post_name}`,
			subtitle: `TA ${report.academic_year}`,
		});
	};

	const infoFilters: Record<string, string> = useMemo(() => {
		if (!committedParams) return {} as Record<string, string>;
		const posNames = feeItems
			.filter((item: any) => selectedPosIds.includes(item.id))
			.map((item: any) => item.name)
			.join(", ");
		const taNames = academicYears
			.filter((ay: any) => selectedAyIds.includes(ay.id))
			.map((ay: any) => ay.name)
			.join(", ");
		return {
			periode: `${formatDate(committedParams.date_from as string)} - ${formatDate(committedParams.date_to as string)}`,
			pos: posNames || "Semua",
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
						<span className="text-gray-900 font-medium">Saldo</span>
					</nav>
					<h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:tracking-tight">
						Laporan Saldo
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
							label="Pos Penerimaan"
							options={posOptions}
							selected={selectedPosIds}
							onChange={setSelectedPosIds}
						/>
					</div>
					<div className="max-w-sm">
						<MultiSelectCheckbox
							label="Tahun Ajaran"
							options={ayOptions}
							selected={selectedAyIds}
							onChange={setSelectedAyIds}
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
					Terjadi kesalahan saat memuat laporan saldo.
				</Alert>
			)}

			{/* Report */}
			{report && !isLoading && (
				<>
					<ReportInfoCard filters={infoFilters} />

					{report.rows.length > 0 ? (
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
														row.selisih >= 0 ? "text-green-600" : "text-red-600"
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
