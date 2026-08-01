import { createFileRoute, Link } from "@tanstack/react-router";
import { useAtom } from "jotai";
import { ChevronRight, Printer } from "lucide-react";
import { useState } from "react";
import { useGetV1ReportsMonthly } from "#/api/endpoints/reports/reports";
import { Alert, Button } from "#/components/ui";
import { academicYearAtom } from "../../../../../store/global";
import { formatCurrency } from "../../../../../utils/format";
import { openPrintWindow } from "../../../../../utils/print";

export const Route = createFileRoute(
	"/_authenticated/keuangan/laporan/old/bulanan",
)({
	component: LaporanBulananPage,
});

const MONTH_NAMES = [
	"Januari",
	"Februari",
	"Maret",
	"April",
	"Mei",
	"Juni",
	"Juli",
	"Agustus",
	"September",
	"Oktober",
	"November",
	"Desember",
];

function LaporanBulananPage() {
	const [activeAy] = useAtom(academicYearAtom);
	const now = new Date();

	const [month, setMonth] = useState(now.getMonth() + 1);
	const [year, setYear] = useState(now.getFullYear());

	const {
		data: reportData,
		isLoading,
		isError,
	} = useGetV1ReportsMonthly(
		{ month, year, academic_year_id: activeAy?.id },
		{ query: { enabled: !!activeAy?.id } },
	);

	const report = (reportData?.data as any)?.data || null;

	const currentYear = now.getFullYear();
	const yearOptions = Array.from({ length: 3 }, (_, i) => currentYear - i);

	const isCurrentMonth =
		month === now.getMonth() + 1 && year === now.getFullYear();

	const income = report?.income_summary;
	const expense = report?.expense_summary;
	const cash = report?.cash;
	const arrears: any[] = report?.arrears_by_class || [];

	function handlePrint() {
		if (!report) return;

		const esc = (s: string) =>
			s
				.replace(/&/g, "&amp;")
				.replace(/</g, "&lt;")
				.replace(/>/g, "&gt;")
				.replace(/"/g, "&quot;");

		const content = `
<div class="mb-6">
	<h2 class="text-xl font-bold">Laporan Bulanan &mdash; ${esc(MONTH_NAMES[month - 1])} ${year}</h2>
	<p class="text-gray mt-2">TA ${esc(activeAy?.name || "-")}</p>
</div>

<h3 class="text-base font-bold uppercase letter-spacing mb-2">Ringkasan Pemasukan</h3>
<table>
	<thead>
		<tr>
			<th>Kategori</th>
			<th class="text-right">Tagihan</th>
			<th class="text-right">Realisasi</th>
			<th class="text-right">Selisih</th>
		</tr>
	</thead>
	<tbody>
		${
			income?.by_category && income.by_category.length > 0
				? income.by_category
						.map((cat: any) => {
							const billed = Number(cat.billed || 0);
							const paid = Number(cat.paid || 0);
							const diff = paid - billed;
							return `
		<tr>
			<td>${esc(cat.category)}</td>
			<td class="text-right">${formatCurrency(billed)}</td>
			<td class="text-right">${formatCurrency(paid)}</td>
			<td class="text-right ${diff < 0 ? "text-red" : "text-green"}">${formatCurrency(diff)}</td>
		</tr>`;
						})
						.join("")
				: `
		<tr>
			<td colspan="4" class="text-center text-gray">Belum ada data pemasukan untuk bulan ini.</td>
		</tr>`
		}
		${
			income?.by_category && income.by_category.length > 0
				? `
		<tr class="bg-gray-50 font-bold">
			<td class="border-t-foot">TOTAL</td>
			<td class="text-right border-t-foot">${formatCurrency(Number(income.total_billed || 0))}</td>
			<td class="text-right border-t-foot">${formatCurrency(Number(income.total_paid || 0))}</td>
			<td class="text-right border-t-foot ${Number(income.total_unpaid || 0) > 0 ? "text-red" : "text-green"}">${formatCurrency(Number(income.total_paid || 0) - Number(income.total_billed || 0))}</td>
		</tr>`
				: ""
		}
	</tbody>
</table>

<h3 class="text-base font-bold uppercase letter-spacing mb-2 mt-8">Ringkasan Pengeluaran</h3>
<table>
	<thead>
		<tr>
			<th>Kategori</th>
			<th class="text-right">Total</th>
		</tr>
	</thead>
	<tbody>
		${
			expense?.by_category && expense.by_category.length > 0
				? expense.by_category
						.map(
							(cat: any) => `
		<tr>
			<td>${esc(cat.sub_category ? `${cat.category} > ${cat.sub_category}` : cat.category)}</td>
			<td class="text-right">${formatCurrency(Number(cat.amount || 0))}</td>
		</tr>`,
						)
						.join("")
				: `
		<tr>
			<td colspan="2" class="text-center text-gray">Belum ada pengeluaran untuk bulan ini.</td>
		</tr>`
		}
		${
			expense?.by_category && expense.by_category.length > 0
				? `
		<tr class="bg-gray-50 font-bold">
			<td class="border-t-foot">TOTAL</td>
			<td class="text-right border-t-foot">${formatCurrency(Number(expense.total || 0))}</td>
		</tr>`
				: ""
		}
	</tbody>
</table>

<h3 class="text-base font-bold uppercase letter-spacing mb-2 mt-8">Tunggakan per Kelas</h3>
<table>
	<thead>
		<tr>
			<th>Kelas</th>
			<th class="text-right">Total Tunggakan</th>
			<th class="text-right">Jumlah Siswa</th>
		</tr>
	</thead>
	<tbody>
		${
			arrears.length > 0
				? arrears
						.map(
							(cls: any) => `
		<tr>
			<td>${esc(cls.class_group_name)}</td>
			<td class="text-right text-red">${formatCurrency(Number(cls.total_unpaid || 0))}</td>
			<td class="text-right text-gray">${cls.student_count} siswa</td>
		</tr>`,
						)
						.join("")
				: `
		<tr>
			<td colspan="3" class="text-center text-gray">Tidak ada tunggakan pada bulan ini.</td>
		</tr>`
		}
	</tbody>
</table>

<h3 class="text-base font-bold uppercase letter-spacing mb-2 mt-8">Ringkasan Kas</h3>
<div class="space-y-2">
	<div class="border-b py-2">
		<span class="text-gray">Saldo Awal Bulan</span>
		<span style="float:right" class="text-right font-bold">${formatCurrency(Number(cash?.opening_balance || 0))}</span>
	</div>
	<div class="border-b py-2">
		<span class="text-green">+ Total Penerimaan</span>
		<span style="float:right" class="text-right font-bold text-green">${formatCurrency(Number(cash?.total_income || 0))}</span>
	</div>
	<div class="border-b py-2">
		<span class="text-red">- Total Pengeluaran</span>
		<span style="float:right" class="text-right font-bold text-red">${formatCurrency(Number(cash?.total_expense || 0))}</span>
	</div>
	<div class="py-2">
		<span>= Saldo Akhir Bulan</span>
		<span style="float:right" class="text-right font-bold">${formatCurrency(Number(cash?.closing_balance || 0))}</span>
	</div>
</div>
`;

		openPrintWindow(content, {
			title: "Laporan Bulanan",
			subtitle: `Periode: ${MONTH_NAMES[month - 1]} ${year}`,
		});
	}

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
						<span className="text-gray-900 font-medium">Laporan Bulanan</span>
					</nav>
					<h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:tracking-tight">
						Laporan Bulanan — {MONTH_NAMES[month - 1]} {year}
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
			<div className="bg-white p-4 rounded-xl shadow-sm ring-1 ring-gray-900/5">
				<div className="flex flex-wrap gap-4 items-end">
					<div>
						<label className="block text-sm font-medium leading-6 text-gray-900 mb-1">
							Bulan
						</label>
						<select
							value={month}
							onChange={(e) => setMonth(Number(e.target.value))}
							className="block w-full sm:w-40 rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
						>
							{MONTH_NAMES.map((name, idx) => (
								<option key={idx} value={idx + 1}>
									{name}
								</option>
							))}
						</select>
					</div>
					<div>
						<label className="block text-sm font-medium leading-6 text-gray-900 mb-1">
							Tahun
						</label>
						<select
							value={year}
							onChange={(e) => setYear(Number(e.target.value))}
							className="block w-full sm:w-28 rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
						>
							{yearOptions.map((y) => (
								<option key={y} value={y}>
									{y}
								</option>
							))}
						</select>
					</div>
					{!isCurrentMonth && (
						<button
							type="button"
							onClick={() => {
								setMonth(now.getMonth() + 1);
								setYear(now.getFullYear());
							}}
							className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
						>
							Reset Filter
						</button>
					)}
				</div>
			</div>

			{/* Loading */}
			{isLoading && (
				<div className="animate-pulse space-y-4">
					<div className="h-48 bg-gray-200 rounded-xl" />
					<div className="h-32 bg-gray-200 rounded-xl" />
					<div className="h-40 bg-gray-200 rounded-xl" />
				</div>
			)}

			{isError && (
				<Alert variant="error" title="Gagal Memuat">
					Terjadi kesalahan saat memuat laporan bulanan.
				</Alert>
			)}

			{/* Report Content */}
			{report && !isLoading && (
				<>
					{isCurrentMonth && (
						<Alert variant="info">
							Data bulan ini masih berjalan dan bisa berubah.
						</Alert>
					)}

					{/* Income: Tagihan vs Realisasi */}
					<div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 overflow-hidden">
						<div className="p-6 pb-2">
							<h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
								Ringkasan Pemasukan
							</h3>
						</div>
						<div className="overflow-x-auto">
							<table className="min-w-full divide-y divide-gray-300">
								<thead className="bg-gray-50">
									<tr>
										<th className="py-3 pl-6 pr-3 text-left text-sm font-semibold text-gray-900">
											Kategori
										</th>
										<th className="px-3 py-3 text-right text-sm font-semibold text-gray-900">
											Tagihan
										</th>
										<th className="px-3 py-3 text-right text-sm font-semibold text-gray-900">
											Realisasi
										</th>
										<th className="px-3 py-3 text-right text-sm font-semibold text-gray-900 pr-6">
											Selisih
										</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-gray-200 bg-white">
									{income?.by_category && income.by_category.length > 0 ? (
										<>
											{income.by_category.map((cat: any, i: number) => {
												const billed = Number(cat.billed || 0);
												const paid = Number(cat.paid || 0);
												const diff = paid - billed;
												return (
													<tr key={i}>
														<td className="py-3 pl-6 pr-3 text-sm text-gray-900">
															{cat.category}
														</td>
														<td className="px-3 py-3 text-sm text-right tabular-nums text-gray-900">
															{formatCurrency(billed)}
														</td>
														<td className="px-3 py-3 text-sm text-right tabular-nums text-gray-900">
															{formatCurrency(paid)}
														</td>
														<td
															className={`px-3 py-3 text-sm text-right tabular-nums font-medium pr-6 ${diff < 0 ? "text-red-600" : "text-green-600"}`}
														>
															{formatCurrency(diff)}
														</td>
													</tr>
												);
											})}
											<tr className="bg-gray-50 font-semibold">
												<td className="py-3 pl-6 pr-3 text-sm text-gray-900">
													TOTAL
												</td>
												<td className="px-3 py-3 text-sm text-right tabular-nums text-gray-900">
													{formatCurrency(Number(income.total_billed || 0))}
												</td>
												<td className="px-3 py-3 text-sm text-right tabular-nums text-gray-900">
													{formatCurrency(Number(income.total_paid || 0))}
												</td>
												<td
													className={`px-3 py-3 text-sm text-right tabular-nums pr-6 ${Number(income.total_unpaid || 0) > 0 ? "text-red-600" : "text-green-600"}`}
												>
													{formatCurrency(
														Number(income.total_paid || 0) -
															Number(income.total_billed || 0),
													)}
												</td>
											</tr>
										</>
									) : (
										<tr>
											<td
												colSpan={4}
												className="px-6 py-8 text-center text-sm text-gray-500"
											>
												Belum ada data pemasukan untuk bulan ini.
											</td>
										</tr>
									)}
								</tbody>
							</table>
						</div>
					</div>

					{/* Expense Summary */}
					<div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 overflow-hidden">
						<div className="p-6 pb-2">
							<h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
								Ringkasan Pengeluaran
							</h3>
						</div>
						<div className="overflow-x-auto">
							<table className="min-w-full divide-y divide-gray-300">
								<thead className="bg-gray-50">
									<tr>
										<th className="py-3 pl-6 pr-3 text-left text-sm font-semibold text-gray-900">
											Kategori
										</th>
										<th className="px-3 py-3 text-right text-sm font-semibold text-gray-900 pr-6">
											Total
										</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-gray-200 bg-white">
									{expense?.by_category && expense.by_category.length > 0 ? (
										<>
											{expense.by_category.map((cat: any, i: number) => (
												<tr key={i}>
													<td className="py-3 pl-6 pr-3 text-sm text-gray-900">
														{cat.sub_category
															? `${cat.category} > ${cat.sub_category}`
															: cat.category}
													</td>
													<td className="px-3 py-3 text-sm text-right tabular-nums text-gray-900 pr-6">
														{formatCurrency(Number(cat.amount || 0))}
													</td>
												</tr>
											))}
											<tr className="bg-gray-50 font-semibold">
												<td className="py-3 pl-6 pr-3 text-sm text-gray-900">
													TOTAL
												</td>
												<td className="px-3 py-3 text-sm text-right tabular-nums text-gray-900 pr-6">
													{formatCurrency(Number(expense.total || 0))}
												</td>
											</tr>
										</>
									) : (
										<tr>
											<td
												colSpan={2}
												className="px-6 py-8 text-center text-sm text-gray-500"
											>
												Belum ada pengeluaran untuk bulan ini.
											</td>
										</tr>
									)}
								</tbody>
							</table>
						</div>
					</div>

					{/* Arrears by Class */}
					<div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 overflow-hidden">
						<div className="p-6 pb-2">
							<h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
								Tunggakan per Kelas
							</h3>
						</div>
						<div className="overflow-x-auto">
							<table className="min-w-full divide-y divide-gray-300">
								<thead className="bg-gray-50">
									<tr>
										<th className="py-3 pl-6 pr-3 text-left text-sm font-semibold text-gray-900">
											Kelas
										</th>
										<th className="px-3 py-3 text-right text-sm font-semibold text-gray-900">
											Total Tunggakan
										</th>
										<th className="px-3 py-3 text-right text-sm font-semibold text-gray-900 pr-6">
											Jumlah Siswa
										</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-gray-200 bg-white">
									{arrears.length > 0 ? (
										arrears.map((cls: any, i: number) => (
											<tr key={i}>
												<td className="py-3 pl-6 pr-3 text-sm text-gray-900">
													{cls.class_group_name}
												</td>
												<td className="px-3 py-3 text-sm text-right tabular-nums text-red-600 font-medium">
													{formatCurrency(Number(cls.total_unpaid || 0))}
												</td>
												<td className="px-3 py-3 text-sm text-right text-gray-500 pr-6">
													{cls.student_count} siswa
												</td>
											</tr>
										))
									) : (
										<tr>
											<td
												colSpan={3}
												className="px-6 py-8 text-center text-sm text-gray-500"
											>
												Tidak ada tunggakan pada bulan ini.
											</td>
										</tr>
									)}
								</tbody>
							</table>
						</div>
						{arrears.length > 0 && (
							<div className="px-6 py-3 border-t border-gray-200">
								<Link
									to="/keuangan/laporan/old/kelas"
									search={{} as any}
									className="text-sm font-medium text-indigo-600 hover:text-indigo-500 inline-flex items-center"
								>
									Lihat Rekap Per Kelas
									<ChevronRight className="ml-1 h-4 w-4" />
								</Link>
							</div>
						)}
					</div>

					{/* Cash Summary */}
					<div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 p-6">
						<h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
							Ringkasan Kas
						</h3>
						<div className="space-y-3">
							<div className="flex justify-between items-center py-2">
								<span className="text-sm text-gray-600">Saldo Awal Bulan</span>
								<span className="text-sm font-semibold text-gray-900 tabular-nums">
									{formatCurrency(Number(cash?.opening_balance || 0))}
								</span>
							</div>
							<div className="flex justify-between items-center py-2">
								<span className="text-sm text-green-600">
									+ Total Pemasukan
								</span>
								<span className="text-sm font-semibold text-green-600 tabular-nums">
									{formatCurrency(Number(cash?.total_income || 0))}
								</span>
							</div>
							<div className="flex justify-between items-center py-2">
								<span className="text-sm text-red-600">
									- Total Pengeluaran
								</span>
								<span className="text-sm font-semibold text-red-600 tabular-nums">
									{formatCurrency(Number(cash?.total_expense || 0))}
								</span>
							</div>
							<div className="border-t border-gray-200 pt-3 flex justify-between items-center">
								<span className="text-sm font-semibold text-gray-900">
									= Saldo Kas Akhir Bulan
								</span>
								<span className="text-base font-bold text-gray-900 tabular-nums">
									{formatCurrency(Number(cash?.closing_balance || 0))}
								</span>
							</div>
						</div>
					</div>
				</>
			)}

			{!isLoading && !isError && !report && (
				<div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 p-12 text-center">
					<p className="text-sm text-gray-500">
						Belum ada data untuk bulan ini.
					</p>
				</div>
			)}
		</div>
	);
}
