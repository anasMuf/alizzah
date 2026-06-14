import { createFileRoute } from "@tanstack/react-router";
import { useAtom } from "jotai";
import { AlertCircle, Landmark } from "lucide-react";
import { EmptyState } from "#/components/ui";
import { academicYearAtom } from "#/store/global";
import { formatCurrency, formatDate } from "#/utils/format";
import { useCapitalInjections } from "../../../features/koperasi/modal/api";

export const Route = createFileRoute("/_authenticated/koperasi/modal")({
	component: ModalPage,
});

function ModalPage() {
	const [activeAy] = useAtom(academicYearAtom);
	const {
		data: items = [],
		isLoading,
		isError,
	} = useCapitalInjections(activeAy?.id);

	const total = items.reduce((sum, it) => sum + it.amount, 0);

	if (!activeAy) {
		return (
			<div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
				<AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
				<h3 className="mt-4 text-sm font-semibold text-gray-900">
					Tahun Ajaran Belum Dipilih
				</h3>
				<p className="mt-1 text-sm text-gray-500">
					Pilih tahun ajaran pada panel samping untuk melihat penyaluran modal.
				</p>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-bold text-gray-900">Modal Koperasi</h1>
				<p className="text-sm text-gray-500">
					Riwayat penyaluran modal dari keuangan sekolah — Tahun Ajaran{" "}
					{activeAy.name}. Penyaluran dilakukan oleh admin keuangan.
				</p>
			</div>

			{isLoading ? (
				<p className="text-sm text-gray-500">Memuat data modal...</p>
			) : isError ? (
				<p className="text-sm text-red-600">Gagal memuat penyaluran modal.</p>
			) : items.length === 0 ? (
				<EmptyState
					icon={<Landmark className="h-10 w-10 text-gray-400" />}
					title="Belum ada penyaluran modal"
					description="Modal koperasi disalurkan oleh admin keuangan melalui menu Keuangan."
				/>
			) : (
				<div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
					<table className="min-w-full divide-y divide-gray-200">
						<thead className="bg-gray-50">
							<tr>
								<th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
									Tanggal
								</th>
								<th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
									Catatan
								</th>
								<th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
									Oleh
								</th>
								<th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">
									Nominal
								</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-gray-100">
							{items.map((it) => (
								<tr key={it.id} className="hover:bg-gray-50">
									<td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
										{formatDate(it.injection_date)}
									</td>
									<td className="px-4 py-3 text-sm text-gray-900">
										{it.notes || "-"}
									</td>
									<td className="px-4 py-3 text-sm text-gray-600">
										{it.created_by || "-"}
									</td>
									<td className="px-4 py-3 text-sm text-right font-medium text-emerald-600 whitespace-nowrap">
										+{formatCurrency(it.amount)}
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
									Total Modal Tersalurkan
								</td>
								<td className="px-4 py-3 text-sm text-right font-bold text-gray-900 whitespace-nowrap">
									{formatCurrency(total)}
								</td>
							</tr>
						</tfoot>
					</table>
				</div>
			)}
		</div>
	);
}
