import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
	Download,
	FileDown,
	Loader2,
	Plus,
	Search,
	Upload,
	Users,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { ApiError } from "#/api/mutator/custom-instance";
import {
	Badge,
	Button,
	ConfirmDialog,
	EmptyState,
	FormField,
	Input,
	SlideOver,
	Table,
	TableBody,
	TableHead,
	useToast,
} from "#/components/ui";
import {
	type Employee,
	type EmployeeInput,
	useDeleteEmployee,
	useEmployeesInfinite,
	useGolongans,
	useSaveEmployee,
} from "#/features/sdm/api";
import { EmployeeImportDialog } from "#/features/sdm/components/EmployeeImport";
import { sdmGet } from "#/features/sdm/lib/client";
import { formatDate } from "#/utils/format";

export const Route = createFileRoute("/_authenticated/sdm/guru/")({
	component: GuruListPage,
	validateSearch: (
		search: Record<string, unknown>,
	): { q?: string; golongan?: number } => {
		const out: { q?: string; golongan?: number } = {};
		const q = search.q;
		if (typeof q === "string" && q !== "") out.q = q;
		const golongan = Number(search.golongan);
		if (Number.isFinite(golongan) && golongan > 0) out.golongan = golongan;
		return out;
	},
});

const PAGE_SIZE = 10;

// Kolom Excel untuk export & template import (cocok dengan parser import).
const IMPORT_HEADERS = [
	"ID",
	"Nama",
	"No. Telp",
	"Tgl Masuk",
	"Golongan",
	"Sertifikasi",
	"Impasing",
	"Aktif",
];
const IMPORT_COLS = [
	{ wch: 6 },
	{ wch: 30 },
	{ wch: 16 },
	{ wch: 12 },
	{ wch: 9 },
	{ wch: 10 },
	{ wch: 10 },
	{ wch: 7 },
];

