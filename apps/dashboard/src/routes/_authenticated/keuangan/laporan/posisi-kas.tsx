import { createFileRoute, Link } from "@tanstack/react-router";
import { useAtom } from "jotai";
import { ChevronRight, Printer } from "lucide-react";
import { useMemo, useState } from "react";
import {
	useGetV1FeeConfigs,
	useGetV1FeeConfigsIdItems,
} from "#/api/endpoints/fee-configs/fee-configs";
import type { PosisiKasPost } from "#/api/endpoints/reports/posisi-kas";
import {
	type PosisiKasData,
	useGetReportsPosisiKas,
} from "#/api/endpoints/reports/posisi-kas";
import { Alert, Button } from "#/components/ui";
import {
	FilterBar,
	type FilterBarValues,
} from "#/features/keuangan/components/FilterBar";
import { MultiSelectCheckbox } from "#/features/keuangan/components/MultiSelectCheckbox";
import { ReportInfoCard } from "#/features/keuangan/components/ReportInfoCard";
import { academicYearAtom } from "#/store/global";
import { formatDate } from "#/utils/format";
import { openPrintWindow } from "#/utils/print";

export const Route = createFileRoute(
	"/_authenticated/keuangan/laporan/posisi-kas",
)({
	component: LaporanPosisiKasPage,
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

function LaporanPosisiKasPage() {
	const [activeAy] = useAtom(academicYearAtom);

	// Fee configs
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
			feeItems
				.slice()
				.sort(sortByCategory)
				.map((item: any) => ({
					id: item.id,
					label: `${item.name} (${item.category})`,
				})),
		[feeItems],
	);

	// Filter state
	const [selectedFeeItemIds, setSelectedFeeItemIds] = useState<number[]>([]);

	const [committedParams, setCommittedParams] = useState<Record<
		string,
		unknown
	> | null>(null);

	const {
		data: reportData,
		isLoading,
		isError,
	} = useGetReportsPosisiKas(committedParams || {}, {
		query: { enabled: !!committedParams },
	});

	const report: PosisiKasData | null = (reportData?.data as any)?.data ?? null;
	const posts: PosisiKasPost[] = report?.posts ?? [];
	const grandTotal = report?.grand_total;

	const handleGenerate = (filters: FilterBarValues) => {
		const selectedCategories = feeItems
			.filter((item: any) => selectedFeeItemIds.includes(item.id))
			.map((item: any) => item.category);
		setCommittedParams({
			date_from: filters.date_from,
			date_to: filters.date_to,
			categories:
				selectedCategories.length > 0
					? selectedCategories.join(",")
					: undefined,
			academic_year_id: filters.academic_year_id,
		});
	};

	function handlePrint() {
		if (!report) return;
		const esc = (s: string) =>
			s
				.replace(/&/g, "&amp;")
				.replace(/</g, "&lt;")
				.replace(/>/g, "&gt;")
				.replace(/"/g, "&quot;");

		const fmtRupiah = (amount: number): string => {
			if (amount === 0) return "0";
			const isNegative = amount < 0;
			const abs = Math.abs(amount);
			const formatted = new Intl.NumberFormat("id-ID").format(abs);
			return isNegative ? `(${formatted})` : formatted;
		};

		const periodLabel =
			report.date_from && report.date_to
				? `${formatDate(report.date_from)} - ${formatDate(report.date_to)}`
				: "";

		let html = `<h2 class="text-lg font-bold mb-2">Laporan Posisi Kas</h2>`;
		if (periodLabel)
			html += `<p class="text-sm text-gray mb-2">Periode: ${esc(periodLabel)}</p>`;
		html += `<p class="text-sm text-gray mb-4">TA ${esc(report.academic_year)}</p>`;

		html += `<table><thead><tr>
			<th>Nama Pos</th>
			<th class="text-right">Saldo Sebelum</th>
			<th class="text-right">Penerimaan</th>
			<th class="text-right">Pengeluaran</th>
			<th class="text-right">Saldo Sampai</th>
		</tr></thead><tbody>`;

		for (const post of posts) {
			const details = post.expense_details || [];
			html += `<tr>
				<td class="font-bold">${esc(post.name)}</td>
				<td class="text-right ${post.saldo_sebelum < 0 ? "text-red" : ""}">${esc(fmtRupiah(post.saldo_sebelum))}</td>
				<td class="text-right">${esc(fmtRupiah(post.penerimaan))}</td>
				<td class="text-right">${esc(fmtRupiah(post.pengeluaran))}</td>
				<td class="text-right ${post.saldo_sampai < 0 ? "text-red" : ""}">${esc(fmtRupiah(post.saldo_sampai))}</td>
			</tr>`;
			if (details.length > 0) {
				for (const detail of details) {
					html += `<tr>
						<td class="text-gray pl-4"><span class="text-gray">&middot;</span> ${esc(detail.name)}</td>
						<td class="text-right"></td><td class="text-right"></td>
						<td class="text-right">${esc(fmtRupiah(detail.amount))}</td>
						<td class="text-right"></td>
					</tr>`;
				}
			}
		}
		if (grandTotal) {
			html += `<tr class="font-bold border-t bg-gray-50">
				<td>Grand Total</td>
				<td class="text-right">${esc(fmtRupiah(grandTotal.saldo_sebelum))}</td>
				<td class="text-right">${esc(fmtRupiah(grandTotal.penerimaan))}</td>
				<td class="text-right">${esc(fmtRupiah(grandTotal.pengeluaran))}</td>
				<td class="text-right">${esc(fmtRupiah(grandTotal.saldo_sampai))}</td>
			</tr>`;
		}
		html += `</tbody></table>`;

		openPrintWindow(html, {
			title: "Posisi Kas",
			subtitle: periodLabel,
		});
	}

	const infoFilters: Record<string, string> = useMemo(() => {
		if (!committedParams) return {} as Record<string, string>;
		const feeNames = feeItems
			.filter((item: any) => selectedFeeItemIds.includes(item.id))
			.map((item: any) => item.name)
			.join(", ");
		const periodLabel =
			committedParams.date_from && committedParams.date_to
				? `${formatDate(committedParams.date_from as string)} - ${formatDate(committedParams.date_to as string)}`
				: "-";
		return {
			pos: feeNames || "Semua",
			periode: periodLabel,
			ta: activeAy?.name ?? "-",
		};
	}, [committedParams, selectedFeeItemIds, feeItems, activeAy]);

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
						<span className="text-gray-900 font-medium">Posisi Kas</span>
					</nav>
					<h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:tracking-tight">
						Laporan Posisi Kas
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
				</div>
			</FilterBar>

			{/* Loading */}
			{isLoading && (
				<div className="animate-pulse space-y-4">
					<div className="h-64 bg-gray-200 rounded-xl" />
				</div>
			)}

			{/* Error */}
			{isError && (
				<Alert variant="error" title="Gagal Memuat">
					Terjadi kesalahan saat memuat laporan posisi kas.
				</Alert>
			)}

			{/* Report */}
			{report && !isLoading && (
				<>
					<ReportInfoCard filters={infoFilters} />

					{posts.length > 0 ? (
						<div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 overflow-hidden">
							<div className="overflow-x-auto">
								<table className="min-w-full divide-y divide-gray-300">
									<thead className="bg-gray-50">
										<tr>
											<th className="py-3 pl-6 pr-3 text-left text-sm font-semibold text-gray-900 w-[280px]">
												Nama Pos
											</th>
											<th className="px-3 py-3 text-right text-sm font-semibold text-gray-900">
												Saldo Sebelum
											</th>
											<th className="px-3 py-3 text-right text-sm font-semibold text-gray-900">
												Penerimaan
											</th>
											<th className="px-3 py-3 text-right text-sm font-semibold text-gray-900">
												Pengeluaran
											</th>
											<th className="px-3 py-3 text-right text-sm font-semibold text-gray-900 pr-6">
												Saldo Sampai
											</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-gray-100 bg-white">
										{posts.map((post) => (
											<PostRows key={post.category} post={post} />
										))}

										{/* Grand Total */}
										{grandTotal && (
											<tr className="bg-gray-50 border-t-2 border-gray-400 font-bold">
												<td className="py-3 pl-6 pr-3 text-sm text-gray-900">
													Grand Total
												</td>
												<td className="px-3 py-3 text-sm text-right tabular-nums text-gray-900">
													{formatRupiah(grandTotal.saldo_sebelum)}
												</td>
												<td className="px-3 py-3 text-sm text-right tabular-nums text-gray-900">
													{formatRupiah(grandTotal.penerimaan)}
												</td>
												<td className="px-3 py-3 text-sm text-right tabular-nums text-gray-900">
													{formatRupiah(grandTotal.pengeluaran)}
												</td>
												<td className="px-3 py-3 text-sm text-right tabular-nums text-gray-900 pr-6">
													{formatRupiah(grandTotal.saldo_sampai)}
												</td>
											</tr>
										)}
									</tbody>
								</table>
							</div>
						</div>
					) : (
						<div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 p-12 text-center">
							<p className="text-sm text-gray-500">
								Tidak ada data posisi kas untuk filter yang dipilih.
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

function formatRupiah(amount: number): string {
	if (amount === 0) return "0";
	const isNegative = amount < 0;
	const abs = Math.abs(amount);
	const formatted = new Intl.NumberFormat("id-ID").format(abs);
	return isNegative ? `(${formatted})` : formatted;
}

/** Renders a post row + expense detail sub-rows */
function PostRows({ post }: { post: PosisiKasPost }) {
	const details = post.expense_details || [];

	return (
		<>
			<tr className="bg-white hover:bg-gray-50">
				<td className="py-2.5 pl-6 pr-3 text-sm font-semibold text-gray-900">
					{post.name}
				</td>
				<td
					className={`px-3 py-2.5 text-sm text-right tabular-nums ${post.saldo_sebelum < 0 ? "text-red-600" : "text-gray-900"}`}
				>
					{formatRupiah(post.saldo_sebelum)}
				</td>
				<td className="px-3 py-2.5 text-sm text-right tabular-nums text-gray-900">
					{formatRupiah(post.penerimaan)}
				</td>
				<td className="px-3 py-2.5 text-sm text-right tabular-nums text-gray-900">
					{formatRupiah(post.pengeluaran)}
				</td>
				<td
					className={`px-3 py-2.5 text-sm text-right tabular-nums pr-6 ${post.saldo_sampai < 0 ? "text-red-600" : "text-gray-900"}`}
				>
					{formatRupiah(post.saldo_sampai)}
				</td>
			</tr>

			{details.length > 0 ? (
				details.map((detail, i) => (
					<tr key={`${post.category}-${i}`} className="bg-white">
						<td className="py-1.5 pl-10 pr-3 text-sm text-gray-500">
							<span className="text-gray-400 mr-1">·</span>
							{detail.name}
						</td>
						<td className="px-3 py-1.5 text-sm text-right tabular-nums text-gray-400" />
						<td className="px-3 py-1.5 text-sm text-right tabular-nums text-gray-400" />
						<td className="px-3 py-1.5 text-sm text-right tabular-nums text-gray-500">
							{formatRupiah(detail.amount)}
						</td>
						<td className="px-3 py-1.5 text-sm text-right tabular-nums text-gray-400 pr-6" />
					</tr>
				))
			) : (
				<tr className="bg-white">
					<td className="py-1.5 pl-10 pr-3 text-sm text-gray-400 italic">
						<span className="text-gray-300 mr-1">·</span>
						(belum ada pengeluaran)
					</td>
					<td colSpan={4} />
				</tr>
			)}
		</>
	);
}
