import { createFileRoute, Link } from "@tanstack/react-router";
import { useAtom } from "jotai";
import { Printer } from "lucide-react";
import { useMemo, useState } from "react";
import { useGetV1ExpenseCategories } from "#/api/endpoints/expense-categories/expense-categories";
import {
	useGetV1FeeConfigs,
	useGetV1FeeConfigsIdItems,
} from "#/api/endpoints/fee-configs/fee-configs";
import { useGetV1IncomeCategories } from "#/api/endpoints/income-categories/income-categories";
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
	facility: "Fasilitas",
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
	facility: 10,
	calisan: 11,
	ekskul: 12,
};

function LaporanPosisiKasPage() {
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

	const { data: expenseCatData } = useGetV1ExpenseCategories({
		query: { staleTime: 5 * 60 * 1000 },
	});
	const expenseCats = ((expenseCatData?.data as any)?.data ?? []) as any[];

	// Kategori penerimaan lain (BOS, Donasi, Hibah, Lainnya, dst) — dinamis dari
	// master data agar setiap kategori yang bisa dipilih user ikut terlaporkan.
	const { data: incomeCatData } = useGetV1IncomeCategories({
		query: { staleTime: 5 * 60 * 1000 },
	});
	const incomeCats = ((incomeCatData?.data as any)?.data ?? []) as any[];

	// Unified category tree: fee categories + expense subs + income-only
	const { kategoriGroups, flatKategoriOptions } = useMemo(() => {
		const groups: MultiSelectGroup[] = [];
		const flat: { id: string | number; label: string }[] = [];

		// Index expense parents by invoice_category
		const expenseByInvoice: Record<string, any> = {};
		for (const cat of expenseCats) {
			if (cat.invoice_category) {
				expenseByInvoice[cat.invoice_category] = cat;
			}
		}

		// Fee categories (sorted)
		const feeCats = [...new Set(feeItems.map((i: any) => i.category))].sort(
			(a, b) => (CATEGORY_ORDER[a] ?? 99) - (CATEGORY_ORDER[b] ?? 99),
		);

		for (const cat of feeCats) {
			const label = CATEGORY_LABELS[cat] || cat;
			const items: { id: string | number; label: string }[] = [];

			// Income checkbox (fee category)
			const incomeId = `cat:${cat}`;
			items.push({ id: incomeId, label: "Pemasukan" });
			flat.push({ id: incomeId, label: `${label} — Pemasukan` });

			// Expense sub-categories under matching parent
			const expenseParent = expenseByInvoice[cat];
			if (expenseParent?.children) {
				for (const child of expenseParent.children) {
					items.push({ id: child.id, label: child.name });
					flat.push({ id: child.id, label: `${label} > ${child.name}` });
				}
			}

			groups.push({ header: label, items });
		}

		// Income-only categories (dinamis dari master data)
		for (const inc of incomeCats) {
			const key = inc.code as string;
			const label = (inc.name as string) || key;
			const expenseParent = expenseByInvoice[key];
			const items: { id: string | number; label: string }[] = [];

			const incomeId = `income:${key}`;
			items.push({ id: incomeId, label: "Pemasukan" });
			flat.push({ id: incomeId, label: `${label} — Pemasukan` });

			if (expenseParent?.children) {
				for (const child of expenseParent.children) {
					items.push({ id: child.id, label: child.name });
					flat.push({ id: child.id, label: `${label} > ${child.name}` });
				}
			}

			groups.push({ header: label, items });
		}

		// Tabungan Umum
		groups.push({
			header: "Tabungan Umum",
			items: [{ id: "savings:voluntary", label: "Setoran" }],
		});
		flat.push({ id: "savings:voluntary", label: "Tabungan Umum — Setoran" });

		return { kategoriGroups: groups, flatKategoriOptions: flat };
	}, [feeItems, expenseCats, incomeCats]);

	const [selectedIds, setSelectedIds] = useState<(string | number)[]>([]);

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
		const selected = [...selectedIds];

		// Fee categories → categories param
		const categories = selected
			.filter((id) => typeof id === "string" && id.startsWith("cat:"))
			.map((id) => (id as string).replace("cat:", ""));

		// Income categories → income_categories param
		const incomeCategories = selected
			.filter((id) => typeof id === "string" && id.startsWith("income:"))
			.map((id) => (id as string).replace("income:", ""));

		// Expense sub-category IDs → expense_category_ids param
		const expenseIds = selected.filter(
			(id) => typeof id === "number",
		) as number[];

		// Tabungan Umum
		const includeSavings = selected.includes("savings:voluntary");

		setCommittedParams({
			date_from: filters.date_from,
			date_to: filters.date_to,
			categories: categories.length > 0 ? categories.join(",") : undefined,
			income_categories:
				incomeCategories.length > 0 ? incomeCategories.join(",") : undefined,
			expense_category_ids:
				expenseIds.length > 0 ? expenseIds.join(",") : undefined,
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
			if (amount === 0) return "-";
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
		const selectedNames = flatKategoriOptions
			.filter((opt) => selectedIds.includes(opt.id))
			.map((opt) => opt.label)
			.join(", ");
		const periodLabel =
			committedParams.date_from && committedParams.date_to
				? `${formatDate(committedParams.date_from as string)} - ${formatDate(committedParams.date_to as string)}`
				: "-";
		return {
			kategori: selectedNames || "Semua",
			periode: periodLabel,
			ta: activeAy?.name ?? "-",
		};
	}, [committedParams, selectedIds, flatKategoriOptions, activeAy]);

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
					<FilterBar
						onGenerate={handleGenerate}
						isLoading={isLoading}
						hidePaymentMethod
					>
						<MultiSelectCheckbox
							label="Kategori"
							options={flatKategoriOptions}
							groups={kategoriGroups}
							selected={selectedIds}
							onChange={setSelectedIds}
						/>
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
	if (amount === 0) return "-";
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
