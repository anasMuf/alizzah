import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { ChevronRight, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { useGetV1AcademicYears } from "#/api/endpoints/academic-years/academic-years";
import {
	getGetV1FeeConfigsQueryKey,
	useGetV1FeeConfigs,
	usePostV1FeeConfigs,
} from "#/api/endpoints/fee-configs/fee-configs";
import type { DtoFeeConfigResponse } from "#/api/model";
import { ApiError } from "#/api/mutator/custom-instance";
import {
	Badge,
	Button,
	EmptyState,
	SlideOver,
	useToast,
} from "#/components/ui";

export const Route = createFileRoute("/_authenticated/pengaturan/tarif/")({
	beforeLoad: () => {
		const role = localStorage.getItem("alizzah_role");
		if (role !== "superadmin") {
			throw redirect({ to: "/" });
		}
	},
	component: PengaturanTarifComponent,
});

function PengaturanTarifComponent() {
	const navigate = useNavigate();
	const queryClient = useQueryClient();

	const [isFormOpen, setIsFormOpen] = useState(false);

	const { data: response, isLoading, isError } = useGetV1FeeConfigs();
	const feeConfigs: DtoFeeConfigResponse[] =
		(response?.data as any)?.data || [];

	return (
		<div className="space-y-6">
			<div className="sm:flex sm:items-center sm:justify-between">
				<div>
					<h1 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:tracking-tight">
						Konfigurasi Tarif
					</h1>
					<p className="mt-1 text-sm text-gray-500">
						Kelola tarif biaya pendidikan per tahun ajaran.
					</p>
				</div>
				<div className="mt-4 sm:ml-4 sm:mt-0">
					<Button
						onClick={() => setIsFormOpen(true)}
						className="flex items-center gap-2"
					>
						<Plus className="h-4 w-4" />
						Buat Konfigurasi Baru
					</Button>
				</div>
			</div>

			{isLoading ? (
				<div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 h-64 animate-pulse" />
			) : isError ? (
				<div className="bg-red-50 p-4 rounded-md text-red-800">
					Gagal memuat data konfigurasi tarif.
				</div>
			) : feeConfigs.length === 0 ? (
				<EmptyState
					title="Belum ada konfigurasi tarif"
					description="Buat konfigurasi tarif baru untuk tahun ajaran yang tersedia."
					action={
						<Button
							onClick={() => setIsFormOpen(true)}
							className="flex items-center gap-2"
						>
							<Plus className="h-4 w-4" />
							Buat Konfigurasi
						</Button>
					}
				/>
			) : (
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{feeConfigs.map((fc) => (
						<button
							key={fc.id}
							onClick={() =>
								navigate({
									to: "/pengaturan/tarif/$id",
									params: { id: String(fc.id) },
								})
							}
							className="text-left bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 overflow-hidden hover:ring-indigo-300 hover:shadow-md transition-all p-5"
						>
							<div className="flex items-start justify-between">
								<div className="flex-1">
									<h3 className="text-lg font-bold text-gray-900">
										{fc.academic_year?.name || "Tahun Ajaran"}
									</h3>
									<p className="mt-1 text-sm text-gray-500">
										Admin tabungan: {fc.savings_admin_rate ?? 0}%
									</p>
									<div className="mt-3 flex items-center gap-2">
										<Badge variant="secondary">
											{fc.items?.length || 0} item tarif
										</Badge>
									</div>
								</div>
								<ChevronRight className="h-5 w-5 text-gray-400 mt-1 shrink-0" />
							</div>
						</button>
					))}
				</div>
			)}

			<CreateFeeConfigSlideOver
				isOpen={isFormOpen}
				onClose={() => setIsFormOpen(false)}
				existingYearIds={
					feeConfigs
						.map((fc) => fc.academic_year?.id)
						.filter(Boolean) as number[]
				}
				onSuccess={() =>
					queryClient.invalidateQueries({
						queryKey: getGetV1FeeConfigsQueryKey(),
					})
				}
			/>
		</div>
	);
}

function CreateFeeConfigSlideOver({
	isOpen,
	onClose,
	existingYearIds,
	onSuccess,
}: {
	isOpen: boolean;
	onClose: () => void;
	existingYearIds: number[];
	onSuccess: () => void;
}) {
	const { addToast } = useToast();

	const [academicYearId, setAcademicYearId] = useState<number>(0);
	const [savingsAdminRate, setSavingsAdminRate] = useState<number>(0);

	const { data: ayResponse } = useGetV1AcademicYears();
	const academicYears = (ayResponse?.data as any)?.data || [];
	const availableYears = academicYears.filter(
		(ay: any) => !existingYearIds.includes(ay.id),
	);

	useEffect(() => {
		if (isOpen) {
			setAcademicYearId(availableYears[0]?.id || 0);
			setSavingsAdminRate(0);
		}
	}, [isOpen]);

	const createMutation = usePostV1FeeConfigs({
		mutation: {
			onSuccess: () => {
				addToast({
					variant: "success",
					title: "Berhasil",
					message: "Konfigurasi tarif berhasil dibuat.",
				});
				onSuccess();
				onClose();
			},
			onError: (error: Error) => {
				const msg =
					error instanceof ApiError
						? error.message
						: "Gagal membuat konfigurasi tarif.";
				addToast({ variant: "error", title: "Gagal", message: msg });
			},
		},
	});

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (!academicYearId) return;
		createMutation.mutate({
			data: {
				academic_year_id: academicYearId,
				savings_admin_rate: savingsAdminRate,
			},
		});
	};

	return (
		<SlideOver
			isOpen={isOpen}
			onClose={onClose}
			title="Buat Konfigurasi Tarif"
			footer={
				<>
					<Button
						variant="secondary"
						onClick={onClose}
						disabled={createMutation.isPending}
					>
						Batal
					</Button>
					<Button
						variant="primary"
						onClick={handleSubmit}
						disabled={createMutation.isPending || !academicYearId}
					>
						{createMutation.isPending ? "Menyimpan..." : "Simpan"}
					</Button>
				</>
			}
		>
			<form onSubmit={handleSubmit} className="space-y-6">
				<div>
					<label
						htmlFor="academic_year_id"
						className="block text-sm font-medium leading-6 text-gray-900 mb-2"
					>
						Tahun Ajaran
					</label>
					{availableYears.length === 0 ? (
						<p className="text-sm text-gray-500">
							Semua tahun ajaran sudah memiliki konfigurasi tarif.
						</p>
					) : (
						<select
							id="academic_year_id"
							value={academicYearId}
							onChange={(e) => setAcademicYearId(Number(e.target.value))}
							className="block w-full rounded-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
							required
						>
							{availableYears.map((ay: any) => (
								<option key={ay.id} value={ay.id}>
									{ay.name}
								</option>
							))}
						</select>
					)}
				</div>
				<div>
					<label
						htmlFor="savings_admin_rate"
						className="block text-sm font-medium leading-6 text-gray-900 mb-2"
					>
						Rate Admin Tabungan (%)
					</label>
					<input
						id="savings_admin_rate"
						type="number"
						min={0}
						max={100}
						step={0.1}
						value={savingsAdminRate}
						onChange={(e) => setSavingsAdminRate(Number(e.target.value))}
						className="block w-full rounded-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
						required
					/>
					<p className="mt-1 text-xs text-gray-500">
						Persentase biaya admin yang dikenakan pada tabungan siswa.
					</p>
				</div>
			</form>
		</SlideOver>
	);
}
