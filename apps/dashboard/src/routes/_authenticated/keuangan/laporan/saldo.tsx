import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useAtom } from "jotai";
import { ChevronRight, Printer } from "lucide-react";
import { useCallback } from "react";
import type { SaldoRow } from "#/api/endpoints/reports/saldo";
import { useGetReportsSaldo } from "#/api/endpoints/reports/saldo";
import { Alert, Button } from "#/components/ui";
import { academicYearAtom } from "../../../../store/global";
import { openPrintWindow } from "../../../../utils/print";

export const Route = createFileRoute("/_authenticated/keuangan/laporan/saldo")({
	component: LaporanSaldoPage,
	validateSearch: (search: Record<string, unknown>) => {
		const asNum = (v: unknown) =>
			typeof v === "number"
				? v
				: typeof v === "string" && v !== ""
					? Number(v)
					: undefined;
		return {
			month: asNum(search.month),
			year: asNum(search.year),
			category: search.category as string | undefined,
		};
	},
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

/** Daftar pos pemasukan untuk dropdown filter */
const CATEGORY_OPTIONS = [
	{ value: "", label: "Semua Pos" },
	{ value: "monthly_spp", label: "SPP" },
	{ value: "monthly_infaq", label: "Infaq Harian" },
	{ value: "initial", label: "Biaya Awal Masuk" },
	{ value: "daycare_initial", label: "Biaya Awal Daycare" },
	{ value: "registration", label: "Biaya Registrasi" },
	{ value: "pasta", label: "PASTA" },
	{ value: "calisan", label: "Calisan" },
	{ value: "ekskul", label: "Ekskul" },
	{ value: "savings_mandatory", label: "Tabungan Wajib" },
	{ value: "daycare", label: "Daycare" },
	{ value: "graduation", label: "Wisuda" },
];

function formatRupiah(amount: number): string {
	if (amount === 0) return "0";
	const isNegative = amount < 0;
	const abs = Math.abs(amount);
	const formatted = new Intl.NumberFormat("id-ID", {
		minimumFractionDigits: 0,
		maximumFractionDigits: 0,
	}).format(abs);
	return isNegative ? `(${formatted})` : formatted;
}

function formatDateID(dateStr: string): string {
	const d = new Date(`${dateStr}T00:00:00`);
	return d.toLocaleDateString("id-ID", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
	});
}

function LaporanSaldoPage() {
	const [activeAy] = useAtom(academicYearAtom);
	const now = new Date();
	const navigate = useNavigate();
	const searchParams = Route.useSearch();

	const month = searchParams.month ?? now.getMonth() + 1;
	const year = searchParams.year ?? now.getFullYear();
	const category = searchParams.category ?? "";

	const updateSearch = useCallback(
		(updates: Partial<typeof searchParams>) => {
			navigate({
				from: Route.fullPath,
				search: { ...searchParams, ...updates } as typeof searchParams,
				replace: true,
			});
		},
		[navigate, searchParams],
	);

	const {
		data: reportData,
		isLoading,
		isError,
	} = useGetReportsSaldo(
		{
			month,
			year,
			category: category || undefined,
			academic_year_id: activeAy?.id,
		},
		{ query: { enabled: !!activeAy?.id } },
	);

	const report = (reportData?.data as any)?.data || null;
	const rows: SaldoRow[] = report?.rows || [];

	const currentYear = now.getFullYear();
	const yearOptions = Array.from({ length: 3 }, (_, i) => currentYear - i);

	const isSemuaPos = !category;
	const isDefault =
		searchParams.month === undefined &&
		searchParams.year === undefined &&
		searchParams.category === undefined;

	function handlePrint() {
		const esc = (s: string) =>
			s
				.replace(/&/g, "&amp;")
				.replace(/</g, "&lt;")
				.replace(/>/g, "&gt;")
				.replace(/"/g, "&quot;");

		const html = `
<div class="mb-4">
	<h2 class="text-lg font-bold mb-2">Laporan Saldo — ${esc(report?.post_name || "-")}</h2>
	<p class="text-sm text-gray">${esc(MONTH_NAMES[month - 1])} ${year} &middot; TA ${esc(report?.academic_year || activeAy?.name || "-")}</p>
	${report?.post_list && report.post_list.length > 0 ? `<p class="text-sm text-gray mt-2">Pos: ${esc(report.post_list.join(", "))}</p>` : ""}
</div>

<table>
	<thead>
		<tr>
			<th>No.</th>
			<th>Tanggal</th>
			<th class="text-right">Jumlah Penerimaan</th>
			<th class="text-right">Jumlah Pengeluaran</th>
			<th class="text-right">Selisih</th>
			<th class="text-right">Saldo</th>
		</tr>
	</thead>
	<tbody>
		<tr class="bg-gray-50">
			<td></td>
			<td class="text-gray">Saldo Sebelum ${esc(MONTH_NAMES[month - 1])} ${year}</td>
			<td></td>
			<td></td>
			<td></td>
			<td class="text-right font-bold ${report.saldo_sebelum < 0 ? "text-red" : ""}">${esc(formatRupiah(report.saldo_sebelum))}</td>
		</tr>
		${
			rows.length > 0
				? rows
						.map(
							(row, idx) => `
		<tr>
			<td>${idx + 1}.</td>
			<td>${esc(formatDateID(row.date))}</td>
			<td class="text-right">${row.penerimaan ? esc(formatRupiah(row.penerimaan)) : ""}</td>
			<td class="text-right">${row.pengeluaran ? esc(formatRupiah(row.pengeluaran)) : ""}</td>
			<td class="text-right ${row.selisih < 0 ? "text-red" : ""}">${row.selisih !== 0 ? esc(formatRupiah(row.selisih)) : ""}</td>
			<td class="text-right ${row.saldo < 0 ? "text-red" : ""}">${esc(formatRupiah(row.saldo))}</td>
		</tr>`,
						)
						.join("")
				: `
		<tr>
			<td colspan="6" class="text-center text-gray py-3">Tidak ada transaksi pada bulan ini.</td>
		</tr>`
		}
		${
			report.total_bulan
				? `
		<tr class="bg-gray-50 border-t-foot font-bold">
			<td></td>
			<td>Jumlah Bulan ${esc(MONTH_NAMES[month - 1])} ${year}</td>
			<td class="text-right">${esc(formatRupiah(report.total_bulan.penerimaan))}</td>
			<td class="text-right">${esc(formatRupiah(report.total_bulan.pengeluaran))}</td>
			<td class="text-right ${report.total_bulan.selisih < 0 ? "text-red" : ""}">${esc(formatRupiah(report.total_bulan.selisih))}</td>
			<td></td>
		</tr>`
				: ""
		}
		<tr class="bg-gray-50 border-t-foot font-bold">
			<td></td>
			<td>Saldo Akhir ${esc(MONTH_NAMES[month - 1])} ${year}</td>
			<td></td>
			<td></td>
			<td></td>
			<td class="text-right ${report.saldo_akhir < 0 ? "text-red" : ""}">${esc(formatRupiah(report.saldo_akhir))}</td>
		</tr>
	</tbody>
</table>`;

		openPrintWindow(html, {
			title: `Saldo - ${report?.post_name || ""}`,
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
						<span className="text-gray-900 font-medium">
							Saldo {isSemuaPos ? "Semua Pos" : "Per Pos"}
						</span>
					</nav>
					<h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:tracking-tight">
						{report ? `Laporan Saldo — ${report.post_name}` : "Laporan Saldo"}
					</h2>
					{report && (
						<p className="mt-1 text-sm text-gray-500">
							{MONTH_NAMES[month - 1]} {year} &middot; TA{" "}
							{report.academic_year || activeAy?.name || "-"}
						</p>
					)}
					{report?.post_list && report.post_list.length > 0 && (
						<p className="mt-0.5 text-xs text-gray-400">
							Pos: {report.post_list.join(", ")}
						</p>
					)}
				</div>
				{report && (
					<Button variant="secondary" onClick={handlePrint}>
						<Printer className="w-4 h-4 mr-2" />
						Cetak
					</Button>
				)}
			</div>

			{/* Filter — auto-fetch */}
			<div className="bg-white p-4 rounded-xl shadow-sm ring-1 ring-gray-900/5">
				<div className="flex flex-wrap gap-4 items-end">
					<div>
						<label className="block text-sm font-medium leading-6 text-gray-900 mb-1">
							Pos Pemasukan
						</label>
						<select
							value={category}
							onChange={(e) =>
								updateSearch({
									category: e.target.value || undefined,
								})
							}
							className="block w-full sm:w-52 rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
						>
							{CATEGORY_OPTIONS.map((opt) => (
								<option key={opt.value} value={opt.value}>
									{opt.label}
								</option>
							))}
						</select>
					</div>
					<div>
						<label className="block text-sm font-medium leading-6 text-gray-900 mb-1">
							Bulan
						</label>
						<select
							value={month}
							onChange={(e) => updateSearch({ month: Number(e.target.value) })}
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
							onChange={(e) => updateSearch({ year: Number(e.target.value) })}
							className="block w-full sm:w-28 rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
						>
							{yearOptions.map((y) => (
								<option key={y} value={y}>
									{y}
								</option>
							))}
						</select>
					</div>
					{!isDefault && (
						<button
							type="button"
							onClick={() => {
								updateSearch({
									month: undefined,
									year: undefined,
									category: undefined,
								});
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
					<div className="h-64 bg-gray-200 rounded-xl" />
				</div>
			)}

			{isError && (
				<Alert variant="error" title="Gagal Memuat">
					Terjadi kesalahan saat memuat laporan saldo.
				</Alert>
			)}

			{/* Report Table */}
			{report && !isLoading && (
				<div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 overflow-hidden">
					<div className="overflow-x-auto">
						<table className="min-w-full divide-y divide-gray-300">
							<thead className="bg-gray-50">
								<tr>
									<th className="py-3 pl-6 pr-3 text-left text-sm font-semibold text-gray-900 w-12">
										No.
									</th>
									<th className="px-3 py-3 text-left text-sm font-semibold text-gray-900 w-32">
										Tanggal
									</th>
									<th className="px-3 py-3 text-right text-sm font-semibold text-gray-900">
										Jumlah Penerimaan
									</th>
									<th className="px-3 py-3 text-right text-sm font-semibold text-gray-900">
										Jumlah Pengeluaran
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
								{/* Saldo Sebelum row */}
								<tr className="bg-gray-50/50">
									<td className="py-2.5 pl-6 pr-3 text-sm text-gray-500" />
									<td className="px-3 py-2.5 text-sm text-gray-500 italic">
										Saldo Sebelum {MONTH_NAMES[month - 1]} {year}
									</td>
									<td className="px-3 py-2.5" />
									<td className="px-3 py-2.5" />
									<td className="px-3 py-2.5" />
									<td
										className={`px-3 py-2.5 text-sm text-right tabular-nums font-semibold pr-6 ${report.saldo_sebelum < 0 ? "text-red-600" : "text-gray-900"}`}
									>
										{formatRupiah(report.saldo_sebelum)}
									</td>
								</tr>

								{rows.length > 0 ? (
									rows.map((row, idx) => (
										<tr key={row.date} className="hover:bg-gray-50">
											<td className="py-2 pl-6 pr-3 text-sm text-gray-500 tabular-nums">
												{idx + 1}.
											</td>
											<td className="px-3 py-2 text-sm text-gray-900 tabular-nums">
												{formatDateID(row.date)}
											</td>
											<td className="px-3 py-2 text-sm text-right tabular-nums text-gray-900">
												{row.penerimaan ? formatRupiah(row.penerimaan) : ""}
											</td>
											<td className="px-3 py-2 text-sm text-right tabular-nums text-gray-900">
												{row.pengeluaran ? formatRupiah(row.pengeluaran) : ""}
											</td>
											<td
												className={`px-3 py-2 text-sm text-right tabular-nums ${row.selisih < 0 ? "text-red-600" : "text-gray-900"}`}
											>
												{row.selisih !== 0 ? formatRupiah(row.selisih) : ""}
											</td>
											<td
												className={`px-3 py-2 text-sm text-right tabular-nums pr-6 ${row.saldo < 0 ? "text-red-600" : "text-gray-900"}`}
											>
												{formatRupiah(row.saldo)}
											</td>
										</tr>
									))
								) : (
									<tr>
										<td
											colSpan={6}
											className="px-6 py-8 text-center text-sm text-gray-500"
										>
											Tidak ada transaksi pada bulan ini.
										</td>
									</tr>
								)}

								{/* Jumlah Bulan footer */}
								{report.total_bulan && (
									<tr className="bg-gray-50 border-t-2 border-gray-300 font-semibold">
										<td className="py-3 pl-6 pr-3" />
										<td className="px-3 py-3 text-sm text-gray-900">
											Jumlah Bulan {MONTH_NAMES[month - 1]} {year}
										</td>
										<td className="px-3 py-3 text-sm text-right tabular-nums text-gray-900">
											{formatRupiah(report.total_bulan.penerimaan)}
										</td>
										<td className="px-3 py-3 text-sm text-right tabular-nums text-gray-900">
											{formatRupiah(report.total_bulan.pengeluaran)}
										</td>
										<td
											className={`px-3 py-3 text-sm text-right tabular-nums ${report.total_bulan.selisih < 0 ? "text-red-600" : "text-gray-900"}`}
										>
											{formatRupiah(report.total_bulan.selisih)}
										</td>
										<td className="px-3 py-3" />
									</tr>
								)}

								{/* Saldo Akhir */}
								<tr className="bg-gray-100 border-t border-gray-300 font-bold">
									<td className="py-3 pl-6 pr-3" />
									<td className="px-3 py-3 text-sm text-gray-900">
										Saldo Akhir {MONTH_NAMES[month - 1]} {year}
									</td>
									<td className="px-3 py-3" />
									<td className="px-3 py-3" />
									<td className="px-3 py-3" />
									<td
										className={`px-3 py-3 text-sm text-right tabular-nums pr-6 ${report.saldo_akhir < 0 ? "text-red-600" : "text-gray-900"}`}
									>
										{formatRupiah(report.saldo_akhir)}
									</td>
								</tr>
							</tbody>
						</table>
					</div>
				</div>
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
