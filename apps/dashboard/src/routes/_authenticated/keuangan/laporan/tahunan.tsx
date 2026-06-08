import { createFileRoute, Link } from "@tanstack/react-router";
import { useAtom } from "jotai";
import { ChevronRight, Printer } from "lucide-react";
import { useGetV1ReportsAnnual } from "../../../../api/endpoints/reports/reports";
import { Alert } from "../../../../components/atoms/Alert";
import { Button } from "../../../../components/atoms/Button";
import { academicYearAtom } from "../../../../store/global";
import { formatCurrency } from "../../../../utils/format";

export const Route = createFileRoute(
	"/_authenticated/keuangan/laporan/tahunan",
)({
	component: LaporanTahunanPage,
});

const MONTH_NAMES_SHORT = [
	"",
	"Jan",
	"Feb",
	"Mar",
	"Apr",
	"Mei",
	"Jun",
	"Jul",
	"Agu",
	"Sep",
	"Okt",
	"Nov",
	"Des",
];

function LaporanTahunanPage() {
	const [activeAy] = useAtom(academicYearAtom);

	const {
		data: reportData,
		isLoading,
		isError,
	} = useGetV1ReportsAnnual(
		{ academic_year_id: activeAy?.id! },
		{ query: { enabled: !!activeAy?.id } },
	);

	const report = (reportData?.data as any)?.data || null;

	const income = report?.income_summary;
	const expense = report?.expense_summary;
	const months: any[] = report?.by_month || [];

	const totalNet =
		Number(income?.total_paid || 0) - Number(expense?.total || 0);

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-start justify-between print:hidden">
				<div>
					<nav className="flex items-center text-sm text-gray-500 mb-2">
						<Link
							to="/keuangan/laporan"
							className="hover:text-indigo-600 transition-colors"
						>
							Laporan
						</Link>
						<ChevronRight className="w-4 h-4 mx-1" />
						<span className="text-gray-900 font-medium">Laporan Tahunan</span>
					</nav>
					<h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:tracking-tight">
						Laporan Tahunan — TA {activeAy?.name || "-"}
					</h2>
				</div>
				{report && (
					<Button
						variant="secondary"
						onClick={() => window.print()}
						className="print:hidden"
					>
						<Printer className="w-4 h-4 mr-2" />
						Cetak
					</Button>
				)}
			</div>

			{/* Print Header */}
			<div className="hidden print:block border-b border-gray-300 pb-4 mb-6">
				<h1 className="text-lg font-bold">ALIZZAH MANAJEMEN</h1>
				<p className="text-sm text-gray-600">Laporan Keuangan</p>
				<div className="mt-2 text-sm text-gray-700 space-y-0.5">
					<p>Jenis: Laporan Tahunan</p>
					<p>TA: {activeAy?.name || "-"}</p>
				</div>
			</div>

			{/* Filter — TA is read-only from global state */}
			<div className="bg-white p-4 rounded-xl shadow-sm ring-1 ring-gray-900/5 print:hidden">
				<div className="flex flex-wrap gap-4 items-end">
					<div>
						<label className="block text-sm font-medium leading-6 text-gray-900 mb-1">
							Tahun Ajaran
						</label>
						<input
							type="text"
							value={activeAy?.name || "-"}
							disabled
							className="block w-full sm:w-48 rounded-md border-0 py-1.5 px-3 text-gray-500 bg-gray-50 ring-1 ring-inset ring-gray-300 sm:text-sm sm:leading-6"
						/>
					</div>
				</div>
			</div>

			{/* Loading */}
			{isLoading && (
				<div className="animate-pulse space-y-4">
					<div className="grid grid-cols-3 gap-4">
						<div className="h-24 bg-gray-200 rounded-xl" />
						<div className="h-24 bg-gray-200 rounded-xl" />
						<div className="h-24 bg-gray-200 rounded-xl" />
					</div>
					<div className="h-64 bg-gray-200 rounded-xl" />
				</div>
			)}

			{isError && (
				<Alert variant="error" title="Gagal Memuat">
					Terjadi kesalahan saat memuat laporan tahunan.
				</Alert>
			)}

			{/* Report Content */}
			{report && !isLoading && (
				<>
					<Alert variant="info">
						Tahun ajaran ini masih berjalan. Data bisa berubah.
					</Alert>

					{/* Summary Cards */}
					<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
						<div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 p-5">
							<p className="text-xs text-gray-500 uppercase tracking-wider font-medium">
								Total Tagihan
							</p>
							<p className="mt-1 text-xl font-bold text-gray-900 tabular-nums">
								{formatCurrency(Number(income?.total_billed || 0))}
							</p>
							<div className="mt-2 flex gap-4 text-xs">
								<span className="text-green-600">
									Terbayar: {formatCurrency(Number(income?.total_paid || 0))}
								</span>
								<span className="text-red-600">
									Sisa: {formatCurrency(Number(income?.total_unpaid || 0))}
								</span>
							</div>
						</div>
						<div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 p-5">
							<p className="text-xs text-gray-500 uppercase tracking-wider font-medium">
								Total Pengeluaran
							</p>
							<p className="mt-1 text-xl font-bold text-red-600 tabular-nums">
								{formatCurrency(Number(expense?.total || 0))}
							</p>
						</div>
						<div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 p-5">
							<p className="text-xs text-gray-500 uppercase tracking-wider font-medium">
								Net (Masuk - Keluar)
							</p>
							<p
								className={`mt-1 text-xl font-bold tabular-nums ${Number(report.net || totalNet) >= 0 ? "text-green-600" : "text-red-600"}`}
							>
								{formatCurrency(Number(report.net ?? totalNet))}
							</p>
						</div>
					</div>

					{/* Saldo */}
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 p-5">
							<p className="text-xs text-gray-500 uppercase tracking-wider font-medium">
								Saldo Kas
							</p>
							<p className="mt-1 text-xl font-bold text-gray-900 tabular-nums">
								{formatCurrency(Number(report.cash_balance || 0))}
							</p>
						</div>
						<div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 p-5">
							<p className="text-xs text-gray-500 uppercase tracking-wider font-medium">
								Saldo Berangkas
							</p>
							<p className="mt-1 text-xl font-bold text-gray-900 tabular-nums">
								{formatCurrency(Number(report.vault_balance || 0))}
							</p>
						</div>
					</div>

					{/* Monthly Breakdown */}
					<div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 overflow-hidden">
						<div className="p-6 pb-2">
							<h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
								Breakdown per Bulan
							</h3>
						</div>
						<div className="overflow-x-auto">
							<table className="min-w-full divide-y divide-gray-300">
								<thead className="bg-gray-50">
									<tr>
										<th className="py-3 pl-6 pr-3 text-left text-sm font-semibold text-gray-900">
											Bulan
										</th>
										<th className="px-3 py-3 text-right text-sm font-semibold text-gray-900">
											Pemasukan
										</th>
										<th className="px-3 py-3 text-right text-sm font-semibold text-gray-900">
											Pengeluaran
										</th>
										<th className="px-3 py-3 text-right text-sm font-semibold text-gray-900 pr-6">
											Net
										</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-gray-200 bg-white">
									{months.length > 0 ? (
										<>
											{months.map((m: any, i: number) => {
												const inc = Number(m.income || 0);
												const exp = Number(m.expense || 0);
												const net = inc - exp;
												return (
													<tr key={i}>
														<td className="py-3 pl-6 pr-3 text-sm text-gray-900">
															{MONTH_NAMES_SHORT[m.month] || m.month} {m.year}
														</td>
														<td className="px-3 py-3 text-sm text-right tabular-nums text-green-600">
															{formatCurrency(inc)}
														</td>
														<td className="px-3 py-3 text-sm text-right tabular-nums text-red-600">
															{formatCurrency(exp)}
														</td>
														<td
															className={`px-3 py-3 text-sm text-right tabular-nums font-medium pr-6 ${net >= 0 ? "text-gray-900" : "text-red-600"}`}
														>
															{formatCurrency(net)}
														</td>
													</tr>
												);
											})}
											{/* Totals row */}
											<tr className="bg-gray-50 font-semibold">
												<td className="py-3 pl-6 pr-3 text-sm text-gray-900">
													TOTAL
												</td>
												<td className="px-3 py-3 text-sm text-right tabular-nums text-green-600">
													{formatCurrency(
														months.reduce(
															(s: number, m: any) => s + Number(m.income || 0),
															0,
														),
													)}
												</td>
												<td className="px-3 py-3 text-sm text-right tabular-nums text-red-600">
													{formatCurrency(
														months.reduce(
															(s: number, m: any) => s + Number(m.expense || 0),
															0,
														),
													)}
												</td>
												<td className="px-3 py-3 text-sm text-right tabular-nums font-bold pr-6 text-gray-900">
													{formatCurrency(
														months.reduce(
															(s: number, m: any) =>
																s +
																Number(m.income || 0) -
																Number(m.expense || 0),
															0,
														),
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
												Belum ada data untuk tahun ajaran ini.
											</td>
										</tr>
									)}
								</tbody>
							</table>
						</div>
					</div>
				</>
			)}

			{!!activeAy?.id && !isLoading && !isError && !report && (
				<div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 p-12 text-center">
					<p className="text-sm text-gray-500">
						Belum ada data untuk tahun ajaran ini.
					</p>
				</div>
			)}
		</div>
	);
}
