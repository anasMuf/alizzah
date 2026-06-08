import { createFileRoute, Link } from "@tanstack/react-router";
import { useAtom } from "jotai";
import { ChevronRight, Search, Wallet } from "lucide-react";
import { useState } from "react";
import { useDebounce } from "use-debounce";
import { useGetV1ClassGroups } from "../../../../api/endpoints/class-groups/class-groups";
import { useGetV1Students } from "../../../../api/endpoints/students/students";
import { Pagination } from "../../../../components/molecules/Pagination";
import { academicYearAtom } from "../../../../store/global";

export const Route = createFileRoute("/_authenticated/keuangan/tabungan/")({
	component: TabunganListPage,
});

function TabunganListPage() {
	const [activeAy] = useAtom(academicYearAtom);

	const [search, setSearch] = useState("");
	const [debouncedSearch] = useDebounce(search, 500);
	const [selectedClassGroup, setSelectedClassGroup] = useState("");
	const [page, setPage] = useState(1);

	const { data: studentsResp, isLoading } = useGetV1Students(
		{
			page,
			limit: 20,
			search: debouncedSearch,
			class_group_id: selectedClassGroup
				? Number(selectedClassGroup)
				: undefined,
		},
		{ query: { enabled: true } },
	);

	const { data: classGroupsData } = useGetV1ClassGroups({
		academic_year_id: activeAy?.id,
	});
	const classGroups = (classGroupsData?.data as any)?.data || [];

	const students = (studentsResp?.data as any)?.data || [];
	const meta = (studentsResp?.data as any)?.meta;

	return (
		<div className="space-y-6">
			<div className="sm:flex sm:items-center sm:justify-between">
				<div>
					<h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:tracking-tight flex items-center">
						<Wallet className="w-6 h-6 mr-2 text-gray-400" /> Tabungan Siswa
					</h2>
					<p className="mt-1 text-sm text-gray-500">
						Daftar saldo tabungan seluruh siswa (Tabungan Umum & Wajib).
					</p>
				</div>
			</div>

			<div className="bg-white p-4 rounded-xl shadow-sm ring-1 ring-gray-900/5 flex flex-wrap gap-4 items-end">
				<div className="flex-1 min-w-[200px]">
					<label className="block text-sm font-medium leading-6 text-gray-900 mb-1">
						Pencarian Siswa
					</label>
					<div className="relative rounded-md shadow-sm">
						<div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
							<Search className="h-5 w-5 text-gray-400" />
						</div>
						<input
							type="text"
							className="block w-full rounded-md border-0 py-1.5 pl-10 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
							placeholder="Cari nama atau NISN..."
							value={search}
							onChange={(e) => setSearch(e.target.value)}
						/>
					</div>
				</div>

				<div className="w-full sm:w-64">
					<label className="block text-sm font-medium leading-6 text-gray-900 mb-1">
						Filter Rombel
					</label>
					<select
						value={selectedClassGroup}
						onChange={(e) => setSelectedClassGroup(e.target.value)}
						className="block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
					>
						<option value="">Semua Rombel</option>
						{classGroups.map((cg: any) => (
							<option key={cg.id} value={cg.id}>
								{cg.name}
							</option>
						))}
					</select>
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
									Siswa
								</th>
								<th
									scope="col"
									className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
								>
									Rombel Aktif
								</th>
								<th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
									<span className="sr-only">Aksi</span>
								</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-gray-200 bg-white">
							{isLoading ? (
								<tr>
									<td
										colSpan={4}
										className="px-3 py-8 text-center text-sm text-gray-500"
									>
										Memuat data siswa...
									</td>
								</tr>
							) : students.length === 0 ? (
								<tr>
									<td
										colSpan={4}
										className="px-3 py-12 text-center text-sm text-gray-500"
									>
										Tidak ada siswa yang ditemukan.
									</td>
								</tr>
							) : (
								students.map((student: any, index: number) => (
									<tr key={student.id} className="hover:bg-gray-50 group">
										<td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
											{(page - 1) * 20 + index + 1}
										</td>
										<td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900 font-medium">
											{student.full_name}
											<div className="text-xs text-gray-500 font-normal mt-1">
												{student.nisn || "-"}
											</div>
										</td>
										<td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
											{student.active_enrollment?.class_group?.name ||
												"Tanpa Rombel"}
										</td>
										<td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
											<Link
												to="/keuangan/tabungan/siswa/$id"
												params={{ id: student.id.toString() }}
												className="inline-flex items-center text-indigo-600 hover:text-indigo-900 bg-indigo-50 px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
											>
												Lihat Tabungan <ChevronRight className="w-4 h-4 ml-1" />
											</Link>
										</td>
									</tr>
								))
							)}
						</tbody>
					</table>
				</div>

				{/* Pagination */}
				{meta && (
					<Pagination
						page={page}
						limit={20}
						total={meta.total}
						onPageChange={setPage}
					/>
				)}
			</div>
		</div>
	);
}
