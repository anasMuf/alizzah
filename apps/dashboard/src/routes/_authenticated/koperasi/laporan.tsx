import { createFileRoute } from "@tanstack/react-router";
import { useAtom } from "jotai";
import { AlertCircle } from "lucide-react";
import { useState } from "react";
import { academicYearAtom } from "#/store/global";
import { formatCurrency, formatDate } from "#/utils/format";
import {
	type OutstandingReport,
	useMonthlyReport,
	usePayables,
	useProfitLoss,
	useReceivables,
	useStockReport,
} from "../../../features/koperasi/laporan/api";

export const Route = createFileRoute("/_authenticated/koperasi/laporan")({
	component: LaporanPage,
});

const MONTHS = [
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

type Tab = "monthly" | "profit-loss" | "receivables" | "payables" | "stock";
const TABS: { key: Tab; label: string }[] = [
	{ key: "monthly", label: "Bulanan" },
	{ key: "profit-loss", label: "Laba-Rugi" },
	{ key: "receivables", label: "Piutang" },
	{ key: "payables", label: "Hutang" },
	{ key: "stock", label: "Stok" },
];

function LaporanPage() {
	const [activeAy] = useAtom(academicYearAtom);
	const [tab, setTab] = useState<Tab>("monthly");

	if (!activeAy) {
		return (
			<div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
				<AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
				<h3 className="mt-4 text-sm font-semibold text-gray-900">
					Tahun Ajaran Belum Dipilih
				</h3>
				<p className="mt-1 text-sm text-gray-500">
					Pilih tahun ajaran pada panel samping untuk melihat laporan.
				</p>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-bold text-gray-900">Laporan Koperasi</h1>
				<p className="text-sm text-gray-500">Tahun Ajaran {activeAy.name}.</p>
			</div>

			<div className="flex flex-wrap gap-2 border-b border-gray-200">
				{TABS.map((t) => (
					<button
						key={t.key}
						type="button"
						onClick={() => setTab(t.key)}
						className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px ${
							tab === t.key
								? "border-indigo-600 text-indigo-600"
								: "border-transparent text-gray-500 hover:text-gray-700"
						}`}
					>
						{t.label}
					</button>
				))}
			</div>

			{tab === "monthly" && <MonthlyTab ayId={activeAy.id} />}
			{tab === "profit-loss" && <ProfitLossTab ayId={activeAy.id} />}
			{tab === "receivables" && (
				<OutstandingTab ayId={activeAy.id} kind="receivables" />
			)}
			{tab === "payables" && (
				<OutstandingTab ayId={activeAy.id} kind="payables" />
			)}
			{tab === "stock" && <StockTab ayId={activeAy.id} />}
		</div>
	);
}

function MonthlyTab({ ayId }: { ayId: number }) {
	const now = new Date();
	const [month, setMonth] = useState(now.getMonth() + 1);
	const [year, setYear] = useState(now.getFullYear());
	const { data, isLoading, isError } = useMonthlyReport(ayId, month, year);
	const categories = data?.categories ?? [];

	return (
		<div className="space-y-4">
			<div className="flex gap-3">
				<select
					value={month}
					onChange={(e) => setMonth(Number(e.target.value))}
					className="rounded-md border-0 py-1.5 text-sm text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600"
				>
					{MONTHS.map((m, i) => (
						<option key={m} value={i + 1}>
							{m}
						</option>
					))}
				</select>
				<input
					type="number"
					value={year}
					onChange={(e) => setYear(Number(e.target.value) || year)}
					className="w-28 rounded-md border-0 py-1.5 text-sm text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600"
				/>
			</div>

			{isLoading ? (
				<p className="text-sm text-gray-500">Memuat laporan...</p>
			) : isError ? (
				<p className="text-sm text-red-600">Gagal memuat laporan.</p>
			) : categories.length === 0 ? (
				<p className="text-sm text-gray-500">
					Tidak ada transaksi kas pada {MONTHS[month - 1]} {year}.
				</p>
			) : (
				<div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
					<table className="min-w-full divide-y divide-gray-200">
						<thead className="bg-gray-50">
							<tr>
								<th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
									Kategori
								</th>
								<th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">
									Masuk
								</th>
								<th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">
									Keluar
								</th>
								<th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">
									Netto
								</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-gray-100">
							{categories.map((c) => (
								<tr key={c.category} className="hover:bg-gray-50">
									<td className="px-4 py-3 text-sm text-gray-900">
										{c.category}
									</td>
									<td className="px-4 py-3 text-sm text-emerald-600 text-right whitespace-nowrap">
										{formatCurrency(c.credit)}
									</td>
									<td className="px-4 py-3 text-sm text-rose-600 text-right whitespace-nowrap">
										{formatCurrency(c.debit)}
									</td>
									<td className="px-4 py-3 text-sm text-right font-medium text-gray-900 whitespace-nowrap">
										{formatCurrency(c.net)}
									</td>
								</tr>
							))}
						</tbody>
						<tfoot className="bg-gray-50">
							<tr>
								<td className="px-4 py-3 text-sm font-semibold text-gray-700">
									Total
								</td>
								<td className="px-4 py-3 text-sm text-right font-bold text-emerald-700 whitespace-nowrap">
									{formatCurrency(data?.total_credit ?? 0)}
								</td>
								<td className="px-4 py-3 text-sm text-right font-bold text-rose-700 whitespace-nowrap">
									{formatCurrency(data?.total_debit ?? 0)}
								</td>
								<td className="px-4 py-3 text-sm text-right font-bold text-gray-900 whitespace-nowrap">
									{formatCurrency(data?.net ?? 0)}
								</td>
							</tr>
						</tfoot>
					</table>
				</div>
			)}
		</div>
	);
}

function ProfitLossTab({ ayId }: { ayId: number }) {
	const { data, isLoading, isError } = useProfitLoss(ayId);

	if (isLoading) {
		return <p className="text-sm text-gray-500">Memuat laba-rugi...</p>;
	}
	if (isError || !data) {
		return <p className="text-sm text-red-600">Gagal memuat laba-rugi.</p>;
	}

	const rows = [
		{
			label: "Pendapatan (penjualan)",
			value: data.revenue,
			tone: "text-gray-900",
		},
		{
			label: "Harga Pokok Penjualan (HPP)",
			value: -data.cost_of_goods,
			tone: "text-rose-600",
		},
		{
			label: "Laba Kotor",
			value: data.gross_profit,
			tone: "text-gray-900 font-semibold",
		},
		{
			label: "Beban Operasional (lain-lain)",
			value: -data.operating_expense,
			tone: "text-rose-600",
		},
	];

	return (
		<div className="max-w-lg overflow-hidden rounded-lg border border-gray-200 bg-white">
			<table className="min-w-full divide-y divide-gray-100">
				<tbody className="divide-y divide-gray-100">
					{rows.map((r) => (
						<tr key={r.label}>
							<td className="px-4 py-3 text-sm text-gray-700">{r.label}</td>
							<td
								className={`px-4 py-3 text-sm text-right whitespace-nowrap ${r.tone}`}
							>
								{formatCurrency(r.value)}
							</td>
						</tr>
					))}
				</tbody>
				<tfoot className="bg-gray-50">
					<tr>
						<td className="px-4 py-3 text-sm font-bold text-gray-900">
							Laba Bersih
						</td>
						<td
							className={`px-4 py-3 text-right text-base font-bold whitespace-nowrap ${
								data.net_profit >= 0 ? "text-emerald-700" : "text-rose-700"
							}`}
						>
							{formatCurrency(data.net_profit)}
						</td>
					</tr>
				</tfoot>
			</table>
		</div>
	);
}

function OutstandingTab({
	ayId,
	kind,
}: {
	ayId: number;
	kind: "receivables" | "payables";
}) {
	const recv = useReceivables(kind === "receivables" ? ayId : undefined);
	const pay = usePayables(kind === "payables" ? ayId : undefined);
	const { data, isLoading, isError } = kind === "receivables" ? recv : pay;
	const report: OutstandingReport | undefined = data;
	const items = report?.items ?? [];
	const partyLabel = kind === "receivables" ? "Pembeli" : "Pemasok";

	if (isLoading) {
		return <p className="text-sm text-gray-500">Memuat data...</p>;
	}
	if (isError) {
		return <p className="text-sm text-red-600">Gagal memuat data.</p>;
	}
	if (items.length === 0) {
		return (
			<p className="text-sm text-gray-500">
				Tidak ada {kind === "receivables" ? "piutang" : "hutang"} yang belum
				lunas.
			</p>
		);
	}

	return (
		<div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
			<table className="min-w-full divide-y divide-gray-200">
				<thead className="bg-gray-50">
					<tr>
						<th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
							{partyLabel}
						</th>
						<th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
							Tanggal
						</th>
						<th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">
							Total
						</th>
						<th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">
							Dibayar
						</th>
						<th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">
							Sisa
						</th>
					</tr>
				</thead>
				<tbody className="divide-y divide-gray-100">
					{items.map((it) => (
						<tr key={it.id} className="hover:bg-gray-50">
							<td className="px-4 py-3 text-sm text-gray-900">{it.party}</td>
							<td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
								{formatDate(it.date)}
							</td>
							<td className="px-4 py-3 text-sm text-gray-900 text-right whitespace-nowrap">
								{formatCurrency(it.total_amount)}
							</td>
							<td className="px-4 py-3 text-sm text-emerald-600 text-right whitespace-nowrap">
								{formatCurrency(it.paid_amount)}
							</td>
							<td className="px-4 py-3 text-sm text-amber-600 text-right font-medium whitespace-nowrap">
								{formatCurrency(it.remaining)}
							</td>
						</tr>
					))}
				</tbody>
				<tfoot className="bg-gray-50">
					<tr>
						<td
							className="px-4 py-3 text-sm font-semibold text-gray-700"
							colSpan={4}
						>
							Total {kind === "receivables" ? "Piutang" : "Hutang"}
						</td>
						<td className="px-4 py-3 text-sm text-right font-bold text-gray-900 whitespace-nowrap">
							{formatCurrency(report?.total_remaining ?? 0)}
						</td>
					</tr>
				</tfoot>
			</table>
		</div>
	);
}

function StockTab({ ayId }: { ayId: number }) {
	const { data, isLoading, isError } = useStockReport(ayId);
	const items = data?.items ?? [];

	if (isLoading) {
		return <p className="text-sm text-gray-500">Memuat stok...</p>;
	}
	if (isError) {
		return <p className="text-sm text-red-600">Gagal memuat stok.</p>;
	}
	if (items.length === 0) {
		return <p className="text-sm text-gray-500">Belum ada barang.</p>;
	}

	return (
		<div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
			<table className="min-w-full divide-y divide-gray-200">
				<thead className="bg-gray-50">
					<tr>
						<th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
							Barang
						</th>
						<th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">
							Stok
						</th>
						<th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">
							Harga Modal
						</th>
						<th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">
							Nilai Persediaan
						</th>
					</tr>
				</thead>
				<tbody className="divide-y divide-gray-100">
					{items.map((it) => (
						<tr key={it.product_id} className="hover:bg-gray-50">
							<td className="px-4 py-3 text-sm text-gray-900">{it.name}</td>
							<td className="px-4 py-3 text-sm text-gray-900 text-right">
								{it.stock}
							</td>
							<td className="px-4 py-3 text-sm text-gray-600 text-right whitespace-nowrap">
								{formatCurrency(it.cost_price)}
							</td>
							<td className="px-4 py-3 text-sm text-gray-900 text-right font-medium whitespace-nowrap">
								{formatCurrency(it.stock_value)}
							</td>
						</tr>
					))}
				</tbody>
				<tfoot className="bg-gray-50">
					<tr>
						<td
							className="px-4 py-3 text-sm font-semibold text-gray-700"
							colSpan={3}
						>
							Total Nilai Persediaan
						</td>
						<td className="px-4 py-3 text-sm text-right font-bold text-gray-900 whitespace-nowrap">
							{formatCurrency(data?.total_stock_value ?? 0)}
						</td>
					</tr>
				</tfoot>
			</table>
		</div>
	);
}
