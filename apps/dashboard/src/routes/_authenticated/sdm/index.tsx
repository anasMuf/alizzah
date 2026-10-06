import { createFileRoute, Link } from "@tanstack/react-router";
import { useAtom } from "jotai";
import {
	BarChart3,
	ChevronRight,
	ClipboardCheck,
	HandCoins,
	Layers,
	Users,
	Wallet,
} from "lucide-react";
import { useSummary } from "#/features/sdm/api";
import { academicYearAtom } from "#/store/global";
import { formatCurrency } from "#/utils/format";

export const Route = createFileRoute("/_authenticated/sdm/")({
	component: SdmOverview,
});

const LINKS = [
	{
		to: "/sdm/guru",
		icon: Users,
		label: "Data Karyawan",
		desc: "Guru, golongan & lampiran HR",
	},
	{
		to: "/sdm/master",
		icon: Layers,
		label: "Master HR",
		desc: "Golongan, tarif, fungsional, dll",
	},
	{
		to: "/sdm/absen",
		icon: ClipboardCheck,
		label: "Absensi",
		desc: "Input kehadiran per bulan",
	},
	{
		to: "/sdm/pinjaman",
		icon: HandCoins,
		label: "Pinjaman",
		desc: "Pinjaman & angsuran potong gaji",
	},
	{
		to: "/sdm/penggajian",
		icon: Wallet,
		label: "Penggajian",
		desc: "Hitung gaji & slip per bulan",
	},
	{
		to: "/sdm/laporan",
		icon: BarChart3,
		label: "Rekap Gaji",
		desc: "Rekap & laporan tanda tangan",
	},
] as const;

function SdmOverview() {
	const [activeAy] = useAtom(academicYearAtom);
	const { data, isLoading, isError } = useSummary(activeAy?.id);

	const chartTitle = activeAy
		? `Total Penggajian per Bulan — Tahun Ajaran ${activeAy.name}`
		: "Total Penggajian per Bulan (tahun berjalan)";

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-bold text-gray-900">SDM / HR</h1>
				<p className="text-sm text-gray-500">
					Penggajian guru honorer — data karyawan, absensi, pinjaman, dan
					kalkulasi gaji bulanan.
				</p>
			</div>

			{isLoading ? (
				<p className="text-sm text-gray-500">Memuat ringkasan...</p>
			) : isError ? (
				<p className="text-sm text-red-600">Gagal memuat ringkasan.</p>
			) : data ? (
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
					<StatCard
						label="Karyawan Aktif"
						value={String(data.jumlah_karyawan_aktif)}
						icon={<Users className="h-5 w-5 text-indigo-600" />}
					/>
					<StatCard
						label="Golongan"
						value={String(data.jumlah_golongan)}
						icon={<Layers className="h-5 w-5 text-indigo-600" />}
					/>
					<StatCard
						label="Pinjaman Aktif"
						value={`${data.pinjaman_aktif} · ${formatCurrency(data.total_sisa_pinjaman)}`}
						icon={<HandCoins className="h-5 w-5 text-amber-600" />}
					/>
					<StatCard
						label="Total Gaji Bulan Ini"
						value={formatCurrency(data.total_gaji_bulan_ini)}
						icon={<Wallet className="h-5 w-5 text-emerald-600" />}
					/>
				</div>
			) : null}

			{data && data.per_bulan.length > 0 && (
				<div className="rounded-lg border border-gray-200 bg-white p-5">
					<h2 className="text-sm font-semibold text-gray-900 mb-4">
						{chartTitle}
					</h2>
					<MonthlyChart data={data.per_bulan} />
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

function StatCard({
	label,
	value,
	icon,
}: {
	label: string;
	value: string;
	icon: React.ReactNode;
}) {
	return (
		<div className="rounded-lg border border-gray-200 bg-white p-5">
			<div className="flex items-center gap-3">
				<div className="rounded-md bg-gray-50 p-2.5 shrink-0">{icon}</div>
				<div className="min-w-0">
					<p className="text-xs font-medium text-gray-500">{label}</p>
					<p className="text-lg font-bold text-gray-900 truncate">{value}</p>
				</div>
			</div>
		</div>
	);
}

const MONTH_NAMES = [
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

function MonthlyChart({
	data,
}: {
	data: Array<{ bulan: string; total_gaji: number }>;
}) {
	const max = Math.max(1, ...data.map((d) => d.total_gaji));
	return (
		<div className="flex items-end gap-1.5 h-40">
			{data.map((d) => {
				// bulan berformat YYYY-MM (dari summary TA) atau MM (fallback tahun).
				const mm =
					d.bulan.length === 7 ? Number(d.bulan.slice(5, 7)) : Number(d.bulan);
				const month = Number.isNaN(mm) ? 0 : Math.min(11, Math.max(0, mm - 1));
				const h = Math.max(2, Math.round((d.total_gaji / max) * 100));
				return (
					<div
						key={d.bulan}
						className="flex-1 flex flex-col items-center gap-1 min-w-0"
						title={`${MONTH_NAMES[month]}: ${formatCurrency(d.total_gaji)}`}
					>
						<span className="text-[10px] text-gray-500 truncate">
							{d.total_gaji > 0 ? formatCurrency(d.total_gaji) : ""}
						</span>
						<div
							className={`w-full rounded-t ${
								d.total_gaji > 0 ? "bg-indigo-500" : "bg-gray-100"
							}`}
							style={{ height: `${h}%` }}
						/>
						<span className="text-[10px] text-gray-500">
							{MONTH_NAMES[month]}
						</span>
					</div>
				);
			})}
		</div>
	);
}
