import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useAtom } from "jotai";
import { Bus, Plus, X } from "lucide-react";
import { useState } from "react";
import {
	facilityKeys,
	useEnrollFacility,
	useGetFacilities,
	useGetStudentFacilities,
	useUnenrollFacility,
} from "#/api/endpoints/facilities/facilities";
import {
	Badge,
	Button,
	ConfirmDialog,
	SlideOver,
	useToast,
} from "#/components/ui";
import { academicYearAtom } from "../../../../../store/global";
import { formatDate } from "../../../../../utils/format";

export const Route = createFileRoute(
	"/_authenticated/administrasi/siswa/$id/fasilitas",
)({
	component: SiswaFasilitasPage,
});

function SiswaFasilitasPage() {
	const { id } = Route.useParams();
	const studentId = Number(id);
	const queryClient = useQueryClient();
	const { addToast } = useToast();
	const [activeAy] = useAtom(academicYearAtom);

	const [isFormOpen, setIsFormOpen] = useState(false);
	const [selectedFacilityId, setSelectedFacilityId] = useState("");
	const [startDate, setStartDate] = useState(
		new Date().toISOString().split("T")[0],
	);
	const [deletingItem, setDeletingItem] = useState<any>(null);

	const { data: sfResp, isLoading } = useGetStudentFacilities(
		studentId,
		{ academic_year_id: activeAy?.id },
		{ query: { enabled: !!activeAy?.id } },
	);
	const studentFacilities: any[] = ((sfResp as any)?.data as any)?.data || [];

	const { data: masterResp } = useGetFacilities();
	const allFacilities: any[] = ((masterResp as any)?.data as any)?.data || [];

	// Filter out already enrolled
	const enrolledIds = new Set(
		studentFacilities
			.filter((sf: any) => !sf.end_date)
			.map((sf: any) => sf.facility.id),
	);
	const availableFacilities = allFacilities.filter(
		(f: any) => f.is_active && !enrolledIds.has(f.id),
	);

	const invalidate = () =>
		queryClient.invalidateQueries({
			queryKey: facilityKeys.studentList(studentId),
		});

	const enrollMutation = useEnrollFacility({
		mutation: {
			onSuccess: () => {
				addToast({
					variant: "success",
					title: "Berhasil",
					message: "Siswa berhasil didaftarkan ke fasilitas.",
				});
				invalidate();
				setIsFormOpen(false);
			},
			onError: (err: any) =>
				addToast({ variant: "error", title: "Gagal", message: err.message }),
		},
	});

	const unenrollMutation = useUnenrollFacility({
		mutation: {
			onSuccess: () => {
				addToast({
					variant: "success",
					title: "Berhasil",
					message: "Siswa berhasil dilepas dari fasilitas.",
				});
				invalidate();
				setDeletingItem(null);
			},
			onError: (err: any) =>
				addToast({ variant: "error", title: "Gagal", message: err.message }),
		},
	});

	const handleEnroll = (e: React.FormEvent) => {
		e.preventDefault();
		if (!selectedFacilityId || !activeAy?.id) return;
		enrollMutation.mutate({
			studentId,
			data: {
				facility_id: Number(selectedFacilityId),
				academic_year_id: activeAy.id,
				start_date: startDate,
			},
		});
	};

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<h3 className="text-lg font-semibold text-gray-900">
					Fasilitas Terdaftar
				</h3>
				<Button
					variant="primary"
					onClick={() => {
						setSelectedFacilityId("");
						setIsFormOpen(true);
					}}
					disabled={availableFacilities.length === 0}
				>
					<Plus className="w-4 h-4 mr-2" /> Tambah Fasilitas
				</Button>
			</div>

			{isLoading ? (
				<div className="animate-pulse space-y-3">
					{[1, 2].map((n) => (
						<div key={n} className="h-14 bg-gray-200 rounded-lg" />
					))}
				</div>
			) : studentFacilities.length === 0 ? (
				<div className="text-center py-8 text-gray-500">
					<Bus className="w-10 h-10 text-gray-300 mx-auto mb-2" />
					<p className="text-sm">Siswa belum terdaftar di fasilitas apapun.</p>
				</div>
			) : (
				<div className="space-y-3">
					{studentFacilities.map((sf: any) => (
						<div
							key={sf.id}
							className={`flex items-center justify-between p-4 rounded-lg border ${sf.end_date ? "bg-gray-50 border-gray-200" : "bg-white border-indigo-200"}`}
						>
							<div className="flex items-center gap-3">
								<Bus
									className={`w-5 h-5 ${sf.end_date ? "text-gray-400" : "text-indigo-500"}`}
								/>
								<div>
									<p className="text-sm font-medium text-gray-900">
										{sf.facility.name}
									</p>
									<p className="text-xs text-gray-500">
										Mulai: {formatDate(sf.start_date)}
										{sf.end_date && (
											<> &bull; Berakhir: {formatDate(sf.end_date)}</>
										)}
									</p>
								</div>
							</div>
							<div className="flex items-center gap-2">
								{sf.end_date ? (
									<Badge variant="danger">Nonaktif</Badge>
								) : (
									<>
										<Badge variant="success">Aktif</Badge>
										<button
											type="button"
											onClick={() => setDeletingItem(sf)}
											className="p-1 rounded text-gray-400 hover:text-rose-600 hover:bg-rose-50"
											title="Lepas dari fasilitas"
										>
											<X className="w-4 h-4" />
										</button>
									</>
								)}
							</div>
						</div>
					))}
				</div>
			)}

			{/* Enroll Form */}
			<SlideOver
				isOpen={isFormOpen}
				onClose={() => setIsFormOpen(false)}
				title="Tambah Fasilitas"
			>
				<form onSubmit={handleEnroll} className="flex h-full flex-col bg-white">
					<div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 space-y-6">
						<div>
							<label className="block text-sm font-medium text-gray-900 mb-2">
								Pilih Fasilitas
							</label>
							<select
								value={selectedFacilityId}
								onChange={(e) => setSelectedFacilityId(e.target.value)}
								className="block w-full rounded-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
							>
								<option value="">— Pilih fasilitas —</option>
								{availableFacilities.map((f: any) => (
									<option key={f.id} value={f.id}>
										{f.name}
									</option>
								))}
							</select>
							{availableFacilities.length === 0 && (
								<p className="mt-1 text-xs text-amber-600">
									Semua fasilitas sudah terdaftar untuk siswa ini.
								</p>
							)}
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-900 mb-2">
								Tanggal Mulai
							</label>
							<input
								type="date"
								value={startDate}
								onChange={(e) => setStartDate(e.target.value)}
								className="block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
								required
							/>
						</div>
					</div>
					<div className="flex-shrink-0 border-t border-gray-200 px-4 py-5 sm:px-6 flex justify-end gap-3">
						<Button
							type="button"
							variant="secondary"
							onClick={() => setIsFormOpen(false)}
						>
							Batal
						</Button>
						<Button
							type="submit"
							variant="primary"
							disabled={!selectedFacilityId || enrollMutation.isPending}
						>
							{enrollMutation.isPending ? "Menyimpan..." : "Daftarkan"}
						</Button>
					</div>
				</form>
			</SlideOver>

			{/* Confirm Unenroll */}
			<ConfirmDialog
				open={!!deletingItem}
				onCancel={() => setDeletingItem(null)}
				onConfirm={() =>
					deletingItem &&
					unenrollMutation.mutate({ studentId, sfId: deletingItem.id })
				}
				title="Lepas Fasilitas"
				variant="danger"
				confirmLabel="Lepas"
			>
				Apakah Anda yakin ingin melepas siswa dari fasilitas{" "}
				<strong>{deletingItem?.facility?.name}</strong>? Item tagihan terkait
				yang belum dibayar akan dihapus dari tagihan bulan ini ke depan.
			</ConfirmDialog>
		</div>
	);
}
