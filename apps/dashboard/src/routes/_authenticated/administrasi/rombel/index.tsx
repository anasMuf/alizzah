import { createFileRoute, Link } from "@tanstack/react-router";
import { useAtom } from "jotai";
import { Clock, Plus, Users } from "lucide-react";
import { useGetV1ClassGroups } from "@alizzah/api-client/endpoints/class-groups/class-groups";
import type { DtoClassGroupResponse } from "@alizzah/api-client/model";
import { Button } from "@alizzah/ui";
import { EmptyState } from "@alizzah/ui";
import { academicYearAtom } from "../../../../store/global";

export const Route = createFileRoute("/_authenticated/administrasi/rombel/")({
	component: RombelIndexPage,
});

function RombelIndexPage() {
	const [activeAy] = useAtom(academicYearAtom);

	const {
		data: response,
		isLoading,
		isError,
	} = useGetV1ClassGroups(
		{ academic_year_id: activeAy?.id as any },
		{ query: { enabled: !!activeAy?.id } as any },
	);

	const classGroups = (response?.data as any)?.data || [];

	const groupedClassGroups = classGroups.reduce(
		(acc: any, cg: any) => {
			if (!acc[cg.level]) {
				acc[cg.level] = [];
			}
			acc[cg.level].push(cg);
			return acc;
		},
		{} as Record<string, DtoClassGroupResponse[]>,
	);

	const levels = [
		{ id: "mutiara", label: "MUTIARA (KB)" },
		{ id: "intan", label: "INTAN (TK-A)" },
		{ id: "berlian", label: "BERLIAN (TK-B)" },
	];

	return (
		<div className="space-y-6">
			<div className="sm:flex sm:items-center sm:justify-between">
				<div>
					<h1 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:tracking-tight">
						Rombel (Kelompok Belajar)
					</h1>
					<p className="mt-1 text-sm text-gray-500">
						Kelola rombongan belajar untuk tahun ajaran{" "}
						{activeAy?.name || "terpilih"}.
					</p>
				</div>
				<div className="mt-4 sm:ml-4 sm:mt-0 flex gap-3">
					<Link to="/administrasi/rombel/baru">
						<Button className="flex items-center gap-2">
							<Plus className="h-4 w-4" />
							Buat Baru
						</Button>
					</Link>
				</div>
			</div>

			{!activeAy ? (
				<EmptyState
					title="Menunggu Tahun Ajaran"
					description="Data tahun ajaran sedang dimuat..."
				/>
			) : isLoading ? (
				<div className="space-y-6">
					<div className="h-40 bg-gray-200 rounded-lg animate-pulse"></div>
					<div className="h-40 bg-gray-200 rounded-lg animate-pulse"></div>
				</div>
			) : isError ? (
				<div className="bg-red-50 p-4 rounded-md text-red-800">
					Gagal memuat data rombel.
				</div>
			) : classGroups.length === 0 ? (
				<EmptyState
					title="Belum ada Rombel"
					description={`Belum ada rombel yang dibuat untuk tahun ajaran ${activeAy.name}.`}
					action={
						<Link to="/administrasi/rombel/baru">
							<Button>Buat Rombel Pertama</Button>
						</Link>
					}
				/>
			) : (
				<div className="space-y-8">
					{levels.map((level) => {
						const groups = groupedClassGroups[level.id];
						if (!groups || groups.length === 0) return null;

						return (
							<div key={level.id}>
								<h3 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">
									{level.label}
								</h3>
								<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
									{groups.map((cg: any) => (
										<div
											key={cg.id}
											className="relative flex flex-col justify-between rounded-lg border border-gray-300 bg-white shadow-sm hover:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:ring-offset-2 transition-all"
										>
											<div className="p-5">
												<h4 className="text-lg font-bold text-gray-900 mb-2 truncate">
													{cg.name}
												</h4>

												<div className="flex items-center text-sm text-gray-500 mb-2">
													<Users className="mr-2 h-4 w-4 text-gray-400 flex-shrink-0" />
													<span>{cg.student_count} Siswa</span>
												</div>

												<div className="flex items-start text-sm text-gray-500">
													<Clock className="mr-2 h-4 w-4 text-gray-400 flex-shrink-0 mt-0.5" />
													<div className="flex-1 space-y-1">
														{cg.schedule.weekdays?.days?.length > 0 && (
															<p
																className="line-clamp-1"
																title={cg.schedule.weekdays.days.join(", ")}
															>
																{cg.schedule.weekdays.days.join(", ")}
															</p>
														)}
														{cg.schedule.weekend?.days?.length > 0 && (
															<p
																className="line-clamp-1"
																title={cg.schedule.weekend.days.join(", ")}
															>
																{cg.schedule.weekend.days.join(", ")}
															</p>
														)}
													</div>
												</div>
											</div>

											<div className="border-t border-gray-200 bg-gray-50 p-3 rounded-b-lg text-right">
												<Link
													to="/administrasi/rombel/$id"
													params={{ id: cg.id.toString() }}
													className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
												>
													Lihat Detail <span aria-hidden="true">&rarr;</span>
												</Link>
											</div>
										</div>
									))}
								</div>
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
}
