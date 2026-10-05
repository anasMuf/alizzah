import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, FileDown, Printer } from "lucide-react";
import { useState } from "react";
import { currentPeriode, useGolongans, useSlip } from "#/features/sdm/api";
import { SlipDetailView } from "#/features/sdm/components/SlipDetailView";

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
	const { data: golongans = [] } = useGolongans();

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
					onClick={async () => {
						const { downloadSlipPdf } = await import(
							"#/features/sdm/lib/slipPdf"
						);
						const golonganKeterangan =
							golongans.find((g) => g.kode === slip.golongan_kode)
								?.keterangan ?? "";
						downloadSlipPdf(slip, periodeState, { golonganKeterangan });
					}}
					className="inline-flex items-center rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
				>
					<FileDown className="h-4 w-4 mr-1.5" /> Download PDF
				</button>
				<button
					type="button"
					onClick={() => window.print()}
					className="inline-flex items-center rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
				>
					<Printer className="h-4 w-4 mr-1.5" /> Cetak
				</button>
			</div>

			<SlipDetailView slip={slip} periode={periodeState} />
		</div>
	);
}
