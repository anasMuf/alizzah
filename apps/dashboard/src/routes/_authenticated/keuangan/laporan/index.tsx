import { createFileRoute, Link } from "@tanstack/react-router";
import {
	ArrowRight,
	BarChart3,
	Receipt,
	TrendingDown,
	Wallet,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/keuangan/laporan/")({
	component: LaporanHubPage,
});

const REPORT_CARDS = [
	{
		title: "Pemasukan",
		description:
			"Transaksi pemasukan per tanggal dengan filter fee item, metode bayar, dan rentang tanggal.",
		icon: TrendingDown,
		to: "/keuangan/laporan/pemasukan",
		color: "text-green-600",
		bg: "bg-green-50",
	},
	{
		title: "Pengeluaran",
		description:
			"Transaksi pengeluaran per tanggal dengan filter fee item, kategori pengeluaran, dan rentang tanggal.",
		icon: Receipt,
		to: "/keuangan/laporan/pengeluaran",
		color: "text-red-600",
		bg: "bg-red-50",
	},
	{
		title: "Saldo",
		description:
			"Saldo berjalan per pos penerimaan dengan multi-select pos dan tahun ajaran.",
		icon: BarChart3,
		to: "/keuangan/laporan/saldo",
		color: "text-cyan-600",
		bg: "bg-cyan-50",
	},
	{
		title: "Posisi Kas",
		description: "Posisi kas per kategori dengan rincian pengeluaran per pos.",
		icon: Wallet,
		to: "/keuangan/laporan/posisi-kas",
		color: "text-teal-600",
		bg: "bg-teal-50",
	},
];

function LaporanHubPage() {
	return (
		<div className="space-y-6">
			<div>
				<h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:tracking-tight">
					Laporan Keuangan
				</h2>
				<p className="mt-1 text-sm text-gray-500">
					Pilih jenis laporan yang ingin ditampilkan.
				</p>
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
				{REPORT_CARDS.map((card) => {
					const Icon = card.icon;
					return (
						<Link
							key={card.to}
							to={card.to}
							className="group bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 p-6 hover:shadow-md hover:ring-gray-900/10 transition-all"
						>
							<div className="flex items-start gap-4">
								<div
									className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${card.bg}`}
								>
									<Icon className={`h-5 w-5 ${card.color}`} />
								</div>
								<div className="min-w-0 flex-1">
									<h3 className="text-sm font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">
										{card.title}
									</h3>
									<p className="mt-1 text-sm text-gray-500 line-clamp-2">
										{card.description}
									</p>
								</div>
							</div>
							<div className="mt-4 flex items-center text-sm font-medium text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity">
								Buka
								<ArrowRight className="ml-1 h-4 w-4" />
							</div>
						</Link>
					);
				})}
			</div>
		</div>
	);
}
