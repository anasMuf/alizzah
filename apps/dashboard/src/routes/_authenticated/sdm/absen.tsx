import { createFileRoute } from "@tanstack/react-router";
import { useAtom } from "jotai";
import { AlertCircle, Download, Trash2, Upload } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { ApiError } from "#/api/mutator/custom-instance";
import { Button, ConfirmDialog, useToast } from "#/components/ui";
import {
	type AbsenEntry,
	formatPeriode,
	monthsInAcademicYear,
	useAbsen,
	useDeleteAbsen,
	useEmployees,
	useSaveAbsen,
} from "#/features/sdm/api";
import { academicYearAtom } from "#/store/global";

export const Route = createFileRoute("/_authenticated/sdm/absen")({
	component: AbsenPage,
});

const COLS = [
	{ key: "hadir", label: "Hadir" },
	{ key: "hadir_siaga", label: "Siaga" },
	{ key: "hadir_terlambat", label: "Terlambat" },
	{ key: "hadir_piket", label: "Piket" },
	{ key: "pulang_awal", label: "Pulang Awal" },
] as const;

function AbsenPage() {
	const { addToast } = useToast();
	const [activeAy] = useAtom(academicYearAtom);
	const months = useMemo(
		() => (activeAy ? monthsInAcademicYear(activeAy) : []),
		[activeAy],
	);
	const [periode, setPeriode] = useState(() => currentPeriodeIn(months));
	const [confirmDelete, setConfirmDelete] = useState(false);
	const fileRef = useRef<HTMLInputElement>(null);

	const { data: employees = [] } = useEmployees("", true);
	const { data: rows = [], isLoading } = useAbsen(periode);
	const saveAbsen = useSaveAbsen();
	const deleteAbsen = useDeleteAbsen();

	// Pindah ke bulan berjalan saat tahun ajaran berubah.
	useEffect(() => {
		setPeriode(currentPeriodeIn(months));
	}, [months]);

	if (!activeAy) {
		return (
			<div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
				<AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
				<h3 className="mt-4 text-sm font-semibold text-gray-900">
					Tahun Ajaran Belum Dipilih
				</h3>
				<p className="mt-1 text-sm text-gray-500">
					Pilih tahun ajaran pada panel samping untuk mengelola absensi.
				</p>
			</div>
		);
	}

	// Editable state: employee_id → angka per kolom.
	const [values, setValues] = useState<Record<number, AbsenEntry>>({});

	// Inisialisasi nilai dari data absen yang sudah ada saat periode berubah.
	useEffect(() => {
		const init: Record<number, AbsenEntry> = {};
		for (const r of rows) {
			init[r.employee_id] = {
				employee_id: r.employee_id,
				hadir: r.hadir,
				hadir_siaga: r.hadir_siaga,
				hadir_terlambat: r.hadir_terlambat,
				hadir_piket: r.hadir_piket,
				pulang_awal: r.pulang_awal,
			};
		}
		setValues(init);
	}, [rows]);

	const setVal = (employeeId: number, key: string, raw: string) => {
		const v = Math.max(0, Number(raw) || 0);
		setValues((prev) => ({
			...prev,
			[employeeId]: { ...prev[employeeId], [key]: v } as AbsenEntry,
		}));
	};

	const items = useMemo(
		() =>
			employees.map((e) => ({
				employee: e,
				entry: values[e.id] ?? {
					employee_id: e.id,
					hadir: 0,
					hadir_siaga: 0,
					hadir_terlambat: 0,
					hadir_piket: 0,
					pulang_awal: 0,
				},
			})),
		[employees, values],
	);

	const handleSave = () => {
		// Hanya kirim karyawan yang diisi (ada nilai > 0) atau sudah punya data
		// periode ini — mencegah guru tanpa absen masuk penggajian & dapat bonus.
		const existingIds = new Set(rows.map((r) => r.employee_id));
		const entries = items
			.map((x) => x.entry)
			.filter(
				(e) =>
					e.hadir > 0 ||
					e.hadir_siaga > 0 ||
					e.hadir_terlambat > 0 ||
					e.hadir_piket > 0 ||
					e.pulang_awal > 0 ||
					existingIds.has(e.employee_id),
			);
		saveAbsen.mutate(
			{ periode, items: entries },
			{
				onSuccess: () =>
					addToast({
						variant: "success",
						title: "Berhasil",
						message: `Absensi ${formatPeriode(periode)} disimpan (${entries.length} karyawan).`,
					}),
				onError: (err: Error) =>
					addToast({
						variant: "error",
						title: "Gagal",
						message:
							err instanceof ApiError ? err.message : "Terjadi kesalahan",
					}),
			},
		);
	};

	const handleExport = () => {
		const header = [
			"Periode",
			"ID Karyawan",
			"Nama",
			"Hadir",
			"Siaga",
			"Terlambat",
			"Piket",
			"Pulang Awal",
		];
		const body = employees.map((e) => {
			const v = values[e.id];
			return [
				periode,
				e.id,
				e.nama,
				v?.hadir ?? 0,
				v?.hadir_siaga ?? 0,
				v?.hadir_terlambat ?? 0,
				v?.hadir_piket ?? 0,
				v?.pulang_awal ?? 0,
			];
		});
		const ws = XLSX.utils.aoa_to_sheet([header, ...body]);
		ws["!cols"] = [
			{ wch: 8 },
			{ wch: 12 },
			{ wch: 30 },
			...Array(5).fill({ wch: 10 }),
		];
		const wb = XLSX.utils.book_new();
		XLSX.utils.book_append_sheet(wb, ws, "Absensi");
		XLSX.writeFile(wb, `absensi-${periode}.xlsx`);
		addToast({
			variant: "success",
			title: "Berhasil",
			message: "Template Excel diunduh.",
		});
	};

	const handleImport = async (file: File) => {
		try {
			const buf = await file.arrayBuffer();
			const wb = XLSX.read(buf);
			const ws = wb.Sheets[wb.SheetNames[0]];
			const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
				defval: 0,
			});
			const imported: AbsenEntry[] = raw
				.map((row) => ({
					employee_id: Number(row["ID Karyawan"] ?? row.id ?? 0),
					hadir: Number(row.Hadir ?? 0),
					hadir_siaga: Number(row.Siaga ?? 0),
					hadir_terlambat: Number(row.Terlambat ?? 0),
					hadir_piket: Number(row.Piket ?? 0),
					pulang_awal: Number(row["Pulang Awal"] ?? 0),
				}))
				.filter((x) => x.employee_id > 0);
			if (imported.length === 0) {
				addToast({
					variant: "error",
					title: "Gagal",
					message: "Tidak ada baris valid pada file.",
				});
				return;
			}
			const next: Record<number, AbsenEntry> = {};
			for (const x of imported) {
				next[x.employee_id] = x;
			}
			setValues((prev) => ({ ...prev, ...next }));
			addToast({
				variant: "success",
				title: "Berhasil",
				message: `${imported.length} baris terbaca — tekan Simpan untuk menyimpan.`,
			});
		} catch {
			addToast({
				variant: "error",
				title: "Gagal",
				message: "File Excel tidak valid.",
			});
		}
	};

	return (
		<div className="space-y-6">
			<div className="flex flex-wrap items-center justify-between gap-4">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">Absensi</h1>
					<p className="text-sm text-gray-500">
						Input kehadiran bulanan ({formatPeriode(periode)}).
					</p>
				</div>
				<div className="flex items-center gap-2">
					<select
						value={periode}
						onChange={(e) => setPeriode(e.target.value)}
						className="block rounded-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm"
					>
						{months.map((m) => (
							<option key={m.value} value={m.value}>
								{m.label}
							</option>
						))}
					</select>
					<Button variant="secondary" size="sm" onClick={handleExport}>
						<Download className="h-4 w-4 mr-1" /> Template
					</Button>
					<Button
						variant="secondary"
						size="sm"
						onClick={() => fileRef.current?.click()}
					>
						<Upload className="h-4 w-4 mr-1" /> Import
					</Button>
					<input
						ref={fileRef}
						type="file"
						accept=".xlsx,.xls"
						className="hidden"
						onChange={(e) => {
							const f = e.target.files?.[0];
							if (f) handleImport(f);
							e.target.value = "";
						}}
					/>
					<Button variant="primary" size="sm" onClick={handleSave}>
						Simpan
					</Button>
					<Button
						variant="danger"
						size="sm"
						onClick={() => setConfirmDelete(true)}
					>
						<Trash2 className="h-4 w-4" />
					</Button>
				</div>
			</div>

			{isLoading ? (
				<p className="text-sm text-gray-500">Memuat absensi...</p>
			) : (
				<div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
					<table className="min-w-full divide-y divide-gray-200">
						<thead className="bg-gray-50">
							<tr>
								<th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
									Karyawan
								</th>
								{COLS.map((c) => (
									<th
										key={c.key}
										className="px-2 py-3 text-center text-xs font-semibold text-gray-500 uppercase"
									>
										{c.label}
									</th>
								))}
							</tr>
						</thead>
						<tbody className="divide-y divide-gray-100">
							{items.map(({ employee, entry }) => (
								<tr key={employee.id} className="hover:bg-gray-50">
									<td className="px-4 py-2 text-sm text-gray-900 whitespace-nowrap">
										{employee.nama}
									</td>
									{COLS.map((c) => (
										<td key={c.key} className="px-2 py-2 text-center">
											<input
												type="number"
												min={0}
												value={entry[c.key]}
												onChange={(e) =>
													setVal(employee.id, c.key, e.target.value)
												}
												className="w-16 rounded-md border-0 py-1 text-center text-sm text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600"
											/>
										</td>
									))}
								</tr>
							))}
						</tbody>
					</table>
					{items.length === 0 && (
						<p className="px-5 py-6 text-sm text-gray-400">
							Tidak ada karyawan aktif.
						</p>
					)}
				</div>
			)}

			<ConfirmDialog
				open={confirmDelete}
				title="Hapus Absensi Periode Ini?"
				description={`Seluruh data absensi ${formatPeriode(periode)} akan dihapus.`}
				confirmLabel="Hapus"
				onConfirm={() =>
					deleteAbsen.mutate(periode, {
						onSuccess: () => {
							addToast({
								variant: "success",
								title: "Berhasil",
								message: "Absensi dihapus.",
							});
							setConfirmDelete(false);
						},
						onError: (err: Error) =>
							addToast({
								variant: "error",
								title: "Gagal",
								message:
									err instanceof ApiError ? err.message : "Terjadi kesalahan",
							}),
					})
				}
				onCancel={() => setConfirmDelete(false)}
			/>
		</div>
	);
}

// currentPeriodeIn memilih bulan berjalan bila ada dalam rentang tahun ajaran,
// selainnya bulan pertama rentang.
function currentPeriodeIn(months: Array<{ value: string }>): string {
	if (months.length === 0) return "";
	const now = new Date();
	const cur = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
	return months.some((m) => m.value === cur) ? cur : months[0].value;
}
