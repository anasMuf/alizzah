import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useAtom } from "jotai";
import { ArrowLeft, Bus, Search, UserX } from "lucide-react";
import { useState } from "react";

import {
	useDeleteV1StudentsIdFacilitiesFacilityId,
	useGetV1Facilities,
	useGetV1FacilitiesIdStudents,
} from "#/api/endpoints/facilities/facilities";
import type {
	DtoFacilityResponse,
	DtoFacilityStudentItemResponse,
} from "#/api/model";
import {
	Badge,
	Button,
	ConfirmDialog,
	EmptyState,
	PageLoading,
	Pagination,
	useToast,
} from "#/components/ui";
import { academicYearAtom } from "#/store/global";

export const Route = createFileRoute(
	"/_authenticated/administrasi/fasilitas/$facilityId",
)({
	component: FacilityDetailPage,
	validateSearch: (params: Record<string, unknown>) => ({
		page: typeof params.page === "string" ? Number(params.page) || 1 : 1,
		search: typeof params.search === "string" ? params.search : "",
	}),
});

function FacilityDetailPage() {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const { addToast } = useToast();
	const [activeAy] = useAtom(academicYearAtom);

	const { facilityId } = Route.useParams();
	const { page, search: searchParam } = Route.useSearch();
	const [searchInput, setSearchInput] = useState(searchParam);
	const [deletingItem, setDeletingItem] =
		useState<DtoFacilityStudentItemResponse | null>(null);

	const id = Number(facilityId);

	// Fetch facility detail
	const { data: facilityResp, isLoading: facilityLoading } =
		useGetV1Facilities();
	const facilities: DtoFacilityResponse[] =
		((facilityResp as any)?.data as any)?.data || [];
	const facility = facilities.find((f: DtoFacilityResponse) => f.id === id);

	// Fetch students enrolled (using Orval-generated hook)
	const { data: studentsResp, isLoading: studentsLoading } =
		useGetV1FacilitiesIdStudents(
			id,
			{
				academic_year_id: activeAy?.id,
				page,
				limit: 15,
				search: searchParam || undefined,
			},
			{ query: { enabled: !!activeAy?.id && !!id } },
		);

	const studentsData = ((studentsResp as any)?.data as any)?.data as
		| DtoFacilityStudentItemResponse[]
		| undefined;
	const meta = ((studentsResp as any)?.data as any)?.meta as
		| { page: number; limit: number; total: number }
		| undefined;

	const isLoading = facilityLoading || studentsLoading;

	const deleteMutation = useDeleteV1StudentsIdFacilitiesFacilityId({
		mutation: {
			onSuccess: () => {
				addToast({
					variant: "success",
					title: "Berhasil",
					message: "Siswa berhasil dilepas dari fasilitas.",
				});
				queryClient.invalidateQueries({
					queryKey: ["/v1/facilities", id, "students"],
				});
				setDeletingItem(null);
			},
			onError: (err: any) =>
				addToast({ variant: "error", title: "Gagal", message: err.message }),
		},
	});

	const handleSearch = () => {
		navigate({
			from: Route.fullPath,
			search: { page: 1, search: searchInput } as any,
			replace: true,
		});
	};

	const handlePageChange = (newPage: number) => {
		navigate({
			from: Route.fullPath,
			search: { page: newPage, search: searchParam } as any,
			replace: true,
		});
	};

	const formatPrice = (amount: number) =>
		new Intl.NumberFormat("id-ID", {
			style: "currency",
			currency: "IDR",
			minimumFractionDigits: 0,
		}).format(amount);

	const formatDate = (dateStr: string) => {
		const d = new Date(dateStr);
		return d.toLocaleDateString("id-ID", {
			day: "2-digit",
			month: "short",
			year: "numeric",
		});
	};

	if (isLoading) {
		return <PageLoading />;
	}

	if (!facility) {
		return (
			<div className="space-y-6">
				<Link
					to="/administrasi/fasilitas"
					className="inline-flex items-center text-sm text-indigo-600 hover:text-indigo-800"
				>
					<ArrowLeft className="w-4 h-4 mr-1" /> Kembali ke daftar fasilitas
				</Link>
				<EmptyState
					title="Fasilitas tidak ditemukan"
					description="Fasilitas yang Anda cari tidak tersedia atau sudah dihapus."
				/>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Header */}
			<div>
				<Link
					to="/administrasi/fasilitas"
					className="inline-flex items-center text-sm text-indigo-600 hover:text-indigo-800 mb-3"
				>
					<ArrowLeft className="w-4 h-4 mr-1" /> Kembali ke daftar fasilitas
				</Link>
				<div className="flex items-center gap-3">
					<div className="flex-shrink-0 w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
						<Bus className="w-5 h-5 text-indigo-600" />
					</div>
					<div>
						<h2 className="text-2xl font-bold leading-7 text-gray-900">
							{facility.name}
						</h2>
						{facility.description && (
							<p className="mt-0.5 text-sm text-gray-500">
								{facility.description}
							</p>
						)}
					</div>
					<Badge variant={facility.is_active ? "success" : "secondary"}>
						{facility.is_active ? "Aktif" : "Nonaktif"}
					</Badge>
				</div>
				<p className="mt-2 text-sm text-gray-500">
					Total siswa terdaftar:{" "}
					<span className="font-semibold text-gray-900">
						{meta?.total ?? 0}
					</span>
				</p>
			</div>

			{/* Filter bar */}
			<div className="flex items-center gap-3">
				<div className="relative flex-1 max-w-sm">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
					<input
						type="text"
						value={searchInput}
						onChange={(e) => setSearchInput(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === "Enter") handleSearch();
						}}
						placeholder="Cari nama siswa..."
						className="block w-full rounded-md border-0 py-1.5 pl-10 pr-4 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
					/>
				</div>
				<Button variant="secondary" onClick={handleSearch}>
					Cari
				</Button>
				{searchParam && (
					<button
						type="button"
						onClick={() => {
							setSearchInput("");
							navigate({
								from: Route.fullPath,
								search: { page: 1, search: "" } as any,
								replace: true,
							});
						}}
						className="text-sm text-gray-500 hover:text-gray-700"
					>
						Reset
					</button>
				)}
			</div>

			{/* Table */}
			{!studentsData || studentsData.length === 0 ? (
				<EmptyState
					title="Belum ada siswa terdaftar"
					description={
						searchParam
							? `Tidak ada siswa dengan nama "${searchParam}" di fasilitas ini.`
							: "Daftarkan siswa melalui halaman detail siswa."
					}
				/>
			) : (
				<div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 overflow-hidden">
					<table className="min-w-full divide-y divide-gray-300">
						<thead className="bg-gray-50">
							<tr>
								<th className="py-3 pl-6 pr-3 text-left text-sm font-semibold text-gray-900">
									Nama
								</th>
								<th className="px-3 py-3 text-left text-sm font-semibold text-gray-900">
									Zona / Paket
								</th>
								<th className="px-3 py-3 text-left text-sm font-semibold text-gray-900">
									Mulai
								</th>
								<th className="px-3 py-3 text-center text-sm font-semibold text-gray-900">
									Status
								</th>
								<th className="px-3 py-3 text-right text-sm font-semibold text-gray-900 pr-6">
									Aksi
								</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-gray-100">
							{studentsData.map((sf) => (
								<tr key={sf.id} className="hover:bg-gray-50">
									<td className="py-3 pl-6 pr-3">
										<div className="text-sm font-medium text-gray-900">
											{sf.student?.full_name}
										</div>
										<div className="text-xs text-gray-500">
											{sf.student?.gender === "L" ? "Laki-laki" : "Perempuan"}
										</div>
									</td>
									<td className="px-3 py-3 text-sm text-gray-500">
										{sf.fee_config_item ? (
											<span className="inline-flex items-center gap-1">
												<span>{sf.fee_config_item.name}</span>
												<span className="text-xs text-gray-400">
													({formatPrice(sf.fee_config_item.amount ?? 0)})
												</span>
											</span>
										) : (
											"-"
										)}
									</td>
									<td className="px-3 py-3 text-sm text-gray-500">
										{sf.start_date ? formatDate(sf.start_date) : "-"}
									</td>
									<td className="px-3 py-3 text-sm text-center">
										<span
											className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
												sf.end_date
													? "bg-gray-100 text-gray-500"
													: "bg-green-100 text-green-700"
											}`}
										>
											{sf.end_date ? "Berhenti" : "Aktif"}
										</span>
									</td>
									<td className="px-3 py-3 text-right pr-6">
										{!sf.end_date && (
											<button
												type="button"
												onClick={() => setDeletingItem(sf)}
												className="inline-flex items-center gap-1 text-xs font-medium text-rose-600 hover:text-rose-800"
											>
												<UserX className="w-3.5 h-3.5" />
												Lepas
											</button>
										)}
									</td>
								</tr>
							))}
						</tbody>
					</table>

					{meta && (
						<Pagination
							page={meta.page}
							limit={meta.limit}
							total={meta.total}
							onPageChange={handlePageChange}
						/>
					)}
				</div>
			)}

			{/* Confirm Unenroll */}
			<ConfirmDialog
				open={!!deletingItem}
				onCancel={() => setDeletingItem(null)}
				onConfirm={() => {
					if (!deletingItem) return;
					deleteMutation.mutate({
						id: deletingItem.student?.id ?? 0,
						facilityId: deletingItem.id ?? 0,
					});
				}}
				title="Lepas Siswa dari Fasilitas"
				variant="danger"
				confirmLabel="Lepas"
			>
				Apakah Anda yakin ingin melepas{" "}
				<strong>{deletingItem?.student?.full_name}</strong> dari fasilitas{" "}
				<strong>{facility.name}</strong>?
			</ConfirmDialog>
		</div>
	);
}
