import { createFileRoute, Link } from "@tanstack/react-router";
import { useAtom } from "jotai";
import {
	ChevronRight,
	Landmark,
	Package,
	ReceiptText,
	Truck,
	Users,
	Wallet,
} from "lucide-react";
import { academicYearAtom } from "#/store/global";
import { formatCurrency } from "#/utils/format";
import { useKasBalance } from "../../../features/koperasi/kas/api";

export const Route = createFileRoute("/_authenticated/koperasi/")({
	component: KoperasiOverview,
});

const LINKS = [
	{
		to: "/koperasi/anggota",
		icon: Users,
		label: "Anggota",
		desc: "Peserta simpan-pinjam",
	},
	{
		to: "/koperasi/barang",
		icon: Package,
		label: "Barang",
		desc: "Barang dagangan & stok",
	},
	{
		to: "/koperasi/pemasok",
		icon: Truck,
		label: "Pemasok",
		desc: "Pemasok pembelian",
	},
	{
		to: "/koperasi/kas",
		icon: ReceiptText,
		label: "Kas",
		desc: "Saldo & jurnal arus kas",
	},
	{
		to: "/koperasi/modal",
		icon: Landmark,
		label: "Modal",
		desc: "Riwayat penyaluran modal",
	},
] as const;

function KoperasiOverview() {
	const [activeAy] = useAtom(academicYearAtom);
	const { data: balance } = useKasBalance(activeAy?.id);

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-bold text-gray-900">Koperasi</h1>
				<p className="text-sm text-gray-500">
					{activeAy
						? `Ringkasan unit usaha koperasi — Tahun Ajaran ${activeAy.name}.`
						: "Pilih tahun ajaran pada panel samping untuk melihat saldo."}
				</p>
			</div>

			{activeAy && (
				<div className="overflow-hidden rounded-lg bg-white shadow ring-1 ring-gray-900/5 max-w-sm">
					<div className="p-5 flex items-center">
						<div className="rounded-md bg-emerald-50 p-3 shrink-0">
							<Wallet className="h-6 w-6 text-emerald-600" />
						</div>
						<div className="ml-5">
							<dt className="text-sm font-medium text-gray-500">
								Saldo Kas Koperasi
							</dt>
							<dd className="text-2xl font-bold text-gray-900">
								{formatCurrency(Number(balance?.balance ?? 0))}
							</dd>
						</div>
					</div>
					<div className="bg-gray-50 px-5 py-3">
						<Link
							to="/koperasi/kas"
							className="text-sm font-medium text-indigo-700 hover:text-indigo-900 flex items-center"
						>
							Lihat jurnal kas <ChevronRight className="h-4 w-4 ml-1" />
						</Link>
					</div>
				</div>
			)}

			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{LINKS.map(({ to, icon: Icon, label, desc }) => (
					<Link
						key={to}
						to={to}
						className="group flex items-center gap-4 rounded-lg border border-gray-200 bg-white p-4 hover:border-indigo-300 hover:shadow-sm"
					>
						<div className="rounded-md bg-indigo-50 p-3 shrink-0">
							<Icon className="h-5 w-5 text-indigo-600" />
						</div>
						<div className="min-w-0">
							<p className="text-sm font-semibold text-gray-900">{label}</p>
							<p className="text-sm text-gray-500 truncate">{desc}</p>
						</div>
						<ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-indigo-500 ml-auto" />
					</Link>
				))}
			</div>
		</div>
	);
}
