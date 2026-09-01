import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Printer } from "lucide-react";
import { useState } from "react";
import { Badge } from "#/components/ui";
import { currentPeriode, formatPeriode, useSlip } from "#/features/sdm/api";
import { formatCurrency } from "#/utils/format";

export const Route = createFileRoute("/_authenticated/sdm/penggajian/$id")({
	component: SlipPage,
	validateSearch: (search: Record<string, unknown>) => ({
		periode: (search.periode as string) || currentPeriode(),
	}),
});

function SlipPage() {
	const { id } = Route.useParams();
	const { periode } = Route.useSearch();
	const employeeId = Number(id);
	const [periodeState] = useState(periode);
	const { data: slip, isLoading, isError } = useSlip(periodeState, employeeId);

	if (isLoading) {
		return <p className="text-sm text-gray-500">Menghitung slip...</p>;
	}
	if (isError || !slip) {
		return (
			<p className="text-sm text-red-600">
				Gagal memuat slip — pastikan karyawan punya absensi pada periode ini.
			</p>
		);
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<Link
					to="/sdm/penggajian"
					className="inline-flex items-center text-sm text-gray-500 hover:text-indigo-600"
				>
					<ArrowLeft className="h-4 w-4 mr-1" /> Penggajian
				</Link>
				<button
					type="button"
					onClick={() => window.print()}
					className="inline-flex items-center rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
				>
					<Printer className="h-4 w-4 mr-1.5" /> Cetak
				</button>
			</div>

			<div className="rounded-lg border border-gray-200 bg-white p-6 print:border-0 print:p-0">
				<div className="text-center border-b border-gray-200 pb-4 print:border-gray-300">
					<h1 className="text-xl font-bold text-gray-900">
						Slip Gaji {formatPeriode(periodeState)}
					</h1>
					<p className="text-sm text-gray-500">Yayasan Al-Izzah — TK/PAUD</p>
				</div>

				<div className="mt-4 flex flex-wrap items-center justify-between gap-3">
					<div>
						<p className="text-sm font-semibold text-gray-900">{slip.nama}</p>
						<p className="text-sm text-gray-500">
							Golongan {slip.golongan_kode}
						</p>
					</div>
					<div className="flex gap-2">
						{slip.sertifikasi && (
							<Badge variant="warning">Sertifikasi (50%)</Badge>
						)}
						{slip.impasing && <Badge variant="danger">Impasing (100%)</Badge>}
					</div>
				</div>

				<div className="mt-5 grid gap-6 lg:grid-cols-2">
					<div className="space-y-4">
						<Block title="HR Pokok & Absensi">
							<Row
								label={`Gaji Pokok (Gol. ${slip.golongan_kode})`}
								value={slip.hr_pokok}
							/>
							<Row
								label={`Kehadiran (${slip.jumlah_hadir} hari × ${formatCurrency(slip.kehadiran / Math.max(1, slip.jumlah_hadir))})`}
								value={slip.kehadiran}
								hideZero
							/>
							<Row
								label={`Hadir Siaga (${slip.jumlah_siaga} hari)`}
								value={slip.siaga}
								hideZero
							/>
							<Row
								label={`Hadir Piket (${slip.jumlah_piket} hari)`}
								value={slip.piket}
								hideZero
							/>
							<Row
								label="Bonus Tidak Terlambat"
								value={slip.bonus_terlambat}
								hideZero
							/>
							<Row
								label="Bonus Tidak Pulang Awal"
								value={slip.bonus_pulang_awal}
								hideZero
							/>
						</Block>
						<Block title="Fungsional">
							{slip.rincian_fungsional.length === 0 ? (
								<Row label="-" value={0} muted />
							) : (
								<>
									{slip.rincian_fungsional.map((r) => (
										<Row key={r.nama} label={r.nama} value={r.nominal} />
									))}
									<Row
										label="Subtotal Fungsional"
										value={slip.subtotal_f}
										strong
									/>
								</>
							)}
						</Block>
						<Block title="Tugas Tambahan">
							{slip.rincian_tugas_tambahan.length === 0 ? (
								<Row label="-" value={0} muted />
							) : (
								<>
									{slip.rincian_tugas_tambahan.map((r) => (
										<Row key={r.nama} label={r.nama} value={r.nominal} />
									))}
									<Row
										label="Subtotal Tugas Tambahan"
										value={slip.subtotal_t}
										strong
									/>
								</>
							)}
						</Block>
					</div>

					<div className="space-y-4">
						<Block title="Penanggung Jawab">
							{slip.rincian_penanggung_jawab.length === 0 ? (
								<Row label="-" value={0} muted />
							) : (
								<>
									{slip.rincian_penanggung_jawab.map((r) => (
										<Row key={r.nama} label={r.nama} value={r.nominal} />
									))}
									<Row
										label="Subtotal Penanggung Jawab"
										value={slip.subtotal_p}
										strong
									/>
								</>
							)}
						</Block>
						<Block title="Lain-lain">
							{slip.rincian_lainlain.length === 0 ? (
								<Row label="-" value={0} muted />
							) : (
								<>
									{slip.rincian_lainlain.map((r) => (
										<Row key={r.nama} label={r.nama} value={r.nominal} />
									))}
									<Row
										label="Subtotal Lain-lain"
										value={slip.subtotal_l}
										strong
									/>
								</>
							)}
						</Block>
						<Block title="Potongan">
							<Row label="Angsuran Pinjaman" value={-slip.angsuran} danger />
						</Block>
					</div>
				</div>

				<div className="mt-6 rounded-lg bg-gray-50 p-4 flex items-center justify-between">
					<span className="text-sm font-semibold text-gray-700">
						Total Gaji
					</span>
					<span className="text-2xl font-bold text-gray-900">
						{formatCurrency(slip.total_gaji)}
					</span>
				</div>

				<div className="mt-8 grid grid-cols-2 gap-8 text-center text-sm text-gray-600">
					<div>
						<p>Diketahui,</p>
						<p className="mt-10">Kepala Sekolah</p>
					</div>
					<div>
						<p>Diterima oleh,</p>
						<p className="mt-10 font-semibold text-gray-900">{slip.nama}</p>
					</div>
				</div>
			</div>
		</div>
	);
}

function Block({
	title,
	children,
}: {
	title: string;
	children: React.ReactNode;
}) {
	return (
		<div className="rounded-lg border border-gray-100">
			<p className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase border-b border-gray-100">
				{title}
			</p>
			<div className="divide-y divide-gray-50">{children}</div>
		</div>
	);
}

function Row({
	label,
	value,
	hideZero = false,
	strong = false,
	danger = false,
	muted = false,
}: {
	label: string;
	value: number;
	hideZero?: boolean;
	strong?: boolean;
	danger?: boolean;
	muted?: boolean;
}) {
	if (hideZero && value === 0) return null;
	return (
		<div className="flex items-center justify-between px-4 py-2">
			<span className={`text-sm ${muted ? "text-gray-400" : "text-gray-600"}`}>
				{label}
			</span>
			<span
				className={`text-sm ${
					danger
						? "text-red-600 font-medium"
						: strong
							? "text-gray-900 font-bold"
							: "text-gray-900"
				}`}
			>
				{formatCurrency(value)}
			</span>
		</div>
	);
}
