import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus, Search, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { ApiError } from "#/api/mutator/custom-instance";
import {
	Badge,
	Button,
	ConfirmDialog,
	EmptyState,
	FormField,
	Input,
	SlideOver,
	useToast,
} from "#/components/ui";
import {
	type Employee,
	type EmployeeInput,
	useDeleteEmployee,
	useEmployees,
	useGolongans,
	useSaveEmployee,
} from "#/features/sdm/api";
import { formatDate } from "#/utils/format";

export const Route = createFileRoute("/_authenticated/sdm/guru/")({
	component: GuruListPage,
});

function GuruListPage() {
	const { addToast } = useToast();
	const [search, setSearch] = useState("");
	const [debounced, setDebounced] = useState("");
	const [formOpen, setFormOpen] = useState(false);
	const [editing, setEditing] = useState<Employee | null>(null);
	const [deleting, setDeleting] = useState<Employee | null>(null);

	const { data: golongans = [] } = useGolongans();
	const { data: employees = [], isLoading, isError } = useEmployees(debounced);
	const saveEmp = useSaveEmployee();
	const deleteEmp = useDeleteEmployee();

	// Debounce sederhana untuk pencarian.
	useEffect(() => {
		const t = setTimeout(() => setDebounced(search), 300);
		return () => clearTimeout(t);
	}, [search]);

	const golonganKode = (id?: number | null) =>
		golongans.find((g) => g.id === id)?.kode ?? "-";

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">Data Karyawan</h1>
					<p className="text-sm text-gray-500">
						Master guru & tenaga kependidikan — golongan, sertifikasi/impasing.
					</p>
				</div>
				<Button
					variant="primary"
					onClick={() => {
						setEditing(null);
						setFormOpen(true);
					}}
				>
					<Plus className="h-4 w-4 mr-1.5" /> Tambah Karyawan
				</Button>
			</div>

			<div className="relative max-w-sm">
				<Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
				<Input
					className="pl-9"
					placeholder="Cari nama karyawan..."
					value={search}
					onChange={(e) => setSearch(e.target.value)}
				/>
			</div>

			{isLoading ? (
				<p className="text-sm text-gray-500">Memuat karyawan...</p>
			) : isError ? (
				<p className="text-sm text-red-600">Gagal memuat karyawan.</p>
			) : employees.length === 0 ? (
				<EmptyState
					icon={<Users className="h-10 w-10 text-gray-400" />}
					title="Belum ada karyawan"
					description="Tambahkan data karyawan untuk mulai mengelola penggajian."
				/>
			) : (
				<div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
					<table className="min-w-full divide-y divide-gray-200">
						<thead className="bg-gray-50">
							<tr>
								<th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
									Nama
								</th>
								<th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
									Masuk
								</th>
								<th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
									Golongan
								</th>
								<th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
									Status
								</th>
								<th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">
									Aksi
								</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-gray-100">
							{employees.map((e) => (
								<tr key={e.id} className="hover:bg-gray-50">
									<td className="px-4 py-3 text-sm font-medium text-gray-900">
										<Link
											to="/sdm/guru/$id"
											params={{ id: String(e.id) }}
											className="hover:text-indigo-600"
										>
											{e.nama}
										</Link>
									</td>
									<td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
										{formatDate(e.tgl_masuk ?? undefined)}
									</td>
									<td className="px-4 py-3 text-sm whitespace-nowrap">
										<Badge variant="info">
											{golonganKode(e.effective_golongan_id)}
										</Badge>
									</td>
									<td className="px-4 py-3 text-sm space-x-1">
										{e.sertifikasi && (
											<Badge variant="warning">Sertifikasi</Badge>
										)}
										{e.impasing && <Badge variant="danger">Impasing</Badge>}
										{!e.is_active && (
											<Badge variant="secondary">Nonaktif</Badge>
										)}
									</td>
									<td className="px-4 py-3 text-right whitespace-nowrap">
										<button
											type="button"
											onClick={() => {
												setEditing(e);
												setFormOpen(true);
											}}
											className="text-indigo-600 hover:text-indigo-800 mr-3 text-sm"
										>
											Ubah
										</button>
										<button
											type="button"
											onClick={() => setDeleting(e)}
											className="text-red-600 hover:text-red-800 text-sm"
										>
											Hapus
										</button>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}

			<EmployeeForm
				isOpen={formOpen}
				onClose={() => setFormOpen(false)}
				initial={editing}
				golongans={golongans}
				onSubmit={(id, body) =>
					saveEmp.mutate(
						{ id, body },
						{
							onSuccess: () => {
								addToast({
									variant: "success",
									title: "Berhasil",
									message: id
										? "Karyawan diperbarui."
										: "Karyawan ditambahkan.",
								});
								setFormOpen(false);
							},
							onError: (err: Error) =>
								addToast({
									variant: "error",
									title: "Gagal",
									message:
										err instanceof ApiError ? err.message : "Terjadi kesalahan",
								}),
						},
					)
				}
			/>

			<ConfirmDialog
				open={!!deleting}
				title="Hapus Karyawan?"
				description={
					deleting
						? `Data "${deleting.nama}" akan dihapus permanen. Karyawan dengan riwayat absen/pinjaman tidak bisa dihapus.`
						: ""
				}
				confirmLabel="Hapus"
				onConfirm={() => {
					if (!deleting) return;
					deleteEmp.mutate(deleting.id, {
						onSuccess: () => {
							addToast({
								variant: "success",
								title: "Berhasil",
								message: "Karyawan dihapus.",
							});
							setDeleting(null);
						},
						onError: (err: Error) =>
							addToast({
								variant: "error",
								title: "Gagal",
								message:
									err instanceof ApiError ? err.message : "Terjadi kesalahan",
							}),
					});
				}}
				onCancel={() => setDeleting(null)}
			/>
		</div>
	);
}

function EmployeeForm({
	isOpen,
	onClose,
	initial,
	golongans,
	onSubmit,
}: {
	isOpen: boolean;
	onClose: () => void;
	initial: Employee | null;
	golongans: Array<{ id: number; kode: string; keterangan: string }>;
	onSubmit: (id: number | undefined, body: EmployeeInput) => void;
}) {
	const [nama, setNama] = useState("");
	const [tglMasuk, setTglMasuk] = useState("");
	const [golonganId, setGolonganId] = useState("");
	const [sertifikasi, setSertifikasi] = useState(false);
	const [impasing, setImpasing] = useState(false);
	const [isActive, setIsActive] = useState(true);

	// Reset form saat dibuka.
	const formKey = isOpen ? (initial?.id ?? "new") : "closed";
	const [key, setKey] = useState(formKey);
	if (key !== formKey) {
		setKey(formKey);
		if (initial) {
			setNama(initial.nama);
			setTglMasuk(initial.tgl_masuk ?? "");
			setGolonganId(initial.golongan_id ? String(initial.golongan_id) : "");
			setSertifikasi(initial.sertifikasi);
			setImpasing(initial.impasing);
			setIsActive(initial.is_active);
		} else {
			setNama("");
			setTglMasuk("");
			setGolonganId("");
			setSertifikasi(false);
			setImpasing(false);
			setIsActive(true);
		}
	}

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (!nama.trim()) return;
		onSubmit(initial?.id, {
			nama: nama.trim(),
			tgl_masuk: tglMasuk || null,
			golongan_id: golonganId ? Number(golonganId) : null,
			sertifikasi,
			impasing,
			is_active: isActive,
		});
	};

	return (
		<SlideOver
			isOpen={isOpen}
			onClose={onClose}
			title={initial ? "Ubah Karyawan" : "Tambah Karyawan"}
			footer={
				<>
					<Button variant="secondary" onClick={onClose}>
						Batal
					</Button>
					<Button variant="primary" onClick={handleSubmit}>
						Simpan
					</Button>
				</>
			}
		>
			<form onSubmit={handleSubmit} className="space-y-6">
				<FormField
					id="nama"
					label="Nama Lengkap"
					placeholder="mis. Abdul Rohim, S.PdI"
					value={nama}
					onChange={(e) => setNama(e.target.value)}
					required
				/>
				<div className="grid grid-cols-2 gap-4">
					<FormField
						id="tgl_masuk"
						label="Tanggal Masuk"
						type="date"
						value={tglMasuk}
						onChange={(e) => setTglMasuk(e.target.value)}
					/>
					<div>
						<label
							htmlFor="golongan_id"
							className="block text-sm font-medium leading-6 text-gray-900 mb-2"
						>
							Golongan
						</label>
						<select
							id="golongan_id"
							value={golonganId}
							onChange={(e) => setGolonganId(e.target.value)}
							className="block w-full rounded-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm"
						>
							<option value="">Otomatis (dari masa kerja)</option>
							{golongans.map((g) => (
								<option key={g.id} value={g.id}>
									Golongan {g.kode} — {g.keterangan}
								</option>
							))}
						</select>
					</div>
				</div>

				<div className="space-y-3 rounded-lg bg-gray-50 p-4">
					<p className="text-sm font-medium text-gray-900">Penghargaan</p>
					<label className="flex items-center gap-2 text-sm text-gray-700">
						<input
							type="checkbox"
							checked={sertifikasi}
							onChange={(e) => {
								setSertifikasi(e.target.checked);
								if (e.target.checked) setImpasing(false);
							}}
							className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
						/>
						Sertifikasi (gaji pokok 50%)
					</label>
					<label className="flex items-center gap-2 text-sm text-gray-700">
						<input
							type="checkbox"
							checked={impasing}
							onChange={(e) => {
								setImpasing(e.target.checked);
								if (e.target.checked) setSertifikasi(false);
							}}
							className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
						/>
						Impasing (gaji pokok 0%)
					</label>
				</div>

				<label className="flex items-center gap-2 text-sm text-gray-700">
					<input
						type="checkbox"
						checked={isActive}
						onChange={(e) => setIsActive(e.target.checked)}
						className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
					/>
					Karyawan aktif
				</label>
			</form>
		</SlideOver>
	);
}
