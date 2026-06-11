import { createFileRoute, Link } from "@tanstack/react-router";
import { useAtom } from "jotai";
import { ChevronRight, Printer } from "lucide-react";
import { useMemo, useState } from "react";
import { useGetV1ClassGroups } from "../../../../api/endpoints/class-groups/class-groups";
import { useGetV1ReportsClassGroupsId } from "../../../../api/endpoints/reports/reports";
import { Alert } from "@alizzah/ui";
import { Badge } from "@alizzah/ui";
import { Button } from "@alizzah/ui";
import { academicYearAtom } from "../../../../store/global";
import { formatCurrency } from "../../../../utils/format";

export const Route = createFileRoute("/_authenticated/keuangan/laporan/kelas")({
	component: RekapKelasPage,
});

const MONTH_NAMES = [
	"Januari",
	"Februari",
	"Maret",
	"April",
	"Mei",
	"Juni",
	"Juli",
	"Agustus",
	"September",
	"Oktober",
	"November",
	"Desember",
];

function RekapKelasPage() {
	const [activeAy] = useAtom(academicYearAtom);
	const now = new Date();

	const [classId, setClassId] = useState("");
	const [month, setMonth] = useState(now.getMonth() + 1);
	const [year, setYear] = useState(now.getFullYear());
	const [statusFilter, setStatusFilter] = useState("");

	const { data: classGroupsData } = useGetV1ClassGroups(
		{ academic_year_id: activeAy?.id },
		{ query: { enabled: !!activeAy?.id } },
	);
	const classGroups: any[] = (classGroupsData?.data as any)?.data || [];

	const classIdNum = Number(classId);
	const shouldFetch = classIdNum > 0 && !!activeAy?.id;

	const {
		data: reportData,
		isLoading,
		isError,
	} = useGetV1ReportsClassGroupsId(
		classIdNum,
		{
			month,
			year,
			academic_year_id: activeAy?.id,
		},
		{ query: { enabled: shouldFetch } },
	);

	const report = shouldFetch ? (reportData?.data as any)?.data : null;
	const summary = report?.summary;
	const students: any[] = report?.students || [];
	const classGroup = report?.class_group;

	const filteredStudents = useMemo(() => {
		if (!statusFilter) return students;
		if (statusFilter === "paid") {
			return students.filter((s: any) => s.invoice_status === "paid");
		}
		return students.filter((s: any) => s.invoice_status !== "paid");
	}, [students, statusFilter]);

	const currentYear = now.getFullYear();
	const yearOptions = Array.from({ length: 3 }, (_, i) => currentYear - i);

	// Group class groups by level
	const groupedClasses = useMemo(() => {
		const groups: Record<string, any[]> = {};
		for (const cg of classGroups) {
			const level = cg.level || "Lainnya";
			if (!groups[level]) groups[level] = [];
			groups[level].push(cg);
		}
		return groups;
	}, [classGroups]);

	const isDefault =
		!classId && month === now.getMonth() + 1 && year === now.getFullYear();

	const handleReset = () => {
		setClassId("");
		setMonth(now.getMonth() + 1);
		setYear(now.getFullYear());
		setStatusFilter("");
	};

	const statusBadge = (status: string) => {
		switch (status) {
			case "paid":
				return <Badge variant="success">Lunas</Badge>;
			case "partial":
				return <Badge variant="warning">Sebagian</Badge>;
			default:
				return <Badge variant="danger">Belum</Badge>;
		}
	};

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-start justify-between print:hidden">
				<div>
					<nav className="flex items-center text-sm text-gray-500 mb-2">
						<Link
							to="/keuangan/laporan"
							className="hover:text-indigo-600 transition-colors"
						>
							Laporan
						</Link>
						<ChevronRight className="w-4 h-4 mx-1" />
						<span className="text-gray-900 font-medium">Rekap per Kelas</span>
					</nav>
					<h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:tracking-tight">
						{report
							? `Rekap ${classGroup?.name || ""} — ${MONTH_NAMES[month - 1]} ${year}`
							: "Rekap per Kelas"}
					</h2>
				</div>
				{report && (
					<Button
						variant="secondary"
						onClick={() => window.print()}
						className="print:hidden"
					>
						<Printer className="w-4 h-4 mr-2" />
						Cetak
					</Button>
				)}
			</div>

			{/* Print Header */}
			<div className="hidden print:block border-b border-gray-300 pb-4 mb-6">
				<h1 className="text-lg font-bold">ALIZZAH MANAJEMEN</h1>
				<p className="text-sm text-gray-600">Laporan Keuangan</p>
				<div className="mt-2 text-sm text-gray-700 space-y-0.5">
					<p>Jenis: Rekap per Kelas</p>
					<p>Kelas: {classGroup?.name || "-"}</p>
					<p>
						Periode: {MONTH_NAMES[month - 1]} {year}
					</p>
					<p>TA: {activeAy?.name || "-"}</p>
				</div>
			</div>

			{/* Filter — auto-fetch when class is selected */}
			<div className="bg-white p-4 rounded-xl shadow-sm ring-1 ring-gray-900/5 print:hidden">
				<div className="flex flex-wrap gap-4 items-end">
					<div>
						<label className="block text-sm font-medium leading-6 text-gray-900 mb-1">
							Rombel <span className="text-red-500">*</span>
						</label>
						<select
							value={classId}
							onChange={(e) => {
								setClassId(e.target.value);
								setStatusFilter("");
							}}
							className="block w-full sm:w-48 rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
						>
							<option value="">Pilih Rombel</option>
							{Object.entries(groupedClasses).map(([level, classes]) => (
								<optgroup
									key={level}
									label={level.charAt(0).toUpperCase() + level.slice(1)}
								>
									{classes.map((cg: any) => (
										<option key={cg.id} value={cg.id}>
											{cg.name}
										</option>
									))}
								</optgroup>
							))}
						</select>
					</div>
					<div>
						<label className="block text-sm font-medium leading-6 text-gray-900 mb-1">
							Bulan
						</label>
						<select
							value={month}
							onChange={(e) => setMonth(Number(e.target.value))}
							className="block w-full sm:w-36 rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
						>
							{MONTH_NAMES.map((name, idx) => (
								<option key={idx} value={idx + 1}>
									{name}
								</option>
							))}
						</select>
					</div>
					<div>
						<label className="block text-sm font-medium leading-6 text-gray-900 mb-1">
							Tahun
						</label>
						<select
							value={year}
							onChange={(e) => setYear(Number(e.target.value))}
							className="block w-full sm:w-24 rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
						>
							{yearOptions.map((y) => (
								<option key={y} value={y}>
									{y}
								</option>
							))}
						</select>
					</div>
					{!isDefault && (
						<button
							type="button"
							onClick={handleReset}
							className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
						>
							Reset Filter
						</button>
					)}
				</div>
			</div>

			{/* Prompt to select a class */}
			{!classId && (
				<div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 p-12 text-center">
					<p className="text-sm text-gray-500">
						Pilih rombel di atas untuk melihat rekap kelas.
					</p>
				</div>
			)}

			{/* Loading */}
			{isLoading && (
				<div className="animate-pulse space-y-4">
					<div className="h-32 bg-gray-200 rounded-xl" />
					<div className="h-64 bg-gray-200 rounded-xl" />
				</div>
			)}

			{isError && (
				<Alert variant="error" title="Gagal Memuat">
					Terjadi kesalahan saat memuat rekap kelas.
				</Alert>
			)}

			{/* Report Content */}
			{report && !isLoading && (
				<>
					{/* Summary */}
					<div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 p-6">
						<h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
							Ringkasan Kelas
						</h3>
						<div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
							<div>
								<p className="text-xs text-gray-500">Jumlah Siswa</p>
								<p className="text-lg font-bold text-gray-900">
									{summary?.total_students || 0}
								</p>
							</div>
							<div>
								<p className="text-xs text-gray-500">Total Tagihan</p>
								<p className="text-lg font-bold text-gray-900 tabular-nums">
									{formatCurrency(Number(summary?.total_billed || 0))}
								</p>
							</div>
							<div>
								<p className="text-xs text-gray-500">Total Terbayar</p>
								<p className="text-lg font-bold text-green-600 tabular-nums">
									{formatCurrency(Number(summary?.total_paid || 0))}
								</p>
							</div>
							<div>
								<p className="text-xs text-gray-500">Total Tunggakan</p>
								<p className="text-lg font-bold text-red-600 tabular-nums">
									{formatCurrency(Number(summary?.total_unpaid || 0))}
								</p>
							</div>
							<div>
								<p className="text-xs text-gray-500">Tingkat Kepatuhan</p>
								<p className="text-lg font-bold text-gray-900">
									{summary?.payment_rate || "0%"}
								</p>
							</div>
						</div>
					</div>

					{/* Status filter */}
					<div className="flex items-center gap-2 print:hidden">
						<span className="text-sm text-gray-500">Filter:</span>
						{["", "unpaid", "paid"].map((val) => (
							<button
								key={val}
								type="button"
								onClick={() => setStatusFilter(val)}
								className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
									statusFilter === val
										? "bg-indigo-100 text-indigo-700"
										: "text-gray-600 hover:bg-gray-100"
								}`}
							>
								{val === ""
									? "Semua"
									: val === "paid"
										? "Lunas"
										: "Belum Lunas"}
							</button>
						))}
					</div>

					{/* Student Table */}
					<div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 overflow-hidden">
						<div className="overflow-x-auto">
							<table className="min-w-full divide-y divide-gray-300">
								<thead className="bg-gray-50">
									<tr>
										<th className="py-3.5 pl-6 pr-3 text-left text-sm font-semibold text-gray-900 w-12">
											#
										</th>
										<th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
											Nama
										</th>
										<th className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900">
											Tagihan
										</th>
										<th className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900">
											Dibayar
										</th>
										<th className="px-3 py-3.5 text-center text-sm font-semibold text-gray-900 pr-6">
											Status
										</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-gray-200 bg-white">
									{filteredStudents.length > 0 ? (
										filteredStudents.map((student: any, idx: number) => (
											<tr key={student.student_id} className="hover:bg-gray-50">
												<td className="whitespace-nowrap py-3 pl-6 pr-3 text-sm text-gray-500">
													{idx + 1}
												</td>
												<td className="whitespace-nowrap px-3 py-3 text-sm">
													<Link
														to="/keuangan/laporan/siswa"
														search={{ studentId: student.student_id }}
														className="text-indigo-600 hover:text-indigo-500 font-medium"
													>
														{student.student_name}
													</Link>
												</td>
												<td className="whitespace-nowrap px-3 py-3 text-sm text-right tabular-nums text-gray-900">
													{formatCurrency(Number(student.total_amount || 0))}
												</td>
												<td className="whitespace-nowrap px-3 py-3 text-sm text-right tabular-nums text-gray-900">
													{formatCurrency(Number(student.paid_amount || 0))}
												</td>
												<td className="whitespace-nowrap px-3 py-3 text-sm text-center pr-6">
													{statusBadge(student.invoice_status)}
												</td>
											</tr>
										))
									) : (
										<tr>
											<td
												colSpan={5}
												className="px-6 py-12 text-center text-sm text-gray-500"
											>
												{statusFilter === "unpaid"
													? "Semua siswa di kelas ini sudah melunasi tagihan bulan ini."
													: "Tidak ada siswa di rombel ini."}
											</td>
										</tr>
									)}
								</tbody>
							</table>
						</div>
					</div>
				</>
			)}

			{shouldFetch && !isLoading && !isError && !report && (
				<div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 p-12 text-center">
					<p className="text-sm text-gray-500">
						Tidak ada data untuk kelas dan periode ini.
					</p>
				</div>
			)}
		</div>
	);
}