function GuruListPage() {
	const { addToast } = useToast();
	const navigate = useNavigate();
	const { q, golongan: golonganParam } = Route.useSearch();
	// `search` = nilai input (lokal, agar mengetik responsif); debounce akan
	// menyinkronkannya ke URL sebagai `q`.
	const [search, setSearch] = useState(q ?? "");
	// Nilai `q` terakhir yang kita tulis sendiri ke URL — untuk membedakan
	// perubahan URL internal (debounce) vs eksternal (back/forward).
	const lastEmitted = useRef<string | undefined>(undefined);
	const [formOpen, setFormOpen] = useState(false);
	const [editing, setEditing] = useState<Employee | null>(null);
	const [deleting, setDeleting] = useState<Employee | null>(null);
	const [importOpen, setImportOpen] = useState(false);

	const { data: golongans = [] } = useGolongans();
	const {
		data,
		isLoading,
		isError,
		fetchNextPage,
		hasNextPage,
		isFetchingNextPage,
	} = useEmployeesInfinite(q ?? "", false, PAGE_SIZE, golonganParam);
	const saveEmp = useSaveEmployee();
	const deleteEmp = useDeleteEmployee();

	const employees = useMemo(
		() => data?.pages.flatMap((p) => p.data) ?? [],
		[data],
	);
	const total = data?.pages[0]?.meta.total ?? 0;

	// Debounce sederhana untuk pencarian: tulis ke URL setelah 300ms jeda.
	useEffect(() => {
		const t = setTimeout(() => {
			const next = search || undefined;
			lastEmitted.current = next;
			navigate({
				to: "/sdm/guru",
				search: (prev) => ({ ...prev, q: next }),
				replace: true,
			});
		}, 300);
		return () => clearTimeout(t);
	}, [search, navigate]);

	// Sinkronkan input saat URL berubah dari luar (mis. tombol back/forward).
	// Perubahan yang berasal dari debounce sendiri diabaikan agar ketikan yang
	// lebih baru tidak tertimpa nilai lama.
	useEffect(() => {
		if (q !== lastEmitted.current) setSearch(q ?? "");
	}, [q]);

	// Infinite scroll: muat halaman berikutnya saat sentinel terlihat.
	const sentinelRef = useRef<HTMLDivElement>(null);
	useEffect(() => {
		const el = sentinelRef.current;
		if (!el) return;
		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
					fetchNextPage();
				}
			},
			{ rootMargin: "200px" },
		);
		observer.observe(el);
		return () => observer.disconnect();
	}, [hasNextPage, isFetchingNextPage, fetchNextPage]);

	const golonganKode = (id?: number | null) =>
		golongans.find((g) => g.id === id)?.kode ?? "-";

	const handleExport = async () => {
		try {
			const all = await sdmGet<Employee[]>("/employees", { all: true });
			const body = all.map((e) => [
				e.id,
				e.nama,
				e.no_telp ?? "",
				e.tgl_masuk ?? "",
				e.golongan?.kode ?? "",
				e.sertifikasi ? "ya" : "tidak",
				e.impasing ? "ya" : "tidak",
				e.is_active ? "ya" : "tidak",
			]);
			const ws = XLSX.utils.aoa_to_sheet([IMPORT_HEADERS, ...body]);
			ws["!cols"] = IMPORT_COLS;
			const wb = XLSX.utils.book_new();
			XLSX.utils.book_append_sheet(wb, ws, "Karyawan");
			XLSX.writeFile(
				wb,
				`karyawan-${new Date().toISOString().slice(0, 10)}.xlsx`,
			);
			addToast({
				variant: "success",
				title: "Berhasil",
				message: `${all.length} karyawan diekspor.`,
			});
		} catch {
			addToast({
				variant: "error",
				title: "Gagal",
				message: "Gagal mengekspor data karyawan.",
			});
		}
	};

	const handleTemplate = () => {
		const ws = XLSX.utils.aoa_to_sheet([IMPORT_HEADERS]);
		ws["!cols"] = IMPORT_COLS;
		const wb = XLSX.utils.book_new();
		XLSX.utils.book_append_sheet(wb, ws, "Karyawan");
		XLSX.writeFile(wb, "template-import-karyawan.xlsx");
		addToast({
			variant: "success",
			title: "Berhasil",
			message: "Template import diunduh.",
		});
	};

	return (
		<div className="space-y-6">
			<div className="flex flex-wrap items-center justify-between gap-4">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">Data Karyawan</h1>
					<p className="text-sm text-gray-500">
						Master guru & tenaga kependidikan — golongan, sertifikasi/impasing.
					</p>
				</div>
				<div className="flex flex-wrap items-center gap-2">
					<Button variant="secondary" onClick={handleTemplate}>
						<FileDown className="h-4 w-4 mr-1.5" /> Template
					</Button>
					<Button variant="primary" onClick={() => setImportOpen(true)}>
						<Upload className="h-4 w-4 mr-1.5" /> Import
					</Button>
					<Button variant="secondary" onClick={handleExport}>
						<Download className="h-4 w-4 mr-1.5" /> Export
					</Button>
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
			</div>

			<div className="flex flex-wrap items-center gap-3">
				<div className="relative max-w-sm flex-1">
					<Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
					<Input
						className="pl-9"
						placeholder="Cari nama karyawan..."
						value={search}
						onChange={(e) => setSearch(e.target.value)}
					/>
				</div>
				<select
					value={golonganParam ?? ""}
					onChange={(e) =>
						navigate({
							to: "/sdm/guru",
							search: (prev) => ({
								...prev,
								golongan: e.target.value ? Number(e.target.value) : undefined,
							}),
							replace: true,
						})
					}
					title="Filter golongan efektif"
					className="block rounded-md border-0 py-2 text-sm text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600"
				>
					<option value="">Semua golongan</option>
					{golongans.map((g) => (
						<option key={g.id} value={g.id}>
							Golongan {g.kode}
						</option>
					))}
				</select>
			</div>

			{isLoading ? (
				<p className="text-sm text-gray-500">Memuat karyawan...</p>
			) : isError ? (
				<p className="text-sm text-red-600">Gagal memuat karyawan.</p>
			) : employees.length === 0 ? (
				<EmptyState
					icon={<Users className="h-10 w-10 text-gray-400" />}
					title={golonganParam ? "Tidak ada karyawan" : "Belum ada karyawan"}
					description={
						golonganParam
							? "Tidak ada karyawan dengan golongan efektif ini."
							: "Tambahkan data karyawan untuk mulai mengelola penggajian."
					}
				/>
			) : (
				<>
					<Table>
						<TableHead>
							<tr>
								<th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase w-14">
									No
								</th>
								<th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
									Nama
								</th>
								<th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
									No. Telp
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
						</TableHead>
						<TableBody>
							{employees.map((e, i) => (
								<tr key={e.id} className="hover:bg-gray-50">
									<td className="px-4 py-3 text-sm text-gray-400 tabular-nums">
										{i + 1}
									</td>
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
										{e.no_telp || "-"}
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
						</TableBody>
					</Table>

					{/* Sentinel infinite scroll */}
					<div ref={sentinelRef} className="h-px" />
				</>
			)}

			{!isLoading && !isError && employees.length > 0 && (
				<div className="flex items-center justify-center py-3 text-sm text-gray-500">
					{isFetchingNextPage ? (
						<>
							<Loader2 className="h-4 w-4 mr-2 animate-spin" /> Memuat...
						</>
					) : hasNextPage ? (
						<span>
							Menampilkan {employees.length} dari {total} karyawan
						</span>
					) : (
						<span>Semua {total} karyawan ditampilkan</span>
					)}
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

			<EmployeeImportDialog
				isOpen={importOpen}
				onClose={() => setImportOpen(false)}
				golongans={golongans}
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

function localFromStored(v?: string | null): string {
	if (!v) return "";
	const d = v.replace(/\D/g, "");
	if (d.startsWith("62")) return d.slice(2);
	if (d.startsWith("0")) return d.slice(1);
	return d;
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
	const [noTelp, setNoTelp] = useState("");
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
			setNoTelp(localFromStored(initial.no_telp));
			setTglMasuk(initial.tgl_masuk ?? "");
			setGolonganId(initial.golongan_id ? String(initial.golongan_id) : "");
			setSertifikasi(initial.sertifikasi);
			setImpasing(initial.impasing);
			setIsActive(initial.is_active);
		} else {
			setNama("");
			setNoTelp("");
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
			no_telp: noTelp.trim(),
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
				<div>
					<label
						htmlFor="no_telp"
						className="block text-sm font-medium leading-6 text-gray-900 mb-2"
					>
						No. Telepon / WA
					</label>
					<div className="flex">
						<span className="inline-flex items-center rounded-l-md border border-r-0 border-gray-300 bg-gray-50 px-3 text-sm text-gray-600">
							+62
						</span>
						<input
							id="no_telp"
							type="tel"
							inputMode="numeric"
							value={noTelp}
							onChange={(e) => setNoTelp(e.target.value.replace(/[^\d]/g, ""))}
							placeholder="812xxxxxxx"
							className="block w-full rounded-r-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm"
						/>
					</div>
				</div>
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
