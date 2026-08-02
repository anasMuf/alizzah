import { createFileRoute, Link } from "@tanstack/react-router";
import { useAtom } from "jotai";
import { Printer } from "lucide-react";
import { useMemo, useState } from "react";
import { useGetV1ExpenseCategories } from "#/api/endpoints/expense-categories/expense-categories";
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
import {
	MultiSelectCheckbox,
	type MultiSelectGroup,
} from "#/features/keuangan/components/MultiSelectCheckbox";
import { ReportInfoCard } from "#/features/keuangan/components/ReportInfoCard";
import { academicYearAtom } from "#/store/global";
import { formatDate } from "#/utils/format";
import { openPrintWindow } from "#/utils/print";

export const Route = createFileRoute(
	"/_authenticated/keuangan/laporan/posisi-kas",
)({
	component: LaporanPosisiKasPage,
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

	const feeItemGroups = useMemo((): MultiSelectGroup[] => {
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

	const flatFeeItemOptions = useMemo(
		() => feeItemGroups.flatMap((g) => g.items),
		[feeItemGroups],
	);

	// Expense categories for filter (grouped)
	const { data: expenseCatData } = useGetV1ExpenseCategories({
		query: { staleTime: 5 * 60 * 1000 },
	});
	const expenseCats = ((expenseCatData?.data as any)?.data ?? []) as any[];
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

	// Filter state
	const [selectedFeeItemIds, setSelectedFeeItemIds] = useState<number[]>([]);
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
			categories:
				selectedCategories.length > 0
					? selectedCategories.join(",")
					: undefined,
			income_categories:
				selectedIncomeCategories.length > 0
					? selectedIncomeCategories.join(",")
					: undefined,
			expense_category_ids:
				selectedExpenseCatIds.length > 0
					? selectedExpenseCatIds.join(",")
					: undefined,
			include_savings: includeSavings || undefined,
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
		const incomeLabelMap: Record<number, string> = {
			[-1]: "Dana BOS",
			[-2]: "Donasi",
			[-3]: "Hibah",
			[-4]: "Lainnya",
			[-5]: "Tabungan Umum",
		};
		const feeNames = feeItems
			.filter((item: any) => selectedFeeItemIds.includes(item.id))
			.map((item: any) => item.name);
		const incomeNames = selectedFeeItemIds
			.filter((id) => id < 0)
			.map((id) => incomeLabelMap[id])
			.filter(Boolean);
		const allPosNames = [...feeNames, ...incomeNames];
		const expenseNames = flatExpenseCatOptions
			.filter((cat) => selectedExpenseCatIds.includes(cat.id))
			.map((cat) => cat.label)
			.join(", ");
		const periodLabel =
			committedParams.date_from && committedParams.date_to
				? `${formatDate(committedParams.date_from as string)} - ${formatDate(committedParams.date_to as string)}`
				: "-";
		return {
			pos: allPosNames.join(", ") || "Semua",
			pengeluaran: expenseNames || "Semua",
			metode: (committedParams.payment_method as string) || "Semua",
			periode: periodLabel,
			ta: activeAy?.name ?? "-",
		};
	}, [
		committedParams,
		selectedFeeItemIds,
		selectedExpenseCatIds,
		feeItems,
		flatExpenseCatOptions,
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
					<h2 className="text-lg font-bold text-gray-900">Posisi Kas</h2>
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
								label="Fee Item (Pemasukan)"
								options={flatFeeItemOptions}
								groups={feeItemGroups}
								selected={selectedFeeItemIds}
								onChange={setSelectedFeeItemIds}
							/>
							<MultiSelectCheckbox
								label="Kategori Pengeluaran"
								options={flatExpenseCatOptions}
								groups={expenseCatGroups}
								selected={selectedExpenseCatIds}
								onChange={setSelectedExpenseCatIds}
							/>
						</div>
					</FilterBar>
				</div>

				{/* Right: Preview */}
				<div className="flex-1 flex flex-col bg-gray-50 overflow-y-auto">
					<div className="p-4">
						{isLoading && (
							<div className="animate-pulse space-y-4">
								<div className="h-64 bg-gray-200 rounded-xl" />
							</div>
						)}
						{isError && (
							<Alert variant="error" title="Gagal Memuat">
								Terjadi kesalahan saat memuat laporan posisi kas.
							</Alert>
						)}

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
