import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useAtom } from "jotai";
import { Plus, Search, ShieldX, UserCircle } from "lucide-react";
import { useState } from "react";
import {
	getGetV1DaycareEnrollmentsQueryKey,
	useGetV1DaycareEnrollments,
	usePatchV1DaycareEnrollmentsIdStatus,
} from "../../../../api/endpoints/daycare-enrollments/daycare-enrollments";
import { Badge } from "@alizzah/ui";
import { Button } from "@alizzah/ui";
import { ConfirmDialog } from "@alizzah/ui";
import { EmptyState } from "@alizzah/ui";
import { useToast } from "@alizzah/ui";
import { academicYearAtom } from "../../../../store/global";

export const Route = createFileRoute("/_authenticated/administrasi/daycare/")({
	component: DaycareIndexPage,
});

function DaycareIndexPage() {
	const [activeAy] = useAtom(academicYearAtom);
	const queryClient = useQueryClient();
	const { addToast } = useToast();

	const [page, setPage] = useState(1);
	const limit = 10;
	const [search, setSearch] = useState("");
	const [searchInput, setSearchInput] = useState("");
	const [statusFilter, setStatusFilter] = useState("");

	const [isDeactivateOpen, setIsDeactivateOpen] = useState(false);
	const [enrollmentToDeactivate, setEnrollmentToDeactivate] =
		useState<any>(null);

	const {
		data: response,
		isLoading,
		isError,
	} = useGetV1DaycareEnrollments(
		{
			academic_year_id: activeAy?.id as any,
			page,
			limit,
			search,
			status: statusFilter,
		},
		{ query: { enabled: !!activeAy?.id, keepPreviousData: true } as any },
	);

	const enrollments = (response?.data as any)?.data || [];
	const meta = (response?.data as any)?.meta;

	const updateStatusMutation = usePatchV1DaycareEnrollmentsIdStatus({
		mutation: {
			onSuccess: () => {
				addToast({
					variant: "success",
					title: "Berhasil",
					message: "Status daycare berhasil diperbarui.",
				});
				queryClient.invalidateQueries({
					queryKey: getGetV1DaycareEnrollmentsQueryKey(),
				});
				setIsDeactivateOpen(false);
				setEnrollmentToDeactivate(null);
			},
			onError: (error: any) => {
				addToast({
					variant: "error",
					title: "Gagal",
					message: error?.message || "Gagal memperbarui status.",
				});
			},
		},
	});

	const handleSearch = (e: React.FormEvent) => {
		e.preventDefault();
		setSearch(searchInput);
		setPage(1);
	};

	const getPackageBadge = (pkg: string) => {
		switch (pkg) {
			case "monthly_kb":
				return <Badge className="bg-blue-100 text-blue-700">Bulanan KB</Badge>;
			case "monthly_tk":
				return (
					<Badge className="bg-emerald-100 text-emerald-700">Bulanan TK</Badge>
				);
			case "monthly_package_kb":
				return (
					<Badge className="bg-purple-100 text-purple-700">Paket KB</Badge>
				);
			case "monthly_package_tk":
				return (
					<Badge className="bg-indigo-100 text-indigo-700">Paket TK</Badge>
				);
			case "daily":
				return <Badge className="bg-amber-100 text-amber-700">Harian</Badge>;
			default:
				return <Badge variant="secondary">{pkg}</Badge>;
		}
	};

	const formatDate = (dateStr: string) => {
		return new Date(dateStr).toLocaleDateString("id-ID", {
			day: "numeric",
			month: "short",
			year: "numeric",
		});
	};

	return (
		<div className="space-y-6">
			<div className="sm:flex sm:items-center sm:justify-between">
				<div>
					<h1 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:tracking-tight">
						Data Siswa Daycare
					</h1>
					<p className="mt-1 text-sm text-gray-500">
						Kelola pendaftaran dan status siswa daycare (layanan penitipan).
					</p>
				</div>
				<div className="mt-4 sm:ml-4 sm:mt-0">
					<Link to="/administrasi/daycare/baru">
						<Button className="flex items-center gap-2">
							<Plus className="h-4 w-4" />
							Pendaftaran Baru
						</Button>
					</Link>
				</div>
			</div>

			<div className="bg-white p-4 rounded-xl shadow-sm ring-1 ring-gray-900/5">
				<div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
					<form onSubmit={handleSearch} className="relative w-full sm:max-w-xs">
						<div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
							<Search className="h-4 w-4 text-gray-400" />
						</div>
						<input
							type="text"
							className="block w-full rounded-md border-0 py-1.5 pl-10 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
							placeholder="Cari nama siswa..."
							value={searchInput}
							onChange={(e) => setSearchInput(e.target.value)}
						/>
					</form>

					<select
						className="block w-full sm:w-48 rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
						value={statusFilter}
						onChange={(e) => {
							setStatusFilter(e.target.value);
							setPage(1);
						}}
					>
						<option value="">Semua Status</option>
						<option value="active">Aktif</option>
						<option value="inactive">Nonaktif</option>
					</select>
				</div>
			</div>

			{!activeAy ? (
				<EmptyState
					title="Menunggu Tahun Ajaran"
					description="Data tahun ajaran sedang dimuat..."
				/>
			) : isLoading ? (
				<div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 h-96 animate-pulse p-8"></div>
			) : isError ? (
				<div className="bg-red-50 p-4 rounded-md text-red-800">
					Gagal memuat data daycare.
				</div>
			) : enrollments.length === 0 ? (
				<EmptyState
					title="Tidak ada data daycare"
					description="Belum ada pendaftaran daycare atau tidak ada data yang cocok dengan filter."
				/>
			) : (
				<div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 overflow-hidden">
					<div className="overflow-x-auto">
						<table className="min-w-full divide-y divide-gray-300">
							<thead className="bg-gray-50">
								<tr>
									<th
										scope="col"
										className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6"
									>
										Siswa
									</th>
									<th
										scope="col"
										className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
									>
										Paket
									</th>
									<th
										scope="col"
										className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
									>
										Tanggal Mulai
									</th>
									<th
										scope="col"
										className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
									>
										Status
									</th>
									<th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
										<span className="sr-only">Aksi</span>
									</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-gray-200 bg-white">
								{enrollments.map((enrollment: any) => (
									<tr
										key={enrollment.id}
										className="hover:bg-gray-50 transition-colors"
									>
										<td className="whitespace-nowrap py-4 pl-4 pr-3 sm:pl-6">
											<div className="flex items-center">
												<div className="h-10 w-10 flex-shrink-0 text-gray-300">
													<UserCircle className="h-10 w-10" />
												</div>
												<div className="ml-4">
													<div className="font-medium text-gray-900">
														{enrollment.student.full_name}
													</div>
													<div className="text-gray-500 text-xs">
														NISN: {enrollment.student.nisn || "-"}
													</div>
												</div>
											</div>
										</td>
										<td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
											{getPackageBadge(enrollment.package_type)}
										</td>
										<td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
											{formatDate(enrollment.start_date)}
										</td>
										<td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
											{enrollment.status === "active" ? (
												<Badge variant="success">Aktif</Badge>
											) : (
												<Badge variant="secondary">Nonaktif</Badge>
											)}
										</td>
										<td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
											<div className="flex justify-end gap-2">
												<Link
													to="/administrasi/siswa/$id/profil"
													params={{ id: enrollment.student.id.toString() }}
													className="text-indigo-600 hover:text-indigo-900 bg-indigo-50 px-2 py-1 rounded-md text-xs font-semibold"
												>
													Profil Siswa
												</Link>
												{enrollment.status === "active" && (
													<button
														onClick={() => {
															setEnrollmentToDeactivate(enrollment);
															setIsDeactivateOpen(true);
														}}
														className="text-red-600 hover:text-red-900 bg-red-50 px-2 py-1 rounded-md text-xs font-semibold flex items-center gap-1"
													>
														<ShieldX className="h-3 w-3" /> Stop
													</button>
												)}
											</div>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>

					{/* Pagination */}
					{meta && meta.total_pages > 1 && (
						<div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
							<div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
								<div>
									<p className="text-sm text-gray-700">
										Menampilkan{" "}
										<span className="font-medium">
											{(page - 1) * limit + 1}
										</span>{" "}
										hingga{" "}
										<span className="font-medium">
											{Math.min(page * limit, meta.total_data)}
										</span>{" "}
										dari <span className="font-medium">{meta.total_data}</span>{" "}
										hasil
									</p>
								</div>
								<div>
									<nav
										className="isolate inline-flex -space-x-px rounded-md shadow-sm"
										aria-label="Pagination"
									>
										<button
											onClick={() => setPage(Math.max(1, page - 1))}
											disabled={page === 1}
											className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
										>
											<span className="sr-only">Previous</span>
											&laquo;
										</button>
										<span className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 focus:z-20 focus:outline-offset-0">
											Halaman {page} dari {meta.total_pages}
										</span>
										<button
											onClick={() =>
												setPage(Math.min(meta.total_pages, page + 1))
											}
											disabled={page === meta.total_pages}
											className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
										>
											<span className="sr-only">Next</span>
											&raquo;
										</button>
									</nav>
								</div>
							</div>
						</div>
					)}
				</div>
			)}

			<ConfirmDialog
				open={isDeactivateOpen}
				onCancel={() => setIsDeactivateOpen(false)}
				onConfirm={() => {
					if (enrollmentToDeactivate) {
						updateStatusMutation.mutate({
							id: enrollmentToDeactivate.id,
							data: {
								status: "inactive",
								end_date: new Date().toISOString(),
							},
						});
					}
				}}
				title="Nonaktifkan Layanan Daycare"
				variant="danger"
			>
				<p>
					Anda yakin ingin menonaktifkan layanan daycare untuk siswa{" "}
					<strong>{enrollmentToDeactivate?.student?.full_name}</strong>? Status
					akan diubah menjadi tidak aktif mulai hari ini.
				</p>
			</ConfirmDialog>
		</div>
	);
}
