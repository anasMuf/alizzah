import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useAtom } from "jotai";
import {
	Download,
	Edit,
	Loader2,
	Plus,
	RefreshCw,
	Search,
	Trash2,
	Users,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import {
	getGetV1ExtracurricularsQueryKey,
	useDeleteV1ExtracurricularsId,
	useGetV1Extracurriculars,
} from "#/api/endpoints/extracurriculars/extracurriculars";
import { getGetV1InvoicesQueryKey } from "#/api/endpoints/invoices/invoices";
import { usePostV1ExtracurricularsSyncInvoices } from "#/api/endpoints/student-extracurriculars/student-extracurriculars";
import { postV1ExtracurricularsPreviewSyncInvoices } from "#/api/endpoints/sync-invoices/sync-invoices";
import type { DtoExtracurricularResponse } from "#/api/model";
import { customInstance } from "#/api/mutator/custom-instance";
import {
	SyncPreviewDialog,
	type SyncPreviewRow,
	type SyncPreviewSummaryItem,
} from "#/components/molecules/SyncPreviewDialog";
import { Button, ConfirmDialog, EmptyState, useToast } from "#/components/ui";
import { academicYearAtom } from "#/store/global";
import {
	downloadExcel,
	type ExcelSheet,
	formatDateId,
	formatGender,
	formatStatus,
} from "#/utils/excel";
import { EkskulForm } from "../../../../features/administrasi/components/EkskulForm";

const MONTH_SHORT = [
	"Jan",
	"Feb",
	"Mar",
	"Apr",
	"Mei",
	"Jun",
	"Jul",
	"Agu",
	"Sep",
	"Okt",
	"Nov",
	"Des",
];

export const Route = createFileRoute("/_authenticated/administrasi/ekskul/")({
	component: EkskulPage,
	validateSearch: (params: Record<string, unknown>) => ({
		search: typeof params.search === "string" ? params.search : undefined,
	}),
});

function EkskulPage() {
	const queryClient = useQueryClient();
	const { addToast } = useToast();
	const navigate = useNavigate();
	const searchParams = Route.useSearch();
	const [activeAy] = useAtom(academicYearAtom);

	const search = searchParams.search ?? "";

	const updateSearch = useCallback(
		(updates: Record<string, unknown>) => {
			navigate({
				from: Route.fullPath,
				search: { ...searchParams, ...updates } as typeof searchParams,
				replace: true,
			});
		},
		[navigate, searchParams],
	);

	const [isFormOpen, setIsFormOpen] = useState(false);
	const [selectedEkskul, setSelectedEkskul] =
		useState<DtoExtracurricularResponse | null>(null);

	const [isDeleteOpen, setIsDeleteOpen] = useState(false);
	const [ekskulToDelete, setEkskulToDelete] =
		useState<DtoExtracurricularResponse | null>(null);
	const [syncOpen, setSyncOpen] = useState(false);

	const { data: response, isLoading, isError } = useGetV1Extracurriculars();
	const ekskuls = (response?.data as any)?.data || [];

	const deleteMutation = useDeleteV1ExtracurricularsId({
		mutation: {
			onSuccess: () => {
				addToast({
					variant: "success",
					title: "Berhasil",
					message: "Ekstrakurikuler berhasil dihapus.",
				});
				queryClient.invalidateQueries({
					queryKey: getGetV1ExtracurricularsQueryKey(),
				});
				setIsDeleteOpen(false);
				setEkskulToDelete(null);
			},
			onError: () => {
				addToast({
					variant: "error",
					title: "Gagal",
					message:
						"Tidak dapat menghapus ekstrakurikuler. Mungkin sudah ada siswa yang terdaftar.",
				});
				setIsDeleteOpen(false);
			},
		},
	});

	const syncMutation = usePostV1ExtracurricularsSyncInvoices({
		mutation: {
			onSuccess: (res: any) => {
				const d = res?.data?.data;
				addToast({
					variant: "success",
					title: "Berhasil",
					message: d
						? `Sinkron selesai — ${d.total_synced} dari ${d.total_enrollments} enrollment diproses, ${d.total_skipped} dilewati.`
						: "Sinkronisasi tagihan selesai.",
				});
				queryClient.invalidateQueries({
					queryKey: getGetV1ExtracurricularsQueryKey(),
				});
				queryClient.invalidateQueries({ queryKey: getGetV1InvoicesQueryKey() });
				setSyncOpen(false);
			},
			onError: (err: any) =>
				addToast({ variant: "error", title: "Gagal", message: err?.message }),
		},
	});

	const loadSyncPreview = async () => {
		const res = await postV1ExtracurricularsPreviewSyncInvoices();
		const d = res.data.data;

		const rows: SyncPreviewRow[] = d.items.map((it) => {
			const monthLabels = it.months_to_add
				.map((m) => `${MONTH_SHORT[m.month - 1]} ${m.year}`)
				.join(", ");
			const skips: string[] = [];
			if (it.skipped_excluded > 0)
				skips.push(`${it.skipped_excluded} bulan di-skip`);
			if (it.skipped_exists > 0) skips.push(`${it.skipped_exists} sudah ada`);
			if (it.skipped_no_invoice > 0)
				skips.push(`${it.skipped_no_invoice} invoice belum ada`);
			const skipNote = skips.length > 0 ? ` · ${skips.join(", ")}` : "";
			return {
				key: `${it.student_id}-${it.extracurricular_id}`,
				title: it.student_name,
				action: `${it.extracurricular_name} — ${it.months_to_add.length} bulan ditambah${it.months_to_add.length > 0 ? `: ${monthLabels}` : ""}${skipNote}`,
				status: it.months_to_add.length > 0 ? "change" : "skip",
			};
		});

		const totalMonths = d.items.reduce(
			(acc, it) => acc + it.months_to_add.length,
			0,
		);
		const totalSkipped = d.items.reduce(
			(acc, it) =>
				acc + it.skipped_excluded + it.skipped_exists + it.skipped_no_invoice,
			0,
		);
		const summary: SyncPreviewSummaryItem[] = [
			{ label: "Enrollment", value: d.total_enrollments },
			{ label: "Bulan akan ditambah", value: totalMonths },
			{ label: "Bulan dilewati", value: totalSkipped },
		];
		return { summary, rows };
	};

	const filteredEkskuls = useMemo(() => {
		return ekskuls.filter((e: any) => {
			const matchSearch = e.name.toLowerCase().includes(search.toLowerCase());
			return matchSearch;
		});
	}, [ekskuls, search]);

	const [exporting, setExporting] = useState(false);

	// ─── Excel Export ──────────────────────────────────────────────────
	const handleExportExcel = async () => {
		if (!activeAy?.id) {
			addToast({
				variant: "error",
				title: "Gagal",
				message: "Pilih tahun ajaran terlebih dahulu.",
			});
			return;
		}
		setExporting(true);
		try {
			const res = await customInstance<any>(
				`/v1/extracurriculars/export?academic_year_id=${activeAy.id}`,
			);
			const items: any[] = (res as any).data?.data ?? [];

			const studentColumns = [
				{ header: "No", key: "_no", width: 5 },
				{ header: "Nama Lengkap", key: "full_name", width: 30 },
				{
					header: "Jenis Kelamin",
					key: "gender",
					width: 15,
					format: formatGender,
				},
				{ header: "Tempat Lahir", key: "birth_place", width: 20 },
				{
					header: "Tanggal Lahir",
					key: "birth_date",
					width: 20,
					format: formatDateId,
				},
				{ header: "Jenjang", key: "class_group_level", width: 12 },
				{ header: "Rombel", key: "class_group_name", width: 20 },
				{ header: "Status", key: "status", width: 15, format: formatStatus },
			];

			const sheets: ExcelSheet[] = [];

			// Sheet 1: Ringkasan semua pasta + jumlah siswa
			const summaryData = items.map((item: any, i: number) => ({
				_no: i + 1,
				extracurricular_name: item.extracurricular_name,
				student_count: item.students?.length ?? 0,
			}));
			sheets.push({
				name: "Semua Pasta",
				columns: [
					{ header: "No", key: "_no", width: 5 },
					{ header: "Nama Pasta", key: "extracurricular_name", width: 35 },
					{ header: "Jumlah Siswa", key: "student_count", width: 15 },
				],
				data: summaryData,
			});

			// Sheet per pasta: daftar siswa
			for (const item of items) {
				const students = (item.students || []).map((s: any, i: number) => ({
					...s,
					_no: i + 1,
				}));
				sheets.push({
					name: item.extracurricular_name,
					columns: studentColumns,
					data: students,
				});
			}

			const ayName = activeAy?.name ?? "semua-tahun";
			const filename = `Data-Pasta-${ayName.replace(/\s+/g, "-")}`;
			await downloadExcel(sheets, filename);

			addToast({
				variant: "success",
				title: "Berhasil",
				message: `Data ${items.length} pasta berhasil diexport ke Excel.`,
			});
		} catch (err: any) {
			addToast({
				variant: "error",
				title: "Gagal Export",
				message: err.message ?? "Terjadi kesalahan saat export data.",
			});
		} finally {
			setExporting(false);
		}
	};

	const handleEdit = (ekskul: DtoExtracurricularResponse) => {
		setSelectedEkskul(ekskul);
		setIsFormOpen(true);
	};

	const handleDelete = (ekskul: DtoExtracurricularResponse) => {
		setEkskulToDelete(ekskul);
		setIsDeleteOpen(true);
	};

	return (
		<div className="space-y-6">
			<div className="sm:flex sm:items-center sm:justify-between">
				<div>
					<h1 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:tracking-tight">
						Pasta
					</h1>
					<p className="mt-1 text-sm text-gray-500">
						Kelola data kegiatan pasta siswa.
					</p>
				</div>
				<div className="mt-4 sm:ml-4 sm:mt-0 flex gap-3">
					<Button
						variant="secondary"
						onClick={() => setSyncOpen(true)}
						title="Backfill item PASTA ke invoice bulanan semua enrollment aktif"
					>
						<RefreshCw className="h-4 w-4" />
						Sinkronkan Tagihan
					</Button>
					<Button
						variant="secondary"
						onClick={handleExportExcel}
						disabled={exporting}
					>
						{exporting ? (
							<Loader2 className="h-4 w-4 animate-spin" />
						) : (
							<Download className="h-4 w-4" />
						)}{" "}
						Export
					</Button>
					<Button
						onClick={() => {
							setSelectedEkskul(null);
							setIsFormOpen(true);
						}}
						className="flex items-center gap-2"
					>
						<Plus className="h-4 w-4" />
						Tambah Pasta
					</Button>
				</div>
			</div>

			<div className="bg-white p-4 rounded-xl shadow-sm ring-1 ring-gray-900/5">
				<div className="flex flex-col sm:flex-row gap-4">
					<div className="relative flex-1 max-w-sm">
						<div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
							<Search className="h-4 w-4 text-gray-400" />
						</div>
						<input
							type="text"
							className="block w-full rounded-md border-0 py-1.5 pl-10 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
							placeholder="Cari nama kegiatan..."
							value={search}
							onChange={(e) => updateSearch({ search: e.target.value })}
						/>
					</div>
					<div className="flex gap-2"></div>
				</div>
			</div>

			{isLoading ? (
				<div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 h-64 animate-pulse p-8"></div>
			) : isError ? (
				<div className="bg-red-50 p-4 rounded-md text-red-800">
					Gagal memuat data ekstrakurikuler.
				</div>
			) : filteredEkskuls.length === 0 ? (
				<EmptyState
					title="Tidak ada data"
					description="Belum ada pasta yang ditambahkan atau tidak ada yang cocok dengan pencarian."
				/>
			) : (
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{filteredEkskuls.map((ekskul: any) => (
						<div
							key={ekskul.id}
							className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 overflow-hidden flex flex-col"
						>
							<div className="p-5 flex-1">
								<div className="flex justify-between items-start mb-2">
									<div className="flex gap-1">
										<button
											onClick={() => handleEdit(ekskul)}
											className="p-1 text-gray-400 hover:text-indigo-600 rounded"
										>
											<Edit className="h-4 w-4" />
										</button>
										<button
											onClick={() => handleDelete(ekskul)}
											className="p-1 text-gray-400 hover:text-red-600 rounded"
										>
											<Trash2 className="h-4 w-4" />
										</button>
									</div>
								</div>
								<Link
									to="/administrasi/ekskul/$id"
									params={{ id: String(ekskul.id) }}
									search={{} as any}
									className="block group"
								>
									<h3 className="text-lg font-bold text-gray-900 mt-2 group-hover:text-indigo-600 transition-colors">
										{ekskul.name}
										{ekskul.is_mandatory && (
											<span className="ml-2 inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
												Wajib
											</span>
										)}
									</h3>
								</Link>
								<div className="mt-1 flex items-center gap-1">
									{ekskul.levels || "" ? (
										(ekskul.levels as string).split(",").map((lv: string) => (
											<span
												key={lv}
												className="inline-flex items-center rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700"
											>
												{lv === "mutiara"
													? "Mutiara"
													: lv === "intan"
														? "Intan"
														: "Berlian"}
											</span>
										))
									) : (
										<span className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
											Semua Jenjang
										</span>
									)}
								</div>
								<div className="mt-3 pt-3 border-t border-gray-100">
									<Link
										to="/administrasi/ekskul/$id"
										params={{ id: String(ekskul.id) }}
										search={{} as any}
										className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800 font-medium"
									>
										<Users className="h-4 w-4" />
										Lihat Siswa
									</Link>
								</div>
							</div>
						</div>
					))}
				</div>
			)}

			<EkskulForm
				isOpen={isFormOpen}
				onClose={() => setIsFormOpen(false)}
				initialData={selectedEkskul}
			/>

			<ConfirmDialog
				open={isDeleteOpen}
				onCancel={() => setIsDeleteOpen(false)}
				onConfirm={() =>
					ekskulToDelete &&
					deleteMutation.mutate({ id: ekskulToDelete.id as number })
				}
				title="Hapus Ekstrakurikuler"
				variant="danger"
			>
				<p>
					Anda yakin ingin menghapus <strong>{ekskulToDelete?.name}</strong>?
					Data ini tidak dapat dikembalikan.
				</p>
			</ConfirmDialog>

			{/* Dialog Preview Sinkronisasi Tagihan */}
			<SyncPreviewDialog
				open={syncOpen}
				onClose={() => setSyncOpen(false)}
				title="Sinkronkan Tagihan PASTA"
				description="Backfill item PASTA ke invoice bulanan semua enrollment aktif. Bulan yang di-skip (Kelola Bulan) tidak disentuh."
				loadPreview={loadSyncPreview}
				runSync={async () => {
					await syncMutation.mutateAsync();
				}}
			/>
		</div>
	);
}
