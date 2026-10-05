import { createFileRoute, Link } from "@tanstack/react-router";
import { useAtom } from "jotai";
import { ArrowLeft, HandCoins, UserCog } from "lucide-react";
import { Badge } from "#/components/ui";
import { useEmployee, useRiwayat } from "#/features/sdm/api";
import { academicYearAtom } from "#/store/global";
import { formatCurrency, formatDate } from "#/utils/format";

export const Route = createFileRoute("/_authenticated/sdm/guru/$id")({
	component: GuruDetailPage,
});

function GuruDetailPage() {
	const { id } = Route.useParams();
	const employeeId = Number(id);
	const { data: emp, isLoading, isError } = useEmployee(employeeId);
	const [activeAy] = useAtom(academicYearAtom);
	const { data: riwayat, isLoading: loadingRiwayat } = useRiwayat(
		activeAy?.id,
		employeeId,
	);

	if (isLoading) {
		return <p className="text-sm text-gray-500">Memuat karyawan...</p>;
	}
	if (isError || !emp) {
		return <p className="text-sm text-red-600">Gagal memuat karyawan.</p>;
	}

	// Hanya bulan yang punya penggajian (riwayat pembayaran).
	const riwayatRows = (riwayat?.per_bulan ?? []).filter((b) => b.ada_data);

	return (
		<div className="space-y-6">
			<Link
				to="/sdm/guru"
				className="inline-flex items-center text-sm text-gray-500 hover:text-indigo-600"
			>
				<ArrowLeft className="h-4 w-4 mr-1" /> Data Karyawan
			</Link>

			{/* Profil karyawan */}
			<div className="rounded-lg border border-gray-200 bg-white p-5">
				<div className="flex flex-wrap items-start justify-between gap-4">
					<div>
						<h1 className="text-2xl font-bold text-gray-900">{emp.nama}</h1>
						<div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-gray-500">
							<span>Masuk {formatDate(emp.tgl_masuk ?? undefined)}</span>
							<Badge variant="info">Golongan {emp.golongan?.kode ?? "-"}</Badge>
							{emp.sertifikasi && <Badge variant="warning">Sertifikasi</Badge>}
							{emp.impasing && <Badge variant="danger">Impasing</Badge>}
							{!emp.is_active && <Badge variant="secondary">Nonaktif</Badge>}
						</div>
					</div>
					<div className="flex flex-wrap gap-2">
						<Link
							to="/sdm/penggajian/olah-hr/$id"
							params={{ id: String(employeeId) }}
							className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
						>
							<UserCog className="h-4 w-4 mr-1.5" /> Olah HR
						</Link>
						<Link
							to="/sdm/pinjaman"
							search={{ employee_id: employeeId }}
							className="inline-flex items-center rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
						>
							<HandCoins className="h-4 w-4 mr-1.5" /> Pinjaman
						</Link>
					</div>
				</div>
			</div>

			{/* Riwayat penggajian */}
			<div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
				<div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
					<h2 className="text-sm font-semibold text-gray-900">
						Riwayat Penggajian
					</h2>
					{activeAy && (
						<span className="text-xs text-gray-500">TA {activeAy.name}</span>
					)}
				</div>

				{!activeAy ? (
					<p className="px-5 py-6 text-sm text-gray-500">
						Pilih Tahun Ajaran pada panel samping untuk melihat riwayat.
					</p>
				) : loadingRiwayat ? (
					<p className="px-5 py-6 text-sm text-gray-500">Memuat riwayat...</p>
				) : riwayatRows.length === 0 ? (
					<p className="px-5 py-6 text-sm text-gray-400">
						Belum ada penggajian pada Tahun Ajaran ini.
					</p>
				) : (
					<div className="overflow-x-auto">
						<table className="min-w-full divide-y divide-gray-200">
							<thead className="bg-gray-50">
								<tr>
									<th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
										Bulan
									</th>
									<th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
										Status
									</th>
									<th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase">
										Total
									</th>
									<th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase">
										Slip
									</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-gray-100">
								{riwayatRows.map((b) => (
									<tr key={b.periode} className="hover:bg-gray-50">
										<td className="px-5 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">
											{b.label}
										</td>
										<td className="px-5 py-3">
											{b.status === "finalized" ? (
												<Badge variant="success">Finalized</Badge>
											) : (
												<Badge variant="warning">Preview</Badge>
											)}
										</td>
										<td className="px-5 py-3 text-sm font-semibold text-gray-900 text-right whitespace-nowrap">
											{formatCurrency(b.total_gaji)}
										</td>
										<td className="px-5 py-3 text-right">
											<Link
												to="/sdm/penggajian/$id"
												params={{ id: String(employeeId) }}
												search={{ periode: b.periode.slice(0, 7) }}
												className="text-sm text-indigo-600 hover:text-indigo-800"
											>
												Lihat Slip
											</Link>
										</td>
									</tr>
								))}
							</tbody>
							<tfoot className="bg-gray-50 font-semibold">
								<tr>
									<td
										colSpan={2}
										className="px-5 py-3 text-right text-sm text-gray-700"
									>
										Total
									</td>
									<td className="px-5 py-3 text-sm text-gray-900 text-right whitespace-nowrap">
										{formatCurrency(riwayat?.total_gaji ?? 0)}
									</td>
									<td />
								</tr>
							</tfoot>
						</table>
					</div>
				)}
			</div>
		</div>
	);
}
