import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Edit, Plus, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import {
	getGetV1ExtracurricularsQueryKey,
	useDeleteV1ExtracurricularsId,
	useGetV1Extracurriculars,
} from "../../../api/endpoints/extracurriculars/extracurriculars";
import type { DtoExtracurricularResponse } from "../../../api/model";
import { Badge } from "@alizzah/ui";
import { Button } from "@alizzah/ui";
import { ConfirmDialog } from "@alizzah/ui";
import { EmptyState } from "@alizzah/ui";
import { useToast } from "@alizzah/ui";
import { EkskulForm } from "../../../features/administrasi/components/EkskulForm";

export const Route = createFileRoute("/_authenticated/administrasi/ekskul")({
	component: EkskulPage,
});

function EkskulPage() {
	const queryClient = useQueryClient();
	const { addToast } = useToast();

	const [search, setSearch] = useState("");
	const [filterType, setFilterType] = useState("all");

	const [isFormOpen, setIsFormOpen] = useState(false);
	const [selectedEkskul, setSelectedEkskul] =
		useState<DtoExtracurricularResponse | null>(null);

	const [isDeleteOpen, setIsDeleteOpen] = useState(false);
	const [ekskulToDelete, setEkskulToDelete] =
		useState<DtoExtracurricularResponse | null>(null);

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

	const filteredEkskuls = useMemo(() => {
		return ekskuls.filter((e: any) => {
			const matchSearch = e.name.toLowerCase().includes(search.toLowerCase());
			const matchType = filterType === "all" || e.type === filterType;
			return matchSearch && matchType;
		});
	}, [ekskuls, search, filterType]);

	const handleEdit = (ekskul: DtoExtracurricularResponse) => {
		setSelectedEkskul(ekskul);
		setIsFormOpen(true);
	};

	const handleDelete = (ekskul: DtoExtracurricularResponse) => {
		setEkskulToDelete(ekskul);
		setIsDeleteOpen(true);
	};

	const getEkskulTypeBadge = (type: string) => {
		switch (type.toLowerCase()) {
			case "pasta":
				return <Badge className="bg-blue-100 text-blue-700">PASTA</Badge>;
			case "calisan":
				return (
					<Badge className="bg-emerald-100 text-emerald-700">CALISAN</Badge>
				);
			case "ekskul":
				return <Badge className="bg-purple-100 text-purple-700">EKSKUL</Badge>;
			default:
				return <Badge variant="secondary">{type}</Badge>;
		}
	};

	return (
		<div className="space-y-6">
			<div className="sm:flex sm:items-center sm:justify-between">
				<div>
					<h1 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:tracking-tight">
						Master Ekstrakurikuler
					</h1>
					<p className="mt-1 text-sm text-gray-500">
						Kelola data kegiatan tambahan siswa seperti PASTA, CALISAN, dan
						Ekskul Reguler.
					</p>
				</div>
				<div className="mt-4 sm:ml-4 sm:mt-0">
					<Button
						onClick={() => {
							setSelectedEkskul(null);
							setIsFormOpen(true);
						}}
						className="flex items-center gap-2"
					>
						<Plus className="h-4 w-4" />
						Tambah Kegiatan
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
							onChange={(e) => setSearch(e.target.value)}
						/>
					</div>
					<div className="flex gap-2">
						{["all", "pasta", "calisan", "ekskul"].map((type) => (
							<button
								key={type}
								onClick={() => setFilterType(type)}
								className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
									filterType === type
										? "bg-indigo-100 text-indigo-700 ring-1 ring-inset ring-indigo-600/20"
										: "bg-white text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
								}`}
							>
								{type === "all" ? "Semua" : type.toUpperCase()}
							</button>
						))}
					</div>
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
					description="Belum ada ekstrakurikuler yang ditambahkan atau tidak ada yang cocok dengan pencarian."
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
									{getEkskulTypeBadge(ekskul.type)}
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
								<h3 className="text-lg font-bold text-gray-900 mt-2">
									{ekskul.name}
								</h3>
								<p className="mt-1 text-sm text-gray-500 line-clamp-2">
									Kegiatan Ekstrakurikuler
								</p>
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
		</div>
	);
}
