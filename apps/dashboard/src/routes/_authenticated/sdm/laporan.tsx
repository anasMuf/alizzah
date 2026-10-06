import { createFileRoute, Link } from "@tanstack/react-router";
import { useAtom } from "jotai";
import { AlertCircle, BarChart3, Printer } from "lucide-react";
import { Badge } from "#/components/ui";
import { useRekap } from "#/features/sdm/api";
import { academicYearAtom } from "#/store/global";
import { formatCurrency } from "#/utils/format";

export const Route = createFileRoute("/_authenticated/sdm/laporan")({
	component: RekapPage,
});

function RekapPage() {
	const [activeAy] = useAtom(academicYearAtom);
	const { data: rekap, isLoading, isError } = useRekap(activeAy?.id);

	if (!activeAy) {
		return (
			<div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
				<AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
				<h3 className="mt-4 text-sm font-semibold text-gray-900">
					Tahun Ajaran Belum Dipilih
				</h3>
				<p className="mt-1 text-sm text-gray-500">
					Pilih tahun ajaran pada panel samping untuk melihat rekap gaji.
				</p>
			</div>
		);
	}

	const perBulan = rekap?.per_bulan ?? [];
	const finalCount = perBulan.filter((b) => b.status === "finalized").length;

	return (
		<div className="space-y-6">
			<div className="flex flex-wrap items-center justify-between gap-4">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">Rekap Gaji</h1>
					<p className="text-sm text-gray-500">
						Rekap penggajian Tahun Ajaran{" "}
						{rekap?.academic_year_name ?? activeAy.name} · dibayar tgl 5 tiap
						bulan.
					</p>
				</div>
				<button
					type="button"
					onClick={() => window.print()}
					className="inline-flex items-center rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 print:hidden"
				>
					<Printer className="h-4 w-4 mr-1.5" /> Cetak
				</button>
			</div>

			{isLoading ? (
				<p className="text-sm text-gray-500">Memuat rekap...</p>
			) : isError ? (
				<p className="text-sm text-red-600">Gagal memuat rekap.</p>
			) : perBulan.length === 0 ? (
				<EmptyRekap />
			) : (
				<>
					<div className="flex items-center justify-between rounded-lg bg-indigo-50 px-5 py-3">
						<span className="text-sm font-medium text-indigo-900">
							Total Penggajian {rekap?.academic_year_name}
						</span>
						<span className="text-lg font-bold text-indigo-900">
							{formatCurrency(rekap?.total_gaji ?? 0)}
						</span>
					</div>

					{finalCount < perBulan.length && (
						<p className="text-xs text-gray-500">
							{finalCount} dari {perBulan.length} bulan sudah difinalisasi —
							bulan preview belum terkunci dan dapat berubah.
						</p>
					)}

					<div className="overflow-x-auto rounded-lg border border-gray-200 bg-white print:border-0">
						<div className="px-6 py-4 text-center border-b border-gray-200 print:border-gray-300">
							<h2 className="text-lg font-bold text-gray-900">
								Rekap Gaji — Tahun Ajaran {rekap?.academic_year_name}
							</h2>
							<p className="text-sm text-gray-500">
								Yayasan Al-Izzah — TK/PAUD
							</p>
						</div>

						<table className="min-w-full divide-y divide-gray-200 text-sm">
							<thead className="bg-gray-50">
								<tr>
									<th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
										Bulan
									</th>
									<th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
										Status
									</th>
									<th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">
										Karyawan
									</th>
									<th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">
										Total Gaji
									</th>
									<th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">
										Detail
									</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-gray-100">
								{perBulan.map((b) => (
									<tr key={b.periode} className="hover:bg-gray-50">
										<td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">
											{b.label}
										</td>
										<td className="px-4 py-3">
											{b.status === "finalized" ? (
												<Badge variant="success">Finalized</Badge>
											) : (
												<Badge variant="warning">Preview</Badge>
											)}
										</td>
										<td className="px-4 py-3 text-right text-gray-600">
											{b.jumlah_karyawan}
										</td>
										<td className="px-4 py-3 text-right font-semibold text-gray-900 whitespace-nowrap">
											{formatCurrency(b.total_gaji)}
										</td>
										<td className="px-4 py-3 text-right">
											<Link
												to="/sdm/penggajian"
												search={{ periode: b.periode.slice(0, 7) }}
												className="text-indigo-600 hover:text-indigo-800"
											>
												Lihat
											</Link>
										</td>
									</tr>
								))}
							</tbody>
							<tfoot className="bg-gray-50 font-semibold">
								<tr>
									<td
										colSpan={3}
										className="px-4 py-3 text-right text-gray-700"
									>
										Total
									</td>
									<td className="px-4 py-3 text-right text-gray-900 whitespace-nowrap">
										{formatCurrency(rekap?.total_gaji ?? 0)}
									</td>
									<td />
								</tr>
							</tfoot>
						</table>

						<div className="grid grid-cols-2 gap-8 px-6 py-6 text-sm text-gray-600 print:mt-8">
							<div>
								<p>Mojokerto, ...</p>
								<p className="mt-14">Kepala Sekolah</p>
							</div>
							<div className="text-right">
								<p>Mengetahui,</p>
								<p className="mt-14">Bendahara</p>
							</div>
						</div>
					</div>
				</>
			)}
		</div>
	);
}

function EmptyRekap() {
	return (
		<div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
			<BarChart3 className="mx-auto h-12 w-12 text-gray-400" />
			<h3 className="mt-4 text-sm font-semibold text-gray-900">
				Belum ada data
			</h3>
			<p className="mt-1 text-sm text-gray-500">
				Input absensi & finalisasi penggajian untuk melihat rekap.
			</p>
		</div>
	);
}
