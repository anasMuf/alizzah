import { createFileRoute, Link } from "@tanstack/react-router";
import { useAtom } from "jotai";
import { ChevronRight, ScanSearch } from "lucide-react";
import { useState } from "react";
import { useGetDailyClosingPreview } from "#/api/custom/daily-closing-preview";
import { useGetV1CashTransactions } from "#/api/endpoints/cash/cash";
import { Badge } from "#/components/ui";
import { academicYearAtom } from "#/store/global";
import { formatCurrency, formatDate } from "#/utils/format";

export const Route = createFileRoute(
	"/_authenticated/keuangan/kas/audit-harian",
)({
	component: AuditKasHarianPage,
});

function getTodayString() {
	const now = new Date();
	const y = now.getFullYear();
	const m = String(now.getMonth() + 1).padStart(2, "0");
	const d = String(now.getDate()).padStart(2, "0");
	return `${y}-${m}-${d}`;
}

const SOURCE_LABELS: Record<string, string> = {
	payment: "Pembayaran siswa",
	income: "Pemasukan lain",
	expense: "Beban / Pengeluaran",
	transfer_to_vault: "Transfer kas ↔ brangkas",
};

function AuditKasHarianPage() {
	const [activeAy] = useAtom(academicYearAtom);
	const today = getTodayString();
	const [selectedDate, setSelectedDate] = useState<string>(today);

	const { data: preview, isLoading: previewLoading } =
		useGetDailyClosingPreview(
			activeAy?.id,
			selectedDate,
			!!activeAy?.id && !!selectedDate,
		);

	const { data: txData, isLoading: txLoading } = useGetV1CashTransactions(
		{
			academic_year_id: activeAy?.id,
			start_date: selectedDate,
			end_date: selectedDate,
			limit: 500,
		},
		{ query: { enabled: !!activeAy?.id && !!selectedDate } },
	);

	const txns: any[] = (txData?.data as any)?.data || [];
	const meta: any = (txData?.data as any)?.meta || {};
	// Konvensi ledger: transaction_type 'debit' = uang MASUK, 'credit' = uang KELUAR.
	const totalIn = Number(meta.total_credit || 0);
	const totalOut = Number(meta.total_debit || 0);

	const openingBalance = Number(preview?.opening_balance || 0);
	const dayCashIn = Number(preview?.day_cash_in || 0);
	const dayCashOut = Number(preview?.day_cash_out || 0);
	const ledgerCash = Number(preview?.ledger_cash_amount || 0);
	const workaroundAdj = Number(preview?.workaround_adjustment || 0);
	const systemCash = Number(preview?.system_cash_amount || 0);

	return (
		<div className="space-y-6">
			{/* Header */}
			<div>
				<nav className="flex items-center text-sm text-gray-500 mb-2">
					<Link
						to="/keuangan/kas"
						className="hover:text-indigo-600 transition-colors"
					>
						Kas & Berangkas
					</Link>
					<ChevronRight className="w-4 h-4 mx-1" />
					<span className="text-gray-900 font-medium">Audit Kas Harian</span>
				</nav>
				<h2 className="text-2xl font-bold leading-7 text-gray-900 flex items-center">
					<ScanSearch className="w-6 h-6 mr-2 text-gray-400" />
					Audit Kas Harian
				</h2>
				<p className="mt-1 text-sm text-gray-500">
					Telusuri setiap transaksi kas pada satu tanggal — cocokkan uang
					tercatat dengan uang yang benar-benar dipegang.
				</p>
			</div>

			{/* Date picker */}
			<div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 p-6">
				<label
					htmlFor="audit-date"
					className="block text-sm font-medium text-gray-700 mb-1"
				>
					Tanggal
				</label>
				<input
					id="audit-date"
					type="date"
					max={today}
					value={selectedDate}
					onChange={(e) => setSelectedDate(e.target.value)}
					className="block w-full max-w-xs rounded-md border-0 py-2.5 px-4 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm"
				/>
				<p className="mt-2 text-xs text-gray-500">{formatDate(selectedDate)}</p>
			</div>

			{/* Rekonsiliasi ringkas */}
			<div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 p-6">
				<h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
					Rekonsiliasi Kas — {formatDate(selectedDate)}
				</h3>
				{previewLoading ? (
					<div className="animate-pulse h-28 bg-gray-100 rounded" />
				) : (
					<div className="space-y-2">
						<Row label="Saldo Kas Awal (s/d H-1)" value={openingBalance} />
						<Row
							label="+ Uang Masuk (tanggal ini)"
							value={dayCashIn}
							tone="in"
						/>
						<Row
							label="− Uang Keluar (tanggal ini)"
							value={dayCashOut}
							tone="out"
						/>
						<Row
							label="= Saldo Kas Ledger (mentah)"
							value={ledgerCash}
							divider
						/>
						<Row
							label='− Koreksi "tarik lalu bayar tunai"'
							value={workaroundAdj}
							tone="warn"
						/>
						<Row
							label="= Kas Sistem (perkiraan tunai fisik)"
							value={systemCash}
							divider
							bold
						/>
						{workaroundAdj > 0 && (
							<p className="text-xs text-gray-500 pt-1">
								Koreksi = penarikan tabungan yang dipakai membayar tunai (uang
								tabungan, bukan uang tunai baru masuk laci).
							</p>
						)}
					</div>
				)}
			</div>

			{/* Rincian transaksi kas */}
			<div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 overflow-hidden">
				<div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
					<h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
						Rincian Transaksi Kas ({txns.length})
					</h3>
					<div className="flex gap-4 text-sm">
						<span className="text-green-600 font-medium">
							Masuk {formatCurrency(totalIn)}
						</span>
						<span className="text-red-600 font-medium">
							Keluar {formatCurrency(totalOut)}
						</span>
					</div>
				</div>

				{txLoading ? (
					<div className="p-6 animate-pulse space-y-2">
						<div className="h-6 bg-gray-100 rounded" />
						<div className="h-6 bg-gray-100 rounded" />
						<div className="h-6 bg-gray-100 rounded" />
					</div>
				) : txns.length === 0 ? (
					<div className="p-10 text-center text-sm text-gray-500">
						Tidak ada transaksi kas pada tanggal ini.
					</div>
				) : (
					<div className="overflow-x-auto">
						<table className="min-w-full divide-y divide-gray-100">
							<thead className="bg-gray-50">
								<tr>
									<th className="px-6 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">
										Jenis
									</th>
									<th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">
										Sumber
									</th>
									<th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">
										Keterangan
									</th>
									<th className="px-6 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase">
										Nominal
									</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-gray-50">
								{txns.map((t) => {
									const isIn = t.transaction_type === "debit";
									return (
										<tr key={t.id} className="hover:bg-gray-50">
											<td className="px-6 py-2.5 whitespace-nowrap">
												{isIn ? (
													<Badge variant="success">Masuk</Badge>
												) : (
													<Badge variant="danger">Keluar</Badge>
												)}
											</td>
											<td className="px-3 py-2.5 text-sm text-gray-700 whitespace-nowrap">
												{SOURCE_LABELS[t.source_type] || t.source_type}
											</td>
											<td className="px-3 py-2.5 text-sm text-gray-600">
												{t.description}
											</td>
											<td
												className={`px-6 py-2.5 text-right text-sm font-semibold tabular-nums whitespace-nowrap ${isIn ? "text-green-600" : "text-red-600"}`}
											>
												{isIn ? "+" : "−"}
												{formatCurrency(Number(t.amount))}
											</td>
										</tr>
									);
								})}
							</tbody>
							<tfoot className="bg-gray-50 border-t-2 border-gray-200">
								<tr>
									<td
										colSpan={3}
										className="px-6 py-3 text-right text-sm font-semibold text-gray-700"
									>
										Selisih (Masuk − Keluar)
									</td>
									<td className="px-6 py-3 text-right text-sm font-bold tabular-nums text-gray-900">
										{formatCurrency(totalIn - totalOut)}
									</td>
								</tr>
							</tfoot>
						</table>
					</div>
				)}
			</div>

			<div className="flex justify-end">
				<Link
					to="/keuangan/kas/tutup-buku"
					className="inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-500"
				>
					Ke Tutup Buku Harian
				</Link>
			</div>
		</div>
	);
}

function Row({
	label,
	value,
	tone,
	divider,
	bold,
}: {
	label: string;
	value: number;
	tone?: "in" | "out" | "warn";
	divider?: boolean;
	bold?: boolean;
}) {
	const color =
		tone === "in"
			? "text-green-600"
			: tone === "out"
				? "text-red-600"
				: tone === "warn"
					? "text-amber-700"
					: "text-gray-900";
	return (
		<div
			className={`flex justify-between items-center py-2 ${divider ? "border-t border-gray-200 pt-3" : ""}`}
		>
			<span
				className={`text-sm ${bold ? "font-semibold text-gray-900" : color}`}
			>
				{label}
			</span>
			<span
				className={`tabular-nums ${bold ? "text-base font-bold text-gray-900" : `text-sm font-semibold ${color}`}`}
			>
				{formatCurrency(value)}
			</span>
		</div>
	);
}
