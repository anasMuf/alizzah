import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, HandCoins, UserCog, Wallet } from "lucide-react";
import { Badge } from "#/components/ui";
import { currentPeriode, useEmployee } from "#/features/sdm/api";
import { formatDate } from "#/utils/format";

export const Route = createFileRoute("/_authenticated/sdm/guru/$id")({
	component: GuruDetailPage,
});

function GuruDetailPage() {
	const { id } = Route.useParams();
	const employeeId = Number(id);
	const { data: emp, isLoading, isError } = useEmployee(employeeId);

	if (isLoading) {
		return <p className="text-sm text-gray-500">Memuat karyawan...</p>;
	}
	if (isError || !emp) {
		return <p className="text-sm text-red-600">Gagal memuat karyawan.</p>;
	}

	return (
		<div className="space-y-6">
			<Link
				to="/sdm/guru"
				className="inline-flex items-center text-sm text-gray-500 hover:text-indigo-600"
			>
				<ArrowLeft className="h-4 w-4 mr-1" /> Data Karyawan
			</Link>

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
							to="/sdm/penggajian/$id"
							params={{ id: String(employeeId) }}
							search={{ periode: currentPeriode() }}
							className="inline-flex items-center rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
						>
							<Wallet className="h-4 w-4 mr-1.5" /> Slip Gaji
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

			<p className="text-sm text-gray-500">
				Item HR (Fungsional, Tugas Tambahan, Penanggung Jawab, Lain-lain) kini
				dikelola di halaman{" "}
				<Link
					to="/sdm/penggajian/olah-hr/$id"
					params={{ id: String(employeeId) }}
					className="text-indigo-600 hover:text-indigo-800"
				>
					Olah HR (Penggajian)
				</Link>
				.
			</p>
		</div>
	);
}
