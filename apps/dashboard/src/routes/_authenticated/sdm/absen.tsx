import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAtom } from "jotai";
import {
	AlertCircle,
	AlertTriangle,
	Download,
	Lock,
	Trash2,
	Upload,
} from "lucide-react";
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
	usePayrollStatus,
	useSaveAbsen,
} from "#/features/sdm/api";
import { resolveDefaultPeriode } from "#/features/sdm/lib/periode";
import { academicYearAtom } from "#/store/global";

export const Route = createFileRoute("/_authenticated/sdm/absen")({
	component: AbsenPage,
	validateSearch: (search: Record<string, unknown>): { periode?: string } => {
		const v = search.periode;
		return typeof v === "string" && v !== "" ? { periode: v } : {};
	},
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
	const navigate = useNavigate();
	const { periode: periodeParam } = Route.useSearch();
	const months = useMemo(
		() => (activeAy ? monthsInAcademicYear(activeAy) : []),
		[activeAy],
	);
	const [confirmDelete, setConfirmDelete] = useState(false);
	const [deleteConfirmText, setDeleteConfirmText] = useState("");
	const [confirmSave, setConfirmSave] = useState<{
		entries: AbsenEntry[];
		crossMonth: boolean;
	} | null>(null);
	const fileRef = useRef<HTMLInputElement>(null);

	// "Hari ini" distabilkan per mount agar default tidak berubah saat render.
	const today = useMemo(() => new Date(), []);
	// Bulan sebelumnya relatif kalender — dipakai menentukan default periode
	// (status payroll + ada/tidaknya absensi bulan lalu).
	const calendarPrevMonth = useMemo(() => {
		const curKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
		const idx = months.findIndex((m) => m.value === curKey);
		return idx > 0 ? months[idx - 1].value : "";
	}, [months, today]);
	const { data: calendarPrevStatus } = usePayrollStatus(calendarPrevMonth);
	const { data: calendarPrevRows = [] } = useAbsen(calendarPrevMonth);

	// Periode bersumber dari URL bila valid; selebihnya default cerdas:
	// tutup buku bulan sebelumnya (tgl 1–5) atau buku tertunda.
	const periode = useMemo(() => {
		if (periodeParam && months.some((m) => m.value === periodeParam)) {
			return periodeParam;
		}
		return resolveDefaultPeriode(months, today, {
			prevStatus: calendarPrevStatus?.status,
			prevHasAbsen: calendarPrevRows.length > 0,
		});
	}, [periodeParam, months, today, calendarPrevStatus, calendarPrevRows]);

	const { data: employees = [] } = useEmployees("", true);
	const { data: rows = [], isLoading } = useAbsen(periode);
	const saveAbsen = useSaveAbsen();
	const deleteAbsen = useDeleteAbsen();
	const { data: payrollStatus } = usePayrollStatus(periode);
	const locked = payrollStatus?.status === "finalized";

	// Periode sebelumnya dipakai untuk peringatan silang bulan: jika bulan
	// sebelumnya belum punya absensi, simpan bulan berjalan berpotensi salah bulan.
	const prevMonth = useMemo(() => {
		const i = months.findIndex((m) => m.value === periode);
		return i > 0 ? months[i - 1].value : "";
	}, [months, periode]);
	const { data: prevRows = [], isLoading: prevLoading } = useAbsen(prevMonth);
	const prevMonthEmpty = !!prevMonth && !prevLoading && prevRows.length === 0;

	// Pindah ke bulan berjalan saat tahun ajaran berubah.
	useEffect(() => {
		if (periode && periode !== periodeParam) {
			navigate({
				to: "/sdm/absen",
				search: { periode },
				replace: true,
			});
		}
	}, [periode, periodeParam, navigate]);

	// Editable state: employee_id → angka per kolom.
	const [values, setValues] = useState<Record<number, AbsenEntry>>({});

	// Kosongkan editan saat periode berganti agar tidak membawa sisa bulan lain.
	// biome-ignore lint/correctness/useExhaustiveDependencies: sengaja reset ketika periode berubah
	useEffect(() => {
		setValues({});
		setDeleteConfirmText("");
	}, [periode]);

	// Muat nilai tersimpan dari server. Digabung (data server di bawah, editan
	// user di atas) supaya refetch tidak menimpa input yang belum disimpan.
	useEffect(() => {
		const fromServer: Record<number, AbsenEntry> = {};
		for (const r of rows) {
			fromServer[r.employee_id] = {
				employee_id: r.employee_id,
				hadir: r.hadir,
				hadir_siaga: r.hadir_siaga,
				hadir_terlambat: r.hadir_terlambat,
				hadir_piket: r.hadir_piket,
				pulang_awal: r.pulang_awal,
			};
		}
		setValues((prev) => ({ ...fromServer, ...prev }));
	}, [rows]);

	const items = useMemo(
		() =>
			employees.map((e) => {
				const base: AbsenEntry = values[e.id] ?? {
					employee_id: e.id,
					hadir: 0,
					hadir_siaga: 0,
					hadir_terlambat: 0,
					hadir_piket: 0,
					pulang_awal: 0,
				};
				// employee_id selalu diambil dari karyawan (sumber kebenaran).
				return { employee: e, entry: { ...base, employee_id: e.id } };
			}),
		[employees, values],
	);

	// Guard diletakkan SETELAH seluruh hook agar jumlah & urutan hook tetap
	// stabil (Rules of Hooks) meski Tahun Ajaran belum dipilih.
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

	const setVal = (employeeId: number, key: string, raw: string) => {
		const v = Math.max(0, Number(raw) || 0);
		setValues((prev) => {
			// Seed entri lengkap bila belum ada — kalau tidak, `{...undefined}`
			// menghasilkan objek tanpa employee_id (payload invalid).
			const base: AbsenEntry = prev[employeeId] ?? {
				employee_id: employeeId,
				hadir: 0,
				hadir_siaga: 0,
				hadir_terlambat: 0,
				hadir_piket: 0,
				pulang_awal: 0,
			};
			return {
				...prev,
				[employeeId]: {
					...base,
					employee_id: employeeId,
					[key]: v,
				} as AbsenEntry,
			};
		});
	};

	// Hanya kirim karyawan yang diisi (ada nilai > 0) atau sudah punya data
	// periode ini — mencegah guru tanpa absen masuk penggajian & dapat bonus.
	const buildSaveEntries = () => {
		const existingIds = new Set(rows.map((r) => r.employee_id));
		return items
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
	};

	const doSave = (entries: AbsenEntry[]) => {
		saveAbsen.mutate(
			{ periode, items: entries },
			{
				onSuccess: () => {
					setConfirmSave(null);
					addToast({
						variant: "success",
						title: "Berhasil",
						message: `Absensi ${formatPeriode(periode)} disimpan (${entries.length} karyawan).`,
					});
				},
				onError: (err: Error) => {
					setConfirmSave(null);
					addToast({
						variant: "error",
						title: "Gagal",
						message:
							err instanceof ApiError ? err.message : "Terjadi kesalahan",
					});
				},
			},
		);
	};

	const handleSave = () => {
		if (locked) {
			addToast({
				variant: "warning",
				title: "Periode terkunci",
				message:
					"Penggajian periode ini sudah difinalisasi. Buka kembali (Unlock) di menu Penggajian untuk mengubah absensi.",
			});
			return;
		}
		const entries = buildSaveEntries();
		if (entries.length === 0) {
			addToast({
				variant: "warning",
				title: "Tidak ada yang disimpan",
				message:
					"Isi minimal satu kolom kehadiran. Untuk mengosongkan seluruh periode, gunakan tombol Hapus.",
			});
			return;
		}
		setConfirmSave({ entries, crossMonth: prevMonthEmpty });
	};

	const handleDelete = () => {
		const expected = formatPeriode(periode);
		if (deleteConfirmText.trim().toLowerCase() !== expected.toLowerCase()) {
			addToast({
				variant: "warning",
				title: "Konfirmasi belum cocok",
				message: `Ketik "${expected}" untuk melanjutkan penghapusan.`,
			});
			return;
		}
		deleteAbsen.mutate(periode, {
			onSuccess: () => {
				addToast({
					variant: "success",
					title: "Berhasil",
					message: `Absensi ${expected} dihapus.`,
				});
				setConfirmDelete(false);
				setDeleteConfirmText("");
			},
			onError: (err: Error) =>
				addToast({
					variant: "error",
					title: "Gagal",
					message: err instanceof ApiError ? err.message : "Terjadi kesalahan",
				}),
		});
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

			// Cocokkan ID di file dengan karyawan aktif, dan pastikan ada nilai
			// kehadiran. Sebelumnya pesan "N baris terbaca" hanya menandakan ID
			// terbaca — file dengan ID tak dikenal/nilai 0 tetap dianggap sukses
			// padahal tidak ada yang bisa disimpan.
			const activeIds = new Set(employees.map((e) => e.id));
			const matched = imported.filter((x) => activeIds.has(x.employee_id));
			const ignored = imported.length - matched.length;
			const filledCount = matched.filter(
				(x) =>
					x.hadir > 0 ||
					x.hadir_siaga > 0 ||
					x.hadir_terlambat > 0 ||
					x.hadir_piket > 0 ||
					x.pulang_awal > 0,
			).length;

			if (matched.length === 0) {
				addToast({
					variant: "error",
					title: "Gagal",
					message: `Tidak ada ID karyawan pada file yang cocok dengan ${employees.length} karyawan aktif. Gunakan template (kolom "ID Karyawan").`,
				});
				return;
			}
			if (filledCount === 0) {
				addToast({
					variant: "warning",
					title: "Tidak ada nilai kehadiran",
					message: `${matched.length} baris cocok, tetapi seluruh kolom kehadiran bernilai 0.`,
				});
				return;
			}

			const next: Record<number, AbsenEntry> = {};
			for (const x of matched) {
				next[x.employee_id] = x;
			}
			setValues((prev) => ({ ...prev, ...next }));
			addToast({
				variant: "success",
				title: "Berhasil",
				message: `${filledCount} baris kehadiran terbaca${
					ignored > 0 ? ` (${ignored} ID tidak dikenal diabaikan)` : ""
				} — tekan Simpan untuk menyimpan.`,
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
					<div className="flex flex-wrap items-center gap-2">
						<h1 className="text-2xl font-bold text-gray-900">Absensi</h1>
						{locked && (
							<span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
								<Lock className="h-3 w-3" /> Terkunci
							</span>
						)}
					</div>
					<p className="text-sm text-gray-500">
						Input kehadiran bulanan ({formatPeriode(periode)}).
					</p>
					{locked && (
						<p className="mt-1 text-xs text-amber-700">
							Penggajian periode ini sudah difinalisasi. Buka kembali (Unlock)
							di menu Penggajian untuk mengubah absensi.
						</p>
					)}
				</div>
				<div className="flex flex-wrap items-center gap-2">
					<select
						value={periode}
						onChange={(e) =>
							navigate({
								to: "/sdm/absen",
								search: { periode: e.target.value },
								replace: true,
							})
						}
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
						disabled={locked}
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
					<Button
						variant="primary"
						size="sm"
						onClick={handleSave}
						disabled={locked}
					>
						Simpan {formatPeriode(periode)}
					</Button>
					<Button
						variant="danger"
						size="sm"
						onClick={() => {
							setDeleteConfirmText("");
							setConfirmDelete(true);
						}}
						disabled={locked}
						title={
							locked ? "Periode terkunci" : "Hapus seluruh absensi periode ini"
						}
					>
						<Trash2 className="h-4 w-4 mr-1" /> Hapus
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
												disabled={locked}
												onChange={(e) =>
													setVal(employee.id, c.key, e.target.value)
												}
												className="w-16 rounded-md border-0 py-1 text-center text-sm text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400"
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
				open={confirmSave !== null}
				title={`Simpan absensi ${formatPeriode(periode)}?`}
				description={`${confirmSave?.entries.length ?? 0} karyawan akan disimpan untuk periode ${formatPeriode(periode)}.`}
				confirmLabel="Simpan"
				onConfirm={() => {
					if (confirmSave) doSave(confirmSave.entries);
				}}
				onCancel={() => setConfirmSave(null)}
			>
				{confirmSave?.crossMonth && (
					<div className="mt-2 flex gap-2 rounded-md bg-amber-50 p-3 text-sm text-amber-800">
						<AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
						<span>
							Absensi {formatPeriode(prevMonth)} belum memiliki data. Pastikan
							Anda tidak salah memilih bulan sebelum menyimpan.
						</span>
					</div>
				)}
			</ConfirmDialog>

			<ConfirmDialog
				open={confirmDelete}
				title={`Hapus absensi ${formatPeriode(periode)}?`}
				description={`Seluruh data absensi ${formatPeriode(periode)} akan dihapus dari tampilan dan bisa diisi ulang.`}
				confirmLabel="Hapus"
				onConfirm={handleDelete}
				onCancel={() => {
					setConfirmDelete(false);
					setDeleteConfirmText("");
				}}
			>
				<div className="mt-3 text-left">
					<label
						htmlFor="delete-confirm"
						className="block text-sm font-medium text-gray-700"
					>
						Ketik <strong>{formatPeriode(periode)}</strong> untuk konfirmasi
					</label>
					<input
						id="delete-confirm"
						type="text"
						value={deleteConfirmText}
						onChange={(e) => setDeleteConfirmText(e.target.value)}
						placeholder={formatPeriode(periode)}
						autoComplete="off"
						className="mt-1 block w-full rounded-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm"
					/>
				</div>
			</ConfirmDialog>
		</div>
	);
}
