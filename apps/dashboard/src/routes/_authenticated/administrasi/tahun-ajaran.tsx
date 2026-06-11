import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Calendar, CheckCircle2, Plus } from "lucide-react";
import { useState } from "react";
import {
	getGetV1AcademicYearsQueryKey,
	useGetV1AcademicYears,
	usePatchV1AcademicYearsIdActivate,
} from "@alizzah/api-client/endpoints/academic-years/academic-years";
import type { DtoAcademicYearResponse } from "@alizzah/api-client/model";
import { ApiError } from "@alizzah/api-client/mutator/custom-instance";
import { Badge } from "@alizzah/ui";
import { Button } from "@alizzah/ui";
import { ConfirmDialog } from "@alizzah/ui";
import { EmptyState } from "@alizzah/ui";
import { useToast } from "@alizzah/ui";
import { AcademicYearForm } from "../../../features/administrasi/components/AcademicYearForm";

export const Route = createFileRoute(
	"/_authenticated/administrasi/tahun-ajaran",
)({
	component: AcademicYearsPage,
});

function AcademicYearsPage() {
	const queryClient = useQueryClient();
	const { addToast } = useToast();

	const { data: response, isLoading, isError } = useGetV1AcademicYears();
	const academicYears = (response as any)?.data?.data || [];

	const [isFormOpen, setIsFormOpen] = useState(false);
	const [selectedAy, setSelectedAy] = useState<DtoAcademicYearResponse | null>(
		null,
	);

	const [isConfirmActivateOpen, setIsConfirmActivateOpen] = useState(false);
	const [ayToActivate, setAyToActivate] =
		useState<DtoAcademicYearResponse | null>(null);

	const activateMutation = usePatchV1AcademicYearsIdActivate({
		mutation: {
			onSuccess: () => {
				addToast({
					variant: "success",
					title: "Berhasil",
					message: "Tahun ajaran diaktifkan.",
				});
				queryClient.invalidateQueries({
					queryKey: getGetV1AcademicYearsQueryKey(),
				});
				setIsConfirmActivateOpen(false);
				setAyToActivate(null);
			},
			onError: (error: Error) => {
				const msg =
					error instanceof ApiError ? error.message : "Terjadi kesalahan";
				addToast({ variant: "error", title: "Gagal", message: msg });
				setIsConfirmActivateOpen(false);
				setAyToActivate(null);
			},
		},
	});

	const handleCreate = () => {
		setSelectedAy(null);
		setIsFormOpen(true);
	};

	const handleEdit = (ay: DtoAcademicYearResponse) => {
		setSelectedAy(ay);
		setIsFormOpen(true);
	};

	const handleActivateClick = (ay: DtoAcademicYearResponse) => {
		setAyToActivate(ay);
		setIsConfirmActivateOpen(true);
	};

	const confirmActivate = () => {
		if (ayToActivate) {
			activateMutation.mutate({ id: ayToActivate.id as number });
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
						Tahun Ajaran
					</h1>
					<p className="mt-1 text-sm text-gray-500">
						Kelola periode tahun ajaran aktif untuk seluruh sistem.
					</p>
				</div>
				<div className="mt-4 sm:ml-4 sm:mt-0">
					<Button onClick={handleCreate} className="flex items-center gap-2">
						<Plus className="h-4 w-4" />
						Buat Baru
					</Button>
				</div>
			</div>

			{isLoading ? (
				<div className="space-y-4 animate-pulse">
					{[1, 2, 3].map((i) => (
						<div key={i} className="h-20 bg-gray-200 rounded-lg w-full"></div>
					))}
				</div>
			) : isError ? (
				<div className="bg-red-50 p-4 rounded-md">
					<p className="text-red-800">Gagal memuat data tahun ajaran.</p>
				</div>
			) : academicYears.length === 0 ? (
				<EmptyState
					title="Belum ada tahun ajaran"
					description="Buat tahun ajaran pertama untuk memulai pencatatan pendaftaran dan keuangan."
					action={
						<Button onClick={handleCreate}>Buat Tahun Ajaran Baru</Button>
					}
				/>
			) : (
				<div className="overflow-hidden bg-white shadow sm:rounded-md">
					<ul role="list" className="divide-y divide-gray-200">
						{academicYears.map((ay: any) => (
							<li key={ay.id} className="px-4 py-4 sm:px-6">
								<div className="flex items-center justify-between">
									<div className="flex flex-col">
										<div className="flex items-center gap-3">
											<p className="truncate text-lg font-medium text-indigo-600">
												{ay.name}
											</p>
											{ay.is_active && (
												<Badge
													variant="success"
													className="flex items-center gap-1"
												>
													<CheckCircle2 className="w-3 h-3" />
													Aktif
												</Badge>
											)}
										</div>
										<div className="mt-2 flex items-center text-sm text-gray-500 gap-1">
											<Calendar className="mr-1.5 h-4 w-4 flex-shrink-0 text-gray-400" />
											<p>
												{formatDate(ay.start_date)} &ndash;{" "}
												{formatDate(ay.end_date)}
											</p>
										</div>
									</div>

									<div className="flex items-center gap-4">
										{!ay.is_active && (
											<Button
												variant="secondary"
												size="sm"
												onClick={() => handleActivateClick(ay)}
											>
												Aktifkan
											</Button>
										)}
										<Button variant="secondary" onClick={() => handleEdit(ay)}>
											Edit
										</Button>
									</div>
								</div>
							</li>
						))}
					</ul>
				</div>
			)}

			{/* SlideOver Form */}
			<AcademicYearForm
				isOpen={isFormOpen}
				onClose={() => setIsFormOpen(false)}
				initialData={selectedAy}
			/>

			{/* Confirm Dialog */}
			<ConfirmDialog
				open={isConfirmActivateOpen}
				onCancel={() => setIsConfirmActivateOpen(false)}
				onConfirm={confirmActivate}
				title="Aktifkan Tahun Ajaran"
				variant="primary"
			>
				<p>
					Anda yakin ingin mengaktifkan Tahun Ajaran{" "}
					<strong>{ayToActivate?.name}</strong>? Tindakan ini akan menonaktifkan
					tahun ajaran yang sedang aktif saat ini.
				</p>
			</ConfirmDialog>
		</div>
	);
}
