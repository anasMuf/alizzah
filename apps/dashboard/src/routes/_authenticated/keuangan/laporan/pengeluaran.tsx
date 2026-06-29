import { createFileRoute, Link } from "@tanstack/react-router";
import { useAtom } from "jotai";
import { ChevronRight, Printer } from "lucide-react";
import { useState } from "react";
import type { TransaksiPengeluaranBlock } from "#/api/endpoints/reports/transaksi-pengeluaran";
import { useGetReportsTransaksiPengeluaran } from "#/api/endpoints/reports/transaksi-pengeluaran";
import { Alert, Button } from "#/components/ui";
import { academicYearAtom } from "../../../../store/global";

export const Route = createFileRoute(
	"/_authenticated/keuangan/laporan/pengeluaran",
)({
	component: LaporanPengeluaranPage,
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
	const d = new Date(dateStr + "T00:00:00");
	return d.toLocaleDateString("id-ID", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
	});
}

function formatDateTimeID(dateStr: string): string {
	const d = new Date(dateStr);
	return d.toLocaleDateString("id-ID", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
	});
}

function LaporanPengeluaranPage() {
	const [activeAy] = useAtom(academicYearAtom);
	const now = new Date();

	const [month, setMonth] = useState(now.getMonth() + 1);
	const [year, setYear] = useState(now.getFullYear());

	const {
		data: reportData,
		isLoading,
		isError,
	} = useGetReportsTransaksiPengeluaran(
		{
			month,
			year,
			academic_year_id: activeAy?.id,
		},
		{ query: { enabled: !!activeAy?.id } },
	);

	const report = (reportData?.data as any)?.data || null;
	const transactions: TransaksiPengeluaranBlock[] = report?.transactions || [];

	const currentYear = now.getFullYear();
	const yearOptions = Array.from({ length: 3 }, (_, i) => currentYear - i);

	const isCurrentMonth =
		month === now.getMonth() + 1 && year === now.getFullYear();

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
						<span className="text-gray-900 font-medium">
							Transaksi Pengeluaran
						</span>
					</nav>
					<h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:tracking-tight">
						Transaksi Pengeluaran — {MONTH_NAMES[month - 1]} {year}
					</h2>
					<p className="mt-1 text-sm text-gray-500">
						TA {report?.academic_year || activeAy?.name || "-"}
					</p>
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
				<h1 className="text-lg font-bold text-center">PAUD AL-IZZAH</h1>
				<p className="text-sm text-gray-600 text-center">
					Laporan Transaksi Pengeluaran
				</p>
				<div className="mt-2 text-sm text-gray-700 space-y-0.5">
					<p>
						Periode: {MONTH_NAMES[month - 1]} {year}
					</p>
					<p>TA: {report?.academic_year || activeAy?.name || "-"}</p>
				</div>
			</div>

			{/* Filter — auto-fetch */}
			<div className="bg-white p-4 rounded-xl shadow-sm ring-1 ring-gray-900/5 print:hidden">
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
					<div className="h-48 bg-gray-200 rounded-xl" />
				</div>
			)}

			{isError && (
				<Alert variant="error" title="Gagal Memuat">
					Terjadi kesalahan saat memuat laporan transaksi pengeluaran.
				</Alert>
			)}

			{/* Transaction Blocks */}
			{report && !isLoading && (
				<>
					{transactions.length > 0 ? (
						<div className="space-y-4">
							{transactions.map((txn) => (
								<TransactionCard key={txn.id} txn={txn} />
							))}

							{/* Grand Total */}
							<div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 p-6">
								<div className="flex justify-between items-center">
									<span className="text-base font-bold text-gray-900">
										Grand Total Pengeluaran {MONTH_NAMES[month - 1]} {year}
									</span>
									<span className="text-lg font-bold text-gray-900 tabular-nums">
										Rp. {formatRupiah(report.grand_total)}
									</span>
								</div>
							</div>
						</div>
					) : (
						<div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 p-12 text-center">
							<p className="text-sm text-gray-500">
								Tidak ada transaksi pengeluaran pada bulan ini.
							</p>
						</div>
					)}
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

/** Transaction card/block component */
function TransactionCard({ txn }: { txn: TransaksiPengeluaranBlock }) {
	const sourceLabel = txn.source === "transfer" ? "TRANSFER" : "TUNAI";

	return (
		<div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 overflow-hidden print:break-inside-avoid">
			{/* Header */}
			<div className="px-6 py-4 border-b border-gray-200 bg-gray-50/50">
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
					<div className="space-y-1">
						<div className="flex gap-2">
							<span className="text-gray-500 w-32 shrink-0">
								Cara Transaksi
							</span>
							<span className="text-gray-900 font-semibold">
								: {sourceLabel}
							</span>
						</div>
						<div className="flex gap-2">
							<span className="text-gray-500 w-32 shrink-0">Keterangan</span>
							<span className="text-gray-900">: {txn.description}</span>
						</div>
						<div className="flex gap-2">
							<span className="text-gray-500 w-32 shrink-0">Terbilang</span>
							<span className="text-gray-700 italic">
								: {txn.total_terbilang}
							</span>
						</div>
					</div>
					<div className="space-y-1 sm:text-right">
						<div className="flex sm:justify-end gap-2">
							<span className="text-gray-500">Tgl. Transaksi :</span>
							<span className="text-gray-900 font-medium">
								{formatDateID(txn.transaction_date)}
							</span>
						</div>
						<div className="flex sm:justify-end gap-2">
							<span className="text-gray-500">Petugas :</span>
							<span className="text-gray-900">{txn.created_by_name}</span>
						</div>
					</div>
				</div>
			</div>

			{/* Items */}
			<div className="px-6 py-3">
				<p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
					Dengan rincian transaksi sebagai berikut :
				</p>
				<table className="min-w-full">
					<thead>
						<tr className="text-xs text-gray-500 uppercase">
							<th className="py-1 text-left w-10">No</th>
							<th className="py-1 text-left w-32">Pos</th>
							<th className="py-1 text-left">Deskripsi</th>
							<th className="py-1 text-right">Nominal (Rp.)</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-gray-100">
						{txn.items.map((item) => (
							<tr key={item.no}>
								<td className="py-1.5 text-sm text-gray-500 tabular-nums">
									{item.no}.
								</td>
								<td className="py-1.5 text-sm text-gray-700 font-medium">
									{item.category_name}
								</td>
								<td className="py-1.5 text-sm text-gray-900">
									{item.description}
								</td>
								<td className="py-1.5 text-sm text-right tabular-nums text-gray-900">
									{formatRupiah(item.amount)}
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>

			{/* Footer */}
			<div className="px-6 py-3 border-t border-gray-200 bg-gray-50/50 flex justify-between items-center">
				<span className="text-xs text-gray-500">
					Waktu Komputer : {formatDateTimeID(txn.created_at)}
				</span>
				<span className="text-sm font-semibold text-gray-900 tabular-nums">
					Jumlah Rp. {formatRupiah(txn.total_amount)}
				</span>
			</div>
		</div>
	);
}
