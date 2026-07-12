import { createFileRoute, Link } from "@tanstack/react-router";
import { useAtom } from "jotai";
import { ChevronRight } from "lucide-react";
import { useGetV1StudentsIdInvoices } from "#/api/endpoints/invoices/invoices";
import { useGetV1StudentsId } from "#/api/endpoints/students/students";
import { Badge, Button } from "#/components/ui";
import { academicYearAtom } from "../../../../store/global";
import { formatCurrency } from "../../../../utils/format";

export const Route = createFileRoute(
	"/_authenticated/keuangan/tagihan/siswa/$id",
)({
	component: TagihanSiswaPage,
});

function TagihanSiswaPage() {
	const { id } = Route.useParams();
	const [activeAy] = useAtom(academicYearAtom);

	const { data: studentResp, isLoading: isStudentLoading } = useGetV1StudentsId(
		Number(id),
	);
	const student = (studentResp?.data as any)?.data;

	const { data: invoicesResp, isLoading: isInvoicesLoading } =
		useGetV1StudentsIdInvoices(
			Number(id),
			{
				academic_year_id: activeAy?.id,
			},
			{ query: { enabled: !!activeAy?.id && !!id } },
		);
	const invoices = (invoicesResp?.data as any)?.data || [];

	const getStatusBadge = (status: string, sisa: number) => {
		if (status === "paid") return <Badge variant="success">● Lunas</Badge>;
		if (status === "partial")
			return (
				<Badge variant="warning">
					⚠ Sebagian (Sisa {formatCurrency(sisa)})
				</Badge>
			);
		return <Badge variant="danger">✗ Belum</Badge>;
	};

	const translateType = (type: string) => {
		const map: Record<string, string> = {
			monthly: "Bulanan",
			registration: "Registrasi Tahunan",
			initial: "Biaya Awal",
			daycare_initial: "Biaya Awal Daycare",
			incidental: "Insidental",
		};
		return map[type] || type;
	};

	if (isStudentLoading)
		return (
			<div className="p-8 text-center text-gray-500">
				Memuat profil siswa...
			</div>
		);
	if (!student)
		return (
			<div className="p-8 text-center text-red-500">Siswa tidak ditemukan.</div>
		);

	return (
		<div className="space-y-6 max-w-7xl mx-auto pb-12">
			{/* Breadcrumb */}
			<nav className="flex" aria-label="Breadcrumb">
				<ol className="flex items-center space-x-2 text-sm text-gray-500">
					<li>
						<Link to="/keuangan/tagihan" className="hover:text-gray-900">
							Tagihan
						</Link>
					</li>
					<li>
						<ChevronRight className="h-4 w-4" />
					</li>
					<li className="font-medium text-gray-900">{student.full_name}</li>
				</ol>
			</nav>

			<div className="border-b border-gray-200 pb-5 sm:flex sm:items-center sm:justify-between">
				<div>
					<h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:tracking-tight flex items-center">
						Tagihan Siswa: {student.full_name}
					</h2>
					<p className="mt-1 text-sm text-gray-500">
						{student.nisn ? `NISN: ${student.nisn}` : "Belum ada NISN"} &bull;{" "}
						{student.active_enrollment?.class_group?.name || "Tanpa Rombel"}{" "}
						&bull; Tahun Ajaran: {activeAy?.name}
					</p>
				</div>
				<div className="mt-4 sm:ml-4 sm:mt-0">
					<Link
						to="/keuangan/pembayaran/baru"
						search={{ student_id: student.id, invoice_id: undefined }}
					>
						<Button variant="primary">+ Catat Pembayaran</Button>
					</Link>
				</div>
			</div>

			<div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 overflow-hidden">
				<div className="overflow-x-auto">
					<table className="min-w-full divide-y divide-gray-300">
						<thead className="bg-gray-50">
							<tr>
								<th
									scope="col"
									className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6 w-16"
								>
									#
								</th>
								<th
									scope="col"
									className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
								>
									Jenis
								</th>
								<th
									scope="col"
									className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
								>
									Periode
								</th>
								<th
									scope="col"
									className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
								>
									Status & Sisa
								</th>
								<th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
									<span className="sr-only">Aksi</span>
								</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-gray-200 bg-white">
							{isInvoicesLoading ? (
								<tr>
									<td
										colSpan={5}
										className="px-3 py-8 text-center text-sm text-gray-500"
									>
										Memuat data tagihan...
									</td>
								</tr>
							) : invoices.length === 0 ? (
								<tr>
									<td
										colSpan={5}
										className="px-3 py-12 text-center text-sm text-gray-500"
									>
										Siswa belum memiliki tagihan pada tahun ajaran ini.
									</td>
								</tr>
							) : (
								invoices.map((invoice: any, index: number) => {
									const sisa =
										Number(invoice.total_amount) - Number(invoice.paid_amount);
									const periodeStr =
										invoice.month && invoice.year
											? `Bulan ${invoice.month} / ${invoice.year}`
											: invoice.academic_year?.name || "-";

									return (
										<tr key={invoice.id} className="hover:bg-gray-50 group">
											<td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
												{index + 1}
											</td>
											<td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900 font-medium">
												{translateType(invoice.type)}
											</td>
											<td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
												{periodeStr}
											</td>
											<td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
												<div className="flex flex-col gap-1 items-start">
													{getStatusBadge(invoice.status, sisa)}
													<span className="text-xs text-gray-500">
														Total:{" "}
														{formatCurrency(Number(invoice.total_amount))}
													</span>
												</div>
											</td>
											<td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
												<Link
													to="/keuangan/tagihan/$id"
													params={{ id: invoice.id.toString() }}
													className="inline-flex items-center text-indigo-600 hover:text-indigo-900 bg-indigo-50 px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
												>
													Detail <ChevronRight className="w-4 h-4 ml-1" />
												</Link>
											</td>
										</tr>
									);
								})
							)}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	);
}
