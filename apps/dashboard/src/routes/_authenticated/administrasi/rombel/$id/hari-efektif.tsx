import { createFileRoute, Link } from "@tanstack/react-router";
import { useAtom } from "jotai";
import { AlertCircle, Calendar, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { useGetV1ClassGroupsId } from "@alizzah/api-client/endpoints/class-groups/class-groups";
import { useGetV1ClassGroupsIdEffectiveDays } from "@alizzah/api-client/endpoints/effective-days/effective-days";
import type { DtoEffectiveDayResponse } from "@alizzah/api-client/model";
import { Button } from "@alizzah/ui";
import { EmptyState } from "@alizzah/ui";
import { EffectiveDayForm } from "../../../../../features/administrasi/components/EffectiveDayForm";
import { academicYearAtom } from "../../../../../store/global";

export const Route = createFileRoute(
	"/_authenticated/administrasi/rombel/$id/hari-efektif",
)({
	component: HariEfektifPage,
});

function HariEfektifPage() {
	const { id } = Route.useParams();
	const classGroupId = Number(id);
	const [activeAy] = useAtom(academicYearAtom);

	const [isFormOpen, setIsFormOpen] = useState(false);
	const [selectedMonth, setSelectedMonth] = useState<number>(0);
	const [selectedYear, setSelectedYear] = useState<number>(0);
	const [selectedData, setSelectedData] =
		useState<DtoEffectiveDayResponse | null>(null);

	const { data: cgResponse, isLoading: isLoadingCg } =
		useGetV1ClassGroupsId(classGroupId);
	const rombel = (cgResponse?.data as any)?.data;

	const { data: edResponse, isLoading: isLoadingEd } =
		useGetV1ClassGroupsIdEffectiveDays(
			classGroupId,
			{ academic_year_id: activeAy?.id as any },
			{ query: { enabled: !!activeAy?.id } as any },
		);
	const effectiveDays = (edResponse?.data as any)?.data || [];

	const monthsList = useMemo(() => {
		if (!activeAy) return [];
		const [startYearStr, endYearStr] = activeAy.name.split("/");
		const start = new Date(Number(startYearStr), 6, 1); // July 1st of start year
		const end = new Date(Number(endYearStr), 5, 30); // June 30th of end year

		const months = [];
		const current = new Date(start.getFullYear(), start.getMonth(), 1);

		while (current <= end) {
			months.push({
				month: current.getMonth() + 1,
				year: current.getFullYear(),
				name: current.toLocaleString("id-ID", {
					month: "long",
					year: "numeric",
				}),
			});
			current.setMonth(current.getMonth() + 1);
		}
		return months;
	}, [activeAy]);

	if (!activeAy) {
		return (
			<EmptyState
				title="Menunggu Tahun Ajaran"
				description="Data tahun ajaran sedang dimuat..."
			/>
		);
	}

	if (isLoadingCg || isLoadingEd) {
		return (
			<div className="p-8 animate-pulse bg-white rounded-xl shadow-sm h-64"></div>
		);
	}

	if (!rombel) {
		return (
			<div className="p-8 bg-red-50 text-red-800 rounded-xl">
				Data rombel tidak ditemukan.
			</div>
		);
	}

	const handleEdit = (monthInfo: any) => {
		const existingEd = effectiveDays.find(
			(ed: any) => ed.month === monthInfo.month && ed.year === monthInfo.year,
		);
		setSelectedData(existingEd || null);
		setSelectedMonth(monthInfo.month);
		setSelectedYear(monthInfo.year);
		setIsFormOpen(true);
	};

	// Check if current month is missing
	const today = new Date();
	const currentMonthInfo = monthsList.find(
		(m) => m.month === today.getMonth() + 1 && m.year === today.getFullYear(),
	);
	const isCurrentMonthMissing =
		currentMonthInfo &&
		!effectiveDays.some(
			(ed: any) =>
				ed.month === currentMonthInfo.month &&
				ed.year === currentMonthInfo.year,
		);

	return (
		<div className="space-y-6 max-w-5xl mx-auto">
			{/* Breadcrumb */}
			<nav className="flex" aria-label="Breadcrumb">
				<ol role="list" className="flex items-center space-x-2">
					<li>
						<Link
							to="/administrasi/rombel"
							className="text-gray-400 hover:text-gray-500"
						>
							Administrasi
						</Link>
					</li>
					<li>
						<div className="flex items-center">
							<ChevronRight
								className="h-5 w-5 flex-shrink-0 text-gray-400"
								aria-hidden="true"
							/>
							<Link
								to="/administrasi/rombel"
								className="ml-2 text-sm font-medium text-gray-500 hover:text-gray-700"
							>
								Rombel
							</Link>
						</div>
					</li>
					<li>
						<div className="flex items-center">
							<ChevronRight
								className="h-5 w-5 flex-shrink-0 text-gray-400"
								aria-hidden="true"
							/>
							<Link
								to="/administrasi/rombel/$id"
								params={{ id: id }}
								className="ml-2 text-sm font-medium text-gray-500 hover:text-gray-700"
							>
								{rombel.name}
							</Link>
						</div>
					</li>
					<li>
						<div className="flex items-center">
							<ChevronRight
								className="h-5 w-5 flex-shrink-0 text-gray-400"
								aria-hidden="true"
							/>
							<span
								className="ml-2 text-sm font-medium text-gray-900"
								aria-current="page"
							>
								Hari Efektif
							</span>
						</div>
					</li>
				</ol>
			</nav>

			{/* Header */}
			<div className="sm:flex sm:items-center sm:justify-between border-b border-gray-200 pb-5">
				<div>
					<h1 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:tracking-tight flex items-center gap-2">
						<Calendar className="h-6 w-6 text-indigo-600" />
						Hari Efektif: {rombel.name}
					</h1>
					<p className="mt-1 text-sm text-gray-500">
						Tahun Ajaran: {activeAy.name}
					</p>
				</div>
			</div>

			{isCurrentMonthMissing && (
				<div className="rounded-md bg-yellow-50 p-4 border border-yellow-200">
					<div className="flex">
						<div className="flex-shrink-0">
							<AlertCircle
								className="h-5 w-5 text-yellow-400"
								aria-hidden="true"
							/>
						</div>
						<div className="ml-3">
							<h3 className="text-sm font-medium text-yellow-800">Perhatian</h3>
							<div className="mt-2 text-sm text-yellow-700">
								<p>
									Hari efektif untuk bulan berjalan belum diisi. Tagihan SPP/SPD
									bulan ini mungkin tidak dapat digenerate dengan benar.
								</p>
							</div>
						</div>
					</div>
				</div>
			)}

			{/* Table */}
			<div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 overflow-hidden">
				<div className="overflow-x-auto">
					<table className="min-w-full divide-y divide-gray-300">
						<thead className="bg-gray-50">
							<tr>
								<th
									scope="col"
									className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6"
								>
									Bulan
								</th>
								<th
									scope="col"
									className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
								>
									Total Hari Efektif
								</th>
								<th
									scope="col"
									className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
								>
									Total Hari Senin
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
							{monthsList.map((m) => {
								const ed = effectiveDays.find(
									(e: any) => e.month === m.month && e.year === m.year,
								);
								const isFilled = !!ed;
								return (
									<tr
										key={`${m.year}-${m.month}`}
										className={!isFilled ? "bg-gray-50/50" : ""}
									>
										<td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
											{m.name}
										</td>
										<td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
											{isFilled ? (
												<span className="font-semibold text-gray-900">
													{ed.total_days} hari
												</span>
											) : (
												"-"
											)}
										</td>
										<td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
											{isFilled ? (
												<span className="font-semibold text-gray-900">
													{ed.total_mondays} hari
												</span>
											) : (
												"-"
											)}
										</td>
										<td className="whitespace-nowrap px-3 py-4 text-sm">
											{isFilled ? (
												<span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
													Terisi
												</span>
											) : (
												<span className="inline-flex items-center rounded-md bg-yellow-50 px-2 py-1 text-xs font-medium text-yellow-800 ring-1 ring-inset ring-yellow-600/20">
													Kosong
												</span>
											)}
										</td>
										<td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
											<Button
												variant="ghost"
												size="sm"
												onClick={() => handleEdit(m)}
											>
												{isFilled ? "Edit" : "Isi Data"}
											</Button>
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
			</div>

			<EffectiveDayForm
				isOpen={isFormOpen}
				onClose={() => setIsFormOpen(false)}
				classGroupId={classGroupId}
				academicYearId={activeAy.id}
				month={selectedMonth}
				year={selectedYear}
				initialData={selectedData}
			/>
		</div>
	);
}
